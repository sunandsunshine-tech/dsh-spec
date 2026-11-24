import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { startStaticServer } from './server.mjs'

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/opt/chrome/chrome',
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate))
}

async function waitForFile(path, deadlineMs = 10_000) {
  const deadline = Date.now() + deadlineMs
  while (Date.now() < deadline) {
    if (existsSync(path)) return readFileSync(path, 'utf8')
    await delay(25)
  }
  throw new Error('browser debugging port did not become ready')
}

class CdpConnection {
  constructor(url) {
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
    this.socket = new WebSocket(url)
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.method) {
        for (const listener of this.listeners.get(message.method) ?? []) {
          listener(message.params)
        }
        return
      }
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
    })
  }

  call(method, params = {}) {
    const id = this.nextId
    this.nextId += 1
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? []
    listeners.push(listener)
    this.listeners.set(method, listeners)
  }

  close() {
    this.socket.close()
  }
}

async function evaluate(connection, expression) {
  const result = await connection.call('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitForMeasurement(connection) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const measurement = await evaluate(connection, 'window.__lastMeasurement ?? null')
    if (measurement) return measurement
    await delay(10)
  }
  throw new Error('visible search update did not complete')
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right)
  return ordered[Math.floor(ordered.length / 2)]
}

function rounded(value) {
  return Number(value.toFixed(3))
}

async function readPerformanceMetrics(connection) {
  const { metrics } = await connection.call('Performance.getMetrics')
  return new Map(metrics.map((metric) => [metric.name, metric.value]))
}

const measuredPerformanceMetrics = [
  'TaskDuration',
  'ScriptDuration',
  'LayoutDuration',
  'RecalcStyleDuration',
]

function metricDeltas(before, after) {
  return Object.fromEntries(
    measuredPerformanceMetrics.map((name) => [
      name,
      rounded(((after.get(name) ?? 0) - (before.get(name) ?? 0)) * 1_000),
    ]),
  )
}

function summarizeProfile(profile) {
  const nodesById = new Map(profile.nodes.map((node) => [node.id, node]))
  const selfTimeByNode = new Map()

  for (let index = 0; index < profile.samples.length; index += 1) {
    const nodeId = profile.samples[index]
    const durationUs = profile.timeDeltas[index] ?? 0
    selfTimeByNode.set(nodeId, (selfTimeByNode.get(nodeId) ?? 0) + durationUs)
  }

  return [...selfTimeByNode]
    .map(([nodeId, durationUs]) => {
      const frame = nodesById.get(nodeId)?.callFrame
      return {
        functionName: frame?.functionName || '(anonymous)',
        url: frame?.url || '',
        lineNumber: (frame?.lineNumber ?? -1) + 1,
        selfMs: rounded(durationUs / 1_000),
      }
    })
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, 12)
}

function summarizeTrace(events) {
  const renderEvents = events.filter((event) =>
    ['EventDispatch', 'FunctionCall', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Commit', 'CompositeLayers'].includes(
      event.name,
    ),
  )
  const firstEventTime = Math.min(...renderEvents.map((event) => event.ts))

  return renderEvents
    .map((event) => ({
      name: event.name,
      type: event.args?.data?.type,
      thread: event.args?.data?.thread,
      durationMs: rounded((event.dur ?? 0) / 1_000),
      atMs: rounded((event.ts - firstEventTime) / 1_000),
    }))
    .slice(-40)
}

function summarizePaintLatencies(events) {
  const inputEvents = events
    .filter((event) => event.name === 'EventDispatch' && event.args?.data?.type === 'input')
    .sort((left, right) => left.ts - right.ts)

  return inputEvents.map((inputEvent, index) => {
    const nextInputTime = inputEvents[index + 1]?.ts ?? Number.POSITIVE_INFINITY
    const paintEvents = events
      .filter(
        (event) =>
          event.name === 'Paint' && event.ts >= inputEvent.ts && event.ts < nextInputTime,
      )
      .sort((left, right) => left.ts - right.ts)
    if (paintEvents.length === 0) throw new Error('trace contained no paint after input')

    const firstPaintStart = paintEvents[0].ts
    const firstPaintCycle = paintEvents.filter((event) => event.ts <= firstPaintStart + 1_000)
    const firstPaintEnd = Math.max(
      ...firstPaintCycle.map((event) => event.ts + (event.dur ?? 0)),
    )
    const commit = events
      .filter(
        (event) =>
          event.name === 'Commit' &&
          event.ts >= firstPaintStart &&
          event.ts < nextInputTime,
      )
      .sort((left, right) => left.ts - right.ts)[0]

    return {
      inputDispatchMs: rounded(inputEvent.dur / 1_000),
      inputToPaintStartMs: rounded((firstPaintStart - inputEvent.ts) / 1_000),
      inputToPaintEndMs: rounded((firstPaintEnd - inputEvent.ts) / 1_000),
      ...(commit
        ? { inputToCommitMs: rounded((commit.ts - inputEvent.ts) / 1_000) }
        : {}),
    }
  })
}

function summarizeLatencyMedians(latencies) {
  return {
    inputDispatchMs: median(latencies.map((sample) => sample.inputDispatchMs)),
    inputToPaintStartMs: median(latencies.map((sample) => sample.inputToPaintStartMs)),
    inputToPaintEndMs: median(latencies.map((sample) => sample.inputToPaintEndMs)),
    inputToCommitMs: median(latencies.map((sample) => sample.inputToCommitMs)),
  }
}

const chrome = findChrome()
if (!chrome) {
  console.error('MISSING_BROWSER: set CHROME_PATH to a Chrome or Chromium executable')
  process.exit(1)
}

const profile = mkdtempSync(join(tmpdir(), 'performance-browser-profile-'))
const { server, url } = await startStaticServer()
let browser
let connection
try {
  browser = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-sandbox',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      `${url}/`,
    ],
    { stdio: 'ignore' },
  )

  const activePort = await waitForFile(join(profile, 'DevToolsActivePort'))
  const [port] = activePort.trim().split('\n')
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
  const page = targets.find((target) => target.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('browser exposed no page target')
  connection = new CdpConnection(page.webSocketDebuggerUrl)
  await connection.open()
  await connection.call('Runtime.enable')
  await connection.call('Page.enable')
  await connection.call('Performance.enable')
  await connection.call('Network.enable')
  const inputRequests = []
  connection.on('Network.requestWillBeSent', ({ request }) => {
    inputRequests.push(request.url)
  })
  await connection.call('Page.navigate', { url: `${url}/` })
  let ready = false
  for (let attempt = 0; attempt < 100; attempt += 1) {
    ready = await evaluate(
      connection,
      "document.readyState === 'complete' && Boolean(document.querySelector('#query'))",
    )
    if (ready) break
    await delay(25)
  }
  if (!ready) throw new Error('search page did not load')

  async function runSample() {
    await evaluate(
      connection,
      "document.querySelector('#query').value = ''; document.querySelector('#query').focus(); window.__lastMeasurement = null",
    )
    inputRequests.length = 0
    const metricsBefore = await readPerformanceMetrics(connection)
    await connection.call('Input.insertText', { text: 'light' })
    const measurement = await waitForMeasurement(connection)
    const metricsAfter = await readPerformanceMetrics(connection)
    const visible = await evaluate(
      connection,
      `(() => {
        const rows = document.querySelector('#results').children
        return {
          inputValue: document.querySelector('#query').value,
          rowCount: rows.length,
          summary: document.querySelector('#summary').textContent,
          firstRow: rows[0]?.textContent ?? '',
        }
      })()`,
    )
    if (
      visible.inputValue !== 'light' ||
      visible.rowCount !== measurement.count ||
      visible.summary !== `${measurement.count} visible results`
    ) {
      throw new Error(`visible result did not match measurement: ${JSON.stringify(visible)}`)
    }

    return {
      ...measurement,
      metrics: metricDeltas(metricsBefore, metricsAfter),
      networkRequestCount: inputRequests.length,
      visible,
    }
  }

  await runSample()

  const samples = []
  for (let index = 0; index < 5; index += 1) {
    const measurement = await runSample()
    samples.push({
      inputToRafBoundaryMs: rounded(measurement.finish - measurement.start),
      filterMs: rounded(measurement.filterFinish - measurement.start),
      domUpdateMs: rounded(measurement.domFinish - measurement.filterFinish),
      postDomToRafBoundaryMs: rounded(measurement.finish - measurement.domFinish),
      count: measurement.count,
      metricsMs: measurement.metrics,
      networkRequestCount: measurement.networkRequestCount,
      visible: measurement.visible,
    })
  }

  const summary = {
    completionBoundary: 'double requestAnimationFrame',
    samplesMs: samples.map((sample) => sample.inputToRafBoundaryMs),
    medianMs: rounded(median(samples.map((sample) => sample.inputToRafBoundaryMs))),
    phaseMediansMs: {
      filter: rounded(median(samples.map((sample) => sample.filterMs))),
      domUpdate: rounded(median(samples.map((sample) => sample.domUpdateMs))),
      rafBoundaryWait: rounded(
        median(samples.map((sample) => sample.postDomToRafBoundaryMs)),
      ),
    },
    browserMetricMediansMs: Object.fromEntries(
      measuredPerformanceMetrics.map((name) => [
        name,
        rounded(median(samples.map((sample) => sample.metricsMs[name]))),
      ]),
    ),
    resultCount: samples[0].count,
    networkRequestCounts: samples.map((sample) => sample.networkRequestCount),
    visibleResult: samples[0].visible,
  }
  let profileSummary
  if (process.env.PROFILE) {
    await connection.call('Profiler.enable')
    await connection.call('Profiler.setSamplingInterval', { interval: 100 })
    await connection.call('Profiler.start')
    await runSample()
    const result = await connection.call('Profiler.stop')
    profileSummary = summarizeProfile(result.profile)
  }

  let traceSummary
  let tracePaintLatencies
  let tracePaintMedians
  if (process.env.TRACE) {
    const traceEvents = []
    connection.on('Tracing.dataCollected', ({ value }) => traceEvents.push(...value))
    const tracingComplete = new Promise((resolve) => {
      connection.on('Tracing.tracingComplete', resolve)
    })
    await connection.call('Tracing.start', {
      categories: 'devtools.timeline,v8,blink,cc,loading',
      transferMode: 'ReportEvents',
    })
    for (let index = 0; index < 5; index += 1) await runSample()
    await connection.call('Tracing.end')
    await tracingComplete
    traceSummary = summarizeTrace(traceEvents)
    tracePaintLatencies = summarizePaintLatencies(traceEvents)
    tracePaintMedians = summarizeLatencyMedians(tracePaintLatencies)
  }

  console.log(
    JSON.stringify({
      ...summary,
      samples,
      ...(profileSummary ? { profile: profileSummary } : {}),
      ...(tracePaintMedians ? { tracePaintMediansMs: tracePaintMedians } : {}),
      ...(tracePaintLatencies ? { tracePaintLatencies } : {}),
      ...(traceSummary ? { trace: traceSummary } : {}),
    }),
  )
} finally {
  connection?.close()
  browser?.kill('SIGKILL')
  await new Promise((resolve) => server.close(resolve))
  rmSync(profile, { recursive: true, force: true })
}

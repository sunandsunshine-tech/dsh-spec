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
    this.socket = new WebSocket(url)
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
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

function metricsByName(metrics) {
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]))
}

function metricDelta(before, after, name) {
  return Number((((after[name] ?? 0) - (before[name] ?? 0)) * 1_000).toFixed(3))
}

function summarizeProfile(profile) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]))
  const selfTimeByNode = new Map()
  for (let index = 0; index < profile.samples.length; index += 1) {
    const nodeId = profile.samples[index]
    selfTimeByNode.set(nodeId, (selfTimeByNode.get(nodeId) ?? 0) + profile.timeDeltas[index])
  }

  return [...selfTimeByNode]
    .map(([nodeId, microseconds]) => {
      const frame = nodes.get(nodeId).callFrame
      return {
        functionName: frame.functionName || '(anonymous)',
        source: frame.url ? `${frame.url.split('/').at(-1)}:${frame.lineNumber + 1}` : '(native)',
        selfMs: Number((microseconds / 1_000).toFixed(3)),
      }
    })
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, 8)
}

const chrome = findChrome()
if (!chrome) {
  console.error('MISSING_BROWSER: set CHROME_PATH to a Chrome or Chromium executable')
  process.exit(1)
}

const browserProfile = mkdtempSync(join(tmpdir(), 'performance-browser-profile-'))
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
      `--user-data-dir=${browserProfile}`,
      `${url}/`,
    ],
    { stdio: 'ignore' },
  )

  const activePort = await waitForFile(join(browserProfile, 'DevToolsActivePort'))
  const [port] = activePort.trim().split('\n')
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
  const page = targets.find((target) => target.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('browser exposed no page target')
  connection = new CdpConnection(page.webSocketDebuggerUrl)
  await connection.open()
  await connection.call('Runtime.enable')
  await connection.call('Page.enable')
  await connection.call('Performance.enable')
  await connection.call('Profiler.enable')
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

  const resources = await evaluate(
    connection,
    `performance.getEntriesByType('resource').map(({ name, duration, transferSize }) => ({
      name: new URL(name).pathname,
      durationMs: Number(duration.toFixed(3)),
      transferBytes: transferSize,
    }))`,
  )
  await evaluate(
    connection,
    "document.querySelector('#query').focus(); window.__lastMeasurement = null",
  )
  await connection.call('Input.insertText', { text: 'light' })
  await waitForMeasurement(connection)

  const samples = []
  for (let index = 0; index < 5; index += 1) {
    await evaluate(
      connection,
      `(() => {
        const query = document.querySelector('#query');
        query.value = '';
        query.focus();
        window.__lastInputStart = null;
        window.__lastMeasurement = null;
        query.addEventListener('input', () => {
          window.__lastInputStart = performance.now();
        }, { capture: true, once: true });
      })()`,
    )
    const beforeMetrics = metricsByName((await connection.call('Performance.getMetrics')).metrics)
    await connection.call('Input.insertText', { text: 'light' })
    const measurement = await waitForMeasurement(connection)
    const inputStart = await evaluate(connection, 'window.__lastInputStart')
    const visible = await evaluate(
      connection,
      `({
        rows: document.querySelector('#results').children.length,
        summary: document.querySelector('#summary').textContent,
        first: document.querySelector('#results').firstElementChild?.textContent ?? '',
      })`,
    )
    if (
      visible.rows !== measurement.count
      || visible.summary !== `${measurement.count} visible results`
      || !visible.first
    ) {
      throw new Error('filtered result was not visible at measurement completion')
    }
    const afterMetrics = metricsByName((await connection.call('Performance.getMetrics')).metrics)
    samples.push({
      inputToVisibleMs: Number((measurement.finish - inputStart).toFixed(3)),
      handlerMs: Number((measurement.finish - measurement.start).toFixed(3)),
      scriptMs: metricDelta(beforeMetrics, afterMetrics, 'ScriptDuration'),
      styleMs: metricDelta(beforeMetrics, afterMetrics, 'RecalcStyleDuration'),
      layoutMs: metricDelta(beforeMetrics, afterMetrics, 'LayoutDuration'),
      taskMs: metricDelta(beforeMetrics, afterMetrics, 'TaskDuration'),
      count: measurement.count,
      rows: visible.rows,
    })
  }

  const summarize = (name) => {
    const ordered = samples.map((sample) => sample[name]).sort((left, right) => left - right)
    return {
      medianMs: ordered[Math.floor(ordered.length / 2)],
      rangeMs: [ordered[0], ordered.at(-1)],
    }
  }
  await evaluate(
    connection,
    "document.querySelector('#query').value = ''; document.querySelector('#query').focus(); window.__lastMeasurement = null",
  )
  await connection.call('Profiler.setSamplingInterval', { interval: 100 })
  await connection.call('Profiler.start')
  await connection.call('Input.insertText', { text: 'light' })
  await waitForMeasurement(connection)
  const { profile: cpuProfile } = await connection.call('Profiler.stop')
  console.log(JSON.stringify({
    samples,
    summary: Object.fromEntries(
      ['inputToVisibleMs', 'handlerMs', 'scriptMs', 'styleMs', 'layoutMs', 'taskMs']
        .map((name) => [name, summarize(name)]),
    ),
    profile: {
      totalMs: Number(((cpuProfile.endTime - cpuProfile.startTime) / 1_000).toFixed(3)),
      topSelfTime: summarizeProfile(cpuProfile),
    },
    initialLoadResources: resources,
  }))
} finally {
  connection?.close()
  browser?.kill('SIGKILL')
  await new Promise((resolve) => server.close(resolve))
  rmSync(browserProfile, { recursive: true, force: true })
}

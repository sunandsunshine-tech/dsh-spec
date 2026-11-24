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

async function readPerformanceMetrics(connection) {
  const { metrics } = await connection.call('Performance.getMetrics')
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]))
}

function counterDelta(before, after, name) {
  return Number((((after[name] ?? 0) - (before[name] ?? 0)) * 1_000).toFixed(3))
}

async function measureSearch(connection, collectPhases) {
  await evaluate(
    connection,
    `(() => {
      const query = document.querySelector('#query')
      query.value = ''
      query.focus()
      window.__lastMeasurement = null
      window.__inputObservedAt = null
      window.__domUpdatedAt = null
      window.__resourceCountBefore = performance.getEntriesByType('resource').length
      document.addEventListener(
        'input',
        (event) => {
          window.__inputObservedAt = event.timeStamp
        },
        { capture: true, once: true },
      )
      const observer = new MutationObserver(() => {
        window.__domUpdatedAt = performance.now()
        observer.disconnect()
      })
      observer.observe(document.querySelector('#results'), { childList: true })
    })()`,
  )

  const before = collectPhases ? await readPerformanceMetrics(connection) : null
  await connection.call('Input.insertText', { text: 'light' })
  const measurement = await waitForMeasurement(connection)
  const after = collectPhases ? await readPerformanceMetrics(connection) : null
  const timing = await evaluate(
    connection,
    `({
      observedAt: window.__inputObservedAt,
      domUpdatedAt: window.__domUpdatedAt,
      resourceCountAfter: performance.getEntriesByType('resource').length,
      resourceCountBefore: window.__resourceCountBefore,
    })`,
  )

  return {
    endToEndMs: Number((measurement.finish - timing.observedAt).toFixed(3)),
    domUpdatedMs: Number((timing.domUpdatedAt - timing.observedAt).toFixed(3)),
    frameWaitMs: Number((measurement.finish - timing.domUpdatedAt).toFixed(3)),
    handlerMs: Number((measurement.finish - measurement.start).toFixed(3)),
    networkRequests: timing.resourceCountAfter - timing.resourceCountBefore,
    scriptMs: after ? counterDelta(before, after, 'ScriptDuration') : null,
    styleMs: after ? counterDelta(before, after, 'RecalcStyleDuration') : null,
    layoutMs: after ? counterDelta(before, after, 'LayoutDuration') : null,
    taskMs: after ? counterDelta(before, after, 'TaskDuration') : null,
  }
}

function median(samples, key) {
  const values = samples.map((sample) => sample[key]).sort((left, right) => left - right)
  return values[Math.floor(values.length / 2)]
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

  await measureSearch(connection, false)
  const samples = []
  for (let index = 0; index < 5; index += 1) {
    samples.push(await measureSearch(connection, true))
  }

  console.log(
    JSON.stringify({
      samples,
      medians: {
        endToEndMs: median(samples, 'endToEndMs'),
        domUpdatedMs: median(samples, 'domUpdatedMs'),
        frameWaitMs: median(samples, 'frameWaitMs'),
        handlerMs: median(samples, 'handlerMs'),
        scriptMs: median(samples, 'scriptMs'),
        styleMs: median(samples, 'styleMs'),
        layoutMs: median(samples, 'layoutMs'),
        taskMs: median(samples, 'taskMs'),
        networkRequests: median(samples, 'networkRequests'),
      },
    }),
  )
} finally {
  connection?.close()
  browser?.kill('SIGKILL')
  await new Promise((resolve) => server.close(resolve))
  rmSync(profile, { recursive: true, force: true })
}

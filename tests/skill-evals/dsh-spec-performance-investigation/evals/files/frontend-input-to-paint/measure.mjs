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

  const samples = []
  for (let index = 0; index < 5; index += 1) {
    await evaluate(
      connection,
      "document.querySelector('#query').value = ''; document.querySelector('#query').focus(); window.__lastMeasurement = null",
    )
    await connection.call('Input.insertText', { text: 'light' })
    const measurement = await waitForMeasurement(connection)
    samples.push(Number((measurement.finish - measurement.start).toFixed(3)))
  }

  const ordered = [...samples].sort((left, right) => left - right)
  console.log(JSON.stringify({ samplesMs: samples, medianMs: ordered[Math.floor(ordered.length / 2)] }))
} finally {
  connection?.close()
  browser?.kill('SIGKILL')
  await new Promise((resolve) => server.close(resolve))
  rmSync(profile, { recursive: true, force: true })
}

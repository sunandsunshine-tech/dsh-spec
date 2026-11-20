import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const chrome = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
].find((candidate) => candidate && existsSync(candidate))
if (!chrome) throw new Error('set CHROME_PATH to a Chrome or Edge executable')

const root = import.meta.dirname
const evidence = join(root, 'evidence-local')
mkdirSync(evidence, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'gif-evidence-chrome-'))
const server = spawn(process.execPath, [join(root, 'server.mjs')], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
})
let browser

async function stop(child) {
  if (child.exitCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))
  child.kill()
  const stopped = await Promise.race([exited.then(() => true), delay(2_000).then(() => false)])
  if (stopped) return
  child.kill('SIGKILL')
  await Promise.race([exited, delay(1_000)])
}

function emergencyCleanup() {
  browser?.kill('SIGKILL')
  if (server.exitCode === null) server.kill('SIGKILL')
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch {
    // Chrome can hold profile files briefly during forced shutdown.
  }
}

process.once('exit', emergencyCleanup)
const baseUrl = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('server did not report a URL')), 10_000)
  server.stdout.once('data', (chunk) => {
    clearTimeout(timer)
    resolve(chunk.toString().trim())
  })
})

const windowsProfile = /\.exe$/i.test(chrome)
  ? spawnSync('wslpath', ['-w', profile], { encoding: 'utf8' }).stdout.trim()
  : profile
browser = spawn(
  chrome,
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${windowsProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
)

const devtoolsUrl = await new Promise((resolve, reject) => {
  let output = ''
  const timer = setTimeout(() => reject(new Error('Chrome did not expose a DevTools endpoint')), 20_000)
  browser.stderr.on('data', (chunk) => {
    output += chunk.toString()
    const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output)
    if (!match) return
    clearTimeout(timer)
    resolve(match[1])
  })
  browser.once('exit', (code) => reject(new Error(`Chrome exited before DevTools was ready: ${code}`)))
})

const endpoint = new URL(devtoolsUrl)
let pageTarget
for (let attempt = 0; attempt < 100; attempt += 1) {
  const targets = await fetch(`http://127.0.0.1:${endpoint.port}/json/list`).then((response) => response.json())
  pageTarget = targets.find((target) => target.type === 'page')
  if (pageTarget) break
  await delay(50)
}
if (!pageTarget) throw new Error('Chrome did not create a page target')

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
const listeners = new Map()

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined) {
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error.message))
    else request.resolve(message.result)
    return
  }
  for (const listener of listeners.get(message.method) ?? []) listener(message.params)
})

function command(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

function once(method) {
  return new Promise((resolve) => {
    const handler = (params) => {
      listeners.set(
        method,
        (listeners.get(method) ?? []).filter((candidate) => candidate !== handler),
      )
      resolve(params)
    }
    listeners.set(method, [...(listeners.get(method) ?? []), handler])
  })
}

async function screenshot(name) {
  const result = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  const bytes = Buffer.from(result.data, 'base64')
  writeFileSync(join(evidence, name), bytes)
  return {
    path: `evidence-local/${name}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  }
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(description, expression) {
  const completed = await evaluate(`(async () => {
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      if (${expression}) return true
      await new Promise((resolve) => setTimeout(resolve, 16))
    }
    throw new Error(${JSON.stringify(`timed out waiting for ${description}`)})
  })()`)
  if (completed !== true) throw new Error(`did not reach ${description}`)
}

async function currentState() {
  return evaluate(`({
    status: document.querySelector('#status').textContent,
    button: document.querySelector('#save').textContent,
    disabled: document.querySelector('#save').disabled
  })`)
}

try {
  await command('Page.enable')
  await command('Runtime.enable')
  await command('Emulation.setDeviceMetricsOverride', {
    width: 720,
    height: 480,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const loaded = once('Page.loadEventFired')
  await command('Page.navigate', { url: baseUrl })
  await loaded
  await waitFor(
    'the initial state',
    "document.querySelector('#status')?.textContent === 'Unsaved changes' && document.querySelector('#save')?.disabled === false",
  )

  const screenshots = []
  const states = {}
  screenshots.push(await screenshot('00-initial.png'))
  states.initial = await currentState()
  await evaluate("document.querySelector('#save').click()")
  await waitFor(
    'the saving state',
    "document.querySelector('#status')?.textContent === 'Saving changes' && document.querySelector('#save')?.textContent === 'Saving…' && document.querySelector('#save')?.disabled === true",
  )
  screenshots.push(await screenshot('01-saving.png'))
  states.saving = await currentState()
  const completed = await fetch(`${baseUrl}/complete`, { method: 'POST' })
  if (!completed.ok) throw new Error(`fixture save completion failed: ${completed.status}`)
  await waitFor(
    'the saved state',
    "document.querySelector('#status')?.textContent === 'Changes saved' && document.querySelector('#save')?.textContent === 'Save changes' && document.querySelector('#save')?.disabled === false",
  )
  screenshots.push(await screenshot('02-saved.png'))
  states.final = await currentState()
  writeFileSync(
    join(evidence, 'capture-report.json'),
    JSON.stringify(
      {
        origin: baseUrl,
        browser: chrome,
        session: 'one Chrome process and one page target',
        screenshots,
        states,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(JSON.stringify({ origin: baseUrl, evidence, screenshots, states }, null, 2))
} finally {
  socket.close()
  await stop(browser)
  await stop(server)
  rmSync(profile, { recursive: true, force: true })
}

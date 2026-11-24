import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`)
  return value
}

const captureDeadlineMs = positiveInteger('CAPTURE_DEADLINE_MS', 60_000)
const root = import.meta.dirname
const evidence = join(root, 'evidence-local')
rmSync(evidence, { recursive: true, force: true })

const chrome = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
].find((candidate) => candidate && existsSync(candidate))
if (!chrome) throw new Error('set CHROME_PATH to a Chrome or Edge executable')

const profile = mkdtempSync(join(tmpdir(), 'gif-evidence-chrome-'))
const staging = mkdtempSync(join(root, '.evidence-local-run-'))
const deadlineAt = Date.now() + captureDeadlineMs
const server = spawn(process.execPath, [join(root, 'server.mjs')], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
})

let browser
let socket
let published = false

function deadlineError(operation) {
  return new Error(`capture deadline exceeded while waiting for ${operation}`)
}

function remaining(operation) {
  const value = deadlineAt - Date.now()
  if (value <= 0) throw deadlineError(operation)
  return value
}

async function withinDeadline(promise, operation, limitMs = remaining(operation)) {
  const timeoutMs = Math.min(limitMs, remaining(operation))
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(deadlineError(operation)), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function waitUntil(predicate, timeoutMs) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (predicate()) return true
    await delay(25)
  }
  return predicate()
}

function signalBrowserGroup(signal) {
  if (!browser?.pid) return false
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' })
    return true
  }
  try {
    process.kill(-browser.pid, signal)
    return true
  } catch (error) {
    if (error?.code === 'ESRCH') return false
    throw error
  }
}

function browserGroupAlive() {
  if (!browser?.pid) return false
  if (process.platform === 'win32') return browser.exitCode === null && browser.signalCode === null
  try {
    process.kill(-browser.pid, 0)
    return true
  } catch (error) {
    if (error?.code === 'ESRCH') return false
    throw error
  }
}

async function stopBrowser() {
  if (!browser?.pid) return
  if (process.platform === 'win32') {
    signalBrowserGroup('SIGKILL')
    if (!(await waitUntil(() => browser.exitCode !== null || browser.signalCode !== null, 2_000))) {
      throw new Error('browser process tree did not stop')
    }
    return
  }
  if (!browserGroupAlive()) return
  signalBrowserGroup('SIGTERM')
  if (await waitUntil(() => !browserGroupAlive(), 2_000)) return
  signalBrowserGroup('SIGKILL')
  if (!(await waitUntil(() => !browserGroupAlive(), 1_000))) {
    throw new Error('browser process group did not stop')
  }
}

async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return
  server.kill('SIGTERM')
  if (await waitUntil(() => server.exitCode !== null || server.signalCode !== null, 2_000)) return
  server.kill('SIGKILL')
  if (!(await waitUntil(() => server.exitCode !== null || server.signalCode !== null, 1_000))) {
    throw new Error('capture server did not stop')
  }
}

function emergencyCleanup() {
  try {
    signalBrowserGroup('SIGKILL')
  } catch {
    // The regular cleanup reports the failure when the process is still running.
  }
  if (server.exitCode === null) server.kill('SIGKILL')
  for (const path of [profile, staging, published ? undefined : evidence]) {
    if (!path) continue
    try {
      rmSync(path, { recursive: true, force: true })
    } catch {
      // The process is already exiting; the regular path reports cleanup failures.
    }
  }
}

process.once('exit', emergencyCleanup)

async function cleanup() {
  const failures = []
  try {
    socket?.close()
  } catch (error) {
    failures.push(`close CDP socket: ${error instanceof Error ? error.message : String(error)}`)
  }
  try {
    await stopBrowser()
  } catch (error) {
    failures.push(`browser: ${error instanceof Error ? error.message : String(error)}`)
  }
  try {
    await stopServer()
  } catch (error) {
    failures.push(`server: ${error instanceof Error ? error.message : String(error)}`)
  }
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch (error) {
    failures.push(`profile: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (failures.length > 0) throw new Error(`capture cleanup failed: ${failures.join('; ')}`)
}

async function waitForServer() {
  return withinDeadline(
    new Promise((resolve, reject) => {
      server.once('error', reject)
      server.once('exit', (code) => reject(new Error(`capture server exited before reporting a URL: ${code}`)))
      server.stdout.once('data', (chunk) => resolve(chunk.toString().trim()))
    }),
    'the capture server URL',
    Math.min(10_000, remaining('the capture server URL')),
  )
}

async function startBrowser() {
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
    {
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )
  return withinDeadline(
    new Promise((resolve, reject) => {
      let output = ''
      browser.once('error', reject)
      browser.stderr.on('data', (chunk) => {
        output += chunk.toString()
        const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output)
        if (match) resolve(match[1])
      })
      browser.once('exit', (code) => reject(new Error(`Chrome exited before DevTools was ready: ${code}`)))
    }),
    'the Chrome DevTools endpoint',
    Math.min(20_000, remaining('the Chrome DevTools endpoint')),
  )
}

async function findPageTarget(devtoolsUrl) {
  const endpoint = new URL(devtoolsUrl)
  while (Date.now() < deadlineAt) {
    try {
      const response = await fetch(`http://127.0.0.1:${endpoint.port}/json/list`, {
        signal: AbortSignal.timeout(Math.max(1, Math.min(1_000, remaining('a page target')))),
      })
      const targets = await response.json()
      const target = targets.find((candidate) => candidate.type === 'page')
      if (target) return target
    } catch (error) {
      if (error?.name !== 'AbortError' && error?.name !== 'TimeoutError' && error?.cause?.code !== 'ECONNREFUSED') {
        throw error
      }
    }
    await delay(50)
  }
  throw deadlineError('a page target')
}

async function connectToPage(pageTarget) {
  const pending = new Map()
  const listeners = new Map()
  let nextId = 0
  let socketFailure

  socket = new WebSocket(pageTarget.webSocketDebuggerUrl)

  function rejectSocket(error) {
    if (socketFailure) return socketFailure
    socketFailure = error
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.reject(error)
    }
    pending.clear()
    for (const [method, methodListeners] of listeners) {
      for (const listener of methodListeners) {
        clearTimeout(listener.timer)
        listener.reject(error)
      }
      listeners.delete(method)
    }
    return socketFailure
  }

  socket.addEventListener('close', (event) => {
    rejectSocket(
      new Error(
        `CDP WebSocket closed after the browser run started (${event.code}${event.reason ? `: ${event.reason}` : ''})`,
      ),
    )
  })
  socket.addEventListener('error', () => {
    rejectSocket(new Error('CDP WebSocket errored after the browser run started'))
  })
  socket.addEventListener('message', (event) => {
    let message
    try {
      message = JSON.parse(event.data)
    } catch (error) {
      rejectSocket(
        new Error(`CDP WebSocket sent invalid JSON: ${error instanceof Error ? error.message : String(error)}`),
      )
      return
    }
    if (message.id !== undefined) {
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      clearTimeout(request.timer)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
      return
    }
    for (const listener of [...(listeners.get(message.method) ?? [])]) listener.resolve(message.params)
  })

  await withinDeadline(
    new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
      socket.addEventListener('close', () => reject(new Error('CDP WebSocket closed during the handshake')), {
        once: true,
      })
    }),
    'the CDP WebSocket handshake',
  )

  function command(method, params = {}) {
    if (socketFailure) return Promise.reject(socketFailure)
    if (socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`CDP WebSocket is not open before ${method}`))
    }
    const requestId = (nextId += 1)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = deadlineError(method)
        rejectSocket(error)
      }, remaining(method))
      pending.set(requestId, { resolve, reject, timer })
      try {
        socket.send(JSON.stringify({ id: requestId, method, params }))
      } catch (error) {
        clearTimeout(timer)
        pending.delete(requestId)
        reject(error)
      }
    })
  }

  function once(method) {
    if (socketFailure) return Promise.reject(socketFailure)
    return new Promise((resolve, reject) => {
      const listener = {
        resolve(params) {
          clearTimeout(listener.timer)
          listeners.set(
            method,
            (listeners.get(method) ?? []).filter((candidate) => candidate !== listener),
          )
          resolve(params)
        },
        reject,
        timer: setTimeout(() => rejectSocket(deadlineError(method)), remaining(method)),
      }
      listeners.set(method, [...(listeners.get(method) ?? []), listener])
    })
  }

  return { command, once }
}

async function capture() {
  const baseUrl = await waitForServer()
  const devtoolsUrl = await startBrowser()
  const pageTarget = await findPageTarget(devtoolsUrl)
  const cdp = await connectToPage(pageTarget)

  async function screenshot(name) {
    const result = await cdp.command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    const bytes = Buffer.from(result.data, 'base64')
    writeFileSync(join(staging, name), bytes)
    return {
      path: `evidence-local/${name}`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
    }
  }

  async function evaluate(expression) {
    const result = await cdp.command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  async function waitFor(description, expression) {
    const waitMs = remaining(`the ${description} state`)
    const completed = await evaluate(`(async () => {
      const deadline = Date.now() + ${waitMs}
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

  await cdp.command('Page.enable')
  await cdp.command('Runtime.enable')
  await cdp.command('Emulation.setDeviceMetricsOverride', {
    width: 720,
    height: 480,
    deviceScaleFactor: 1,
    mobile: false,
  })
  const loaded = cdp.once('Page.loadEventFired')
  await cdp.command('Page.navigate', { url: baseUrl })
  await loaded
  await waitFor(
    'initial',
    "document.querySelector('#status')?.textContent === 'Unsaved changes' && document.querySelector('#save')?.disabled === false",
  )

  const screenshots = []
  const states = {}
  screenshots.push(await screenshot('00-initial.png'))
  states.initial = await currentState()
  await evaluate("document.querySelector('#save').click()")
  await waitFor(
    'saving',
    "document.querySelector('#status')?.textContent === 'Saving changes' && document.querySelector('#save')?.textContent === 'Saving…' && document.querySelector('#save')?.disabled === true",
  )
  screenshots.push(await screenshot('01-saving.png'))
  states.saving = await currentState()
  await waitFor(
    'saved',
    "document.querySelector('#status')?.textContent === 'Changes saved' && document.querySelector('#save')?.textContent === 'Save changes' && document.querySelector('#save')?.disabled === false",
  )
  screenshots.push(await screenshot('02-saved.png'))
  states.final = await currentState()
  writeFileSync(
    join(staging, 'capture-report.json'),
    JSON.stringify(
      {
        origin: baseUrl,
        browser: chrome,
        session: 'one Chrome process and one page target',
        freshProfile: true,
        deadlineMs: captureDeadlineMs,
        runId: basename(staging),
        screenshots,
        states,
      },
      null,
      2,
    ) + '\n',
  )
  return { origin: baseUrl, screenshots, states }
}

async function run() {
  try {
    const summary = await capture()
    await cleanup()
    renameSync(staging, evidence)
    published = true
    console.log(JSON.stringify({ ...summary, evidence }, null, 2))
  } catch (error) {
    let cleanupFailure
    try {
      await cleanup()
    } catch (failure) {
      cleanupFailure = failure
    }
    rmSync(staging, { recursive: true, force: true })
    if (!published) rmSync(evidence, { recursive: true, force: true })
    if (cleanupFailure instanceof Error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${message}; ${cleanupFailure.message}`)
    }
    throw error
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

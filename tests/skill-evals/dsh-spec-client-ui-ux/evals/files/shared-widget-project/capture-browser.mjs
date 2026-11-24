import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = import.meta.dirname
const evidence = join(root, 'evidence-local')
const lockDirectory = join(root, '.shared-widget-capture.lock')

let browser
let server
let socket
let runDirectory
let profile
let stagedEvidence
let windowsChromeProfile
let windowsChromeName
let lockOwned = false
let evidencePublished = false

class CaptureError extends Error {
  constructor(code, message, options) {
    super(message, options)
    this.name = 'CaptureError'
    this.code = code
  }
}

function abortError(signal, fallbackCode, fallbackMessage) {
  return signal.reason instanceof Error ? signal.reason : new CaptureError(fallbackCode, fallbackMessage)
}

function readTimeout(name, fallback) {
  const value = Number(process.env[name] ?? fallback)
  if (!Number.isFinite(value) || value <= 0) {
    throw new CaptureError('INVALID_TIMEOUT', name + ' must be a positive number')
  }
  return value
}

function removePath(path, description) {
  if (!path) return
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
  } catch (error) {
    throw new CaptureError('CAPTURE_CLEANUP_FAILED', 'could not remove ' + description + ': ' + error.message, {
      cause: error,
    })
  }
}

async function removePathToQuiescence(path, description, timeoutMs) {
  if (!path) return
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
      lastError = undefined
    } catch (error) {
      lastError = error
    }
    if (!existsSync(path)) {
      await delay(50)
      if (!existsSync(path)) return
    }
    await delay(50)
  }
  throw new CaptureError(
    'CAPTURE_CLEANUP_FAILED',
    'could not remove ' + description + ' before its deadline' + (lastError ? ': ' + lastError.message : ''),
    { cause: lastError },
  )
}

function emergencyKill(child) {
  if (!child?.pid) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') child.kill('SIGKILL')
  }
}

function emergencyCleanup() {
  try {
    socket?.close()
  } catch {
    // The process is exiting; the owned process groups are the remaining cleanup boundary.
  }
  if (windowsChromeProfile) stopWindowsChromeProcesses(1_000)
  emergencyKill(browser)
  emergencyKill(server)
  if (runDirectory) {
    try {
      rmSync(runDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 25 })
    } catch {
      // A terminating process can retain a Windows profile while the operating system releases it.
    }
  }
  if (lockOwned) {
    try {
      rmSync(lockDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 25 })
    } catch {
      // A stale lock makes the next capture fail closed instead of racing this run.
    }
  }
}

function spawnOwned(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== 'win32',
    windowsHide: true,
  })
  child.captureError = undefined
  child.once('error', (error) => {
    child.captureError = error
  })
  return child
}

function processGroupAlive(pid) {
  try {
    process.kill(-pid, 0)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    if (error.code === 'EPERM') return true
    throw error
  }
}

async function waitForProcessGroupExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!processGroupAlive(pid)) return true
    await delay(25)
  }
  return !processGroupAlive(pid)
}

async function waitForChildExit(child, timeoutMs) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return true
  return Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    delay(timeoutMs).then(() => false),
  ])
}

function taskkill(child, force) {
  const args = ['/pid', String(child.pid), '/T']
  if (force) args.push('/F')
  return (
    spawnSync('taskkill', args, {
      stdio: 'ignore',
      windowsHide: true,
    }).status === 0
  )
}

function stopWindowsChromeProcesses(timeoutMs) {
  if (process.platform === 'win32' || !windowsChromeProfile || !windowsChromeName) return true
  const powershell = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
  if (!existsSync(powershell)) return false
  const script = [
    '$name = $env:CAPTURE_BROWSER_NAME',
    '$profile = $env:CAPTURE_CHROME_PROFILE',
    '$timeout = [int]$env:CAPTURE_STOP_TIMEOUT_MS',
    '$matches = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq $name -and $_.CommandLine -and $_.CommandLine.Contains($profile) })',
    'foreach ($item in $matches) { Stop-Process -Id $item.ProcessId -Force -ErrorAction SilentlyContinue }',
    '$deadline = [DateTime]::UtcNow.AddMilliseconds($timeout)',
    'do {',
    '  $matches = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq $name -and $_.CommandLine -and $_.CommandLine.Contains($profile) })',
    '  if ($matches.Count -eq 0) { exit 0 }',
    '  Start-Sleep -Milliseconds 50',
    '} while ([DateTime]::UtcNow -lt $deadline)',
    'exit 1',
  ].join('\n')
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: {
      ...process.env,
      CAPTURE_BROWSER_NAME: windowsChromeName,
      CAPTURE_CHROME_PROFILE: windowsChromeProfile,
      CAPTURE_STOP_TIMEOUT_MS: String(timeoutMs),
    },
    stdio: 'ignore',
    windowsHide: true,
  })
  return result.status === 0
}

async function stopChild(child, name, timeoutMs) {
  if (!child?.pid) return []
  if (process.platform === 'win32') {
    taskkill(child, false)
    if (await waitForChildExit(child, timeoutMs)) return []
    taskkill(child, true)
    if (await waitForChildExit(child, timeoutMs)) return []
    return [new CaptureError('PROCESS_CLEANUP_FAILED', name + ' process did not exit after taskkill')]
  }

  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch (error) {
    if (error.code !== 'ESRCH') {
      return [
        new CaptureError('PROCESS_CLEANUP_FAILED', 'could not signal ' + name + ' process group: ' + error.message, {
          cause: error,
        }),
      ]
    }
  }
  if (await waitForProcessGroupExit(child.pid, timeoutMs)) return []

  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') {
      return [
        new CaptureError('PROCESS_CLEANUP_FAILED', 'could not kill ' + name + ' process group: ' + error.message, {
          cause: error,
        }),
      ]
    }
  }
  if (await waitForProcessGroupExit(child.pid, timeoutMs)) return []
  return [new CaptureError('PROCESS_CLEANUP_FAILED', name + ' process group remained after SIGKILL')]
}

async function stopOwnedProcesses(processStopTimeoutMs) {
  const errors = []
  try {
    socket?.close()
  } catch (error) {
    errors.push(
      new CaptureError('PROCESS_CLEANUP_FAILED', 'could not close Chrome DevTools socket: ' + error.message, {
        cause: error,
      }),
    )
  }
  if (!stopWindowsChromeProcesses(processStopTimeoutMs)) {
    errors.push(
      new CaptureError(
        'PROCESS_CLEANUP_FAILED',
        'could not stop Windows Chrome processes owned by the capture profile',
      ),
    )
  }
  errors.push(...(await stopChild(browser, 'Chrome', processStopTimeoutMs)))
  errors.push(...(await stopChild(server, 'server', processStopTimeoutMs)))
  browser = undefined
  server = undefined
  socket = undefined
  return errors
}

function waitForOutput(child, options) {
  const { signal, timeoutMs, timeoutCode, timeoutMessage, label, pattern } = options
  return new Promise((resolve, reject) => {
    let output = ''
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.stdout?.off('data', onData)
      child.stderr?.off('data', onData)
      child.off('error', onError)
      child.off('exit', onExit)
      signal.removeEventListener('abort', onAbort)
      callback(value)
    }
    const inspect = () => {
      const match = pattern.exec(output)
      if (match) finish(resolve, label === 'server' ? match[0] : match[1])
    }
    const onData = (chunk) => {
      output = (output + chunk.toString()).slice(-64 * 1024)
      inspect()
    }
    const onError = (error) => {
      finish(
        reject,
        new CaptureError(
          label === 'server' ? 'SERVER_UNREADY' : 'CHROME_START_FAILED',
          label + ' process could not start: ' + error.message,
          { cause: error },
        ),
      )
    }
    const onExit = (code, exitSignal) => {
      finish(
        reject,
        new CaptureError(
          label === 'server' ? 'SERVER_UNREADY' : 'CHROME_START_FAILED',
          label + ' exited before readiness: ' + (exitSignal ?? code),
        ),
      )
    }
    const onAbort = () => finish(reject, abortError(signal, timeoutCode, timeoutMessage))
    const timer = setTimeout(
      () => finish(reject, new CaptureError(timeoutCode, timeoutMessage, { cause: signal.reason })),
      timeoutMs,
    )
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.once('error', onError)
    child.once('exit', onExit)
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
    inspect()
  })
}

async function findPageTarget(port, signal, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (signal.aborted) throw abortError(signal, 'CAPTURE_TIMEOUT', 'capture deadline expired')
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal })
      if (response.ok) {
        const targets = await response.json()
        const pageTargets = targets.filter((target) => target.type === 'page')
        if (pageTargets.length === 1) return pageTargets[0]
      }
    } catch (error) {
      if (signal.aborted) throw abortError(signal, 'CAPTURE_TIMEOUT', 'capture deadline expired')
      if (Date.now() + 50 >= deadline) {
        throw new CaptureError('CHROME_TARGET_UNAVAILABLE', 'Chrome DevTools target lookup failed', {
          cause: error,
        })
      }
    }
    await delay(50, undefined, { signal })
  }
  throw new CaptureError('CHROME_TARGET_UNAVAILABLE', 'Chrome did not create a page target')
}

async function connectDevTools(devtoolsUrl, signal, commandTimeoutMs) {
  socket = new WebSocket(devtoolsUrl)
  let nextId = 0
  const pending = new Map()
  const eventWaiters = new Map()
  let connectionFailure
  let rejectOpen

  const failConnection = (error) => {
    if (connectionFailure) return
    connectionFailure = error
    rejectOpen?.(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
    for (const waiters of eventWaiters.values()) {
      for (const waiter of waiters) {
        signal.removeEventListener('abort', waiter.onAbort)
        waiter.reject(error)
      }
    }
    eventWaiters.clear()
  }

  const onMessage = (event) => {
    try {
      const message = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString())
      if (message.id !== undefined) {
        const request = pending.get(message.id)
        if (!request) return
        pending.delete(message.id)
        if (message.error) {
          request.reject(
            new CaptureError('CDP_COMMAND_FAILED', message.error.message, {
              cause: message.error.code === undefined ? undefined : new Error(String(message.error.code)),
            }),
          )
        } else {
          request.resolve(message.result)
        }
        return
      }
      const waiters = eventWaiters.get(message.method)
      if (!waiters) return
      eventWaiters.delete(message.method)
      for (const waiter of waiters) {
        signal.removeEventListener('abort', waiter.onAbort)
        waiter.resolve(message.params)
      }
    } catch (error) {
      failConnection(new CaptureError('CDP_PROTOCOL_ERROR', 'could not read a DevTools message', { cause: error }))
    }
  }
  const onError = (event) => {
    const cause = event.error instanceof Error ? event.error : undefined
    failConnection(
      new CaptureError(
        'CDP_DISCONNECTED',
        'Chrome DevTools connection failed' + (cause?.message ? ': ' + cause.message : ''),
        { cause },
      ),
    )
  }
  const onClose = (event) => {
    const detail = event.reason ? ': ' + event.reason : ' with code ' + event.code
    failConnection(new CaptureError('CDP_DISCONNECTED', 'Chrome DevTools connection closed' + detail))
  }
  const onAbort = () => failConnection(abortError(signal, 'CAPTURE_TIMEOUT', 'capture deadline expired'))
  socket.addEventListener('message', onMessage)
  socket.addEventListener('error', onError)
  socket.addEventListener('close', onClose)
  signal.addEventListener('abort', onAbort, { once: true })

  try {
    await new Promise((resolve, reject) => {
      let settled = false
      const timer = setTimeout(
        () =>
          failConnection(
            new CaptureError(
              'CDP_CONNECT_TIMEOUT',
              'Chrome DevTools connection did not open within ' + commandTimeoutMs + ' ms',
            ),
          ),
        commandTimeoutMs,
      )
      const finish = (callback) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        rejectOpen = undefined
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('close', onCloseForOpen)
        callback()
      }
      rejectOpen = (error) => finish(() => reject(error))
      const onOpen = () => finish(resolve)
      const onCloseForOpen = () => finish(reject)
      socket.addEventListener('open', onOpen, { once: true })
      socket.addEventListener('close', onCloseForOpen, { once: true })
      if (connectionFailure) rejectOpen(connectionFailure)
    })
  } catch (error) {
    throw connectionFailure || error
  }

  function command(method, params = {}) {
    if (connectionFailure) return Promise.reject(connectionFailure)
    if (socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(
        new CaptureError('CDP_DISCONNECTED', 'cannot send ' + method + ' after the DevTools connection closed'),
      )
    }

    const id = ++nextId
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (callback, value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        signal.removeEventListener('abort', commandAbort)
        pending.delete(id)
        callback(value)
      }
      const request = {
        resolve: (value) => finish(resolve, value),
        reject: (error) => finish(reject, error),
      }
      const timer = setTimeout(
        () =>
          request.reject(
            new CaptureError('CDP_COMMAND_TIMEOUT', method + ' did not finish within ' + commandTimeoutMs + ' ms'),
          ),
        commandTimeoutMs,
      )
      const commandAbort = () => request.reject(abortError(signal, 'CAPTURE_TIMEOUT', 'capture deadline expired'))
      pending.set(id, request)
      signal.addEventListener('abort', commandAbort, { once: true })
      try {
        socket.send(JSON.stringify({ id, method, params }))
      } catch (error) {
        request.reject(
          new CaptureError('CDP_SEND_FAILED', 'could not send ' + method + ' to Chrome DevTools', { cause: error }),
        )
      }
    })
  }

  function once(method) {
    if (connectionFailure) return Promise.reject(connectionFailure)
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve: (params) => {
          signal.removeEventListener('abort', waiter.onAbort)
          resolve(params)
        },
        reject: (error) => {
          signal.removeEventListener('abort', waiter.onAbort)
          reject(error)
        },
        onAbort: () => reject(abortError(signal, 'CAPTURE_TIMEOUT', 'capture deadline expired')),
      }
      eventWaiters.set(method, [...(eventWaiters.get(method) ?? []), waiter])
      signal.addEventListener('abort', waiter.onAbort, { once: true })
    })
  }

  return { command, once }
}

async function capture(options) {
  const {
    captureSignal,
    commandTimeoutMs,
    chromeReadyTimeoutMs,
    browserCloseTimeoutMs,
    serverReadyTimeoutMs,
    chrome,
    outputDirectory,
  } = options

  server = spawnOwned(process.execPath, [process.env.SERVER_ENTRY ?? 'server.mjs'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const baseUrl = await waitForOutput(server, {
    signal: captureSignal,
    timeoutMs: serverReadyTimeoutMs,
    timeoutCode: 'SERVER_UNREADY',
    timeoutMessage: 'server did not report a URL within ' + serverReadyTimeoutMs + ' ms',
    label: 'server',
    pattern: /https?:\/\/[^\s]+/,
  })

  const usesWindowsPath = /\.exe$/i.test(chrome)
  const profileArgument = usesWindowsPath
    ? spawnSync('wslpath', ['-w', profile], { encoding: 'utf8' }).stdout.trim()
    : profile
  if (!profileArgument) throw new CaptureError('CHROME_START_FAILED', 'could not resolve the Chrome profile path')
  if (process.platform !== 'win32' && usesWindowsPath) {
    windowsChromeProfile = profileArgument
    windowsChromeName = chrome.split(/[\\/]/).pop()
  }

  browser = spawnOwned(
    chrome,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileArgument}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const devtoolsUrl = await waitForOutput(browser, {
    signal: captureSignal,
    timeoutMs: chromeReadyTimeoutMs,
    timeoutCode: 'CHROME_READY_TIMEOUT',
    timeoutMessage: 'Chrome did not expose a DevTools endpoint within ' + chromeReadyTimeoutMs + ' ms',
    label: 'Chrome',
    pattern: /DevTools listening on (ws:\/\/[^\s]+)/,
  })

  const endpoint = new URL(devtoolsUrl)
  const port = endpoint.port
  if (!port) throw new CaptureError('CHROME_TARGET_UNAVAILABLE', 'Chrome DevTools endpoint has no port')
  const pageTarget = await findPageTarget(port, captureSignal, chromeReadyTimeoutMs)
  const session = await connectDevTools(pageTarget.webSocketDebuggerUrl, captureSignal, commandTimeoutMs)

  async function navigate(path, width, height) {
    const loaded = session.once('Page.loadEventFired')
    await session.command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await session.command('Page.navigate', { url: baseUrl + path })
    await loaded
    await delay(150, undefined, { signal: captureSignal })
  }

  async function evaluate(expression) {
    const result = await session.command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  async function screenshot(name) {
    const result = await session.command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    const bytes = Buffer.from(result.data, 'base64')
    writeFileSync(join(outputDirectory, `${name}.png`), bytes)
    return {
      path: `evidence-local/${name}.png`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
    }
  }

  async function buttonState(selector) {
    return evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    const rect = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      active: button === document.activeElement,
      focusVisible: button.matches(':focus-visible'),
      hover: button.matches(':hover'),
      pressed: button.matches(':active'),
      disabled: button.disabled,
      background: style.backgroundColor,
      color: style.color,
      outline: style.outline,
      opacity: style.opacity
    };
  })()`)
  }

  async function pressTab(times) {
    for (let count = 0; count < times; count += 1) {
      await session.command('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
      await session.command('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
      })
    }
  }

  const screenshots = {}
  const states = {}
  await session.command('Page.enable')
  await session.command('Runtime.enable')

  await navigate('/?variant=after', 390, 900)
  screenshots.narrowIdle = await screenshot('narrow-after-idle')
  states.narrowIdle = await buttonState('.search-panel .button')

  const searchPoint = await evaluate(`(() => {
    const rect = document.querySelector('.search-panel .button').getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`)
  await session.command('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: searchPoint.x,
    y: searchPoint.y,
  })
  await delay(100, undefined, { signal: captureSignal })
  screenshots.searchHover = await screenshot('search-hover')
  states.searchHover = await buttonState('.search-panel .button')
  await session.command('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: searchPoint.x,
    y: searchPoint.y,
    button: 'left',
    clickCount: 1,
  })
  await delay(100, undefined, { signal: captureSignal })
  screenshots.searchPressed = await screenshot('search-pressed')
  states.searchPressed = await buttonState('.search-panel .button')
  await session.command('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: searchPoint.x,
    y: searchPoint.y,
    button: 'left',
    clickCount: 1,
  })

  await navigate('/?variant=after', 390, 900)
  await pressTab(2)
  screenshots.searchFocus = await screenshot('search-keyboard-focus')
  states.searchFocus = await buttonState('.search-panel .button')

  await navigate('/?variant=after&saving=1', 390, 900)
  screenshots.disabled = await screenshot('delete-disabled')
  states.disabled = await buttonState('.settings-panel .danger')

  await navigate('/?variant=after', 768, 900)
  screenshots.wideIdle = await screenshot('wide-after-idle')
  states.wideIdle = await buttonState('.search-panel .button')

  const report = {
    browser: {
      executable: chrome,
      freshProfile: true,
      protocolEndpointPort: port,
    },
    application: {
      origin: baseUrl,
      session: 'one spawned Chrome process handle and one page target',
    },
    evidenceDirectory: 'evidence-local',
    screenshots,
    states,
  }
  writeFileSync(join(outputDirectory, 'review-state.json'), JSON.stringify(report, null, 2) + '\n')
  try {
    await session.command('Browser.close')
  } catch (error) {
    if (captureSignal.aborted) throw abortError(captureSignal, 'CAPTURE_TIMEOUT', 'capture deadline expired')
    if (!(error instanceof CaptureError) || error.code !== 'CDP_DISCONNECTED') {
      // The process-tree cleanup below remains authoritative when graceful close is unavailable.
    }
  }
  await waitForChildExit(browser, browserCloseTimeoutMs)
  return report
}

function findChrome() {
  const chromeCandidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean)
  const chrome = chromeCandidates.find((candidate) => existsSync(candidate))
  if (!chrome) throw new CaptureError('CHROME_UNAVAILABLE', 'set CHROME_PATH to a Chrome or Edge executable')
  return chrome
}

async function main() {
  const commandTimeoutMs = readTimeout('CDP_COMMAND_TIMEOUT_MS', 15_000)
  const captureTimeoutMs = readTimeout('CAPTURE_TIMEOUT_MS', 60_000)
  const chromeReadyTimeoutMs = readTimeout('CHROME_READY_TIMEOUT_MS', 20_000)
  const serverReadyTimeoutMs = readTimeout('SERVER_READY_TIMEOUT_MS', 10_000)
  const processStopTimeoutMs = readTimeout('PROCESS_STOP_TIMEOUT_MS', 2_000)
  const browserCloseTimeoutMs = readTimeout('BROWSER_CLOSE_TIMEOUT_MS', 5_000)
  const captureController = new AbortController()
  const captureTimer = setTimeout(
    () =>
      captureController.abort(
        new CaptureError('CAPTURE_TIMEOUT', 'capture did not finish within ' + captureTimeoutMs + ' ms'),
      ),
    captureTimeoutMs,
  )
  let report
  let failure
  let finalError
  let evidenceCommitted = false

  try {
    try {
      mkdirSync(lockDirectory)
    } catch (error) {
      if (error?.code === 'EEXIST') {
        throw new CaptureError('CAPTURE_BUSY', 'another capture owns the evidence directory lock')
      }
      throw error
    }
    lockOwned = true
    runDirectory = mkdtempSync(join(root, '.shared-widget-capture-'))
    profile = join(runDirectory, 'profile')
    stagedEvidence = join(runDirectory, 'evidence-local')
    const retiredEvidence = join(runDirectory, 'previous-evidence')
    mkdirSync(profile)
    mkdirSync(stagedEvidence)
    if (existsSync(evidence)) renameSync(evidence, retiredEvidence)
    removePath(retiredEvidence, 'previous evidence')

    report = await capture({
      captureSignal: captureController.signal,
      commandTimeoutMs,
      chromeReadyTimeoutMs,
      browserCloseTimeoutMs,
      serverReadyTimeoutMs,
      chrome: findChrome(),
      outputDirectory: stagedEvidence,
    })

    const processErrors = await stopOwnedProcesses(processStopTimeoutMs)
    if (processErrors.length > 0) {
      throw new CaptureError('PROCESS_CLEANUP_FAILED', processErrors.map((error) => error.message).join('; '))
    }
    await removePathToQuiescence(profile, 'Chrome profile', browserCloseTimeoutMs)
    profile = undefined

    captureController.signal.throwIfAborted()
    renameSync(stagedEvidence, evidence)
    clearTimeout(captureTimer)
    stagedEvidence = undefined
    evidenceCommitted = true
    evidencePublished = true
    await removePathToQuiescence(runDirectory, 'capture run directory', browserCloseTimeoutMs)
    runDirectory = undefined
  } catch (error) {
    failure = error instanceof Error ? error : new Error(String(error))
  } finally {
    clearTimeout(captureTimer)
    if (!evidenceCommitted) captureController.abort(failure ?? new CaptureError('CAPTURE_ABORTED', 'capture aborted'))

    const cleanupErrors = [...(await stopOwnedProcesses(processStopTimeoutMs))]
    for (const [path, description] of [
      [profile, 'Chrome profile'],
      [runDirectory, 'capture run directory'],
    ]) {
      try {
        removePath(path, description)
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
    profile = undefined
    runDirectory = undefined
    if (!evidenceCommitted && lockOwned) {
      try {
        removePath(evidence, 'failed evidence')
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
    if (lockOwned) {
      try {
        removePath(lockDirectory, 'capture lock')
      } catch (error) {
        cleanupErrors.push(error)
      }
      lockOwned = false
    }
    if (cleanupErrors.length > 0) {
      const cleanupFailure = new CaptureError(
        'CAPTURE_CLEANUP_FAILED',
        cleanupErrors.map((error) => error.message).join('; '),
        { cause: cleanupErrors[0] },
      )
      finalError = failure
        ? new AggregateError([failure, cleanupFailure], 'capture failed and cleanup was incomplete')
        : cleanupFailure
    } else if (failure) {
      finalError = failure
    }
  }

  if (finalError) throw finalError
  console.log(JSON.stringify(report, null, 2))
}

process.once('exit', emergencyCleanup)

try {
  await main()
} catch (error) {
  if (error instanceof AggregateError) {
    for (const item of error.errors) {
      const code = item instanceof CaptureError ? item.code : 'CAPTURE_FAILED'
      console.error(code + ': ' + item.message)
    }
  } else {
    const code = error instanceof CaptureError ? error.code : 'CAPTURE_FAILED'
    console.error(code + ': ' + error.message)
  }
  console.error(
    evidencePublished
      ? 'Capture published complete evidence, but a post-publication cleanup step failed.'
      : 'Capture failed; no evidence was published.',
  )
  process.exitCode = 1
}

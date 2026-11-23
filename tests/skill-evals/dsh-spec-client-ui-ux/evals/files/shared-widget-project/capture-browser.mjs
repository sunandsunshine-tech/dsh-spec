import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const chrome = chromeCandidates.find((candidate) => existsSync(candidate))
if (!chrome) throw new Error('set CHROME_PATH to a Chrome or Edge executable')

const root = import.meta.dirname
const evidence = join(root, 'evidence-local')
mkdirSync(evidence, { recursive: true })
const profile = mkdtempSync(join(tmpdir(), 'shared-widget-chrome-'))
let browser
let socket
const server = spawn(process.execPath, [process.env.SERVER_ENTRY ?? 'server.mjs'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
})

async function stopChild(child) {
  if (!child || child.exitCode !== null) return
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
    // The operating system may still hold the browser profile briefly during shutdown.
  }
}

process.once('exit', emergencyCleanup)
try {
  const baseUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('server did not report a URL')),
      Number(process.env.SERVER_READY_TIMEOUT_MS ?? 10_000),
    )
    server.stdout.once('data', (chunk) => {
      clearTimeout(timer)
      resolve(chunk.toString().trim())
    })
  })

  const usesWindowsPath = /\.exe$/i.test(chrome)
  const windowsProfile = usesWindowsPath
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
    let buffered = ''
    const timer = setTimeout(() => reject(new Error('Chrome did not expose a DevTools endpoint')), 20_000)
    browser.stderr.on('data', (chunk) => {
      buffered += chunk.toString()
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buffered)
      if (!match) return
      clearTimeout(timer)
      resolve(match[1])
    })
    browser.once('exit', (code) => reject(new Error(`Chrome exited before DevTools was ready: ${code}`)))
  })

  const endpoint = new URL(devtoolsUrl)
  const port = endpoint.port
  let pageTarget
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())
    const pageTargets = targets.filter((target) => target.type === 'page')
    if (pageTargets.length === 1) pageTarget = pageTargets[0]
    if (pageTarget) break
    await delay(50)
  }
  if (!pageTarget) throw new Error('Chrome did not create a page target')

  socket = new WebSocket(pageTarget.webSocketDebuggerUrl)
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

  async function navigate(path, width, height) {
    const loaded = once('Page.loadEventFired')
    await command('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await command('Page.navigate', { url: baseUrl + path })
    await loaded
    await delay(150)
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

  async function screenshot(name) {
    const result = await command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    const bytes = Buffer.from(result.data, 'base64')
    const path = join(evidence, `${name}.png`)
    writeFileSync(path, bytes)
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
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    }
  }

  const screenshots = {}
  const states = {}
  await command('Page.enable')
  await command('Runtime.enable')

  await navigate('/?variant=after', 390, 900)
  screenshots.narrowIdle = await screenshot('narrow-after-idle')
  states.narrowIdle = await buttonState('.search-panel .button')

  const searchPoint = await evaluate(`(() => {
    const rect = document.querySelector('.search-panel .button').getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  })()`)
  await command('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: searchPoint.x,
    y: searchPoint.y,
  })
  await delay(100)
  screenshots.searchHover = await screenshot('search-hover')
  states.searchHover = await buttonState('.search-panel .button')
  await command('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: searchPoint.x,
    y: searchPoint.y,
    button: 'left',
    clickCount: 1,
  })
  await delay(100)
  screenshots.searchPressed = await screenshot('search-pressed')
  states.searchPressed = await buttonState('.search-panel .button')
  await command('Input.dispatchMouseEvent', {
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
  writeFileSync(join(evidence, 'review-state.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  socket?.close()
  await stopChild(browser)
  await stopChild(server)
  rmSync(profile, { recursive: true, force: true })
}

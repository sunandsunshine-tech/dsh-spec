#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const mode = process.env.FAKE_CHROME_MODE ?? 'success'
const eventsPath = process.env.FAKE_CHROME_EVENTS
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nT8AAAAASUVORK5CYII=',
  'base64',
)

function record(event, details = {}) {
  if (!eventsPath) return
  appendFileSync(eventsPath, JSON.stringify({ event, ...details }) + '\n')
}

if (process.env.FAKE_CHROME_PID_FILE) {
  writeFileSync(process.env.FAKE_CHROME_PID_FILE, String(process.pid))
}
record('start', { argv: process.argv.slice(2), mode })

if (mode === 'exit-before-ready') {
  process.exit(Number(process.env.FAKE_CHROME_EXIT_CODE ?? 7))
}

if (process.env.FAKE_DESCENDANT_PID_FILE) {
  const descendant = spawn(process.execPath, [join(import.meta.dirname, 'fake-capture-descendant.mjs')], {
    env: {
      ...process.env,
      FAKE_DESCENDANT_PID_FILE: process.env.FAKE_DESCENDANT_PID_FILE,
    },
    stdio: 'ignore',
  })
  descendant.unref()
}

let screenshotCount = 0
let screenshotSent = false
let socket

function frame(payload) {
  const bytes = Buffer.from(payload)
  if (bytes.length < 126) {
    return Buffer.concat([Buffer.from([0x81, bytes.length]), bytes])
  }
  if (bytes.length <= 0xffff) {
    const header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(bytes.length, 2)
    return Buffer.concat([header, bytes])
  }
  const header = Buffer.alloc(10)
  header[0] = 0x81
  header[1] = 127
  header.writeBigUInt64BE(BigInt(bytes.length), 2)
  return Buffer.concat([header, bytes])
}

function send(message) {
  if (!socket || socket.destroyed) return
  socket.write(frame(JSON.stringify(message)))
}

function response(id, result) {
  send({ id, result })
}

function runtimeValue(expression) {
  if (expression.includes('return { x: rect.x + rect.width / 2')) {
    return { x: 32, y: 32 }
  }
  return {
    rect: { x: 16, y: 16, width: 32, height: 32 },
    active: true,
    focusVisible: true,
    hover: true,
    pressed: true,
    disabled: false,
    background: 'rgb(15, 118, 110)',
    color: 'rgb(255, 255, 255)',
    outline: 'rgb(15, 118, 110) auto 1px',
    opacity: '1',
  }
}

function handleCommand(message) {
  record('command', { method: message.method })
  if (mode === 'disconnect-pending' && message.method === 'Page.enable') {
    record('disconnect-pending', { method: message.method })
    socket.destroy()
    return
  }
  if (mode === 'command-timeout' && message.method === 'Page.enable') return
  if (mode === 'fail-after-first-screenshot' && screenshotSent && message.method === 'Runtime.evaluate') {
    record('command-failed', { method: message.method })
    send({ id: message.id, error: { code: -32000, message: 'injected CDP failure' } })
    return
  }
  if (message.method === 'Page.captureScreenshot') {
    screenshotCount += 1
    screenshotSent = true
    record('screenshot', { count: screenshotCount })
    response(message.id, { data: png.toString('base64') })
    return
  }
  if (message.method === 'Runtime.evaluate') {
    response(message.id, {
      result: { type: 'object', value: runtimeValue(message.params?.expression ?? '') },
    })
    return
  }
  if (message.method === 'Page.navigate') {
    response(message.id, { frameId: 'fake-frame', loaderId: 'fake-loader' })
    setImmediate(() => send({ method: 'Page.loadEventFired', params: { timestamp: Date.now() } }))
    return
  }
  if (message.method === 'Browser.close') {
    response(message.id, {})
    setImmediate(() => process.exit(0))
    return
  }
  response(message.id, {})
}

function consume(client, incoming) {
  let buffer = Buffer.concat([client.pendingData ?? Buffer.alloc(0), incoming])
  while (buffer.length >= 2) {
    const first = buffer[0]
    const second = buffer[1]
    const opcode = first & 0x0f
    const masked = (second & 0x80) !== 0
    let length = second & 0x7f
    let offset = 2
    if (length === 126) {
      if (buffer.length < 4) break
      length = buffer.readUInt16BE(2)
      offset = 4
    } else if (length === 127) {
      if (buffer.length < 10) break
      length = Number(buffer.readBigUInt64BE(2))
      offset = 10
    }
    const maskOffset = offset
    if (masked) offset += 4
    if (buffer.length < offset + length) break
    let payload = buffer.subarray(offset, offset + length)
    if (masked) {
      const mask = buffer.subarray(maskOffset, maskOffset + 4)
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]))
    }
    buffer = buffer.subarray(offset + length)
    if (opcode === 0x8) {
      client.end(Buffer.from([0x88, 0x00]))
      return
    }
    if (opcode === 0x1) handleCommand(JSON.parse(payload.toString()))
  }
  client.pendingData = buffer
}

const httpServer = createServer((request, response) => {
  if (mode === 'overall-timeout') {
    record('target-request-hung', { url: request.url })
    return
  }
  if (request.url !== '/json/list') {
    response.writeHead(404)
    response.end()
    return
  }
  const port = httpServer.address().port
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(
    JSON.stringify([
      {
        type: 'page',
        webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/fake`,
      },
    ]),
  )
})

httpServer.on('upgrade', (request, client, head) => {
  socket = client
  const accept = createHash('sha1')
    .update(request.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64')
  client.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n',
  )
  record('websocket-open')
  client.on('data', (chunk) => consume(client, chunk))
  client.on('error', () => {})
  if (head.length > 0) consume(client, head)
})

httpServer.listen(0, '127.0.0.1', () => {
  const port = httpServer.address().port
  console.error(`DevTools listening on ws://127.0.0.1:${port}/devtools/browser/fake`)
})

setInterval(() => {}, 1_000)

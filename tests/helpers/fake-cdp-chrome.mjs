import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const mode = process.env.FAKE_CDP_MODE ?? 'success'
const websocketGuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

if (process.env.FAKE_CDP_BROWSER_PID_FILE) {
  writeFileSync(process.env.FAKE_CDP_BROWSER_PID_FILE, String(process.pid))
}

if (process.env.FAKE_CDP_CHILD_PID_FILE) {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  writeFileSync(process.env.FAKE_CDP_CHILD_PID_FILE, String(child.pid))
}

function frame(payload) {
  const body = Buffer.from(payload)
  if (body.length < 126) return Buffer.concat([Buffer.from([0x81, body.length]), body])
  if (body.length <= 0xffff) {
    const header = Buffer.alloc(4)
    header[0] = 0x81
    header[1] = 126
    header.writeUInt16BE(body.length, 2)
    return Buffer.concat([header, body])
  }
  const header = Buffer.alloc(10)
  header[0] = 0x81
  header[1] = 127
  header.writeBigUInt64BE(BigInt(body.length), 2)
  return Buffer.concat([header, body])
}

function decodeFrames(socket) {
  let buffered = Buffer.alloc(0)
  socket.on('data', (chunk) => {
    buffered = Buffer.concat([buffered, chunk])
    while (buffered.length >= 2) {
      const opcode = buffered[0] & 0x0f
      const masked = (buffered[1] & 0x80) !== 0
      let length = buffered[1] & 0x7f
      let offset = 2
      if (length === 126) {
        if (buffered.length < 4) return
        length = buffered.readUInt16BE(2)
        offset = 4
      } else if (length === 127) {
        if (buffered.length < 10) return
        length = Number(buffered.readBigUInt64BE(2))
        offset = 10
      }
      const maskOffset = offset
      if (masked) offset += 4
      if (buffered.length < offset + length) return
      const mask = masked ? buffered.subarray(maskOffset, maskOffset + 4) : undefined
      const payload = Buffer.from(buffered.subarray(offset, offset + length))
      if (mask) {
        for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4]
      }
      buffered = buffered.subarray(offset + length)
      if (opcode === 0x8) {
        socket.end(Buffer.from([0x88, 0]))
        return
      }
      if (opcode === 0x1) socket.emit('cdp-message', payload.toString('utf8'))
    }
  })
}

const server = createServer((request, response) => {
  const address = server.address()
  const port = address && typeof address === 'object' ? address.port : 0
  if (request.url === '/json/list') {
    response.setHeader('content-type', 'application/json')
    response.end(
      JSON.stringify([
        {
          type: 'page',
          webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/fake`,
        },
      ]),
    )
    return
  }
  response.writeHead(404)
  response.end()
})

server.on('upgrade', (request, socket) => {
  const key = request.headers['sec-websocket-key']
  if (typeof key !== 'string') {
    socket.destroy()
    return
  }
  const accept = createHash('sha1')
    .update(key + websocketGuid)
    .digest('base64')
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  )
  socket.setNoDelay(true)
  decodeFrames(socket)

  let disconnected = false
  let screenshotCount = 0
  let stateCount = 0
  const send = (payload) => {
    if (!socket.destroyed) socket.write(frame(JSON.stringify(payload)))
  }
  const disconnect = () => {
    if (disconnected) return
    disconnected = true
    socket.destroy()
  }

  socket.on('cdp-message', (text) => {
    if (mode === 'disconnect') {
      disconnect()
      return
    }
    if (mode === 'hang') return
    const message = JSON.parse(text)
    if (message.method === 'Page.navigate') {
      send({ method: 'Page.loadEventFired', params: {} })
      send({ id: message.id, result: { frameId: 'fake' } })
      return
    }
    if (message.method === 'Runtime.evaluate') {
      const expression = String(message.params?.expression ?? '')
      if (expression.includes(`document.querySelector('#save').click()`)) {
        send({ id: message.id, result: { result: { type: 'undefined' } } })
        return
      }
      if (expression.includes('status:')) {
        const states = [
          { status: 'Unsaved changes', button: 'Save changes', disabled: false },
          { status: 'Saving changes', button: 'Saving…', disabled: true },
          { status: 'Changes saved', button: 'Save changes', disabled: false },
        ]
        const value = states[Math.min(stateCount, states.length - 1)]
        stateCount += 1
        send({ id: message.id, result: { result: { type: 'object', value } } })
        return
      }
      send({ id: message.id, result: { result: { type: 'boolean', value: true } } })
      return
    }
    if (message.method === 'Page.captureScreenshot') {
      screenshotCount += 1
      if (mode === 'fail-mid-run' && screenshotCount === 3) {
        disconnect()
        return
      }
      send({ id: message.id, result: { data: png.toString('base64') } })
      return
    }
    send({ id: message.id, result: {} })
  })
})

server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (!address || typeof address !== 'object') throw new Error('fake Chrome did not bind a port')
  process.stderr.write(`DevTools listening on ws://127.0.0.1:${address.port}/devtools/browser/fake\n`)
})

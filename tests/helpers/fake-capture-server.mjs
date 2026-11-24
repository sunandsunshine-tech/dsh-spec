import { appendFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const mode = process.env.FAKE_SERVER_MODE ?? 'ready'
const pidFile = process.env.FAKE_SERVER_PID_FILE
const eventsPath = process.env.FAKE_SERVER_EVENTS

function record(event) {
  if (eventsPath) appendFileSync(eventsPath, JSON.stringify({ event }) + '\n')
}

if (pidFile) writeFileSync(pidFile, String(process.pid))
record('start')

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end('<!doctype html><title>fake capture server</title>')
})

server.listen(0, '127.0.0.1', () => {
  if (mode === 'ready') {
    const address = server.address()
    if (address && typeof address === 'object') {
      console.log(`http://127.0.0.1:${address.port}`)
      record('ready')
    }
  }
})

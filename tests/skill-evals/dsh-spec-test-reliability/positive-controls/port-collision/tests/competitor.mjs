import { createServer } from 'node:http'

const port = Number(process.argv[2])
const server = createServer()

function sendAndDisconnect(message) {
  if (process.send === undefined) {
    process.exitCode = 1
    return
  }
  process.send(message, () => process.disconnect())
}

server.once('error', (error) => {
  sendAndDisconnect({ type: 'failed', code: error.code ?? error.message })
})

server.once('listening', () => {
  sendAndDisconnect({ type: 'claimed', port })
})

server.listen(port, '127.0.0.1')

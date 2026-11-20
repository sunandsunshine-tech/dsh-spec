import { createServer } from 'node:http'

export async function findFreePort() {
  const probe = createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  return port
}

export async function listen(port) {
  const server = createServer((request, response) => {
    response.writeHead(request.url === '/ready' ? 200 : 404)
    response.end()
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  })
  return {
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

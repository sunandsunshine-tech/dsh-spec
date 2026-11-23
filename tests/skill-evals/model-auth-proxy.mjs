import http from 'node:http'
import https from 'node:https'

const upstream = new URL(process.argv[2] ?? '')
const token = process.env.MODEL_AUTH_TOKEN
if (!upstream.protocol || !token) throw new Error('model auth proxy requires an upstream URL and MODEL_AUTH_TOKEN')

const client = upstream.protocol === 'https:' ? https : http
const allowedPath = /^\/(?:v1\/)?(?:responses|chat\/completions)$/
const server = http.createServer((request, response) => {
  const incoming = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (
    request.method !== 'POST' ||
    !allowedPath.test(incoming.pathname) ||
    request.headers.authorization !== 'Bearer local-model-proxy' ||
    !String(request.headers['content-type']).startsWith('application/json')
  ) {
    response.writeHead(403).end()
    return
  }

  const headers = { ...request.headers }
  headers.authorization = `Bearer ${token}`
  delete headers.host
  const upstreamBase = upstream.pathname === '/' ? '' : upstream.pathname.replace(/\/$/, '')
  const upstreamPath =
    (upstreamBase && incoming.pathname.startsWith(upstreamBase + '/')
      ? incoming.pathname
      : upstreamBase + incoming.pathname) + incoming.search

  const forwarded = client.request(
    upstream,
    {
      method: request.method,
      path: upstreamPath,
      headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
      upstreamResponse.pipe(response)
    },
  )
  forwarded.on('error', () => {
    if (response.headersSent) response.destroy()
    else response.writeHead(502).end()
  })
  request.pipe(forwarded)
})

server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('model auth proxy did not bind a TCP port')
  process.stdout.write(JSON.stringify({ url: `http://127.0.0.1:${address.port}` }) + '\n')
})

server.on('error', (error) => {
  process.stderr.write(String(error) + '\n')
  process.exitCode = 1
})

let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.closeAllConnections()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 500).unref()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, shutdown)
}
process.once('disconnect', shutdown)

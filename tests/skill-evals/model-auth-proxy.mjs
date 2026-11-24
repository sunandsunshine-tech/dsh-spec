import http from 'node:http'
import https from 'node:https'
import { timingSafeEqual } from 'node:crypto'

let upstream
let token
let authToken
let server
const allowedPath = /^\/(?:v1\/)?(?:responses|chat\/completions)$/

function authorizationMatches(value) {
  if (typeof value !== 'string' || !authToken) return false
  const expected = Buffer.from(`Bearer ${authToken}`)
  const actual = Buffer.from(value)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function forwardedPath(incoming) {
  let requestPath = incoming.pathname
  const basePath = upstream.pathname.replace(/\/+$/, '')
  if (basePath.endsWith('/v1') && /^\/v1(?:\/|$)/.test(requestPath)) {
    requestPath = requestPath.slice(3) || '/'
  }
  const query = new URLSearchParams(upstream.search)
  for (const [key, value] of incoming.searchParams) query.append(key, value)
  const search = query.toString()
  return (basePath + requestPath).replace(/\/{2,}/g, '/') + (search ? `?${search}` : '')
}

function start() {
  const client = upstream.protocol === 'https:' ? https : http
  server = http.createServer((request, response) => {
    const incoming = new URL(request.url ?? '/', 'http://127.0.0.1')
    const mediaType = String(request.headers['content-type'] ?? '')
      .split(';', 1)[0]
      ?.trim()
      .toLowerCase()
    if (
      request.method !== 'POST' ||
      !allowedPath.test(incoming.pathname) ||
      !authorizationMatches(request.headers.authorization) ||
      mediaType !== 'application/json'
    ) {
      response.writeHead(403).end()
      return
    }

    const headers = { ...request.headers }
    for (const name of ['host', 'authorization', 'x-api-key', 'api-key', 'connection', 'content-length']) {
      delete headers[name]
    }
    headers.authorization = `Bearer ${token}`

    const forwarded = client.request(
      upstream,
      {
        method: request.method,
        path: forwardedPath(incoming),
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
}

process.once('message', (message) => {
  try {
    upstream = new URL(message?.upstream)
    token = message?.token
    authToken = message?.authToken
    if (
      !upstream.protocol ||
      (upstream.protocol !== 'http:' && upstream.protocol !== 'https:') ||
      !token ||
      !/^[0-9a-f]{64}$/.test(authToken)
    ) {
      throw new Error('model auth proxy requires an upstream URL and two credentials')
    }
    start()
  } catch {
    process.stderr.write('model auth proxy received invalid configuration\n')
    process.exit(1)
  }
})

let shuttingDown = false
function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server?.closeAllConnections()
  server?.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 500).unref()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, shutdown)
}
process.once('disconnect', shutdown)

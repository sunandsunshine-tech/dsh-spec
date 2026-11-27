import { createServer } from 'node:http'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { quoteShipping } from './src/external.mjs'
import { buildOrder, createOrderLines } from './src/order.mjs'

export function createOrderServer() {
  const lines = createOrderLines()
  return createServer(async (request, response) => {
    if (request.method !== 'GET' || request.url !== '/checkout') {
      response.writeHead(404).end('not found')
      return
    }

    const externalStart = performance.now()
    const quotes = await quoteShipping(lines)
    const externalMs = performance.now() - externalStart

    const localStart = performance.now()
    const order = buildOrder(lines, quotes)
    const localMs = performance.now() - localStart

    response.writeHead(200, {
      'content-type': 'application/json',
      'server-timing': `external;dur=${externalMs.toFixed(3)}, local;dur=${localMs.toFixed(3)}`,
    })
    response.end(JSON.stringify({ ...order, phases: { externalMs, localMs } }))
  })
}

export function startOrderServer() {
  const server = createOrderServer()
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('server did not expose a TCP address'))
        return
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` })
    })
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { url } = await startOrderServer()
  console.log(url)
}

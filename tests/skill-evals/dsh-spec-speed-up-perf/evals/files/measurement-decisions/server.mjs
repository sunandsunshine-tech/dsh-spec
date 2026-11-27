import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { buildReport, createInventory } from './src/report.mjs'

export function createReportServer(items = createInventory()) {
  return createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== '/report') {
      response.writeHead(404).end('not found')
      return
    }
    const report = buildReport(items)
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(report))
  })
}

export function startReportServer(port = 0) {
  const server = createReportServer()
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
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
  const { url } = await startReportServer(Number(process.env.PORT ?? 0))
  console.log(url)
}

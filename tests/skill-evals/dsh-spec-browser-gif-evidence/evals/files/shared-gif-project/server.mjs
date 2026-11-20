import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const root = join(import.meta.dirname, 'dist')
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}
const pendingSaves = new Set()
const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (request.method === 'POST' && pathname === '/save') {
    pendingSaves.add(response)
    return
  }
  if (request.method === 'POST' && pathname === '/complete') {
    for (const pending of pendingSaves) pending.end('saved')
    pendingSaves.clear()
    response.writeHead(204)
    response.end()
    return
  }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
  const file = normalize(join(root, relative))
  if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
    response.writeHead(404)
    response.end('not found')
    return
  }
  response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(response)
})

server.listen(Number(process.env.PORT ?? 0), '127.0.0.1', () => {
  const address = server.address()
  if (address && typeof address === 'object') console.log(`http://127.0.0.1:${address.port}`)
})

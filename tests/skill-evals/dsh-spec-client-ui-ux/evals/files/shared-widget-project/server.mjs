import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'

const root = import.meta.dirname
const port = Number(process.env.PORT ?? 0)
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
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

server.listen(port, '127.0.0.1', () => {
  const address = server.address()
  if (address && typeof address === 'object') console.log(`http://127.0.0.1:${address.port}`)
})

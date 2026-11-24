import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = new URL('./dist/', import.meta.url)
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
])

export function createStaticServer() {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://fixture').pathname
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
    try {
      const body = await readFile(join(root.pathname, relative))
      response.writeHead(200, {
        'content-type': contentTypes.get(extname(relative)) ?? 'application/octet-stream',
      })
      response.end(body)
    } catch {
      response.writeHead(404).end('not found')
    }
  })
}

export function startStaticServer() {
  const server = createStaticServer()
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
  const { url } = await startStaticServer()
  console.log(url)
}

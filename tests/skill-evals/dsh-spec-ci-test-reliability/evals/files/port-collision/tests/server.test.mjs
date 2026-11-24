import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { findFreePort, listen } from '../support/server.mjs'

let server
let competitor

before(async () => {
  const port = await findFreePort(async (candidate) => {
    competitor = await listen(candidate)
  })
  server = await listen(port)
})

after(async () => {
  await server?.close()
  await competitor?.close()
})

test('serves diagnostics', async () => {
  const response = await fetch(`http://127.0.0.1:${server.port}/health`)
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'ok')
})

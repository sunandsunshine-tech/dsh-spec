import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findFreePort, listen } from '../support/server.mjs'

test('isolated readiness fixture', async () => {
  const port = await findFreePort()
  const server = await listen(port)
  try {
    const response = await fetch(`http://127.0.0.1:${port}/ready`)
    assert.equal(response.status, 200)
  } finally {
    await server.close()
  }
})

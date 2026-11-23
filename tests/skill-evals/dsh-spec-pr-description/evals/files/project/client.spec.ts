import assert from 'node:assert/strict'
import { test } from 'node:test'

import { request } from './client.ts'

void test('GET respects the configured attempt cap', async () => {
  let attempts = 0
  const original = globalThis.fetch
  globalThis.fetch = async () => {
    attempts += 1
    return new Response(null, { status: 503 })
  }
  try {
    await request('https://example.test', { method: 'GET' }, { maxAttempts: 3 })
    assert.equal(attempts, 3)
  } finally {
    globalThis.fetch = original
  }
})

void test('POST does not retry', async () => {
  let attempts = 0
  const original = globalThis.fetch
  globalThis.fetch = async () => {
    attempts += 1
    return new Response(null, { status: 503 })
  }
  try {
    await request('https://example.test', { method: 'POST' }, { maxAttempts: 3 })
    assert.equal(attempts, 1)
  } finally {
    globalThis.fetch = original
  }
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getRows, subscribe, updateLabel } from '../src/store.mjs'

test('subscriptions receive an immediate event and preserve collection order', () => {
  const events = []
  const unsubscribe = subscribe((value) => events.push(value))
  assert.equal(events.length, 1)
  assert.deepEqual(
    events[0].rows.map((row) => row.id),
    ['north', 'south', 'west'],
  )
  updateLabel('west', 'West updated')
  assert.deepEqual(
    events.at(-1).rows.map((row) => row.id),
    ['north', 'south', 'west'],
  )
  assert.deepEqual(
    getRows().map((row) => row.label),
    ['North', 'South', 'West updated'],
  )
  unsubscribe()
  updateLabel('north', 'North updated')
  assert.equal(events.length, 2)
})

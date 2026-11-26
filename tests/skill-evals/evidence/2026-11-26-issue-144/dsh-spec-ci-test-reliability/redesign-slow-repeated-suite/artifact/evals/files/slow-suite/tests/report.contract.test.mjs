import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reportRows } from '../src/report.mjs'

test('reportRows exposes every expected row', () => {
  const rows = reportRows()

  assert.equal(rows.length, 3)
  for (const expected of [1, 2, 3]) {
    assert.ok(rows.includes(expected))
  }
})

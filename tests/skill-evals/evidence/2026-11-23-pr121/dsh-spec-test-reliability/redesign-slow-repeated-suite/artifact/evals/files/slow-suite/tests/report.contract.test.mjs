import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reportRows } from '../src/report.mjs'

for (const [name, expected] of [
  ['renders the first row', 1],
  ['renders the second row', 2],
  ['renders the third row', 3],
]) {
  test(name, () => {
    const rows = reportRows()

    assert.equal(rows.length, 3)
    assert.ok(rows.includes(expected))
  })
}

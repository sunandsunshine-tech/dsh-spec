import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { reportRows } from '../src/report.mjs'

async function buildReport() {
  await delay(80)
  return { rows: reportRows() }
}

test('builds a representative report', async () => {
  const report = await buildReport()

  assert.equal(report.rows.length, 3)
  for (const expected of [1, 2, 3]) {
    assert.ok(report.rows.includes(expected))
  }
})

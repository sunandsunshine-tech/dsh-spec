import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { reportRows } from '../src/report.mjs'

async function expensiveFixture() {
  await delay(80)
  return { rows: reportRows() }
}

test('renders report rows through the delayed fixture', async () => {
  const fixture = await expensiveFixture()

  assert.deepEqual(fixture.rows, [1, 2, 3])
})

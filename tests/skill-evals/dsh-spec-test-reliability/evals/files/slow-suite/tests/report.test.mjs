import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

async function expensiveFixture() {
  await delay(80)
  return { rows: [1, 2, 3] }
}

for (const [name, expected] of [
  ['renders the first row', 1],
  ['renders the second row', 2],
  ['renders the third row', 3],
]) {
  test(name, async () => {
    const fixture = await expensiveFixture()
    assert.equal(fixture.rows.length, 3)
    assert.ok(fixture.rows.includes(expected))
  })
}

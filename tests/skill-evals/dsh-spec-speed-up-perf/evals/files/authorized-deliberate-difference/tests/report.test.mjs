import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderRows, sourceRows, totalDurationMs } from '../src/report.mjs'

test('duration labels and row order match the reviewed export', () => {
  const source = sourceRows()
  const total = totalDurationMs()
  const rendered = renderRows()
  assert.equal(rendered.length, source.length)
  assert.equal(rendered[0].label, 'Activity 0: 0.900 s')
  assert.equal(rendered[1].label, 'Activity 1: 0.937 s')
  assert.equal(rendered.at(-1).label, 'Activity 19: 2.363 s')
  assert.deepEqual(
    rendered.map((row) => row.id),
    source.map((row) => row.id),
  )
  assert.equal(
    total,
    source.reduce((sum, row) => sum + row.durationMs, 0),
  )
  assert.equal(total, 13_451_750)
  assert.equal(totalDurationMs(), total)
})

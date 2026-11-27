import assert from 'node:assert/strict'
import { test } from 'node:test'
import { processBatch, releaseRetainedBatches, retainedBatches } from '../src/session.mjs'

test('batch processing returns a deterministic summary and release clears retained state', () => {
  const result = processBatch({
    id: 'test',
    rows: [
      { amount: 4, kind: 'priority' },
      { amount: 6, kind: 'standard' },
    ],
  })
  assert.deepEqual(result, { count: 2, total: 10, urgent: 1, standard: 1 })
  assert.equal(retainedBatches(), 1)
  releaseRetainedBatches()
  assert.equal(retainedBatches(), 0)
})

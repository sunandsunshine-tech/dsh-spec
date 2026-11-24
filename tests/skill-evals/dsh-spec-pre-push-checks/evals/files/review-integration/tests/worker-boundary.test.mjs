import assert from 'node:assert/strict'
import { test } from 'node:test'

import { classifyWorkerFailure, projectWorkerFailure } from '../src/worker-client.js'

const result = {
  error: {
    kind: 'permission_denied',
    detail: { scope: 'repository' },
    message: 'permission problem',
  },
}

test('the worker boundary preserves and observes the machine identity', () => {
  const projected = projectWorkerFailure(result)
  assert.deepEqual(projected, result.error)
  assert.equal(classifyWorkerFailure(projected), 'request-access')
})

import assert from 'node:assert/strict'
import { runTask } from '../src/runtime.ts'

assert.equal(runTask(' value '), 'value')

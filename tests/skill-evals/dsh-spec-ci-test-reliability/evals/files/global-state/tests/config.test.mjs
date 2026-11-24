import assert from 'node:assert/strict'
import { chdir, cwd } from 'node:process'
import { test } from 'node:test'
import { loadConfig } from '../src/config.mjs'
import { now, useFakeTimers, useRealTimers } from '../support/clock.mjs'

const original = {
  featurePresent: Object.hasOwn(process.env, 'FEATURE_FLAG'),
  feature: process.env.FEATURE_FLAG,
  cwd: cwd(),
  clock: now(),
}

test('loads the optional feature flag', async () => {
  process.env.FEATURE_FLAG = 'on'
  chdir('fixtures/project')
  useFakeTimers(1_700_000_000_000)

  const config = await loadConfig()
  assert.deepEqual(config, {
    feature: 'on',
    workspace: 'project',
    now: 1_700_000_000_000,
  })
})

test('restores the pre-test global state', () => {
  assert.equal(Object.hasOwn(process.env, 'FEATURE_FLAG'), original.featurePresent)
  assert.equal(process.env.FEATURE_FLAG, original.feature)
  assert.equal(cwd(), original.cwd)
  assert.equal(now(), original.clock)
  useRealTimers()
})

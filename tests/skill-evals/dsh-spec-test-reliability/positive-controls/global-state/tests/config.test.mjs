import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { chdir, cwd } from 'node:process'
import { afterEach, test } from 'node:test'
import { loadConfig } from '../src/config.mjs'
import { now, useFakeTimers, useRealTimers } from '../support/clock.mjs'

const projectFixture = fileURLToPath(new URL('../fixtures/project', import.meta.url))

function captureGlobals() {
  return {
    feature: Object.hasOwn(process.env, 'FEATURE_FLAG')
      ? { present: true, value: process.env.FEATURE_FLAG }
      : { present: false },
    cwd: cwd(),
    clock: now(),
  }
}

function restoreGlobals(snapshot) {
  try {
    if (snapshot.feature.present) {
      process.env.FEATURE_FLAG = snapshot.feature.value
    } else {
      delete process.env.FEATURE_FLAG
    }
  } finally {
    try {
      chdir(snapshot.cwd)
    } finally {
      if (snapshot.clock === 'real') {
        useRealTimers()
      } else {
        useFakeTimers(snapshot.clock)
      }
    }
  }
}

const suiteStart = captureGlobals()
let fallbackRestore

afterEach(() => {
  const restore = fallbackRestore
  fallbackRestore = undefined
  restore?.()
})

function prepareGlobalState(t) {
  const snapshot = captureGlobals()
  let restored = false
  const restore = () => {
    if (restored) {
      return
    }
    restoreGlobals(snapshot)
    restored = true
  }

  fallbackRestore = restore
  t.after(() => {
    restore()
    if (fallbackRestore === restore) {
      fallbackRestore = undefined
    }
  })
  return { snapshot, restore }
}

test('loads the optional feature flag and restores global state', async (t) => {
  const { snapshot, restore } = prepareGlobalState(t)
  try {
    process.env.FEATURE_FLAG = 'on'
    chdir(projectFixture)
    useFakeTimers(1_700_000_000_000)

    assert.deepEqual(await loadConfig(), {
      feature: 'on',
      workspace: 'project',
      now: 1_700_000_000_000,
    })
  } finally {
    restore()
  }

  assert.deepEqual(captureGlobals(), snapshot)
})

test('distinguishes an absent feature flag from an empty value', (t) => {
  const { snapshot, restore } = prepareGlobalState(t)
  try {
    delete process.env.FEATURE_FLAG
    assert.deepEqual(captureGlobals().feature, { present: false })

    process.env.FEATURE_FLAG = ''
    assert.deepEqual(captureGlobals().feature, { present: true, value: '' })
  } finally {
    restore()
  }

  assert.deepEqual(captureGlobals(), snapshot)
})

test('starts each case from the suite state', () => {
  assert.deepEqual(captureGlobals(), suiteStart)
})

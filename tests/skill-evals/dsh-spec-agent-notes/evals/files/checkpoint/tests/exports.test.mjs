import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { createExportStore } from '../src/exports.mjs'

test('an export resumes from its saved state after the store restarts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'export-store-'))
  const storePath = join(directory, 'store.json')
  const firstStore = createExportStore(undefined, storePath)
  firstStore.save('export-1', { completedRows: 10 })
  const moduleUrl = new URL('../src/exports.mjs', import.meta.url).href
  const restarted = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { createExportStore } from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(createExportStore(undefined, process.env.EXPORT_STORE_PATH).resume('export-1')))`,
    ],
    { env: { ...process.env, EXPORT_STORE_PATH: storePath }, encoding: 'utf8' },
  )
  assert.equal(restarted.status, 0, restarted.stderr)
  assert.deepEqual(JSON.parse(restarted.stdout), { completedRows: 10 })
  rmSync(directory, { recursive: true, force: true })
})

test('expired exports are purged after the default retention window', () => {
  const directory = mkdtempSync(join(tmpdir(), 'export-store-'))
  const storePath = join(directory, 'store.json')
  let clock = 0
  const store = createExportStore(() => clock, storePath)
  store.save('old', { completedRows: 1 })
  clock = 8 * 24 * 60 * 60 * 1000
  store.purgeExpired()
  assert.equal(store.resume('old'), undefined)
  rmSync(directory, { recursive: true, force: true })
})

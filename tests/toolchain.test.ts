/**
 * The pinned toolchain: one pnpm version in every place that records it.
 *
 * package.json is the contract, the checks workflow runs the same version, and pnpm 12 writes that
 * version into the lockfile's self-management document. A bump that updates one place but not the
 * others silently splits local and CI behaviour, so the suite fails here first.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

test('the pinned pnpm version agrees across package.json, the workflow and the lockfile', () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    packageManager?: string
  }
  const pinnedMatch = /^pnpm@(.+)$/.exec(manifest.packageManager ?? '')
  assert.ok(pinnedMatch, 'package.json must pin pnpm with packageManager')
  const pinned = pinnedMatch[1]

  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/checks.yml'), 'utf8')
  const action = /pnpm\/setup[\s\S]*?version:\s*['"]?([0-9][^'"\s]*)['"]?/.exec(workflow)
  assert.ok(action, 'the checks workflow must pin the pnpm action version')
  assert.equal(action[1], pinned, 'the workflow pnpm action version must match packageManager')

  const lock = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8')
  const managed = /packageManagerDependencies:\n\s+pnpm:\n\s+specifier: ([^\n]+)\n\s+version: ([^\n]+)/.exec(lock)
  assert.ok(managed, 'the lockfile must carry the pnpm self-management document')
  assert.equal(managed[1], pinned, 'the lockfile specifier must match packageManager')
  assert.equal(managed[2], pinned, 'the lockfile version must match packageManager')
})

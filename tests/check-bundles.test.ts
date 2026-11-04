/**
 * The committed-bundle gate's three failure states, pinned without rebuilding real skills.
 *
 * check-bundles builds into a temporary root and compares it with skills/<skill>/scripts/. The
 * command runs the build; compareBundles owns the comparison, so a synthetic pair of trees can
 * exercise missing, changed and extra bundles.
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { test } from 'node:test'
import { compareBundles } from '../scripts/check-bundles.ts'

function tree(root: string, files: string[]): void {
  for (const file of files) {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, file + '\n')
  }
}

test('equal trees report no mismatch', () => {
  const repo = mkdtempSync(join(tmpdir(), 'check-bundles-repo-'))
  const built = mkdtempSync(join(tmpdir(), 'check-bundles-built-'))
  try {
    tree(repo, ['skills/alpha/scripts/a.mjs'])
    tree(built, ['alpha/scripts/a.mjs'])
    writeFileSync(join(repo, 'skills/alpha/scripts/a.mjs'), 'same\n')
    writeFileSync(join(built, 'alpha/scripts/a.mjs'), 'same\n')
    assert.deepEqual(compareBundles(repo, built), { lines: [], count: 1 })
  } finally {
    rmSync(repo, { recursive: true, force: true })
    rmSync(built, { recursive: true, force: true })
  }
})

test('an empty build root reports nothing to check', () => {
  const repo = mkdtempSync(join(tmpdir(), 'check-bundles-repo-'))
  const built = mkdtempSync(join(tmpdir(), 'check-bundles-built-'))
  try {
    assert.deepEqual(compareBundles(repo, built), {
      lines: ['check-bundles.ts: the build produced no bundle; nothing to check'],
      count: 0,
    })
  } finally {
    rmSync(repo, { recursive: true, force: true })
    rmSync(built, { recursive: true, force: true })
  }
})

test('changed, missing and extra bundles are each reported', () => {
  const repo = mkdtempSync(join(tmpdir(), 'check-bundles-repo-'))
  const built = mkdtempSync(join(tmpdir(), 'check-bundles-built-'))
  try {
    tree(repo, ['skills/alpha/scripts/a.mjs', 'skills/alpha/scripts/extra.mjs'])
    writeFileSync(join(repo, 'skills/alpha/scripts/a.mjs'), 'landed\n')
    tree(built, ['alpha/scripts/a.mjs', 'alpha/scripts/missing.mjs'])
    writeFileSync(join(built, 'alpha/scripts/a.mjs'), 'built\n')
    const result = compareBundles(repo, built)
    assert.equal(result.count, 2)
    assert.equal(result.lines.length, 3)
    const output = result.lines.join('\n')
    assert.match(output, /changed skills\/alpha\/scripts\/a\.mjs/)
    assert.match(output, /missing skills\/alpha\/scripts\/missing\.mjs/)
    assert.match(output, /extra skills\/alpha\/scripts\/extra\.mjs/)
  } finally {
    rmSync(repo, { recursive: true, force: true })
    rmSync(built, { recursive: true, force: true })
  }
})

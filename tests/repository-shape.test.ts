/**
 * Repository invariants the workspace tooling relies on.
 *
 * These cases read the working tree rather than a fixture: the package scripts stay single commands,
 * so no shell pipeline can hide a failure again, and every landed skill has an installed copy with
 * the same bytes, so `pnpm run skill:refresh` is verified against the tree it just produced.
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

/** Every file under a directory, keyed by its relative path and content hash. */
function hashTree(root: string): Map<string, string> {
  const files = new Map<string, string>()
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path, name)
      else if (entry.isFile()) files.set(name, createHash('sha256').update(readFileSync(path)).digest('hex'))
    }
  }
  walk(root, '')
  return files
}

function repoFile(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf8')
}

test('every package script is one command', () => {
  const scripts = JSON.parse(repoFile('package.json')).scripts as Record<string, string>
  assert.ok(Object.keys(scripts).length > 0)
  for (const [name, command] of Object.entries(scripts)) {
    assert.doesNotMatch(command, /&&|\|\||;|\$\(|`|\brsync\b|\brm -rf\b/, name)
  }
})

test('every landed skill has an identical installed copy', () => {
  const skills = readdirSync(join(REPO_ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
  assert.ok(skills.length > 0)
  for (const name of skills) {
    const landed = join(REPO_ROOT, 'skills', name)
    const installed = join(REPO_ROOT, '.agents', 'skills', name)
    assert.equal(existsSync(installed), true, `${name} is not installed`)
    const left = hashTree(landed)
    const right = hashTree(installed)
    assert.deepEqual([...right.keys()], [...left.keys()], `${name} file list`)
    for (const [path, hash] of left) {
      assert.equal(right.get(path), hash, `${name}/${path}`)
    }
  }
})

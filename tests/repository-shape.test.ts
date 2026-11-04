/**
 * Repository invariants the workspace tooling relies on.
 *
 * These cases read the working tree rather than a fixture: the package scripts stay single commands,
 * so no shell pipeline can hide a failure, and every landed skill has an installed copy with the
 * same bytes, so `pnpm run skill:refresh` is verified against the tree it just produced.
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

/** Test/verification headings that own current evidence; Chinese headings have no \b after CJK. */
const ACTIVE_TEST_HEADING = /^## (?:(?:Testing|Verification)\b|测试|验证)/m

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

test('the split note modules carry their SPDX and provenance headers', () => {
  const root = 'package/dsh-spec-agent-notes'
  const files = [
    ...readdirSync(join(REPO_ROOT, root))
      .filter((name) => name.endsWith('.ts') && name !== 'build.ts' && name !== 'vite.config.ts')
      .map((name) => root + '/' + name),
    ...readdirSync(join(REPO_ROOT, root, 'cli'))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => root + '/cli/' + name),
  ]
  assert.ok(files.length >= 9, 'expected the split notes modules')
  for (const file of files) {
    const text = repoFile(file)
    assert.match(text.slice(0, 500), /SPDX-License-Identifier: MIT/, file)
    assert.match(text.slice(0, 500), /Adapted from the DeepSeek Harness note-gate scripts/, file)
  }
})

test('active record test sections do not name removed commands', () => {
  const root = '.agents/dsh-spec-agent-notes'
  const files = readdirSync(join(REPO_ROOT, root), { recursive: true }).filter(
    (name): name is string => typeof name === 'string' && name.endsWith('.md') && name.split(/[\\/]/)[0] !== 'archived',
  )
  assert.ok(files.length > 0)
  for (const file of files) {
    const text = repoFile(root + '/' + file)
    for (const section of text.split(/\n(?=## )/)) {
      if (!ACTIVE_TEST_HEADING.test(section)) continue
      assert.doesNotMatch(section, /dsh-spec\.ts|dsh-spec-manager|verify-skill-structure/, file)
    }
  }
})

test('the active-record guard recognizes English and Chinese headings', () => {
  for (const heading of ['## Testing', '## Verification', '## 验证', '## 验证锚点']) {
    assert.match(heading + '\n- `dsh-spec.ts`', ACTIVE_TEST_HEADING)
  }
  assert.doesNotMatch('### 验证\n- `dsh-spec.ts`', ACTIVE_TEST_HEADING)
})

test('every package script is one command', () => {
  const scripts = JSON.parse(repoFile('package.json')).scripts as Record<string, string>
  assert.ok(Object.keys(scripts).length > 0)
  for (const [name, command] of Object.entries(scripts)) {
    assert.doesNotMatch(command, /&&|\|\||;|\$\(|`|\||\brsync\b|\brm -rf\b/, name)
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

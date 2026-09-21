/**
 * The management verbs: adoption, refresh, drift and removal.
 *
 * Nothing here reaches the network. `install` and `upgrade` are exercised through `--dry-run`, and
 * `status` and `uninstall` are local: the cases that would install at a revision belong to a
 * release, not to a suite that must run offline.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { NOTES, makeFixture, snapshot, writeNote } from './helpers/fixtures.ts'

test('install --dry-run reports a plan and changes nothing', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  const before = [...snapshot(fixture.root).entries()]

  const result = runCli(fixture.root, ['install', '--dry-run'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /dry run/)
  assert.deepEqual([...snapshot(fixture.root).entries()], before)
})

test('upgrade --dry-run reports without changing anything', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  const before = [...snapshot(fixture.root).entries()]

  const result = runCli(fixture.root, ['upgrade', '--dry-run'])

  assert.equal(result.status, 0, result.output)
  assert.deepEqual([...snapshot(fixture.root).entries()], before)
})

test('status reports drift on a project that is not installed', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['status'])

  assert.equal(result.status, 1, result.output)
})

test('uninstall --dry-run names the artifacts it leaves behind', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n', 'docs/terminology.md': '| English | 中文 |\n|---|---|\n' })
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')

  const result = runCli(fixture.root, ['uninstall', '--dry-run'])

  assert.equal(result.status, 0, result.output)
  for (const left of ['AGENTS.md', 'docs/', NOTES]) {
    assert.match(result.output, new RegExp(left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `uninstall did not name ${left}:\n${result.output}`)
  }
})

test('a check subject that is not a command flag still refuses an unknown operation', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', '--frobnicate'])

  assert.equal(result.status, 2, result.output)
})

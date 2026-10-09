/**
 * The gate input contract: exactly one scope, and a path outside a check's scope is an error.
 *
 * A silent skip is the failure mode this contract exists to prevent — a dispatcher that assembles
 * the wrong path list must be caught by the check rather than reported as a clean run.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { makeFixture, writeNote } from './helpers/fixtures.ts'

test('--all checks the whole active tree', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')

  const result = runCli(fixture.root, ['notes', 'check', '--all'])

  assert.equal(result.status, 0, result.output)
})

test('an explicit path list checks exactly those files', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const note = writeNote(fixture, '2026-01-01-a-first-decision.md')

  const result = runCli(fixture.root, ['notes', 'check', note])

  assert.equal(result.status, 0, result.output)
})

test('--files-from reads the list from stdin', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const note = writeNote(fixture, '2026-01-01-a-first-decision.md')

  const result = runCli(fixture.root, ['notes', 'check', '--files-from', '-'], { stdin: `${note}\n` })

  assert.equal(result.status, 0, result.output)
})

test('--files-from reads the list from a file on disk', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const note = writeNote(fixture, '2026-01-01-a-first-decision.md')
  fixture.write('paths.txt', `${note}\n`)

  const result = runCli(fixture.root, ['notes', 'check', '--files-from', 'paths.txt'])

  assert.equal(result.status, 0, result.output)
})

test('an empty list in a --files-from file is a usage error, never a clean run', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  fixture.write('paths.txt', '\n')

  const result = runCli(fixture.root, ['notes', 'check', '--files-from', 'paths.txt'])

  assert.equal(result.status, 2, result.output)
})

test('an empty --files-from list is a usage error, never a clean run', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')

  const result = runCli(fixture.root, ['notes', 'check', '--files-from', '-'], { stdin: '\n' })

  assert.equal(result.status, 2, result.output)
})

test('a path outside the check scope is a violation, not a skip', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', 'check', 'README.md'])

  assert.equal(result.status, 1, result.output)
})

test('a deleted path is accepted, not refused', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const note = writeNote(fixture, '2026-01-01-a-first-decision.md')
  fixture.commit('add the note')
  fixture.remove(note)

  const result = runCli(fixture.root, ['notes', 'check', note])

  assert.equal(result.status, 0, result.output)
})

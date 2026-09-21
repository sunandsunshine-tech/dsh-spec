/**
 * `notes --check`: classification and format over the active lifecycles only.
 *
 * The split from `notes-archived` is a mechanism decision, not a convenience one: an archived note
 * keeps the format it was sealed with, so the live rules must not read it. The last two cases pin
 * that boundary from both sides.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { NOTES, makeFixture, noteText, writeArchivedTriplet, writeArchiveKindDirs, writeNote } from './helpers/fixtures.ts'

test('a conforming active tree passes', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  writeNote(fixture, '2026-01-02-a-second-decision.md', { lifecycle: 'rejected', cls: 'bug-fix' })

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 0, result.output)
})

test('an unknown class folder fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md', { cls: 'nonsense' })

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /unknown class/)
})

test('a filename without a date fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, 'a-first-decision.md')

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /yyyy-mm-dd/)
})

test('a centralized INDEX.md fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  fixture.write(`${NOTES}/INDEX.md`, '# Index\n')

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
})

test('a note missing a required section fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const body = '# Agent Note: A first decision\n\nStatus: implemented\n\n## Problem\n\nSomething.\n\n## Consequences\n\nIt holds.\n'
  writeNote(fixture, '2026-01-01-a-first-decision.md', { body })

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
})

test('a status that contradicts its lifecycle folder fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md', {
    body: noteText('A first decision', 'proposed'),
  })

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
})

test('an absent notes tree fails rather than reporting nothing to check', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
})

test('notes does not read the archive', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  writeArchiveKindDirs(fixture)
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision')

  const result = runCli(fixture.root, ['notes', '--check', '--all'])

  assert.equal(result.status, 0, result.output)
})

test('the archive is checked by its own subject', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  writeArchiveKindDirs(fixture)
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision')

  const result = runCli(fixture.root, ['notes-archived', '--check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /manifest\.json/)
})

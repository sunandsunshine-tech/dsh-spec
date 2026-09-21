/**
 * `notes-archived check`: the frozen archive, its closed kind tree, and its append-only seal.
 *
 * The empty-archive case is first on purpose: a fresh clone carries no empty directories, so a rule
 * that demanded all six unconditionally made the aggregate fail on every checkout. The sealing case
 * is what makes the rest evidence rather than a snapshot.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { NOTES, makeFixture, writeArchivedTriplet, writeArchiveKindDirs } from './helpers/fixtures.ts'

test('an empty archive passes, with or without the kind directories', (t) => {
  const fixture = makeFixture({ [`${NOTES}/archived/AGENTS.md`]: '# Archived Agent Notes\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes-archived', 'check', '--all'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /empty/)
})

test('an artifact without its kind directories fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision')

  const result = runCli(fixture.root, ['notes-archived', 'check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /required kind directory/)
})

test('an unsealed triplet fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeArchiveKindDirs(fixture)
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision')
  fixture.commit('archive an old decision')

  const result = runCli(fixture.root, ['notes-archived', 'check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /manifest\.json/)
})

test('write seals, and the sealed archive passes', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeArchiveKindDirs(fixture)
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision')
  fixture.commit('archive an old decision')

  const written = runCli(fixture.root, ['notes-archived', 'write', '--all'])
  assert.equal(written.status, 0, written.output)
  fixture.commit('seal the archive')

  const checked = runCli(fixture.root, ['notes-archived', 'check', '--all'])
  assert.equal(checked.status, 0, checked.output)
})

test('an unknown kind directory fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeArchiveKindDirs(fixture)
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision', 'nonsense')

  const result = runCli(fixture.root, ['notes-archived', 'check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /unknown Agent Note kind/)
})

test('an incomplete triplet fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeArchiveKindDirs(fixture)
  fixture.write(`${NOTES}/archived/process/2026-01-01-an-old-decision.md`, '# Agent Note: An old decision\n')

  const result = runCli(fixture.root, ['notes-archived', 'check', '--all'])

  assert.equal(result.status, 1, result.output)
})

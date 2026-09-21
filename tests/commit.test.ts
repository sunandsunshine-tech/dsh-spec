/**
 * `commit --check`: read the change, hand each check the scope it owns, dispatch.
 *
 * The selection is derived from the mechanisms rather than from convenience. A path is paired when
 * a naming-family member or a switcher declares it, and it is Markdown when the prose scope admits
 * it — so a note change and a paired document each select two checks, while an archived file is
 * outside the prose scope and selects only the archive. The rename case is the documented limit: a
 * target renamed under an untouched referrer selects the check, and the break is still not seen.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli, selected } from './helpers/cli.ts'
import { NOTES, makeFixture, writeArchiveKindDirs, writeArchivedTriplet, writeNote, writePair } from './helpers/fixtures.ts'

test('a clean tree selects nothing and says why', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  fixture.commit('init')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 0, result.output)
  assert.deepEqual(selected(result.output), [])
  assert.match(result.output, /skipped/)
})

test('a changed engine file selects nothing', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  fixture.commit('init')
  fixture.write('.agents/skills/dsh-spec-manager/scripts/probe.ts', 'export const probe = 1\n')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 0, result.output)
  assert.deepEqual(selected(result.output), [])
})

test('a changed active note selects notes and md-links', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  fixture.commit('init')
  fixture.write(`${NOTES}/implemented/process/2026-01-01-a-first-decision.md`, '# Agent Note: A first decision\n')
  fixture.commit('break the note')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 1, result.output)
  assert.deepEqual(selected(result.output).sort(), ['md-links', 'notes'])
})

test('a changed archived file selects notes-archived alone', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeArchiveKindDirs(fixture)
  writeArchivedTriplet(fixture, '2026-01-01-an-old-decision')
  fixture.commit('init')
  fixture.write(`${NOTES}/archived/process/2026-01-01-an-old-decision.zh.md`, '# Agent Note: An old decision\n')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 1, result.output)
  assert.deepEqual(selected(result.output), ['notes-archived'])
})

test('a changed paired document selects translation-pair and md-links', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('init')
  fixture.write('docs/guide.md', '# Guide\n\nEnglish | [中文](guide.zh.md)\n\nA new sentence.\n')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 1, result.output)
  assert.deepEqual(selected(result.output).sort(), ['md-links', 'translation-pair'])
})

test('a changed unpaired document selects md-links alone', (t) => {
  const fixture = makeFixture({ 'docs/plain.md': '# Plain\n\nNothing to pair.\n' })
  t.after(() => fixture.dispose())
  fixture.commit('init')
  fixture.write('docs/plain.md', '# Plain\n\nSee [gone](gone.md).\n')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 1, result.output)
  assert.deepEqual(selected(result.output), ['md-links'])
})

test('an untracked file is part of the change', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  fixture.commit('init')
  fixture.write('docs/fresh.md', '# Fresh\n\nSee [gone](gone.md).\n')

  const result = runCli(fixture.root, ['commit', '--check'])

  assert.equal(result.status, 1, result.output)
  assert.deepEqual(selected(result.output), ['md-links'])
})

test('--base reaches a change that is already committed', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  fixture.commit('init')
  fixture.write('docs/committed.md', '# Committed\n\nSee [gone](gone.md).\n')
  fixture.commit('add a broken document')

  const clean = runCli(fixture.root, ['commit', '--check'])
  assert.deepEqual(selected(clean.output), [], clean.output)

  const based = runCli(fixture.root, ['commit', '--check', '--base', 'HEAD~1'])
  assert.equal(based.status, 1, based.output)
  assert.deepEqual(selected(based.output), ['md-links'])
})

test('a renamed target selects the check, and the untouched referrer stays unchecked', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [B](b.md).\n',
    'docs/b.md': '# B\n',
  })
  t.after(() => fixture.dispose())
  fixture.commit('init')
  fixture.git('mv', 'docs/b.md', 'docs/c.md')

  const result = runCli(fixture.root, ['commit', '--check'])

  // The limit is asserted, not hidden: the deleted target and the added one are markdown, so the
  // check runs, and the break in `docs/a.md` — which did not change — is not reported.
  assert.equal(result.status, 0, result.output)
  assert.deepEqual(selected(result.output), ['md-links'])
  assert.doesNotMatch(result.output, /a\.md.*b\.md/)
})

/**
 * `md-links --check`: one subject over both link checks — the resolver and the shapes a bulk
 * rewrite leaves behind that a parser cannot see.
 *
 * This subject takes a path list and never `--all`, because it decides the asking side per file:
 * a target deleted by someone else, whose referrer did not change, is outside any file selection.
 * That limit is asserted in `commit.test.ts` rather than hidden here.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { makeFixture } from './helpers/fixtures.ts'

test('a resolving link passes', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [B](b.md) and [the section](b.md#a-section).\n',
    'docs/b.md': '# B\n\n## A section\n\nText.\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', 'docs/a.md'])

  assert.equal(result.status, 0, result.output)
})

test('a link to a missing target fails', (t) => {
  const fixture = makeFixture({ 'docs/a.md': '# A\n\nSee [B](b.md).\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a fragment that names no heading fails', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [B](b.md#not-a-heading).\n',
    'docs/b.md': '# B\n\n## A section\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a link a bulk rewrite turned into prose fails', (t) => {
  const fixture = makeFixture({ 'docs/a.md': '# A\n\nSee [the guide (reference).\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a nested link fails', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [[B](b.md)](b.md).\n',
    'docs/b.md': '# B\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a path outside the markdown scope is a violation', (t) => {
  const fixture = makeFixture({ 'docs/notes.txt': 'Not Markdown.\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', 'docs/notes.txt'])

  assert.equal(result.status, 1, result.output)
})

test('checking refuses --all', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', '--check', '--all'])

  assert.equal(result.status, 2, result.output)
})

/**
 * `md-links check`: one subject over both link checks — the resolver and the shapes a bulk
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

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 0, result.output)
})

test('a link to a missing target fails', (t) => {
  const fixture = makeFixture({ 'docs/a.md': '# A\n\nSee [B](b.md).\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a fragment that names no heading fails', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [B](b.md#not-a-heading).\n',
    'docs/b.md': '# B\n\n## A section\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('an explicit id on a raw HTML element is an anchor', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [中文](b.md#cn-v1) | [English](b.md#en-v1).\n',
    'docs/b.md': '# B\n\n<h3 id="cn-v1">新增功能</h3>\n\nText.\n\n<h3 id="en-v1">Improvements</h3>\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 0, result.output)
})

test('a fragment naming an id no element carries still fails', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [中文](b.md#cn-v2).\n',
    'docs/b.md': '# B\n\n<h3 id="cn-v1">新增功能</h3>\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('an unterminated comment is a comment, so the id inside it is no anchor', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [新增功能](b.md#ghost).\n',
    // A comment opened and never closed runs to the end of the block; the heading it hides is
    // prose, not a target, and a gate that read it would accept a fragment nothing defines.
    'docs/b.md': '# B\n\n<!-- <h3 id="ghost">新增功能</h3>\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a link a bulk rewrite turned into prose fails', (t) => {
  const fixture = makeFixture({ 'docs/a.md': '# A\n\nSee [the guide (reference).\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a nested link fails', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [[B](b.md)](b.md).\n',
    'docs/b.md': '# B\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
})

test('a preserved region is left unread, and both link gates name it', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\n<!-- preserved-region:start -->\n\nSee [the guide (reference).\n\n<!-- preserved-region:end -->\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /verify-md-link-syntax: 1 preserved region\(s\) left unread — docs\/a\.md:4-6/, result.output)
  assert.match(result.output, /verify-md-links: 1 preserved region\(s\) left unread — docs\/a\.md:4-6/, result.output)
})

test('the resolver leaves a preserved region unread', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\n<!-- preserved-region:start -->\n\nSee [gone](missing.md) and [worse](b.md#nope).\n\n<!-- preserved-region:end -->\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /verify-md-links: 1 preserved region\(s\) left unread/, result.output)
})

test('an anchor inside a preserved region is still a target', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [the anchor](b.md#kept).\n',
    'docs/b.md': '# B\n\n<!-- preserved-region:start -->\n\n<a id="kept"></a>\n\n<!-- preserved-region:end -->\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 0, result.output)
})

test('a half-applied marker leaves the whole file read', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\n<!-- preserved-region:start -->\n\nSee [the guide (reference).\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md'])

  assert.equal(result.status, 1, result.output)
  assert.doesNotMatch(result.output, /left unread/, result.output)
})

test('a path outside the markdown scope is a violation', (t) => {
  const fixture = makeFixture({ 'docs/notes.txt': 'Not Markdown.\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/notes.txt'])

  assert.equal(result.status, 1, result.output)
})

test('checking refuses --all', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', '--all'])

  assert.equal(result.status, 2, result.output)
})

test('a global flag is not read as a scope entry', (t) => {
  const fixture = makeFixture({
    'docs/a.md': '# A\n\nSee [B](b.md).\n',
    'docs/b.md': '# B\n',
  })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['md-links', 'check', 'docs/a.md', '--jobs', '1'])

  assert.equal(result.status, 0, result.output)
})

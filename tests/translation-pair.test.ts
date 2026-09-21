/**
 * `translation-pair --check`: a pair is declared by its content switcher **or** by a naming-family
 * member, and the union is what keeps the gate from being defeated by the violation it exists to
 * catch.
 *
 * The decisive case is the English side that lost its switcher while its counterpart still exists:
 * declared by content alone, that file is not a pair, and the missing switcher is never reported.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { makeFixture, writePair } from './helpers/fixtures.ts'

test('a recorded, consistent pair passes', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')

  const written = runCli(fixture.root, ['translation-pair', '--write', 'docs/guide.md'])
  assert.equal(written.status, 0, written.output)

  const checked = runCli(fixture.root, ['translation-pair', '--check', 'docs/guide.md'])
  assert.equal(checked.status, 0, checked.output)
})

test('editing one side without the other fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')
  runCli(fixture.root, ['translation-pair', '--write', 'docs/guide.md'])

  const anchor = 'docs/guide.md'
  fixture.write(anchor, `${fixture.read(anchor)}\nA sentence nobody translated.\n`)
  const result = runCli(fixture.root, ['translation-pair', '--check', anchor])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /out of sync/)
})

test('an English side that lost its switcher is still a pair, and fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')
  runCli(fixture.root, ['translation-pair', '--write', 'docs/guide.md'])

  // The English side loses its switcher, and the record is brought along so the hash check passes:
  // what is left is exactly the violation a content-only declaration would not even see, because
  // the file no longer declares itself a pair.
  fixture.write('docs/guide.md', '# Guide\n\nA sentence with no switcher.\n')
  runCli(fixture.root, ['translation-pair', '--write', 'docs/guide.md'])
  const result = runCli(fixture.root, ['translation-pair', '--check', 'docs/guide.md'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /switcher/)
})

test('a switcher pointing at a missing counterpart declares a pair, and fails', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write('docs/lonely.md', '# Lonely\n\nEnglish | [中文](lonely.zh.md)\n\nSome text.\n')

  const result = runCli(fixture.root, ['translation-pair', '--check', 'docs/lonely.md'])

  assert.equal(result.status, 1, result.output)
})

test('a half-deleted pair is caught from the half that survived', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')
  runCli(fixture.root, ['translation-pair', '--write', 'docs/guide.md'])
  fixture.remove('docs/guide.zh.md')

  const result = runCli(fixture.root, ['translation-pair', '--check', 'docs/guide.md'])

  assert.equal(result.status, 1, result.output)
})

test('--explain names the counterpart and its record', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')

  const result = runCli(fixture.root, ['translation-pair', '--explain', 'docs/guide.md'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /guide\.zh\.md/)
})

test('--list reports without failing', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')

  const result = runCli(fixture.root, ['translation-pair', '--list'])

  assert.equal(result.status, 0, result.output)
})

test('--brief prints the update briefing instead of checking', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write('docs/terminology.md', '# Vocabulary\n\n| English | 中文 | 首次出现 | 不要译作 | 备注 |\n|---|---|---|---|---|\n')
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')
  runCli(fixture.root, ['translation-pair', '--write', 'docs/guide.md'])
  fixture.write('docs/guide.md', '# Guide\n\nEnglish | [中文](guide.zh.md)\n\nA new sentence.\n')

  const result = runCli(fixture.root, ['translation-pair', '--brief', 'docs/guide.md'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /Translation update briefing/)
})

test('checking refuses --all', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['translation-pair', '--check', '--all'])

  assert.equal(result.status, 2, result.output)
})

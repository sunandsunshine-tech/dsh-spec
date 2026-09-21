/**
 * The command surface: one entry point, subjects with an operation, and no bare subject.
 *
 * These cases pin the vocabulary itself, because every reference in the shipped skills is supposed
 * to name a subject rather than a script path. They also pin the two usage failures the design
 * distinguishes from a violation: an unknown subject and a check without exactly one scope.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { makeFixture } from './helpers/fixtures.ts'

/** Every subject the design defines. */
const SUBJECTS = [
  'install',
  'upgrade',
  'uninstall',
  'status',
  'notes',
  'notes-archived',
  'translation-pair',
  'md-links',
  'commit',
  'all',
]

test('--help exits zero and names every subject', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['--help'])

  assert.equal(result.status, 0, result.output)
  for (const subject of SUBJECTS) {
    assert.match(result.output, new RegExp(`\\b${subject}\\b`), `--help does not name ${subject}:\n${result.output}`)
  }
})

test('an unknown subject is a usage error, not a violation', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['frobnicate'])

  assert.equal(result.status, 2, result.output)
})

test('a check subject without its operation is a usage error', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', '--all'])

  assert.equal(result.status, 2, result.output)
})

test('a check without a scope is a usage error', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', '--check'])

  assert.equal(result.status, 2, result.output)
})

test('a check given both --all and a path is a usage error', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', '--check', '--all', 'README.md'])

  assert.equal(result.status, 2, result.output)
})

test('the two file-selection checks refuse --all', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const subject of ['md-links', 'translation-pair']) {
    const result = runCli(fixture.root, [subject, '--check', '--all'])
    assert.equal(result.status, 2, `${subject} accepted --all:\n${result.output}`)
  }
})

/**
 * The command surface: two levels, an action as a subcommand, and no operation flag.
 *
 * These cases pin the vocabulary itself, because every reference in the shipped skills names a
 * command rather than a script path. They also pin the three usage failures the design distinguishes
 * from a violation — an unknown command, a noun without its verb, and a missing scope — because each
 * one has to say what to run next instead of choosing a scope for the caller.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { makeFixture } from './helpers/fixtures.ts'

/** Every command the design defines, at either level. */
const COMMANDS = [
  'install',
  'upgrade',
  'uninstall',
  'status',
  'check',
  'notes',
  'notes-archived',
  'translation-pair',
  'md-links',
]

test('--help exits zero and names every command', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['--help'])

  assert.equal(result.status, 0, result.output)
  for (const command of COMMANDS) {
    assert.match(result.output, new RegExp(`\\b${command}\\b`), `--help does not name ${command}:\n${result.output}`)
  }
})

test('an unknown command is a usage error, not a violation', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['frobnicate'])

  assert.equal(result.status, 2, result.output)
})

test('a noun without its verb names the verb and points at its help', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes'])

  assert.equal(result.status, 2, result.output)
  assert.match(result.output, /needs a verb/)
  assert.match(result.output, /\bcheck\b/)
  assert.match(result.output, /-h\b/, `the hint does not point at the help:\n${result.output}`)
})

test('check without a scope names the three selections and points at its help', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['check'])

  assert.equal(result.status, 2, result.output)
  assert.match(result.output, /--base/)
  assert.match(result.output, /--all/)
  assert.match(result.output, /-h\b/, `the hint does not point at the help:\n${result.output}`)
})

test('check takes one selection, not two', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const args of [['check', '--all', '--base', 'HEAD'], ['check', '--all', 'README.md'], ['check', '--head', 'HEAD']]) {
    const result = runCli(fixture.root, args)
    assert.equal(result.status, 2, `${args.join(' ')} was not refused:\n${result.output}`)
  }
})

test('an operation spelled as a flag is refused, not aliased', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const args of [
    ['notes', '--check', '--all'],
    ['notes-archived', '--write', '--all'],
    ['md-links', '--check', 'README.md'],
    ['translation-pair', '--list'],
    ['translation-pair', '--check', 'docs/guide.md'],
  ]) {
    const result = runCli(fixture.root, args)
    assert.equal(result.status, 2, `${args.join(' ')} was accepted:\n${result.output}`)
  }
})

test('the commands the aggregate and the diff dispatch replaced are gone', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const args of [['commit', '--check', '--base', 'HEAD'], ['all', '--check'], ['brief', '--help']]) {
    const result = runCli(fixture.root, args)
    assert.equal(result.status, 2, `${args.join(' ')} was accepted:\n${result.output}`)
  }
})

test('the two file-selection checks refuse --all', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  for (const subject of ['md-links', 'translation-pair']) {
    const result = runCli(fixture.root, [subject, 'check', '--all'])
    assert.equal(result.status, 2, `${subject} check accepted --all:\n${result.output}`)
  }
})

test('a noun names its verbs', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const notes = runCli(fixture.root, ['notes', '--help'])
  assert.equal(notes.status, 0, notes.output)
  assert.match(notes.output, /\bcheck\b/)

  const pair = runCli(fixture.root, ['translation-pair', '--help'])
  assert.equal(pair.status, 0, pair.output)
  for (const verb of ['check', 'list', 'explain', 'write', 'brief']) {
    assert.match(pair.output, new RegExp(`\\b${verb}\\b`), `translation-pair --help does not name ${verb}:\n${pair.output}`)
  }
})

/**
 * Applying norms: the selection a project holds, the file they land in, and the comparison that
 * decides what an update may overwrite.
 *
 * The cases that matter here are the three states a recorded base makes distinguishable — an
 * untouched norm takes the revision's text, a personalized one is kept and named, a conflict prints
 * both versions — and the promise that nothing outside a marked block is ever written.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runCli } from './helpers/cli.ts'
import { makeFixture } from './helpers/fixtures.ts'

/** The two files an applied selection lives in. */
const FILE = join('docs', 'norms.md')
const RECORD = join('docs', 'norms.yaml')

/** One norm's block, as the file holds it. */
function block(fixture: { read: (path: string) => string }, id: string): string {
  const match = new RegExp(`<!-- dsh-norm: ${id.replace('.', '\\.')} -->\\n([\\s\\S]*?)\\n<!-- /dsh-norm -->`).exec(fixture.read(FILE))
  assert.ok(match !== null, `${id} has no block in ${FILE}`)
  return match[1] as string
}

test('an install dry run prints the plan and writes neither file', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['norms', 'install', '--group', 'test', '--dry-run'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /add\s+test\.acceptance-first/, result.output)
  assert.match(result.output, /4 norm\(s\): 4 add/, result.output)
  assert.match(result.output, /dry run/, result.output)
  assert.equal(existsSync(join(fixture.root, FILE)), false, 'a dry run wrote the file')
  assert.equal(existsSync(join(fixture.root, RECORD)), false, 'a dry run wrote the record')
})

test('install writes the group as a section, and the record as the base of every block', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  assert.equal(result.status, 0, result.output)

  const file = fixture.read(FILE)
  assert.match(file, /<!-- dsh-norms: test -->/, file)
  assert.match(file, /## Tests/, file)
  for (const id of ['test.acceptance-first', 'test.behaviour', 'test.offline', 'test.fast-subset']) {
    assert.ok(block(fixture, id).startsWith('- **'), `${id} has no rule`)
  }
  const record = fixture.read(RECORD)
  assert.match(record, /groups: \[test\]/, record)
  assert.equal(record.split('\n').filter(line => /^[a-z-]+\.[a-z-]+: [0-9a-f]{64}/.test(line)).length, 4, record)

  // A second install of the same group has nothing to do: the comparison is against the record.
  const again = runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  assert.equal(again.status, 0, again.output)
  assert.match(again.output, /4 norm\(s\): 4 ok/, again.output)
  assert.equal(fixture.read(FILE), file, 'a no-op install rewrote the file')
})

test('update keeps a personalized block, and --keep stops asking about it', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  const mine = '- **Our suite runs offline, with the stub server in tests/stub/.**'
  fixture.write(FILE, fixture.read(FILE).replace('- **The suite runs offline and deterministically.**', mine))

  const update = runCli(fixture.root, ['norms', 'update'])
  assert.equal(update.status, 0, update.output)
  assert.match(update.output, /personalized — kept\s+test\.offline/, update.output)
  assert.match(block(fixture, 'test.offline'), /Our suite runs offline/, 'the update overwrote a personalized block')

  const kept = runCli(fixture.root, ['norms', 'update', '--keep', 'test.offline'])
  assert.equal(kept.status, 0, kept.output)
  assert.match(fixture.read(RECORD), /test\.offline: [0-9a-f]{64} kept/, fixture.read(RECORD))

  const after = runCli(fixture.root, ['norms', 'update'])
  assert.equal(after.status, 0, after.output)
  assert.match(after.output, /personalized — kept\s+test\.offline/, after.output)
  assert.match(block(fixture, 'test.offline'), /Our suite runs offline/, 'a confirmed block was overwritten')
})

test('--take takes the revision text, and lets the norm go back to ok', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  fixture.write(FILE, fixture.read(FILE).replace('- **The suite runs offline and deterministically.**', '- **Ours.**'))

  const taken = runCli(fixture.root, ['norms', 'update', '--take', 'test.offline'])
  assert.equal(taken.status, 0, taken.output)
  assert.match(taken.output, /update\s+test\.offline/, taken.output)
  assert.match(block(fixture, 'test.offline'), /The suite runs offline and deterministically/)
  assert.doesNotMatch(fixture.read(RECORD), /kept/, 'a taken norm is still marked as the project\'s')

  const after = runCli(fixture.root, ['norms', 'update'])
  assert.equal(after.status, 0, after.output)
  assert.match(after.output, /4 norm\(s\): 4 ok/, after.output)
})

test('nothing outside a marked block is ever written', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  const own = '\n## Our own rules\n\n- We run `make check` before every push.\n\n<!-- dsh-norm: mine.rule -->\n- ours.\n<!-- /dsh-norm -->\n'
  fixture.write(FILE, `${fixture.read(FILE)}${own}`)

  const update = runCli(fixture.root, ['norms', 'update'])
  assert.equal(update.status, 0, update.output)
  const file = fixture.read(FILE)
  assert.match(file, /## Our own rules/, file)
  assert.match(file, /We run `make check` before every push\./, file)
  assert.match(file, /<!-- dsh-norm: mine\.rule -->/, file)

  const removed = runCli(fixture.root, ['norms', 'remove', 'test.fast-subset'])
  assert.equal(removed.status, 0, removed.output)
  assert.match(fixture.read(FILE), /## Our own rules/, 'a removal took the project\'s own section with it')
})

test('remove refuses a personalized norm, and takes back an untouched one', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  fixture.write(FILE, fixture.read(FILE).replace('- **Assert the behaviour, not the implementation.**', '- **Ours.**'))

  const refused = runCli(fixture.root, ['norms', 'remove', 'test.behaviour'])
  assert.equal(refused.status, 1, refused.output)
  assert.match(refused.output, /personalized — kept\s+test\.behaviour/, refused.output)
  assert.match(fixture.read(FILE), /Ours\./, 'a refused removal deleted the block')

  const removed = runCli(fixture.root, ['norms', 'remove', 'test.offline'])
  assert.equal(removed.status, 0, removed.output)
  assert.doesNotMatch(fixture.read(FILE), /dsh-norm: test\.offline/, 'the block is still there')
  assert.doesNotMatch(fixture.read(RECORD), /test\.offline/, 'the record still lists it')
})

test('explain reads a norm, its record and whether this project applied it', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])

  const applied = runCli(fixture.root, ['norms', 'explain', 'test.behaviour'])
  assert.equal(applied.status, 0, applied.output)
  assert.match(applied.output, /applied: yes/, applied.output)
  // No manager is installed in this fixture, so there is no ref to link at and the path is printed.
  assert.match(applied.output, /record: \.agents\/dsh-spec\/notes\//, applied.output)
  assert.match(applied.output, /- Why:/, applied.output)

  const other = runCli(fixture.root, ['norms', 'explain', 'pr.lifecycle'])
  assert.equal(other.status, 0, other.output)
  assert.match(other.output, /applied: no/, other.output)

  const json = runCli(fixture.root, ['norms', 'explain', 'test.behaviour', '--json'])
  assert.equal(json.status, 0, json.output)
  const parsed = JSON.parse(json.stdout) as { id: string, applied: boolean, source: string }[]
  assert.equal(parsed[0]?.id, 'test.behaviour')
  assert.equal(parsed[0]?.applied, true)
  assert.ok(parsed[0]?.source.startsWith('.agents/'))
})

test('a selection or a record that cannot be read is refused, not half-applied', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const unknown = runCli(fixture.root, ['norms', 'install', 'nope.norm'])
  assert.equal(unknown.status, 2, unknown.output)
  assert.match(unknown.output, /no norm `nope\.norm`/, unknown.output)

  const noSelection = runCli(fixture.root, ['norms', 'install'])
  assert.equal(noSelection.status, 2, noSelection.output)
  assert.match(noSelection.output, /name the norms this applies to/, noSelection.output)

  const unapplied = runCli(fixture.root, ['norms', 'update', '--take', 'test.behaviour'])
  assert.equal(unapplied.status, 2, unapplied.output)
  assert.match(unapplied.output, /is not applied in this project/, unapplied.output)

  fixture.write(RECORD, 'groups: [test]\ntest.behaviour: not-a-hash\n')
  const broken = runCli(fixture.root, ['norms', 'update'])
  assert.equal(broken.status, 1, broken.output)
  assert.match(broken.output, /is not `<id>: <sha256>`/, broken.output)
})

test('the file and the record render as documented, and an installed manager turns the record into a URL', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write('.agents/skills/dsh-spec-manager/SKILL.md',
    '---\nname: probe\nmetadata:\n    github-ref: refs/tags/v1.2.3\n---\n# Probe\n')
  runCli(fixture.root, ['norms', 'install', '--group', 'evidence'])

  const explained = runCli(fixture.root, ['norms', 'explain', 'evidence.claims'])
  assert.equal(explained.status, 0, explained.output)
  assert.match(explained.output, /record: https:\/\/github\.com\/sunandsunshine-tech\/dsh-spec\/blob\/v1\.2\.3\/\.agents\/dsh-spec\/notes\//, explained.output)

  const json = runCli(fixture.root, ['norms', 'list', '--group', 'evidence', '--json'])
  const parsed = JSON.parse(json.stdout) as { norms: { source: string, sourceUrl: string }[] }
  for (const norm of parsed.norms) {
    assert.ok(norm.source.startsWith('.agents/'), norm.source)
    assert.match(norm.sourceUrl, /^https:\/\/github\.com\/sunandsunshine-tech\/dsh-spec\/blob\/v1\.2\.3\//, norm.sourceUrl)
  }
  assert.match(readFileSync(join(fixture.root, FILE), 'utf8'), /<!-- dsh-norms: evidence -->/)
})

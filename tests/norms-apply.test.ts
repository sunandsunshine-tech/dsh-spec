/**
 * Applying norms: the selection a project holds, the file they land in, and the comparison that
 * decides what an update may overwrite.
 *
 * The cases that matter here are the three states a recorded base makes distinguishable — an
 * untouched norm takes the revision's text, a hand-edited one is kept and reported as drifted until
 * `--force` takes the catalog text, and a norm the catalog dropped is pruned — and the promise that
 * nothing outside a marked block is ever written.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { NORMS_FILE, NORMS_RECORD, normsStatusFor, recordPathOf, filePathOf, normHash, renderNormsRecord } from '../skills/dsh-spec-manager/scripts/norms-apply.ts'
import { runCli, runScript } from './helpers/cli.ts'
import { makeFixture, REPO_ROOT } from './helpers/fixtures.ts'

/** The two files an applied selection lives in. */
const FILE = NORMS_FILE
const RECORD = NORMS_RECORD

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

test('a hand-edited block drifts, and only --force takes the catalog text', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  const mine = '- **Our suite runs offline, with the stub server in tests/stub/.**'
  fixture.write(FILE, fixture.read(FILE).replace('- **The suite runs offline and deterministically.**', mine))

  // Without --force the update reports the drift and refuses: the edit is not overwritten.
  const update = runCli(fixture.root, ['norms', 'update'])
  assert.equal(update.status, 1, update.output)
  assert.match(update.output, /drifted: test\.offline \(locally modified in .*norms\.md\)/, update.output)
  assert.match(block(fixture, 'test.offline'), /Our suite runs offline/, 'the update overwrote a hand-edited block')

  // The record still holds the hash the skill set wrote, so the next update reports the same drift.
  const again = runCli(fixture.root, ['norms', 'update'])
  assert.equal(again.status, 1, again.output)
  assert.match(again.output, /drifted: test\.offline/, again.output)

  const forced = runCli(fixture.root, ['norms', 'update', '--force'])
  assert.equal(forced.status, 0, forced.output)
  assert.match(block(fixture, 'test.offline'), /The suite runs offline and deterministically/)

  const after = runCli(fixture.root, ['norms', 'update'])
  assert.equal(after.status, 0, after.output)
  assert.match(after.output, /4 norm\(s\): 4 ok/, after.output)
})

test('a norm the catalog dropped is pruned from the record and the file', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  // The catalog no longer ships this id, and the project still records it.
  fixture.write(RECORD, fixture.read(RECORD).replace(/^test\.behaviour: [0-9a-f]{64}$/m, `pr.gone: ${'a'.repeat(64)}`))
  fixture.write(FILE, fixture.read(FILE).replace('<!-- dsh-norm: test.behaviour -->', '<!-- dsh-norm: pr.gone -->'))

  const update = runCli(fixture.root, ['norms', 'update'])
  assert.equal(update.status, 0, update.output)
  assert.match(update.output, /removed: pr\.gone \(unshipped from catalog, pruned\)/, update.output)
  assert.doesNotMatch(fixture.read(RECORD), /pr\.gone/, 'the record still lists a norm the catalog dropped')
  assert.doesNotMatch(fixture.read(FILE), /dsh-norm: pr\.gone/, 'the block survived the prune')
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

test('remove refuses a block that drifted, and takes back an untouched one', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  fixture.write(FILE, fixture.read(FILE).replace('- **Assert the behaviour, not the implementation.**', '- **Ours.**'))

  const refused = runCli(fixture.root, ['norms', 'remove', 'test.behaviour'])
  assert.equal(refused.status, 1, refused.output)
  assert.match(refused.output, /drifted: test\.behaviour/, refused.output)
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
  // The owning document of `test.behaviour` is the suite's own README, so that path is printed.
  assert.match(applied.output, /record: tests\/README\.md/, applied.output)
  assert.match(applied.output, /- Why:/, applied.output)

  const other = runCli(fixture.root, ['norms', 'explain', 'pr.lifecycle'])
  assert.equal(other.status, 0, other.output)
  assert.match(other.output, /applied: no/, other.output)

  const json = runCli(fixture.root, ['norms', 'explain', 'test.behaviour', '--json'])
  assert.equal(json.status, 0, json.output)
  const parsed = JSON.parse(json.stdout) as { id: string, applied: boolean, source: string }[]
  assert.equal(parsed[0]?.id, 'test.behaviour')
  assert.equal(parsed[0]?.applied, true)
  assert.equal(parsed[0]?.source, 'tests/README.md')
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

test('a refresh reports the applied norms, and never writes them', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const body = '- **One.**\n  - Why: because.\n  - Self-check: ask.'
  fixture.write('catalog.json', JSON.stringify({
    groups: [{ id: 'g', title: 'G', titleZh: '组' }],
    norms: [{ id: 'g.one', group: 'g', title: 'One', titleZh: '一', invariant: 'One.', body, source: 'README.md' }],
  }))
  const catalog = join(fixture.root, 'catalog.json')

  // Nothing applied: the report says what the set offers and how to apply it.
  assert.match(normsStatusFor(fixture.root, catalog), /no norms are applied.*`norms list` shows the 1/, normsStatusFor(fixture.root, catalog))
  assert.equal(existsSync(join(fixture.root, FILE)), false, 'the report created the file')

  // Applied and current: the block hashes to the recorded base.
  fixture.write(FILE, `# Norms\n\n<!-- dsh-norms: g -->\n## G\n\n<!-- dsh-norm: g.one -->\n${body}\n<!-- /dsh-norm -->\n`)
  fixture.write(RECORD, renderNormsRecord({ groups: ['g'], norms: [{ id: 'g.one', base: normHash(body) }] }))
  assert.match(normsStatusFor(fixture.root, catalog), /1 norm\(s\) applied, all at this revision/)

  // Edited by hand: named as drift, and the flag that would take the catalog text is named too.
  fixture.write(FILE, fixture.read(FILE).replace('- **One.**', '- **Ours.**'))
  const report = normsStatusFor(fixture.root, catalog)
  assert.match(report, /1 drifted/, report)
  assert.match(report, /a drifted block needs `--force`; this command does not write them/, report)

  // A record that cannot be read is reported, because a project's norms must not fail an upgrade.
  fixture.write(RECORD, 'g.one: not-a-hash\n')
  assert.match(normsStatusFor(fixture.root, catalog), /could not be read/, normsStatusFor(fixture.root, catalog))
  assert.match(normsStatusFor(fixture.root, join(fixture.root, 'absent.json')), /could not be read/)
})

test('the record path and the file path are the documented pair', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  assert.equal(recordPathOf(fixture.root), join(fixture.root, RECORD))
  assert.equal(filePathOf(fixture.root), join(fixture.root, FILE))
})

test('the AGENTS.md hook exists exactly while the project applies norms', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# AGENTS.md\n\nOurs.\n' })
  t.after(() => fixture.dispose())
  const sync = ['skills/dsh-spec-manager/scripts/init-agents-md.ts', '--root', fixture.root, '--sync', '--write']

  // Nothing applied: the collection's own sync adds no line pointing at a file the project has not
  // got, and the project's text is left as it stands.
  runScript(sync[0] as string, sync.slice(1))
  assert.doesNotMatch(fixture.read('AGENTS.md'), /dsh-spec:norms/)
  assert.match(fixture.read('AGENTS.md'), /Ours\./)

  // A dry run says what it would do and writes nothing.
  const planned = runCli(fixture.root, ['norms', 'install', '--group', 'test', '--dry-run'])
  assert.match(planned.output, /AGENTS\.md: the norms section is added/, planned.output)
  assert.doesNotMatch(fixture.read('AGENTS.md'), /dsh-spec:norms/, 'a dry run wrote the hook')

  const installed = runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  assert.equal(installed.status, 0, installed.output)
  assert.match(installed.output, /AGENTS\.md: the norms section is added/, installed.output)
  assert.match(fixture.read('AGENTS.md'), /<!-- dsh-spec:norms -->/)
  assert.match(fixture.read('AGENTS.md'), /Ours\./)

  // The hook is a report of the selection, so a second install reports it in step and rewrites
  // nothing; removing the last norm takes the hook away with it.
  const again = runCli(fixture.root, ['norms', 'install', '--group', 'test'])
  assert.match(again.output, /AGENTS\.md: the norms section is already in step/, again.output)
  const removed = runCli(fixture.root, ['norms', 'remove', '--all'])
  assert.equal(removed.status, 0, removed.output)
  assert.match(removed.output, /AGENTS\.md: the norms section is removed/, removed.output)
  assert.doesNotMatch(fixture.read('AGENTS.md'), /dsh-spec:norms/, 'the hook outlived the last norm')
  assert.match(fixture.read('AGENTS.md'), /Ours\./)
})

test('a hook a hand edit dropped comes back from the record on the next sync', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# AGENTS.md\n\nOurs.\n' })
  t.after(() => fixture.dispose())
  runCli(fixture.root, ['norms', 'install', '--group', 'evidence'])
  fixture.write('AGENTS.md', fixture.read('AGENTS.md').replace(/\n*<!-- dsh-spec:norms -->[\s\S]*?<!-- \/dsh-spec:norms -->\n*/, '\n'))

  runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync', '--write'])

  assert.match(fixture.read('AGENTS.md'), /<!-- dsh-spec:norms -->/, 'the sync did not restore the hook')
  assert.match(fixture.read('AGENTS.md'), /Ours\./)
})

test('this repository applies its own catalog, and holds the hook', () => {
  // The catalog is generic and every red line is rendered from it, so this repository applies a
  // selection like any other project: the file exists and `AGENTS.md` points at it.
  assert.equal(existsSync(join(REPO_ROOT, NORMS_FILE)), true, 'this repository does not apply the catalog')
  assert.match(readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf8'), /dsh-spec:norms/, 'this repository carries no catalog hook')
})

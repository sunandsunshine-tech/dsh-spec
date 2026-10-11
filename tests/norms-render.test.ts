/**
 * `verify-norms-render`: the hook, the file and the record are a render of the catalog, and a
 * catalog edited without `norms update` used to leave every check green.
 *
 * Every case runs the manager copy the fixture adopted rather than this repository's engine, so the
 * gate reads the catalog beside the script that runs it — the shape a project has — and the render
 * is written by the same copy. That is what lets a case edit a catalog and leave the render behind
 * it, which is the failure the gate exists for.
 */

import assert from 'node:assert/strict'
import { cpSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runEntry } from './helpers/cli.ts'
import { makeFixture, REPO_ROOT } from './helpers/fixtures.ts'

const MANAGER = '.agents/skills/dsh-spec-manager'
const CATALOG = `${MANAGER}/references/norms.json`
const CLI = `${MANAGER}/scripts/dsh-spec.ts`
const GATE = `${MANAGER}/scripts/verify-norms-render.ts`
const FILE = '.agents/dsh-spec/norms/norms.md'
const RECORD = '.agents/dsh-spec/norms/applied.yaml'

/** The escape a fixture path needs before it can stand in a regular expression. */
function literal(path: string): string {
  return path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A project that adopted this repository's manager, applying four norms through its own copy. */
function applied(fixture: ReturnType<typeof makeFixture>): void {
  cpSync(join(REPO_ROOT, 'skills', 'dsh-spec-manager'), join(fixture.root, MANAGER), { recursive: true })
  const installed = runEntry(join(fixture.root, CLI), fixture.root, ['norms', 'install', '--group', 'test', '--root', fixture.root])
  assert.equal(installed.status, 0, installed.output)
}

/** Run the gate the way the dispatcher runs it: a tree assertion needs its whole root. */
function gate(fixture: ReturnType<typeof makeFixture>): ReturnType<typeof runEntry> {
  return runEntry(join(fixture.root, GATE), fixture.root, ['--all', '--root', fixture.root])
}

/** A catalog edit that changes one applied norm's text without re-rendering it. */
function editCatalog(fixture: ReturnType<typeof makeFixture>): void {
  const catalog = JSON.parse(fixture.read(CATALOG)) as { norms: { id: string, body: string }[] }
  const norm = catalog.norms.find(entry => entry.id === 'test.offline')
  assert.ok(norm !== undefined, 'the fixture catalog does not ship test.offline')
  norm.body = `${norm.body} One more sentence, and no render follows it.`
  fixture.write(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`)
}

test('a render that matches the catalog passes', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own orders.\n' })
  t.after(() => fixture.dispose())
  applied(fixture)

  const result = gate(fixture)

  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /verify-norms-render: the hook, the file and the record are the catalog's render \(4 norm\(s\) applied, none drifted\)\./)
})

test('a catalog edited without a refresh fails, naming the artifacts and the remedy', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own orders.\n' })
  t.after(() => fixture.dispose())
  applied(fixture)
  editCatalog(fixture)

  const result = gate(fixture)

  assert.equal(result.status, 1, result.output)
  assert.match(result.stderr, /the render has drifted from the catalog at/)
  assert.match(result.stderr, new RegExp(`${literal(FILE)} is not the catalog's render`))
  assert.match(result.stderr, new RegExp(`${literal(RECORD)} is not the catalog's render`))

  // The remedy the report names is the one that clears it.
  const updated = runEntry(join(fixture.root, CLI), fixture.root, ['norms', 'update', '--root', fixture.root])

  assert.equal(updated.status, 0, updated.output)
  assert.equal(gate(fixture).status, 0, 'norms update did not bring the render back in step')
})

test('a block edited by hand inside the file fails, naming the artifact and --force', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own orders.\n' })
  t.after(() => fixture.dispose())
  applied(fixture)
  const file = fixture.read(FILE)
  const edited = file.replace(
    /(<!-- dsh-norm: test\.[a-z-]+ -->\n)([\s\S]*?)(\n<!-- \/dsh-norm -->)/,
    (_, open: string, body: string, close: string) => `${open}${body} And one word more.${close}`,
  )
  assert.notEqual(edited, file, 'the case did not edit a block')
  fixture.write(FILE, edited)

  const result = gate(fixture)

  assert.equal(result.status, 1, result.output)
  assert.match(result.stderr, new RegExp(`${literal(FILE)} holds a block edited by hand`))
  assert.match(result.stderr, /--force/)

  // `--force` is the remedy the report names, and it clears the failure.
  const forced = runEntry(join(fixture.root, CLI), fixture.root, ['norms', 'update', '--force', '--root', fixture.root])

  assert.equal(forced.status, 0, forced.output)
  assert.equal(gate(fixture).status, 0, 'norms update --force did not bring the render back in step')
})

test('a hook the catalog no longer says fails', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own orders.\n' })
  t.after(() => fixture.dispose())
  applied(fixture)
  const withoutHook = fixture.read('AGENTS.md').replace(/<!-- dsh-spec:norms -->[\s\S]*?<!-- \/dsh-spec:norms -->\n?/, '')
  assert.doesNotMatch(withoutHook, /dsh-spec:norms/, 'the case did not remove the hook')
  fixture.write('AGENTS.md', withoutHook)

  const result = gate(fixture)

  assert.equal(result.status, 1, result.output)
  assert.match(result.stderr, /AGENTS\.md's marked section is not the catalog's render/)
})

test('a record edited by hand fails', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own orders.\n' })
  t.after(() => fixture.dispose())
  applied(fixture)
  fixture.write(RECORD, fixture.read(RECORD).replace(/^groups: .*$/m, 'groups: []'))

  const result = gate(fixture)

  assert.equal(result.status, 1, result.output)
  assert.match(result.stderr, new RegExp(`${literal(RECORD)} is not the catalog's render`))
})

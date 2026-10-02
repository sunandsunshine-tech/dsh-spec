/**
 * The norms catalog: what a project may apply, and how the surface that offers them behaves.
 *
 * The catalog is the only place a norm is written down twice-free: an id, the group a project
 * chooses it by, the English body that would be written into that project, and the Chinese title
 * this surface prints. These cases are what keep it renderable — an id that cannot be matched, a
 * group nothing belongs to, or a body with no reason is refused before it reaches a project.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { readNorms, renderNormsJson, renderNormsList, normsPathOf } from '../skills/dsh-spec-manager/scripts/norms.ts'
import { runCli } from './helpers/cli.ts'
import { makeFixture, REPO_ROOT } from './helpers/fixtures.ts'

/** The catalog this skill set ships. */
const CATALOG = normsPathOf(join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'scripts'))

test('the shipped catalog is one every norm can be rendered from', () => {
  const catalog = readNorms(CATALOG)

  assert.ok(catalog.norms.length >= 10, `the catalog offers ${catalog.norms.length} norm(s)`)
  for (const norm of catalog.norms) {
    assert.match(norm.id, /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/, `${norm.id} is not <group>.<name>`)
    assert.ok(norm.titleZh !== '', `${norm.id} has no Chinese title`)
    assert.ok(norm.body.startsWith('- **'), `${norm.id} does not open with the rule itself`)
    // A norm whose record has moved is a norm whose rationale cannot be read: the source is a path
    // in this repository, so it is checked here rather than trusted.
    assert.ok(existsSync(join(REPO_ROOT, norm.source)), `${norm.id} points at ${norm.source}, which does not exist`)
  }
  for (const group of catalog.groups) {
    assert.ok(catalog.norms.some(norm => norm.group === group.id), `group \`${group.id}\` offers nothing`)
  }
})

test('a catalog that cannot be rendered is refused by name', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const group = { id: 'pr', title: 'Pull-request lifecycle', titleZh: 'PR 生命周期' }
  const norm = {
    id: 'pr.lifecycle',
    group: 'pr',
    title: 'Walk a change through its phases',
    titleZh: '按阶段推进改动',
    invariant: 'Walk the change through its phases.',
    body: '- **Walk it.**\n  - Why: because.\n  - Self-check: ask.',
    source: '.agents/dsh-spec/notes/README.md',
  }
  const cases: Array<[name: string, catalog: unknown, expected: RegExp]> = [
    ['no groups', { norms: [norm] }, /names no groups/],
    ['a group id that is not a name', { groups: [{ ...group, id: 'PR' }], norms: [norm] }, /group id `PR` that is not a name/],
    ['no Chinese group title', { groups: [{ ...group, titleZh: '' }], norms: [norm] }, /no Chinese title/],
    ['an id recorded twice', { groups: [group], norms: [norm, norm] }, /records `pr\.lifecycle` twice/],
    ['a norm in an undeclared group', { groups: [group], norms: [{ ...norm, group: 'prose' }] }, /names group `prose`/],
    ['a body with no rule', { groups: [group], norms: [{ ...norm, body: 'Walk it.' }] }, /does not open with the rule/],
    ['a body with no reason', { groups: [group], norms: [{ ...norm, body: '- **Walk it.**' }] }, /missing `- Why:` or `- Self-check:`/],
    ['a group nothing belongs to', { groups: [group, { id: 'test', title: 'Tests', titleZh: '测试' }], norms: [norm] }, /group `test` has no norms/],
    ['no norms at all', { groups: [group], norms: [] }, /names no norms/],
  ]
  for (const [name, catalog, expected] of cases) {
    fixture.write('norms.json', JSON.stringify(catalog))
    assert.throws(() => readNorms(join(fixture.root, 'norms.json')), expected, `the catalog with ${name} was accepted`)
  }
  assert.throws(() => readNorms(join(fixture.root, 'absent.json')), /no norms catalog at/, 'a missing catalog was accepted')
})

test('a missing catalog fails the command rather than printing an empty list', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  // The catalog path is derived from the engine, so the shipped one is what every run reads; this
  // case pins that the report is data, not a scan of the project, by running in an empty fixture.
  const result = runCli(fixture.root, ['norms', 'list'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /pr\.lifecycle/, result.output)
})

test('norms list prints every group and norm, and narrows to one group', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const all = readNorms(CATALOG)

  const result = runCli(fixture.root, ['norms', 'list'])
  assert.equal(result.status, 0, result.output)
  for (const norm of all.norms) assert.match(result.output, new RegExp(norm.id.replace('.', '\\.')), result.output)
  assert.match(result.output, new RegExp(`${all.norms.length} norm\\(s\\) in ${all.groups.length} group\\(s\\)`), result.output)

  const narrowed = runCli(fixture.root, ['norms', 'list', '--group', 'owner'])
  assert.equal(narrowed.status, 0, narrowed.output)
  const owner = all.norms.filter(norm => norm.group === 'owner')
  assert.match(narrowed.output, new RegExp(`${owner.length} norm\\(s\\) in 1 group\\(s\\)`), narrowed.output)
  for (const norm of all.norms.filter(entry => entry.group !== 'owner')) {
    assert.doesNotMatch(narrowed.output, new RegExp(norm.id.replace('.', '\\.')), `--group owner printed ${norm.id}`)
  }
})

test('norms list follows the locale, and refuses a group the catalog does not declare', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const catalog = readNorms(CATALOG)
  const first = catalog.norms.find(norm => norm.group === 'pr')
  assert.ok(first !== undefined)

  const zh = runCli(fixture.root, ['norms', 'list', '--group', 'pr'], { env: { DSH_SPEC_LANG: 'zh', LC_ALL: undefined, LANG: undefined } })
  assert.equal(zh.status, 0, zh.output)
  assert.match(zh.output, new RegExp(first.titleZh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), zh.output)

  const unknown = runCli(fixture.root, ['norms', 'list', '--group', 'absent'])
  assert.equal(unknown.status, 2, unknown.output)
  assert.match(unknown.output, /no group `absent`/, unknown.output)
})

test('norms list --json carries both titles, the body and the record', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['norms', 'list', '--json', '--group', 'evidence'])
  assert.equal(result.status, 0, result.output)
  const parsed = JSON.parse(result.stdout) as { groups: { id: string }[], norms: Record<string, unknown>[] }

  assert.deepEqual(parsed.groups.map(group => group.id), ['evidence'])
  const shipped = readNorms(CATALOG).norms.filter(norm => norm.group === 'evidence')
  assert.deepEqual(parsed.norms.map(norm => norm.id), shipped.map(norm => norm.id))
  for (const norm of parsed.norms) {
    assert.ok(typeof norm.title === 'string' && norm.title !== '', `${String(norm.id)} has no English title`)
    assert.ok(typeof norm.titleZh === 'string' && norm.titleZh !== '', `${String(norm.id)} has no Chinese title`)
    assert.match(String(norm.body), /- Why:/, `${String(norm.id)} carries no reason`)
    assert.ok(String(norm.source).startsWith('.agents/'), `${String(norm.id)} does not name a record in this repository`)
  }
})

test('norms without a verb, and an unknown flag, are refused', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  const catalog = readNorms(CATALOG)

  const noVerb = runCli(fixture.root, ['norms'])
  assert.equal(noVerb.status, 2, noVerb.output)
  assert.match(noVerb.output, /norms needs a verb: list/, noVerb.output)

  const unknown = runCli(fixture.root, ['norms', 'list', '--bogus'])
  assert.equal(unknown.status, 2, unknown.output)
  assert.match(unknown.output, /norms list does not take --bogus/, unknown.output)

  // The renderers are the surface's two shapes; a narrowed selection is the same data either way.
  assert.match(renderNormsList(catalog, { language: 'en', group: 'test' }), /test\.acceptance-first/)
  assert.deepEqual(
    (JSON.parse(renderNormsJson(catalog, { group: 'test' })) as { groups: { id: string }[] }).groups.map(group => group.id),
    ['test'],
  )
})

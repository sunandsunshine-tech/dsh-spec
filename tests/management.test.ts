/**
 * The management verbs: adoption, refresh, drift and removal.
 *
 * Nothing here reaches the network. `install` and `upgrade` are exercised through `--dry-run`, and
 * `status` and `uninstall` are local: the cases that would install at a revision belong to a
 * release, not to a suite that must run offline. The one network question a resolution asks — the
 * newest published release — is answered by a `gh` stand-in on `PATH`, so the resolution itself is
 * covered without a real API call.
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runCli, runScript } from './helpers/cli.ts'
import { NOTES, makeFixture, snapshot, writeNote } from './helpers/fixtures.ts'
import type { Fixture } from './helpers/fixtures.ts'

/** The skills the manifest names, in manifest order. */
const SKILLS = [
  'dsh-spec-manager',
  'dsh-archive-agent-notes',
  'dsh-translate-docs',
  'dsh-prose-standard',
  'dsh-trim-cot-leakage',
  'dsh-code-review',
  'dsh-pre-push-checks',
  'dsh-find-simplifications',
]

/** An installed `SKILL.md` carrying the metadata block `gh skill install` injects. */
function installedSkill(ref: string): string {
  return `---\nname: probe\nmetadata:\n    github-ref: refs/heads/${ref}\n---\n# Probe\n`
}

/** Install all eight skills at one ref, letting a case put one of them elsewhere. */
function installSet(fixture: Fixture, ref: string, overrides: Record<string, string> = {}): void {
  for (const skill of SKILLS) {
    fixture.write(`.agents/skills/${skill}/SKILL.md`, installedSkill(overrides[skill] ?? ref))
  }
}

/**
 * A `gh` stand-in first on `PATH`: it records its argv and answers each endpoint it is asked for.
 *
 * The manager asks three questions — the newest published release, the revision's commit, and the
 * revision's tree — so the stand-in answers all three from canned payloads. It honours the `--jq`
 * the manager passes, because that filter is part of the answer rather than decoration: a response
 * body handed back untransformed is not what `gh` prints, and a case would pass against a shape the
 * real binary never produces. Nothing reaches the network, and the call log is what proves a flag
 * short-circuited one of the questions.
 */
function stubGh(fixture: Fixture, options: { releases?: unknown[], commit?: string, status?: number } = {}): () => string[] {
  const log = join(fixture.root, 'gh-calls.log')
  const releases = encode(options.releases ?? [])
  const commit = encode({ commit: { tree: { sha: options.commit ?? 'a'.repeat(40) } } })
  const script = [
    '#!/bin/sh',
    `printf '%s\\n' "$*" >> '${log}'`,
    'payload=""',
    'case "$*" in',
    `  "api repos/"*"/releases") payload=$(printf '%s' '${releases}' | base64 -d) ;;`,
    `  "api repos/"*"/commits/"*) payload=$(printf '%s' '${commit}' | base64 -d) ;;`,
    `  "api repos/"*"/git/trees/"*) [ -f '${fixture.root}/gh-tree.json' ] && payload=$(cat '${fixture.root}/gh-tree.json') ;;`,
    '  *) : ;;',
    'esac',
    'filter=$(printf \'%s\\n\' "$*" | sed -n \'s/.*--jq //p\')',
    'if [ -n "$filter" ]; then printf \'%s\' "$payload" | jq -r "$filter"; else printf \'%s\' "$payload"; fi',
    `exit ${options.status ?? 0}`,
    '',
  ].join('\n')
  fixture.write('.stub/gh', script)
  chmodSync(join(fixture.root, '.stub', 'gh'), 0o755)
  return () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(line => line !== '') : [])
}

/** A payload for the stand-in: base64, so no quoting of the JSON is left to the shell. */
function encode(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}

/** The environment that puts the stub before every other `gh` on the machine. */
function stubPath(fixture: Fixture): Record<string, string | undefined> {
  return { PATH: `${join(fixture.root, '.stub')}:${process.env.PATH ?? ''}` }
}

/**
 * The project's own files, size and all, without the stand-ins' own artifacts.
 *
 * A case that proves a dry run wrote nothing has to look past the `gh` stand-in and the log it
 * appends to: those are the harness's, not the project's, and a stub that records its call is
 * writing evidence rather than changing the project.
 */
function projectFiles(fixture: Fixture): [string, number][] {
  const harness = new Set(['.stub/gh', 'gh-calls.log', 'gh-tree.json', 'reexec.txt'])
  return [...snapshot(fixture.root).entries()].filter(([path]) => !harness.has(path))
}

/** One skill's shipped files, as a `path → blob sha` record. */
type TreeFiles = Record<string, string>

/** The revision's tree, as the API reports it: one summary plus a record per directory and file. */
interface TreeSpec {
  /** The tree sha `gh` records for each `skills/<name>` directory. */
  trees: Record<string, string>
  /** Each skill's shipped paths and blob shas, as the API's path is relative to the repository. */
  files: Record<string, TreeFiles>
}

/** Put a revision's tree on a fixture and point the stand-in `gh` at it. */
function withTree(fixture: Fixture, spec: TreeSpec): void {
  const tree: { type: string, sha: string, path: string }[] = [
    { type: 'tree', sha: '0'.repeat(40), path: 'skills' },
  ]
  for (const [skill, sha] of Object.entries(spec.trees)) {
    tree.push({ type: 'tree', sha, path: `skills/${skill}` })
    for (const [path, blob] of Object.entries(spec.files[skill] ?? {}).sort()) {
      tree.push({ type: 'blob', sha: blob, path: `skills/${skill}/${path}` })
    }
  }
  fixture.write('gh-tree.json', JSON.stringify({ sha: '0'.repeat(40), tree }))
}

/** Every skill carries one file, `SKILL.md`, whose blob sha the caller chooses per skill. */
function oneFilePerSkill(sha: (skill: string) => string): TreeSpec {
  const trees: Record<string, string> = {}
  const files: Record<string, TreeFiles> = {}
  for (const skill of SKILLS) {
    trees[skill] = digest(`${skill}-tree`)
    files[skill] = { 'SKILL.md': sha(skill) }
  }
  return { trees, files }
}

/** A digest wide enough to look like a git object id, and unique per input. */
function digest(seed: string): string {
  return createHash('sha1').update(seed).digest('hex')
}

/** The tree sha a `oneFilePerSkill` spec records for one skill. */
function treeOf(skill: string): string {
  return digest(`${skill}-tree`)
}

test('install --dry-run reports a plan and changes nothing', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  // A project installs the manager by hand first, so adoption always runs beside one.
  fixture.write('.agents/skills/dsh-spec-manager/SKILL.md', installedSkill('main'))
  stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const before = projectFiles(fixture)

  const result = runCli(fixture.root, ['install', '--dry-run'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /dry run/)
  assert.match(result.output, /at main/)
  assert.deepEqual(projectFiles(fixture), before, 'a dry run wrote to the project')
})

test('upgrade --dry-run reports without changing anything', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })
  const before = projectFiles(fixture)

  const result = runCli(fixture.root, ['upgrade', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /upgrade 8 skill\(s\) .* at main/)
  assert.deepEqual(projectFiles(fixture), before, 'a dry run wrote to the project')
})

test('--revision wins over the manager\'s own ref and reads no release list', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  fixture.write('.agents/skills/dsh-spec-manager/SKILL.md', installedSkill('main'))
  const calls = stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })

  const result = runCli(fixture.root, ['install', '--dry-run', '--revision', 'release-x'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /at release-x/, result.output)
  assert.deepEqual(calls().filter(call => call.endsWith('/releases')), [], 'an explicit --revision still read the release list')
  assert.deepEqual(calls().filter(call => call.includes('/commits/release-x')), ['api repos/sunandsunshine-tech/dsh-spec/commits/release-x --jq .commit.tree.sha'])
})

test('upgrade without --revision takes the newest published release, not a draft', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  stubGh(fixture, { releases: [{ draft: true, tag_name: 'v2.0.0-draft' }, { draft: false, tag_name: 'v9.9.9' }] })

  const result = runCli(fixture.root, ['upgrade', '--dry-run'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /at v9\.9\.9/, result.output)
  assert.doesNotMatch(result.output, /v2\.0\.0-draft/)
})

test('no published release and no --revision is refused with exit 2, naming the flag', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  stubGh(fixture, { releases: [{ draft: true, tag_name: 'v1.0.0-draft' }] })

  const result = runCli(fixture.root, ['upgrade', '--dry-run'], { env: stubPath(fixture) })

  assert.equal(result.status, 2, result.output)
  assert.match(result.output, /--revision/, result.output)
})

test('a release list that cannot be read fails instead of falling back', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  stubGh(fixture, { status: 1 })

  const result = runCli(fixture.root, ['upgrade', '--dry-run'], { env: stubPath(fixture) })

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /releases/, result.output)
})

test("status holds every skill against the manager's own ref", (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')

  const result = runCli(fixture.root, ['status'])

  assert.equal(result.status, 0, result.output)
  const okLines = result.stdout.split('\n').filter(line => /^ {2}ok {8}dsh-/.test(line))
  assert.equal(okLines.length, 8, `status did not report eight matching skills:\n${result.output}`)
})

test("status names both refs when a skill drifted off the manager's own ref", (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main', { 'dsh-code-review': 'other' })

  const result = runCli(fixture.root, ['status'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /dsh-code-review: at other, the manager is at main/, result.output)
})

test('status reports a manager whose own ref cannot be read', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  fixture.write('.agents/skills/dsh-spec-manager/SKILL.md', '---\nname: dsh-spec-manager\n---\n# Manager\n')

  const result = runCli(fixture.root, ['status'])

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /metadata\.github-ref/, result.output)
})

test('status reports drift on a project that is not installed', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['status'])

  assert.equal(result.status, 1, result.output)
})

test('uninstall --dry-run names the artifacts it leaves behind', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n', 'docs/terminology.md': '| English | 中文 |\n|---|---|\n' })
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')

  const result = runCli(fixture.root, ['uninstall', '--dry-run'])

  assert.equal(result.status, 0, result.output)
  for (const left of ['AGENTS.md', 'docs/', NOTES]) {
    assert.match(result.output, new RegExp(left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `uninstall did not name ${left}:\n${result.output}`)
  }
})

test('a check subject that is not a command flag still refuses an unknown operation', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())

  const result = runCli(fixture.root, ['notes', '--frobnicate'])

  assert.equal(result.status, 2, result.output)
})

test('sync re-records a written pair through the entry point verb', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write(`${NOTES}/README.md`, '# Old contract\n')
  fixture.write(`${NOTES}/README.zh.md`, '# 旧约定\n')
  // The dispatcher a sync reaches is the project's, not this repository's: a stub records the
  // command it was handed, so this case pins the verb the sync runs without re-recording a pair.
  const scripts = '.agents/skills/dsh-spec-manager/scripts'
  fixture.write(`${scripts}/dsh-spec.ts`, [
    "import { appendFileSync } from 'node:fs'",
    "appendFileSync(new URL('../../../../calls.txt', import.meta.url), `${process.argv.slice(2).join(' ')}\\n`)",
    '',
  ].join('\n'))

  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync', '--write'])

  assert.equal(result.status, 0, result.output)
  assert.deepEqual(
    fixture.read('calls.txt').trim().split('\n'),
    [`translation-pair write ${NOTES}/README.md --root ${fixture.root}`],
  )
})

/**
 * Record the dispatcher a re-exec reaches, so a case can prove which process ran the second half.
 *
 * The path is the installed manager's entry point, not this repository's: an upgrade re-executes the
 * copy `gh` just installed, and this stand-in writes its arguments to a log beside the fixture.
 */
function stubDispatcher(fixture: Fixture, exit = 0): string {
  const path = join(fixture.root, '.agents', 'skills', 'dsh-spec-manager', 'scripts', 'dsh-spec.ts')
  fixture.write('.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts', [
    "import { appendFileSync } from 'node:fs'",
    `appendFileSync(new URL('../../../../reexec.txt', import.meta.url), \`\${process.argv.slice(2).join(' ')}\\n\`)`,
    `process.exit(${exit})`,
    '',
  ].join('\n'))
  return path
}

/** The install calls a run made, in order. */
function installCalls(calls: string[]): string[] {
  return calls.filter(call => call.startsWith('skill install'))
}

/** The dispatcher arguments a re-exec recorded, one line each; empty when none reached it. */
function reexecCalls(fixture: Fixture): string[] {
  if (!existsSync(join(fixture.root, 'reexec.txt'))) return []
  return fixture.read('reexec.txt').trim().split('\n').filter(line => line !== '')
}

test('upgrade self-updates the manager, then re-executes the new copy for the skill set', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  stubDispatcher(fixture)
  const calls = stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })

  const result = runCli(fixture.root, ['upgrade', '--revision', 'v9.9.9', '--root', fixture.root], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  const installs = installCalls(calls())
  assert.deepEqual(installs, [
    `skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@v9.9.9 --dir ${fixture.root}/.agents/skills --force`,
  ], `the self-update ran the wrong install:\n${result.output}`)
  assert.deepEqual(
    reexecCalls(fixture),
    [`upgrade --only-skill-set --revision v9.9.9 --root ${fixture.root}`],
    `the re-exec ran the wrong command:\n${result.output}`,
  )
})

test('a manager already at the target ref is not reinstalled, and the set is still refreshed', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  stubDispatcher(fixture)
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const calls = stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })

  const result = runCli(fixture.root, ['upgrade', '--revision', 'main', '--root', fixture.root], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /the manager is already at main/, result.output)
  // One install per skill, the manager among them: an extra call naming the manager would be the
  // self-update, which an already-current manager does not owe.
  assert.deepEqual(installCalls(calls()).filter(call => call.includes('dsh-spec-manager@')), [
    `skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@main --dir ${fixture.root}/.agents/skills --force`,
  ], 'the manager was installed more than once')
  assert.deepEqual(reexecCalls(fixture), [], 'an up-to-date manager was re-executed')
})

test('--only-skill-set installs the set and never touches the manager', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  stubDispatcher(fixture)
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const calls = stubGh(fixture)

  const result = runCli(fixture.root, ['upgrade', '--only-skill-set', '--revision', 'main', '--root', fixture.root], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /installing the skill set only/, result.output)
  assert.deepEqual(installCalls(calls()).filter(call => call.includes('dsh-spec-manager@')), [
    `skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@main --dir ${fixture.root}/.agents/skills --force`,
  ], '--only-skill-set installed the manager more than once')
  assert.deepEqual(reexecCalls(fixture), [], '--only-skill-set re-executed a dispatcher')
})

test('--only-skill-set without --revision stays at the manager ref and reads no release list', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  stubDispatcher(fixture)
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const calls = stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })

  const result = runCli(fixture.root, ['upgrade', '--only-skill-set', '--dry-run', '--root', fixture.root], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /at main: installing the skill set only/, result.output)
  assert.doesNotMatch(result.output, /v9\.9\.9/, `--only-skill-set ignored the manager ref:\n${result.output}`)
  assert.deepEqual(calls().filter(call => call.endsWith('/releases')), [], '--only-skill-set read the release list')
})

test('upgrade --dry-run prints the self-update it would run and runs nothing', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  const calls = stubGh(fixture)
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const before = projectFiles(fixture)

  const result = runCli(fixture.root, ['upgrade', '--dry-run', '--revision', 'main', '--root', fixture.root], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, new RegExp(`would run: gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@main --dir ${fixture.root}/\\.agents/skills --force`), result.output)
  assert.deepEqual(calls().filter(call => call.startsWith('skill install')), [], 'a dry run installed a skill')
  assert.deepEqual(projectFiles(fixture), before, 'a dry run wrote to the project')
})

test('the dry-run plan names the files a refresh touches, per skill', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  // The manager is byte-for-byte the revision's content, `SKILL.md`'s injected tree sha included,
  // so its line is `already at` and everything below belongs to the skills that differ.
  fixture.write('.agents/skills/dsh-spec-manager/SKILL.md', installedSkill('main'))
  fixture.write('.agents/skills/dsh-prose-standard/SKILL.md', installedSkill('main'))
  fixture.write('.agents/skills/dsh-code-review/references/stale.md', '# A file the revision dropped\n')
  const managerBlob = createHash('sha1').update(fixture.read('.agents/skills/dsh-spec-manager/SKILL.md')).digest('hex')
  withTree(fixture, {
    trees: { 'dsh-spec-manager': treeOf('dsh-spec-manager'), 'dsh-prose-standard': treeOf('dsh-prose-standard'), 'dsh-code-review': treeOf('dsh-code-review') },
    files: {
      'dsh-spec-manager': { 'SKILL.md': managerBlob },
      'dsh-prose-standard': { 'SKILL.md': digest('the revision local file'), 'references/guide.md': digest('a reference') },
      'dsh-code-review': { 'SKILL.md': digest('the code review file') },
    },
  })
  fixture.write(
    '.agents/skills/dsh-spec-manager/SKILL.md',
    installedSkill('main').replace('metadata:\n', `metadata:\n    github-tree-sha: ${treeOf('dsh-spec-manager')}\n`),
  )
  stubGh(fixture, { commit: digest('the revision tree') })

  const result = runCli(fixture.root, ['upgrade', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /already at main: dsh-spec-manager/, result.output)
  assert.match(result.output, /^ {2}\+ dsh-code-review\/SKILL\.md$/m, result.output)
  assert.match(result.output, /^ {2}\+ dsh-prose-standard\/references\/guide\.md$/m, result.output)
  assert.match(result.output, /^ {2}~ dsh-prose-standard\/SKILL\.md$/m, result.output)
  assert.match(result.output, /^ {2}would remove .*dsh-code-review\/references\/stale\.md — the revision does not ship it$/m, result.output)
  assert.doesNotMatch(result.output, /^ {2}[+~-] dsh-spec-manager\//m, `the current skill was planned as a change:\n${result.output}`)
})

test('a dry-run sync diffs the managed text it would rewrite', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  // A first sync writes the files the collection owns; the case then puts a stale marked section
  // back into `AGENTS.md`, which is what makes the next dry run's diff a comparison between a
  // project's text and this revision's.
  runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync', '--write'])
  const injected = fixture.read('AGENTS.md')
  fixture.write('AGENTS.md', `${injected.replace('## Decision records', 'stale injected text')}\nOur own standing orders.\n`)

  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /would update AGENTS\.md/, result.output)
  assert.match(result.output, /^--- AGENTS\.md \(as it is\)$/m, result.output)
  assert.match(result.output, /^\+\+\+ AGENTS\.md \(as sync would write it\)$/m, result.output)
  assert.match(result.output, /^-stale injected text$/m, result.output)
  assert.match(result.output, /^[ +]Our own standing orders\.$/m, `the project's own lines are not in the diff:\n${result.output}`)
  assert.match(result.output, /^\+## Decision records$/m, `the changed hunk is not in the diff:\n${result.output}`)
})

test('the dry-run refresh names the managed text it would rewrite', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  stubGh(fixture)

  const result = runCli(fixture.root, ['upgrade', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /would run: .*init-agents-md\.ts --root .* --sync\s*$/, result.output)
  assert.doesNotMatch(result.output, /--sync --write/, `a dry run would have written the managed text:\n${result.output}`)
})

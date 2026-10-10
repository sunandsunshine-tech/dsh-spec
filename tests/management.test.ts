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
import { NORMS_FILE } from '../skills/dsh-spec-manager/scripts/norms-apply.ts'
import { NOTES, PLANS, REPO_ROOT, exists, makeFixture, snapshot, writeNote } from './helpers/fixtures.ts'
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
  'dsh-agent-experience',
  'dsh-agent-team-workflow',
]

/** An installed `SKILL.md` carrying the metadata block `gh skill install` injects. */
function installedSkill(ref: string): string {
  return `---\nname: probe\nmetadata:\n    github-ref: refs/heads/${ref}\n---\n# Probe\n`
}

/** Install all ten skills at one ref, letting a case put one of them elsewhere. */
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
  // The initializer's own preview is part of this plan, not a command the plan defers: a dry run
  // that stopped at the skills would not say which project files adoption would create.
  assert.match(result.output, /root AGENTS\.md: missing — will be created/, result.output)
  // Adoption reports the norms a project could apply, and writes none of them.
  assert.match(result.output, /no norms are applied in this project/, result.output)
  assert.equal(existsSync(join(fixture.root, NORMS_FILE)), false, 'adoption wrote a norms file')
  assert.deepEqual(projectFiles(fixture), before, 'a dry run wrote to the project')
})

test('upgrade --dry-run reports without changing anything', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })
  const before = projectFiles(fixture)

  const result = runCli(fixture.root, ['upgrade', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /upgrade 10 skill\(s\) .* at main/)
  assert.match(result.output, /no norms are applied in this project/, result.output)
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
  assert.equal(okLines.length, SKILLS.length, `status did not report every manifest skill:\n${result.output}`)
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
  for (const left of ['AGENTS.md', 'docs/', NOTES, PLANS]) {
    assert.match(result.output, new RegExp(left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `uninstall did not name ${left}:\n${result.output}`)
  }
  assert.match(result.output, /dsh-spec:plans block/, `uninstall did not name the plan hook it leaves:\n${result.output}`)
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
function stubDispatcher(fixture: Fixture): string {
  const path = join(fixture.root, '.agents', 'skills', 'dsh-spec-manager', 'scripts', 'dsh-spec.ts')
  fixture.write('.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts', [
    "import { appendFileSync } from 'node:fs'",
    `appendFileSync(new URL('../../../../reexec.txt', import.meta.url), \`\${process.argv.slice(2).join(' ')}\\n\`)`,
    'process.exit(0)',
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

/** An installed `SKILL.md` whose injected ref is a tag rather than a branch. */
function installedTagged(ref: string): string {
  return `---\nname: probe\nmetadata:\n    github-ref: refs/tags/${ref}\n---\n# Probe\n`
}

test('a set installed from a tag is read, reported and reinstalled at the short tag', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  // What a released revision looks like on disk: `gh` injects the tag form, while the ref every
  // command speaks is the short name. Installing the set and reporting drift both read it.
  for (const skill of SKILLS) fixture.write(`.agents/skills/${skill}/SKILL.md`, installedTagged('v1.2.3'))
  stubDispatcher(fixture)
  withTree(fixture, oneFilePerSkill(skill => digest(`tag-${skill}`)))
  const calls = stubGh(fixture, { releases: [{ draft: false, tag_name: 'v9.9.9' }] })

  const result = runCli(fixture.root, ['upgrade', '--only-skill-set', '--root', fixture.root], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /at v1\.2\.3: installing the skill set only/, result.output)
  assert.doesNotMatch(result.output, /v9\.9\.9/, `a tag pin fell back to the newest release:\n${result.output}`)
  // A refresh installs the set concurrently, so the stub records the calls in completion order;
  // which skills were installed at the tag is the assertion, not the order they landed in.
  assert.deepEqual([...installCalls(calls())].sort(), SKILLS.map(skill =>
    `skill install sunandsunshine-tech/dsh-spec ${skill}@v1.2.3 --dir ${fixture.root}/.agents/skills --force`,
  ).sort(), `the set was not installed at the tag:\n${result.output}`)

  const status = runCli(fixture.root, ['status', '--root', fixture.root])
  assert.equal(status.status, 0, status.output)
  assert.match(status.output, /10 skill\(s\) at v1\.2\.3/, status.output)
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
  // The project's own line goes immediately before the marked block, which is what puts it inside
  // the reported hunk: a sync replaces a block in place, so a line far from the edit is unchanged
  // text a diff has no reason to print.
  fixture.write('AGENTS.md', injected.replace('## Decision records', 'stale injected text').replace('<!-- dsh-spec:agent-notes -->', 'Our own standing orders.\n\n<!-- dsh-spec:agent-notes -->'))

  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync'])

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /would update AGENTS\.md/, result.output)
  assert.match(result.output, /^--- AGENTS\.md \(as it is\)$/m, result.output)
  assert.match(result.output, /^\+\+\+ AGENTS\.md \(as sync would write it\)$/m, result.output)
  assert.match(result.output, /^-stale injected text$/m, result.output)
  assert.match(result.output, /^[ +]Our own standing orders\.$/m, `the project's own lines are not in the diff:\n${result.output}`)
  assert.match(result.output, /^\+## Decision records$/m, `the changed hunk is not in the diff:\n${result.output}`)
})

test('a dry-run refresh renders the managed text it would rewrite, and writes none of it', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  stubGh(fixture)
  // The initializer writes the files the collection owns; a stale marked section put back into
  // `AGENTS.md` is what makes the next dry run a comparison between a project's text and this
  // revision's — the half a preview must render rather than defer to a command.
  runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--write'])
  fixture.write('AGENTS.md', fixture.read('AGENTS.md').replace('## Decision records', 'stale injected text'))

  const result = runCli(fixture.root, ['upgrade', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /would update AGENTS\.md/, result.output)
  assert.match(result.output, /^--- AGENTS\.md \(as it is\)$/m, result.output)
  assert.match(result.output, /^-stale injected text$/m, `the managed-text diff was not rendered:\n${result.output}`)
  assert.doesNotMatch(result.output, /would run: .*init-agents-md/, `the preview deferred the managed text:\n${result.output}`)
  assert.match(fixture.read('AGENTS.md'), /stale injected text/, 'the dry run wrote the managed text')
})

/**
 * The delivery-plan surface, adoption through refresh.
 *
 * The plan tree is created the way the notes tree is: an adoption writes the English contract and
 * its orders, and a refresh brings that text to the installed revision without giving back a tree a
 * project removed. Its marked block in the root `AGENTS.md` is one entry in a list rather than a
 * special case, so these cases pin the two blocks apart as well as the merge itself.
 */

/** Adopt into a fixture: the initializer's create half, which every case below starts from. */
function adopt(fixture: Fixture): void {
  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--write'])
  assert.equal(result.status, 0, result.output)
}

/** Run the initializer's sync half, require it to succeed, and hand back what it reported. */
function sync(fixture: Fixture): string {
  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync', '--write'])
  assert.equal(result.status, 0, result.output)
  return result.output
}

test("adoption creates the plan tree's two files and the hook that points at them", (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())

  adopt(fixture)

  for (const path of [`${PLANS}/README.md`, `${PLANS}/AGENTS.md`]) {
    assert.equal(exists(fixture.root, path), true, `adoption did not create ${path}`)
  }
  // The Chinese counterpart ships as a template and is not deployed, exactly as the notes
  // contract's counterpart is not: a project that adds the other side declares the pair.
  assert.equal(exists(fixture.root, `${PLANS}/README.zh.md`), false, "adoption deployed the plan contract's Chinese side")
  const agents = fixture.read('AGENTS.md')
  assert.match(agents, /<!-- dsh-spec:agent-notes -->/, agents)
  assert.match(agents, /<!-- dsh-spec:plans -->/, agents)
  assert.match(agents, /## Delivery plans/, agents)
  assert.match(agents, /\]\(\.agents\/dsh-spec\/plans\/README\.md\)/, agents)
  assert.match(agents, /<!-- \/dsh-spec:plans -->\n$/, agents)
})

test('a sync creates no tree that is not there', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own standing orders.\n' })
  t.after(() => fixture.dispose())

  const output = sync(fixture)

  assert.equal(exists(fixture.root, NOTES), false, `a sync created the notes tree:\n${output}`)
  assert.equal(exists(fixture.root, PLANS), false, `a sync created the plan tree:\n${output}`)
  // The hook lands whether or not the tree does, which is this delivery's decision: the tree and
  // the hook land unconditionally, and become conditional with the team workflow.
  const agents = fixture.read('AGENTS.md')
  assert.match(agents, /Our own standing orders\./, agents)
  assert.match(agents, /<!-- dsh-spec:agent-notes -->/, agents)
  assert.match(agents, /<!-- dsh-spec:plans -->/, agents)
})

test('a sync reads back what an adoption wrote, and a second one changes nothing', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  const adopted = fixture.read('AGENTS.md')

  const first = sync(fixture)
  const second = sync(fixture)

  for (const [round, output] of [['first', first], ['second', second]] as const) {
    assert.match(output, /  \d+ managed file\(s\) already match the installed revision/, `the ${round} sync rewrote managed text:\n${output}`)
    assert.doesNotMatch(output, /(would update|updated|would create|created) /, `the ${round} sync reported a change:\n${output}`)
  }
  assert.equal(fixture.read('AGENTS.md'), adopted, 'a sync rewrote the instruction file it had just written')
})

test('a sync replaces an edited block in place and keeps the text around it', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  const adopted = fixture.read('AGENTS.md')
  const between = (text: string, open: string, close: string): string => text.slice(text.indexOf(open), text.indexOf(close))
  const notesBlock = between(adopted, '<!-- dsh-spec:agent-notes -->', '<!-- /dsh-spec:agent-notes -->')

  // The project edits inside the plans block and adds its own orders after it.
  fixture.write('AGENTS.md', `${adopted.replace('A delivery that spans more than one step', 'stale plans text')}\nOur own standing orders.\n`)

  const output = sync(fixture)

  assert.match(output, /updated AGENTS\.md/, output)
  const after = fixture.read('AGENTS.md')
  assert.doesNotMatch(after, /stale plans text/, after)
  assert.match(after, /A delivery that spans more than one step/, after)
  assert.match(after, /Our own standing orders\./, after)
  assert.equal(between(after, '<!-- dsh-spec:agent-notes -->', '<!-- /dsh-spec:agent-notes -->'), notesBlock, 'the notes block moved while the plans block was replaced')
})

test("a sync gathers the collection's blocks, above a block that follows them", (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  const adopted = fixture.read('AGENTS.md')
  const notesBlock = adopted.slice(
    adopted.indexOf('<!-- dsh-spec:agent-notes -->'),
    adopted.indexOf('<!-- /dsh-spec:agent-notes -->'),
  )
  const plansStart = adopted.indexOf('<!-- dsh-spec:plans -->')
  const plansEnd = adopted.indexOf('<!-- /dsh-spec:plans -->') + '<!-- /dsh-spec:plans -->'.length
  const plansSection = adopted.slice(plansStart, plansEnd).trimEnd()
  // The order an earlier revision left behind: the project's own text between the two collection
  // blocks, and the plans block at the very end — the shape the norms hook then sat below.
  fixture.write('AGENTS.md', `${adopted.slice(0, plansStart).trimEnd()}\n\nOur own standing orders.\n\n${plansSection}\n`)

  sync(fixture)

  const after = fixture.read('AGENTS.md')
  const notes = after.indexOf('<!-- dsh-spec:agent-notes -->')
  const plans = after.indexOf('<!-- dsh-spec:plans -->')
  const orders = after.indexOf('Our own standing orders.')
  assert.ok(notes >= 0 && plans >= 0 && orders >= 0, after)
  assert.ok(notes < plans, `the collection's blocks are out of order:\n${after}`)
  assert.ok(plans < orders, `a block that follows the collection's blocks was moved above them:\n${after}`)
  assert.equal(after.slice(notes, after.indexOf('<!-- /dsh-spec:agent-notes -->')), notesBlock, 'the notes block was rewritten')
})

test('the notes block and the plans block are replaced independently', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  const adopted = fixture.read('AGENTS.md')

  fixture.write('AGENTS.md', adopted.replace('## Delivery plans', 'stale plans heading'))
  sync(fixture)
  assert.equal(fixture.read('AGENTS.md'), adopted, 'a plans-only edit was not restored in place')

  fixture.write('AGENTS.md', adopted.replace('## Decision records', 'stale notes heading'))
  sync(fixture)
  assert.equal(fixture.read('AGENTS.md'), adopted, 'a notes-only edit was not restored in place')
})

test('a deployed plan contract keeps the switcher its template already carries, once', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  // The project takes the shipped Chinese side, which is what makes the pair one. The English
  // template already carries its half of the switcher, so deployment must not add a second.
  fixture.write(
    `${PLANS}/README.zh.md`,
    readFileSync(join(REPO_ROOT, 'skills/dsh-spec-manager/templates/plans-README.zh.md.template'), 'utf8'),
  )

  const output = sync(fixture)

  const switchers = fixture.read(`${PLANS}/README.md`).split('\n').filter(line => line.startsWith('English | [中文]('))
  assert.deepEqual(switchers, ['English | [中文](README.zh.md)'], `the deployed contract carries ${switchers.length} switcher line(s)`)
  assert.doesNotMatch(output, /plans\/README\.md/, `a sync reported work on a contract that matches:\n${output}`)
})

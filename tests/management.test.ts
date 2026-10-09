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
import { chmodSync, cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { runCli, runEntry, runScript } from './helpers/cli.ts'
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

/** The repository the manifest names, and the URL `gh skill install` writes for it. */
const COLLECTION_REPO = 'sunandsunshine-tech/dsh-spec'
const COLLECTION_URL = 'https://github.com/sunandsunshine-tech/dsh-spec'

/**
 * An installed `SKILL.md` carrying the metadata block `gh skill install` injects.
 *
 * `github-repo` is the source repository, which is what makes an installed directory's owner readable
 * offline; a case that omits it stands for an install that recorded no owner. The value is passed as
 * given, so a case can model either the URL the installer writes or the bare form the manifest uses.
 */
function installedSkill(ref: string, repo?: string): string {
  const source = repo === undefined ? '' : `    github-repo: ${repo}\n`
  return `---\nname: probe\nmetadata:\n${source}    github-ref: refs/heads/${ref}\n---\n# Probe\n`
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
function stubGh(fixture: Fixture, options: { releases?: unknown[], commit?: string, status?: number, installs?: boolean } = {}): () => string[] {
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
    `  "api repos/"*"/contents/"*) [ -f '${fixture.root}/gh-contents.json' ] && payload=$(cat '${fixture.root}/gh-contents.json') ;;`,
    '  *) : ;;',
    'esac',
    // An install that really leaves a directory behind, the way `gh skill install` does: a case that
    // needs the create half to see an installed optional skill cannot get there otherwise.
    ...(options.installs === true
      ? [
        'if [ "$1" = skill ] && [ "$2" = install ]; then',
        '  dir=""',
        '  prev=""',
        '  for a in "$@"; do',
        '    if [ "$prev" = "--dir" ]; then dir="$a"; fi',
        '    prev="$a"',
        '  done',
        '  spec="$4"',
        '  name="${spec%@*}"',
        '  ref="${spec#*@}"',
        '  mkdir -p "$dir/$name"',
        '  printf -- \'---\\nname: %s\\nmetadata:\\n    github-repo: https://github.com/sunandsunshine-tech/dsh-spec\\n    github-ref: refs/heads/%s\\n---\\n# %s\\n\' "$name" "$ref" "$name" > "$dir/$name/SKILL.md"',
        'fi',
      ]
      : []),
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

/** The contents-API answer the stand-in gives for a skill's `SKILL.md`, which is where a description lives. */
function withSkillFile(fixture: Fixture, text: string): void {
  fixture.write('gh-contents.json', JSON.stringify({ content: Buffer.from(text, 'utf8').toString('base64') }))
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
  // Nine, not ten: the tenth is the optional skill, this project never took it, and a refresh does
  // not install a choice the project did not make.
  assert.match(result.output, /upgrade 9 skill\(s\) .* at main/)
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
  // The optional skill is installed here, so the surface it owns has to be whole too.
  writePlanSurface(fixture)

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
  writePlanSurface(fixture)
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
 * The delivery-plan surface: the optional workflow skill owns it, so adoption creates it with that
 * skill and a refresh only maintains what is there.
 *
 * The tree and the hook are one surface — a project that took the optional skill holds both, and one
 * that did not holds neither — and the contract is a pair, so an adoption records the sidecar the
 * pairing gate checks. Removing the skill later turns the hook off and leaves the tree, with the plans
 * in it. The cases below cover the six states the plan names: taken, not taken, taken later,
 * refreshed, uninstalled, and half-installed.
 */

/** Install the optional skill whose presence turns the delivery-plan surface on. */
function installPlanSurface(fixture: Fixture): void {
  fixture.write('.agents/skills/dsh-agent-team-workflow/SKILL.md', installedSkill('main'))
}

/**
 * Give a fixture the manager the initializer reaches for, so a pair it creates is really recorded.
 *
 * A sidecar is generated by the entry point rather than shipped, so the create half runs it. A
 * fixture without that copy can hold the templates but not the record.
 */
function adoptManagerCopy(fixture: Fixture): void {
  cpSync(join(REPO_ROOT, 'skills', 'dsh-spec-manager'), join(fixture.root, '.agents', 'skills', 'dsh-spec-manager'), { recursive: true })
}

/** Adopt into a fixture, with the optional plan-surface skill unless a case says otherwise. */
function adopt(fixture: Fixture, options: { planSurface?: boolean } = {}): void {
  if (options.planSurface !== false) {
    installPlanSurface(fixture)
    adoptManagerCopy(fixture)
  }
  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--write'])
  assert.equal(result.status, 0, result.output)
}

/** Run the initializer's sync half, require it to succeed, and hand back what it reported. */
function sync(fixture: Fixture): string {
  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--sync', '--write'])
  assert.equal(result.status, 0, result.output)
  return result.output
}

/** The fixture's own entry point, which is the command a project runs. */
function fixtureCli(fixture: Fixture): string {
  return join(fixture.root, '.agents', 'skills', 'dsh-spec-manager', 'scripts', 'dsh-spec.ts')
}

test('an adoption that takes the optional skill creates the plan tree, its pair and the hook', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())

  adopt(fixture)

  for (const path of [`${PLANS}/README.md`, `${PLANS}/README.zh.md`, `${PLANS}/AGENTS.md`, `${PLANS}/README.i18n.yaml`]) {
    assert.equal(exists(fixture.root, path), true, `adoption did not create ${path}`)
  }
  const agents = fixture.read('AGENTS.md')
  assert.match(agents, /<!-- dsh-spec:agent-notes -->/, agents)
  assert.match(agents, /<!-- dsh-spec:plans -->/, agents)
  assert.match(agents, /## Delivery plans/, agents)
  assert.match(agents, /\]\(\.agents\/dsh-spec\/plans\/README\.md\)/, agents)
  assert.match(agents, /<!-- \/dsh-spec:plans -->\n$/, agents)

  // The pair the create half wrote passes the gate it belongs to, through the project's own entry
  // point rather than through this repository's.
  const checked = runEntry(fixtureCli(fixture), fixture.root, ['translation-pair', 'check', `${PLANS}/README.md`, '--root', fixture.root])
  assert.equal(checked.status, 0, checked.output)
})

test('an adoption that does not take the optional skill creates no plan tree and no hook', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())

  adopt(fixture, { planSurface: false })

  assert.equal(exists(fixture.root, PLANS), false, 'an adoption without the optional skill created the plan tree')
  const agents = fixture.read('AGENTS.md')
  assert.match(agents, /<!-- dsh-spec:agent-notes -->/, agents)
  assert.doesNotMatch(agents, /dsh-spec:plans/, agents)
})

test('a sync creates no tree that is not there, and no hook for a surface that is off', (t) => {
  const fixture = makeFixture({ 'AGENTS.md': '# A project\n\nOur own standing orders.\n' })
  t.after(() => fixture.dispose())

  const output = sync(fixture)

  assert.equal(exists(fixture.root, NOTES), false, `a sync created the notes tree:\n${output}`)
  assert.equal(exists(fixture.root, PLANS), false, `a sync created the plan tree:\n${output}`)
  const agents = fixture.read('AGENTS.md')
  assert.match(agents, /Our own standing orders\./, agents)
  assert.match(agents, /<!-- dsh-spec:agent-notes -->/, agents)
  assert.doesNotMatch(agents, /dsh-spec:plans/, agents)
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

test('a deployed plan contract keeps the single switcher its template already carries', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)

  // The English template already carries its half of the switcher, so deploying the pair must not
  // add a second, and a sync of the pair it just recorded must have nothing to do.
  const switchers = fixture.read(`${PLANS}/README.md`).split('\n').filter(line => line.startsWith('English | [中文]('))
  assert.deepEqual(switchers, ['English | [中文](README.zh.md)'], `the deployed contract carries ${switchers.length} switcher line(s)`)
  const output = sync(fixture)
  assert.doesNotMatch(output, /plans\/README\.md/, `a sync reported work on a contract that matches:\n${output}`)
})

test('an install that adds the optional skill creates the surface that skill owns', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  // A project that already holds the manager adopts again; the stand-in leaves each installed skill
  // directory behind the way `gh skill install` does, so the install's create half sees them.
  adoptManagerCopy(fixture)
  stubGh(fixture, { installs: true })

  const result = runCli(fixture.root, ['install', '--revision', 'main', '--with', 'dsh-agent-team-workflow'], { env: stubPath(fixture) })

  assert.equal(result.status, 0, result.output)
  for (const path of [`${PLANS}/README.md`, `${PLANS}/README.zh.md`, `${PLANS}/AGENTS.md`]) {
    assert.equal(exists(fixture.root, path), true, `the install did not create ${path}:\n${result.output}`)
  }
  assert.match(fixture.read('AGENTS.md'), /<!-- dsh-spec:plans -->/, result.output)
})

test('a refresh syncs the plan surface and never creates it', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  // No revision listing: the refresh installs what it selected through the stand-in and prunes
  // nothing, which is the path this case is about — the surface, not the skill plan.
  stubGh(fixture)

  fixture.write(`${PLANS}/AGENTS.md`, '# A stale copy of the orders\n')
  const synced = runCli(fixture.root, ['upgrade', '--only-skill-set', '--revision', 'main'], { env: stubPath(fixture) })
  assert.equal(synced.status, 0, synced.output)
  assert.match(fixture.read(`${PLANS}/AGENTS.md`), /Delivery plans/, 'a refresh did not sync the plan tree it found')

  rmSync(join(fixture.root, PLANS), { recursive: true, force: true })
  const again = runCli(fixture.root, ['upgrade', '--only-skill-set', '--revision', 'main'], { env: stubPath(fixture) })
  assert.equal(again.status, 0, again.output)
  assert.equal(exists(fixture.root, PLANS), false, 'a refresh gave back a plan tree the project removed')
})

test('uninstalling the optional skill keeps the plan tree and the plans, and removes the hook', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  adopt(fixture)
  fixture.write(`${PLANS}/2026-10-10-a-delivery.md`, '# A delivery plan\n')

  const result = runCli(fixture.root, ['uninstall', '--skill', 'dsh-agent-team-workflow'])

  assert.equal(result.status, 0, result.output)
  assert.equal(exists(fixture.root, `${PLANS}/2026-10-10-a-delivery.md`), true, 'the uninstall took the project\'s own plan')
  assert.equal(exists(fixture.root, `${PLANS}/README.md`), true, 'the uninstall took the plan contract')
  const agents = fixture.read('AGENTS.md')
  assert.doesNotMatch(agents, /dsh-spec:plans/, `the hook outlived the skill it belongs to:\n${agents}`)
  assert.match(agents, /<!-- dsh-spec:agent-notes -->/, agents)
})

test('status reports a delivery-plan surface that is half installed', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')

  const missing = runCli(fixture.root, ['status'])

  assert.equal(missing.status, 1, missing.output)
  assert.match(missing.output, /dsh-agent-team-workflow is installed but the delivery-plan surface is incomplete: the plan tree is missing/, missing.output)
  assert.match(missing.output, /the root AGENTS\.md carries no <!-- dsh-spec:plans --> hook/, missing.output)

  // The two halves adoption writes are what close the gap.
  fixture.write(`${PLANS}/README.md`, '# Delivery plans\n')
  fixture.write('AGENTS.md', '<!-- dsh-spec:plans -->\n## Delivery plans\n<!-- /dsh-spec:plans -->\n')
  const whole = runCli(fixture.root, ['status'])
  assert.equal(whole.status, 0, whole.output)
})

/**
 * Ownership: which installed directory is this collection's, and which is another collection's.
 *
 * Two collections share `.agents/skills/`, which is what #63 cost: a name this manifest does not
 * carry was a finding, and a neighbouring collection made this one's `status` fail. The owner is the
 * source repo `gh skill install` injected into the directory, read locally and never fetched.
 */

/** Every skill of the set except the optional one, installed at one ref. */
function installRequired(fixture: Fixture, ref: string, repo?: string): void {
  for (const skill of SKILLS.filter(name => name !== 'dsh-agent-team-workflow')) {
    fixture.write(`.agents/skills/${skill}/SKILL.md`, installedSkill(ref, repo))
  }
}

/** The plan surface a project that took the optional skill holds: the contract and its hook. */
function writePlanSurface(fixture: Fixture): void {
  fixture.write(`${PLANS}/README.md`, '# Delivery plans\n')
  fixture.write('AGENTS.md', '<!-- dsh-spec:agent-notes -->\n## Decision records\n<!-- /dsh-spec:agent-notes -->\n\n<!-- dsh-spec:plans -->\n## Delivery plans\n<!-- /dsh-spec:plans -->\n')
}

test("another collection's install beside this one does not fail this collection's status", (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  writePlanSurface(fixture)
  // Another collection's install carries the URL form the installer writes, and the line reports the
  // repository it names rather than the URL it recorded.
  fixture.write('.agents/skills/other-set/SKILL.md', installedSkill('main', 'https://github.com/someone-else/another-set'))
  fixture.write('.agents/skills/anonymous/SKILL.md', installedSkill('main'))

  const result = runCli(fixture.root, ['status'])

  // #63's reproduction: a neighbouring collection's directory used to make this exit 1.
  assert.equal(result.status, 0, `status failed over another collection's directory:\n${result.output}`)
  assert.match(result.output, /other +other-set +someone-else\/another-set — not this collection's, left alone/, result.output)
  assert.match(result.output, /other +anonymous +no metadata\.github-repo — not this collection's, left alone/, result.output)
})

/** A fixture holding a skill this collection installed and the revision no longer publishes. */
function retiredFixture(recorded: string): Fixture {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  installSet(fixture, 'main')
  fixture.write('.agents/skills/dsh-retired-probe/SKILL.md', installedSkill('main', recorded))
  return fixture
}

/** A fixture whose manager owns a retired skill is reported and removed, whichever form it recorded. */
function assertRetiredIsRemoved(fixture: Fixture): void {
  const retired = join(fixture.root, '.agents', 'skills', 'dsh-retired-probe')

  const reported = runCli(fixture.root, ['status'])
  assert.equal(reported.status, 1, reported.output)
  assert.match(reported.output, /dsh-retired-probe: installed from sunandsunshine-tech\/dsh-spec but this revision no longer publishes it — `upgrade` removes it/, reported.output)

  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  stubGh(fixture)
  const dry = runCli(fixture.root, ['upgrade', '--only-skill-set', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })
  assert.equal(dry.status, 0, dry.output)
  assert.match(dry.output, /would remove .*dsh-retired-probe — this revision no longer publishes dsh-retired-probe/, dry.output)
  assert.equal(existsSync(retired), true, 'a dry run removed the retired skill')

  const applied = runCli(fixture.root, ['upgrade', '--only-skill-set', '--revision', 'main'], { env: stubPath(fixture) })
  assert.equal(applied.status, 0, applied.output)
  assert.match(applied.output, /removed .*dsh-retired-probe — this revision no longer publishes dsh-retired-probe/, applied.output)
  assert.equal(existsSync(retired), false, 'upgrade left a skill the revision no longer publishes')
}

test('a skill this collection installed and the revision dropped is found through the URL the installer writes', (t) => {
  // What `gh skill install` records in every installed copy of this repository.
  const fixture = retiredFixture(COLLECTION_URL)
  t.after(() => fixture.dispose())

  assertRetiredIsRemoved(fixture)
})

test('the same retired skill is found when the source repository was recorded in the bare form', (t) => {
  const fixture = retiredFixture(COLLECTION_REPO)
  t.after(() => fixture.dispose())

  assertRetiredIsRemoved(fixture)
})

test('a trailing slash or `.git` on the recorded URL still names this collection', (t) => {
  for (const recorded of [`${COLLECTION_URL}/`, `${COLLECTION_URL}.git`, `https://github.com/${COLLECTION_REPO}/`]) {
    const fixture = retiredFixture(recorded)
    t.after(() => fixture.dispose())

    const reported = runCli(fixture.root, ['status'])

    assert.equal(reported.status, 1, `status did not find the retired skill recorded as ${recorded}:\n${reported.output}`)
    assert.match(reported.output, /dsh-retired-probe: installed from sunandsunshine-tech\/dsh-spec but this revision no longer publishes it/, reported.output)
  }
})

test('a refresh follows an optional skill the project holds and does not install one it never took', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installRequired(fixture, 'main')
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const calls = stubGh(fixture)

  const absent = runCli(fixture.root, ['upgrade', '--only-skill-set', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(absent.status, 0, absent.output)
  assert.match(absent.output, /upgrade 9 skill\(s\)/, absent.output)
  assert.deepEqual(
    installCalls(calls()).filter(call => call.includes('dsh-agent-team-workflow')),
    [],
    'a refresh installed an optional skill the project never took',
  )

  // The project takes it; from then on the optional skill follows the set like a required one.
  fixture.write('.agents/skills/dsh-agent-team-workflow/SKILL.md', installedSkill('main'))
  const present = runCli(fixture.root, ['upgrade', '--only-skill-set', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(present.status, 0, present.output)
  assert.match(present.output, /upgrade 10 skill\(s\)/, present.output)
  assert.equal(
    installCalls(calls()).filter(call => call.includes('dsh-agent-team-workflow')).length,
    1,
    `a held optional skill did not follow the set:\n${present.output}`,
  )
})

test('a missing optional skill is reported as absent rather than as a problem', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installRequired(fixture, 'main')

  const result = runCli(fixture.root, ['status'])

  assert.equal(result.status, 0, `status failed over the optional skill it was not given:\n${result.output}`)
  assert.match(result.output, /absent +dsh-agent-team-workflow +optional, not installed/, result.output)
})

test('uninstall removes one named skill, the whole set, and never another collection\'s directory', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  const foreign = join(fixture.root, '.agents', 'skills', 'other-set')
  fixture.write('.agents/skills/other-set/SKILL.md', installedSkill('main', 'https://github.com/someone-else/another-set'))

  const one = runCli(fixture.root, ['uninstall', '--skill', 'dsh-code-review'])
  assert.equal(one.status, 0, one.output)
  assert.equal(existsSync(join(fixture.root, '.agents', 'skills', 'dsh-code-review')), false, 'the named skill survived')
  assert.equal(existsSync(join(fixture.root, '.agents', 'skills', 'dsh-prose-standard')), true, '--skill removed more than the name it was given')

  // A name this manifest does not carry is an invocation error, so another collection's directory is
  // never even considered for removal.
  const unknown = runCli(fixture.root, ['uninstall', '--skill', 'other-set'])
  assert.equal(unknown.status, 2, unknown.output)
  assert.match(unknown.output, /--skill other-set is not a skill this collection publishes/, unknown.output)
  assert.equal(existsSync(foreign), true, "uninstall touched another collection's directory")

  // The entry point's flag table decides which command may be handed the flag, and how many times.
  const repeated = runCli(fixture.root, ['uninstall', '--skill', 'dsh-prose-standard', '--skill', 'dsh-code-review'])
  assert.equal(repeated.status, 2, repeated.output)
  assert.match(repeated.output, /uninstall takes --skill once/, repeated.output)

  const elsewhere = runCli(fixture.root, ['status', '--skill', 'dsh-code-review'])
  assert.equal(elsewhere.status, 2, elsewhere.output)
  assert.match(elsewhere.output, /status does not take --skill/, elsewhere.output)

  const rest = runCli(fixture.root, ['uninstall'])
  assert.equal(rest.status, 0, rest.output)
  assert.equal(existsSync(join(fixture.root, '.agents', 'skills', 'dsh-prose-standard')), false, 'the whole-set uninstall left a skill')
  assert.equal(existsSync(foreign), true, "the whole-set uninstall touched another collection's directory")
})

/**
 * The install's optional-skill question: who is asked, who is told the flag, and what a preview does.
 *
 * `process.stdin.isTTY` is what decides whether a person can be asked at all, and a pipe never
 * reports one — so the terminal case runs a probe that marks its own stdin as a terminal and then
 * runs the shipped install, with the pipe answering. Everything below stays offline: the `gh`
 * stand-in answers the revision, and `withSkillFile` answers the description the question quotes.
 */

/** A skill `SKILL.md` whose frontmatter carries the description a question quotes. */
function optionalSkillFile(description: string): string {
  return `---\nname: probe\ndescription: ${description}\n---\n# Probe\n`
}

/**
 * Run the shipped install with stdin claiming to be a terminal.
 *
 * The probe is the honest way to reach the asking path: it changes nothing about the manager, and
 * the answer travels the same readline a person's keystrokes would.
 */
function ttyInstall(fixture: Fixture, answers: string, options: { dryRun?: boolean } = {}): ReturnType<typeof runEntry> {
  const entry = join(fixture.root, 'tty-install.ts')
  const manager = pathToFileURL(join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'scripts', 'manager', 'install.ts')).href
  fixture.write('tty-install.ts', [
    "Object.defineProperty(process.stdin, 'isTTY', { value: true })",
    `const { installProject } = await import(${JSON.stringify(manager)})`,
    `await installProject(${JSON.stringify(fixture.root)}, { dryRun: ${options.dryRun === true}, jobs: 1, revision: 'main' })`,
    '',
  ].join('\n'))
  return runEntry(entry, fixture.root, [], { stdin: answers, env: stubPath(fixture) })
}

test('an install in a shell that is not a terminal names the flag and adds nothing optional', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const calls = stubGh(fixture)

  const planned = runCli(fixture.root, ['install', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(planned.status, 0, planned.output)
  assert.match(planned.output, /optional not installed: dsh-agent-team-workflow — pass --with dsh-agent-team-workflow to add it/, planned.output)
  assert.match(planned.output, /install 9 skill\(s\)/, planned.output)
  assert.doesNotMatch(planned.output, /would run: .*dsh-agent-team-workflow/, planned.output)

  const applied = runCli(fixture.root, ['install', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(applied.status, 0, applied.output)
  assert.match(applied.output, /optional not installed: dsh-agent-team-workflow/, applied.output)
  assert.deepEqual(
    installCalls(calls()).filter(call => call.includes('dsh-agent-team-workflow')),
    [],
    'an install with nobody to ask added the optional skill anyway',
  )
})

test('--with takes an optional skill without asking, and names anything else it is given', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  const calls = stubGh(fixture)

  // The flag is repeatable: it is the agent's way of answering, and answering twice is not an error.
  const taken = runCli(fixture.root, ['install', '--revision', 'main', '--with', 'dsh-agent-team-workflow', '--with', 'dsh-agent-team-workflow'], { env: stubPath(fixture) })

  assert.equal(taken.status, 0, taken.output)
  assert.match(taken.output, /with: dsh-agent-team-workflow — named by --with, no question asked/, taken.output)
  assert.match(taken.output, /install 10 skill\(s\)/, taken.output)
  assert.equal(
    installCalls(calls()).filter(call => call.includes('dsh-agent-team-workflow')).length,
    1,
    `--with installed the optional skill a number of times other than once:\n${taken.output}`,
  )

  const alreadyRequired = runCli(fixture.root, ['install', '--dry-run', '--revision', 'main', '--with', 'dsh-code-review'])
  assert.equal(alreadyRequired.status, 2, alreadyRequired.output)
  assert.match(alreadyRequired.output, /--with dsh-code-review is not optional/, alreadyRequired.output)

  const unknown = runCli(fixture.root, ['install', '--dry-run', '--revision', 'main', '--with', 'dsh-not-shipped'])
  assert.equal(unknown.status, 2, unknown.output)
  assert.match(unknown.output, /--with dsh-not-shipped is not a skill this collection publishes/, unknown.output)

  const elsewhere = runCli(fixture.root, ['status', '--with', 'dsh-agent-team-workflow'])
  assert.equal(elsewhere.status, 2, elsewhere.output)
  assert.match(elsewhere.output, /status does not take --with/, elsewhere.output)
})

test('a terminal is asked about each optional skill, and the default answer is no', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  withSkillFile(fixture, optionalSkillFile('Use when a delivery needs planning. A second sentence stays out.'))
  const calls = stubGh(fixture)

  // An empty line is the whole answer: the question defaults to no.
  const declined = ttyInstall(fixture, '\n')

  assert.equal(declined.status, 0, declined.output)
  assert.match(declined.output, /dsh-agent-team-workflow — Use when a delivery needs planning\.\n  add it\? \[y\/N\] /, declined.output)
  assert.doesNotMatch(declined.output, /A second sentence stays out/, 'the question quoted more than the first sentence')
  assert.match(declined.output, /install 9 skill\(s\)/, declined.output)
  assert.deepEqual(
    installCalls(calls()).filter(call => call.includes('dsh-agent-team-workflow')),
    [],
    'a question answered with the default installed the optional skill',
  )

  const accepted = ttyInstall(fixture, 'y\n')

  assert.equal(accepted.status, 0, accepted.output)
  assert.match(accepted.output, /install 10 skill\(s\)/, accepted.output)
  assert.equal(
    installCalls(calls()).filter(call => call.includes('dsh-agent-team-workflow')).length,
    1,
    `a question answered yes did not install the optional skill:\n${accepted.output}`,
  )
})

test('a preview prints the question and the answer it would take, and reads no stdin', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  withSkillFile(fixture, optionalSkillFile('Use when a delivery needs planning.'))
  stubGh(fixture)

  // `y` is waiting on stdin: a preview that read it would plan the optional skill.
  const result = ttyInstall(fixture, 'y\n', { dryRun: true })

  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /would ask: dsh-agent-team-workflow.*answer: no \(pass --with dsh-agent-team-workflow to install it\)/, result.output)
  assert.match(result.output, /install 9 skill\(s\)/, result.output)
  assert.doesNotMatch(result.output, /would run: .*dsh-agent-team-workflow/, result.output)
})

test('an install leaves an optional skill the project already holds where it is', (t) => {
  const fixture = makeFixture({ 'README.md': '# A project\n' })
  t.after(() => fixture.dispose())
  installSet(fixture, 'main')
  fixture.write('.agents/skills/dsh-agent-team-workflow/SKILL.md', installedSkill('older'))
  withTree(fixture, oneFilePerSkill(skill => digest(`main-${skill}`)))
  stubGh(fixture)

  const reported = runCli(fixture.root, ['status'])
  assert.equal(reported.status, 1, reported.output)
  assert.match(reported.output, /dsh-agent-team-workflow: at older, the manager is at main/, reported.output)

  // An install adds what it is asked to add; it maintains nothing. The held optional is not in the
  // selection, so it is neither updated nor pruned, and `upgrade` is the verb that moves it.
  const installed = runCli(fixture.root, ['install', '--dry-run', '--revision', 'main'], { env: stubPath(fixture) })

  assert.equal(installed.status, 0, installed.output)
  assert.match(installed.output, /install 9 skill\(s\)/, installed.output)
  assert.doesNotMatch(installed.output, /(would run|would remove).*dsh-agent-team-workflow/, installed.output)
})

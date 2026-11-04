// Tests for the bundled notes.mjs checks. Each test builds its own Git project in a temporary
// directory through the shared fixture helpers and runs the real script, so no case touches the
// repository's own checkout or the network.

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmodSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { skillBundle } from './helpers/bundles.ts'
import { runScript } from './helpers/cli.ts'
import { isolatedGitEnv, makeIsolatedFixture, runGit } from './helpers/fixtures.ts'
import type { CleanupContext, Fixture } from './helpers/fixtures.ts'
import { makeWorkspace } from './helpers/workspace.ts'

const SCRIPT = skillBundle('dsh-spec-agent-notes', 'notes.mjs')

const PROPOSED = `# Agent Note: A proposal

Status: proposed

## Problem

A problem that needs a decision.

## Proposal

Do the proposed thing.

## Alternatives considered

**Keep the current behavior.** It lost because the problem is real.

## Acceptance criteria

The observable state after the change.

## Risks

What could go wrong and what the change gives up.
`

const IMPLEMENTED = `# Agent Note: A decision

Status: implemented

## Problem

A problem that needed a decision.

## Decision

The decision, as it shipped.

## Alternatives considered

**Do nothing.** It lost because the problem was real.

## Consequences

What the trade-off cost and bought.
`

const REJECTED = `# Agent Note: A rejection

Status: rejected — the cost outweighed the benefit

## Problem

A problem that needed a decision.

## Proposal

The declined proposal.

## Alternatives considered

**The proposal.** It lost because the cost outweighed the benefit.
`

const ROOT = '.agents/dsh-spec-agent-notes'

function makeProject(t: CleanupContext): Fixture {
  const project = makeIsolatedFixture({ 'README.md': '# project\n' }, { cleanup: t })
  project.commit('initial')
  return project
}

function initTree(project: Fixture | string): void {
  const result = run(project, ['init'])
  assert.equal(result.status, 0, result.stdout + result.stderr)
}

function run(target: Fixture | string, args: string[]) {
  const directory = typeof target === 'string' ? target : target.root
  const env = typeof target === 'string' ? isolatedGitEnv(directory) : target.env
  return runScript(SCRIPT, args, directory, { env })
}

function archived(note, date = '2026-10-03') {
  return note.replace('Status: implemented', `Status: implemented\nArchived: ${date}`)
}

function seedSealedArchive(project, date = '2026-10-03') {
  initTree(project)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  project.commit('implemented note')
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED, date))
  project.remove(`${ROOT}/implemented/feature/2026-10-02-ship.md`)
  const sealed = run(project, ['archive', '--write'])
  assert.equal(sealed.status, 0, sealed.stdout + sealed.stderr)
  project.commit('seal')
}

test('check passes a valid proposed and implemented tree', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/proposed/process/2026-10-01-try-a-policy.md`, PROPOSED)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  project.write(`${ROOT}/proposed/AGENTS.md`, '# local instructions\n')
  const result = run(project, ['check'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /2 note\(s\)/)
})

test('check rejects unknown lifecycle, class and filename folders', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/drafting/process/2026-10-01-x.md`, PROPOSED)
  project.write(`${ROOT}/implemented/refactor/2026-10-02-ship.md`, IMPLEMENTED)
  project.write(`${ROOT}/implemented/feature/no-date.md`, IMPLEMENTED)
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unknown lifecycle folder/)
  assert.match(result.stdout, /unknown class folder/)
  assert.match(result.stdout, /filename must be yyyy-mm-dd-topic\.md/)
})

test('check checks the filename shape only and rejects INDEX.md', (t) => {
  const project = makeProject(t)
  // The source regex accepts a syntactically dated name even when the date is not a real calendar date.
  project.write(`${ROOT}/implemented/feature/2026-02-30-ship.md`, IMPLEMENTED)
  project.write(`${ROOT}/implemented/feature/no-date.md`, IMPLEMENTED)
  project.write(`${ROOT}/INDEX.md`, '# index\n')
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /filename must be yyyy-mm-dd-topic\.md/)
  assert.match(result.stdout, /centralized note indexes are forbidden/)
  assert.doesNotMatch(result.stdout, /2026-02-30/)
})

test('check rejects a status that disagrees with the lifecycle', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/proposed/process/2026-10-01-x.md`, PROPOSED.replace('Status: proposed', 'Status: implemented'))
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /proposed status grammar/)
})

test('check rejects a missing required section and a missing alternatives section', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED.replace('## Consequences\n', ''))
  project.write(`${ROOT}/proposed/process/2026-10-01-x.md`, PROPOSED.replace('## Alternatives considered\n', ''))
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /missing the required .## Consequences./)
  assert.match(result.stdout, /missing .## Alternatives considered./)
})

test('check rejects proposal-era headings in implemented notes but ignores fenced examples', (t) => {
  const project = makeProject(t)
  project.write(
    `${ROOT}/implemented/feature/2026-10-02-ship.md`,
    IMPLEMENTED.replace('## Consequences\n', '## Acceptance criteria\n\nIt works.\n'),
  )
  const fenced = IMPLEMENTED.replace('## Consequences\n', '## Consequences\n\n\`\`\`markdown\n## Proposal\n\`\`\`\n')
  project.write(`${ROOT}/implemented/architecture/2026-10-03-keep.md`, fenced)
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /proposal-era heading/)
  assert.doesNotMatch(result.stdout, /2026-10-03-keep\.md/)
})

test('check pairs declared companions with their source note', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/proposed/process/2026-10-01-x.md`, PROPOSED)
  project.write(`${ROOT}/proposed/process/2026-10-01-x.zh.md`, '# 笔记\n\nStatus: proposed\n\n## 问题\n')
  const paired = run(project, ['check', '--companion', '.zh.md'])
  assert.equal(paired.status, 0, paired.stdout)
  assert.match(paired.stdout, /1 companion\(s\)/)
  project.write(`${ROOT}/proposed/process/2026-10-09-orphan.zh.md`, '# 孤儿\n')
  const orphan = run(project, ['check', '--companion', '.zh.md'])
  assert.equal(orphan.status, 1)
  assert.match(orphan.stdout, /no source note 2026-10-09-orphan\.md/)
})

test('check resolves a non-default root against the project root', (t) => {
  const project = makeProject(t)
  project.write(`docs/notes/proposed/process/2026-10-01-x.md`, PROPOSED)
  const result = run(project, ['check', '--root', 'docs/notes'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /1 note\(s\)/)
})

test('archive refuses an archive without a manifest', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED))
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /manifest\.json is required/)
  assert.match(result.stdout, /not sealed in manifest\.json/)
  assert.match(result.stdout, /seal it with .archive --write./)
})

test('archive --write seals a unit and the sealed archive verifies', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  const result = run(project, ['archive'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /1 frozen artifact/)
  const manifest = JSON.parse(project.read(`${ROOT}/archived/manifest.json`))
  assert.equal(manifest.version, 1)
  assert.match(manifest.files['feature/2026-10-02-ship.md'], /^sha256:[0-9a-f]{64}$/)
})

test('archive rejects a changed sealed artifact', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  project.write(
    `${ROOT}/archived/feature/2026-10-02-ship.md`,
    `${project.read(`${ROOT}/archived/feature/2026-10-02-ship.md`)}tampered\n`,
  )
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /sealed content hash changed/)
})

test('archive rejects a manifest entry removed against the baseline', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  const path = `${ROOT}/archived/manifest.json`
  const manifest = JSON.parse(project.read(path))
  manifest.files = {}
  project.write(path, `${JSON.stringify(manifest, null, 2)}\n`)
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /sealed manifest entry is missing/)
})

test('archive rejects a sealed artifact that is missing', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  project.remove(`${ROOT}/archived/feature/2026-10-02-ship.md`)
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /sealed artifact is missing/)
})

test('archive rejects archive metadata without the Archived line', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, IMPLEMENTED)
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /requires Archived: YYYY-MM-DD/)
})

test('archive rejects an unknown class directory', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/archived/refactor/2026-10-02-ship.md`, archived(IMPLEMENTED))
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unknown class folder/)
})

test('archive enforces declared companion completeness', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  project.commit('implemented note')
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED))
  project.write(
    `${ROOT}/archived/feature/2026-10-02-ship.zh.md`,
    archived(IMPLEMENTED.replace('A decision', '一个决定')),
  )
  const missing = run(project, ['archive', '--write', '--companion', '.zh.md', '--companion', '.i18n.yaml'])
  assert.equal(missing.status, 1)
  assert.match(missing.stdout, /incomplete unit; missing feature\/2026-10-02-ship\.i18n\.yaml/)
})

test('check gates the pre-format alternatives comment by the adoption date', (t) => {
  const project = makeProject(t)
  const comment = '<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->'
  const preFormat = PROPOSED.replace(
    '## Alternatives considered\n\n**Keep the current behavior.** It lost because the problem is real.\n',
    `${comment}\n`,
  )
  project.write(`${ROOT}/proposed/process/2026-06-01-old.md`, preFormat)
  const withoutDate = run(project, ['check'])
  assert.equal(withoutDate.status, 1)
  assert.match(withoutDate.stdout, /requires --format-adopted/)
  const accepted = run(project, ['check', '--format-adopted', '2026-07-05'])
  assert.equal(accepted.status, 0, accepted.stdout)
  project.write(`${ROOT}/proposed/process/2026-08-01-new.md`, preFormat)
  const late = run(project, ['check', '--format-adopted', '2026-07-05'])
  assert.equal(late.status, 1)
  assert.match(late.stdout, /only valid for notes dated before 2026-07-05/)
})

test('check pairs a lifecycle-root companion with its allowlisted source', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/implemented/AGENTS.zh.md`, '# 生命周期说明\n')
  project.write(`${ROOT}/implemented/AGENTS.i18n.yaml`, 'AGENTS.md: 0000000000000000000000000000000000000000\n')
  const orphanMarkdown = run(project, ['check', '--companion', '.zh.md'])
  assert.equal(orphanMarkdown.status, 1)
  assert.match(orphanMarkdown.stdout, /no source note AGENTS\.md/)
  const orphanRecord = run(project, ['check', '--companion', '.i18n.yaml'])
  assert.equal(orphanRecord.status, 1)
  assert.match(orphanRecord.stdout, /no source note AGENTS\.md/)
  project.write(`${ROOT}/implemented/AGENTS.md`, '# lifecycle instructions\n')
  const paired = run(project, ['check', '--companion', '.zh.md', '--companion', '.i18n.yaml'])
  assert.equal(paired.status, 0, paired.stdout)
  assert.match(paired.stdout, /2 companion\(s\)/)
})

test('check ignores an empty class directory and rejects Markdown nested deeper', (t) => {
  const project = makeProject(t)
  project.mkdir(`${ROOT}/implemented/feature`)
  project.mkdir(`${ROOT}/implemented/refactor`)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  const empty = run(project, ['check'])
  assert.equal(empty.status, 0, empty.stdout)
  project.write(`${ROOT}/implemented/feature/nested/2026-10-03-other.md`, IMPLEMENTED)
  const nested = run(project, ['check'])
  assert.equal(nested.status, 1)
  assert.match(nested.stdout, /nested deeper/)
})

test('check accepts a valid rejected note and rejects a broken one', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/rejected/simplification/2026-10-01-drop-it.md`, REJECTED)
  const valid = run(project, ['check'])
  assert.equal(valid.status, 0, valid.stdout)
  project.write(
    `${ROOT}/rejected/simplification/2026-10-01-drop-it.md`,
    REJECTED.replace('Status: rejected — the cost outweighed the benefit', 'Status: rejected'),
  )
  const status = run(project, ['check'])
  assert.equal(status.status, 1)
  assert.match(status.stdout, /rejected status grammar/)
  project.write(`${ROOT}/rejected/simplification/2026-10-01-drop-it.md`, REJECTED.replace('## Proposal\n', ''))
  const skeleton = run(project, ['check'])
  assert.equal(skeleton.status, 1)
  assert.match(skeleton.stdout, /missing the required .## Proposal./)
})

test('archive requires one identical Archived date across Markdown sides', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  project.commit('implemented note')
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED, '2026-10-03'))
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.zh.md`, archived(IMPLEMENTED, '2026-10-04'))
  const result = run(project, ['archive', '--write', '--companion', '.zh.md'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /different archive dates/)
})

test('archive rejects an invalid or predating archive date', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  project.commit('implemented note')
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED, '2026-02-30'))
  const invalid = run(project, ['archive', '--write'])
  assert.equal(invalid.status, 1)
  assert.match(invalid.stdout, /valid date/)
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED, '2026-09-01'))
  const predating = run(project, ['archive', '--write'])
  assert.equal(predating.status, 1)
  assert.match(predating.stdout, /predates the note date/)
})

test('archive --write is a no-op when nothing changed', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  const before = project.read(`${ROOT}/archived/manifest.json`)
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /sealed 0 new artifact\(s\)/)
  assert.equal(project.read(`${ROOT}/archived/manifest.json`), before)
})

test('archive reads a trusted external baseline with --base-ref', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(`${ROOT}/implemented/feature/2026-10-02-ship.md`, IMPLEMENTED)
  project.commit('implemented note')
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, archived(IMPLEMENTED))
  project.remove(`${ROOT}/implemented/feature/2026-10-02-ship.md`)
  assert.equal(run(project, ['archive', '--write']).status, 0)
  project.commit('seal')
  const sealCommit = project.gitOk('rev-parse', 'HEAD').trim()
  project.write(`${ROOT}/implemented/process/2026-10-03-next.md`, PROPOSED)
  project.commit('next note')
  const ok = run(project, ['archive', '--base-ref', sealCommit])
  assert.equal(ok.status, 0, ok.stdout)
  const missing = run(project, ['archive', '--base-ref', 'does-not-exist'])
  assert.equal(missing.status, 1)
  assert.match(missing.stdout, /cannot read baseline/)
})

test('check passes an empty active tree with a zero count', (t) => {
  const project = makeProject(t)
  project.mkdir(`${ROOT}/implemented/feature`)
  const result = run(project, ['check'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /0 note\(s\)/)
})

test('archive passes an empty sealed archive with a zero count', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write('README.md', '# project\n')
  project.commit('initial')
  project.write(`${ROOT}/archived/manifest.json`, '{\n  "version": 1,\n  "files": {}\n}\n')
  const result = run(project, ['archive'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /0 frozen artifact/)
})

test('archive --write writes nothing when a check fails', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write('README.md', '# project\n')
  project.commit('initial')
  project.write(`${ROOT}/archived/feature/2026-10-02-ship.md`, IMPLEMENTED)
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.equal(project.exists(`${ROOT}/archived/manifest.json`), false)
})

test('archive accepts a project-internal root whose name starts with dots', (t) => {
  const project = makeProject(t)
  project.write('README.md', '# project\n')
  project.commit('initial')
  const initialized = run(project, ['init', '--root', '..notes'])
  assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr)
  project.write(`..notes/archived/manifest.json`, '{\n  "version": 1,\n  "files": {}\n}\n')
  const result = run(project, ['archive', '--root', '..notes'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /0 frozen artifact/)
})

test('usage errors exit 2 and --json reports the summary', (t) => {
  const project = makeProject(t)
  project.write(`${ROOT}/proposed/process/2026-10-01-x.md`, PROPOSED)
  const usage = run(project, ['check', '--base-ref', 'HEAD'])
  assert.equal(usage.status, 2)
  assert.match(usage.stderr, /^notes\.mjs: .*--base-ref belong to archive\nrun "notes\.mjs --help" for usage\n$/)
  const json = run(project, ['check', '--json'])
  assert.equal(json.status, 0, json.stdout)
  assert.match(json.stdout, /^\{\n  "command"/)
  const summary = JSON.parse(json.stdout)
  assert.equal(summary.ok, true)
  assert.equal(summary.notes, 1)
  assert.deepEqual(summary.violations, [])
})

test('init creates the default notes skeleton idempotently', (t) => {
  const project = makeProject(t)
  const first = run(project, ['init'])
  assert.equal(first.status, 0, first.stdout + first.stderr)
  for (const kind of ['feature', 'bug-fix', 'simplification', 'architecture', 'process', 'testing']) {
    assert.equal(project.exists(`${ROOT}/archived/${kind}/.gitkeep`), true)
    assert.equal(project.exists(`${ROOT}/proposed/${kind}/.gitkeep`), true)
  }
  assert.equal(project.exists(`${ROOT}/archived/manifest.json`), false)
  assert.equal(project.exists(`${ROOT}/archived/AGENTS.md`), false)
  project.write(ROOT + '/proposed/process/AGENTS.md', '# adopter additions\n')
  const second = run(project, ['init'])
  assert.equal(second.status, 0, second.stdout)
  assert.match(second.stdout, /already initialized/)
  assert.equal(project.read(ROOT + '/proposed/process/AGENTS.md'), '# adopter additions\n')
})

test('init rejects a notes root outside the project', (t) => {
  const project = makeProject(t)
  const result = run(project, ['init', '--root', '../outside'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /outside the project root/)
})

test('init rejects a notes root inside the project Git directory', (t) => {
  const project = makeProject(t)
  const result = run(project, ['init', '--root', '.git/notes'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inside the project's Git directory/)
})

test('check requires a Git repository', (t) => {
  const workspace = makeWorkspace()
  t.after(() => workspace.dispose())
  workspace.write(ROOT + '/proposed/process/2026-10-01-x.md', PROPOSED)
  const result = run(workspace.root, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /not a Git repository/)
})

test('archive requires a Git repository', (t) => {
  const workspace = makeWorkspace()
  t.after(() => workspace.dispose())
  const result = run(workspace.root, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /not a Git repository/)
})

test('check uses the default notes root', (t) => {
  const project = makeProject(t)
  project.write(ROOT + '/proposed/process/2026-10-01-x.md', PROPOSED)
  const result = run(project, ['check'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /1 note\(s\)/)
})

test('check rejects a symlinked notes root that resolves outside the project', (t) => {
  const project = makeProject(t)
  const external = makeWorkspace()
  t.after(() => external.dispose())
  external.write('proposed/process/2026-10-01-x.md', PROPOSED)
  symlinkSync(external.root, join(project.root, 'notes-link'))
  const result = run(project, ['check', '--root', 'notes-link'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /outside the project root/)
})

test('archive requires the init skeleton', (t) => {
  const project = makeProject(t)
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /run "notes.mjs init" first/)
})

test('archive requires every archived class directory', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.remove(`${ROOT}/archived/testing`)
  project.write(ROOT + '/archived/manifest.json', '{\n  "version": 1,\n  "files": {}\n}\n')
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /required class directory is missing/)
})

test('archive verification requires the manifest tracked by Git', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  assert.equal(run(project, ['archive', '--write']).status, 0)
  const untracked = run(project, ['archive'])
  assert.equal(untracked.status, 1)
  assert.match(untracked.stdout, /is not tracked by Git/)
  project.gitOk('add', ROOT + '/archived')
  const staged = run(project, ['archive'])
  assert.equal(staged.status, 0, staged.stdout)
  project.commit('seal')
  const committed = run(project, ['archive'])
  assert.equal(committed.status, 0, committed.stdout)
})

test('archive rejects a fabricated view whose manifest stays untracked', (t) => {
  const project = makeProject(t)
  project.write('README.md', '# project\n')
  project.commit('initial')
  const view = join(project.root, 'sub')
  project.mkdir('sub')
  project.write('sub/.git', 'gitdir: ' + join(project.root, '.git') + '\n')
  const initialized = run(view, ['init'])
  assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr)
  project.write('sub/' + ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  const sealed = run(view, ['archive', '--write'])
  assert.equal(sealed.status, 0, sealed.stdout + sealed.stderr)
  const verified = run(view, ['archive'])
  assert.equal(verified.status, 1)
  assert.match(verified.stdout, /is not tracked by Git/)
})

test('archive accepts a linked worktree as the project checkout', (t) => {
  const project = makeProject(t)
  project.write('README.md', '# project\n')
  project.commit('initial')
  const worktree = makeWorkspace()
  t.after(() => worktree.dispose())
  const linked = join(worktree.root, 'linked')
  project.gitOk('worktree', 'add', '-q', linked, '-b', 'linked')
  const initialized = run(linked, ['init'])
  assert.equal(initialized.status, 0, initialized.stdout + initialized.stderr)
  worktree.write('linked/' + ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  const sealed = run(linked, ['archive', '--write'])
  assert.equal(sealed.status, 0, sealed.stdout + sealed.stderr)
  runGit(linked, ['add', ROOT + '/archived'])
  runGit(linked, ['-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'seal'])
  const verified = run(linked, ['archive'])
  assert.equal(verified.status, 0, verified.stdout)
})

test('archive accepts historical units when the declared companion set grows', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-old.md', archived(IMPLEMENTED))
  assert.equal(run(project, ['archive', '--write']).status, 0)
  project.commit('old seal')
  project.write(
    ROOT + '/archived/feature/2026-10-03-new.md',
    archived(IMPLEMENTED.replace('A decision', 'A new decision')),
  )
  project.write(
    ROOT + '/archived/feature/2026-10-03-new.zh.md',
    archived(IMPLEMENTED.replace('A decision', 'A new decision')),
  )
  const sealed = run(project, ['archive', '--write', '--companion', '.zh.md'])
  assert.equal(sealed.status, 0, sealed.stdout)
  project.commit('new seal')
  const verified = run(project, ['archive', '--companion', '.zh.md'])
  assert.equal(verified.status, 0, verified.stdout)
})

test('archive rejects an artifact added to a sealed unit', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-old.md', archived(IMPLEMENTED))
  assert.equal(run(project, ['archive', '--write']).status, 0)
  project.commit('seal')
  project.write(ROOT + '/archived/feature/2026-10-02-old.zh.md', archived(IMPLEMENTED))
  const result = run(project, ['archive', '--write', '--companion', '.zh.md'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /sealed unit cannot gain artifact/)
})

test('archive requires declared companions for a newly sealed unit', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-new.md', archived(IMPLEMENTED))
  const result = run(project, ['archive', '--write', '--companion', '.zh.md'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /incomplete unit; missing .*\.zh\.md/)
})

test('archive allows an optional archived/AGENTS.md without sealing it', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/AGENTS.md', '# archive policy\n')
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  const sealed = run(project, ['archive', '--write'])
  assert.equal(sealed.status, 0, sealed.stdout + sealed.stderr)
  const manifest = JSON.parse(project.read(ROOT + '/archived/manifest.json'))
  assert.deepEqual(Object.keys(manifest.files), ['feature/2026-10-02-ship.md'])
  project.commit('seal')
  const verified = run(project, ['archive'])
  assert.equal(verified.status, 0, verified.stdout)
})

test('check follows a symlinked lifecycle folder and a symlinked note file', (t) => {
  const project = makeProject(t)
  project.mkdir('real-tree/feature')
  project.write('real-tree/feature/2026-10-02-ship.md', IMPLEMENTED)
  project.mkdir(ROOT)
  symlinkSync(join(project.root, 'real-tree'), join(project.root, ROOT, 'implemented'))
  project.write('real-note.md', PROPOSED)
  project.mkdir(`${ROOT}/proposed/process`)
  symlinkSync(join(project.root, 'real-note.md'), join(project.root, ROOT, 'proposed', 'process', '2026-10-03-link.md'))
  const result = run(project, ['check'])
  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /2 note\(s\)/)
})

test('check reports a broken Markdown symlink instead of skipping it', (t) => {
  const project = makeProject(t)
  project.write(ROOT + '/implemented/feature/2026-10-02-ship.md', IMPLEMENTED)
  symlinkSync(
    join(project.root, 'missing.md'),
    join(project.root, ROOT, 'implemented', 'feature', '2026-10-03-broken.md'),
  )
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unreadable entry/)
})

test('check reports a broken declared companion', (t) => {
  const project = makeProject(t)
  project.write(ROOT + '/proposed/process/2026-10-01-x.md', PROPOSED)
  symlinkSync(
    join(project.root, 'missing.zh.md'),
    join(project.root, ROOT, 'proposed', 'process', '2026-10-01-x.zh.md'),
  )
  const result = run(project, ['check', '--companion', '.zh.md'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unreadable entry/)
})

test('archive matches the longest declared companion suffix regardless of order', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  project.write(ROOT + '/archived/feature/2026-10-02-ship.yaml', 'sidecar: one\n')
  project.write(ROOT + '/archived/feature/2026-10-02-ship.i18n.yaml', 'en.md: 0\n')
  const sealed = run(project, ['archive', '--write', '--companion', '.yaml', '--companion', '.i18n.yaml'])
  assert.equal(sealed.status, 0, sealed.stdout)
  const manifest = JSON.parse(project.read(ROOT + '/archived/manifest.json'))
  assert.deepEqual(Object.keys(manifest.files).sort(), [
    'feature/2026-10-02-ship.i18n.yaml',
    'feature/2026-10-02-ship.md',
    'feature/2026-10-02-ship.yaml',
  ])
  project.commit('seal')
  const reversed = run(project, ['archive', '--write', '--companion', '.i18n.yaml', '--companion', '.yaml'])
  assert.equal(reversed.status, 0, reversed.stdout)
  assert.match(reversed.stdout, /sealed 0 new artifact/)
})

test('init rejects a root symlink that resolves outside the project', (t) => {
  const project = makeProject(t)
  const outside = makeWorkspace()
  t.after(() => outside.dispose())
  symlinkSync(outside.root, join(project.root, 'notes-link'))
  const result = run(project, ['init', '--root', 'notes-link'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /outside the project root/)
  assert.equal(outside.exists('proposed'), false)
})

test('init rejects a root symlink that resolves into the project Git directory', (t) => {
  const project = makeProject(t)
  symlinkSync(join(project.root, '.git'), join(project.root, 'gitlink'))
  const result = run(project, ['init', '--root', 'gitlink/notes'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inside the project's Git directory/)
  assert.equal(project.exists('.git/notes'), false)
})

test('init reports a non-directory obstacle instead of crashing', (t) => {
  const project = makeProject(t)
  project.write(ROOT + '/proposed', 'not a directory\n')
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /parent path is not a directory/)
  assert.match(result.stdout, /FAIL init/)
})

test('check reports a malformed header line', (t) => {
  const project = makeProject(t)
  project.write(
    ROOT + '/proposed/process/2026-10-01-x.md',
    PROPOSED.replace('# Agent Note: A proposal', '# Not a note'),
  )
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /line 1 must be/)
})

test('--help exits 0 and prints usage', (t) => {
  const project = makeProject(t)
  const result = run(project, ['--help'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /usage: notes.mjs/)
})

test('check requires a worktree, not a bare repository', (t) => {
  const bare = makeWorkspace()
  t.after(() => bare.dispose())
  runGit(bare.root, ['init', '--bare', '-q'])
  const result = run(bare.root, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /bare Git repository with no worktree/)
})

test('archive --write reports a missing baseline in a project without a commit', (t) => {
  const project = makeWorkspace()
  t.after(() => project.dispose())
  runGit(project.root, ['init', '-q'])
  initTree(project.root)
  const result = run(project.root, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /cannot read baseline/)
})

test('archive rejects a manifest hash that changed against the baseline', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  const path = ROOT + '/archived/manifest.json'
  const manifest = JSON.parse(project.read(path))
  manifest.files['feature/2026-10-02-ship.md'] = 'sha256:' + '0'.repeat(64)
  project.write(path, JSON.stringify(manifest, null, 2) + '\n')
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /sealed manifest hash changed/)
})

test('archive rejects an unsealed artifact beside a tracked manifest', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  project.write(ROOT + '/archived/feature/2026-10-04-extra.md', archived(IMPLEMENTED))
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /not sealed in manifest.json/)
})

test('archive --write rejects an artifact added to a sealed unit against the baseline', (t) => {
  const project = makeProject(t)
  seedSealedArchive(project)
  const sealCommit = project.gitOk('rev-parse', 'HEAD').trim()
  project.write(ROOT + '/archived/feature/2026-10-02-ship.zh.md', archived(IMPLEMENTED))
  const content = project.read(ROOT + '/archived/feature/2026-10-02-ship.zh.md')
  const hash = 'sha256:' + createHash('sha256').update(content).digest('hex')
  const path = ROOT + '/archived/manifest.json'
  const manifest = JSON.parse(project.read(path))
  manifest.files['feature/2026-10-02-ship.zh.md'] = hash
  project.write(path, JSON.stringify(manifest, null, 2) + '\n')
  project.commit('added companion')
  const result = run(project, ['archive', '--write', '--base-ref', sealCommit, '--companion', '.zh.md'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /sealed unit cannot gain artifact/)
})

test('archive treats Markdown metadata case-sensitively', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  project.write(ROOT + '/archived/feature/2026-10-02-ship.ZH.MD', 'not metadata\n')
  const result = run(project, ['archive', '--write', '--companion', '.ZH.MD'])
  assert.equal(result.status, 0, result.stdout)
})

test('check rejects a class symlink that resolves outside the project', (t) => {
  const project = makeProject(t)
  const outside = makeWorkspace()
  t.after(() => outside.dispose())
  outside.write('2026-10-02-ship.md', IMPLEMENTED)
  project.mkdir(ROOT + '/implemented')
  symlinkSync(outside.root, join(project.root, ROOT, 'implemented', 'feature'))
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /resolves outside the project checkout/)
})

test('archive rejects an archive root symlink that resolves outside the project', (t) => {
  const project = makeProject(t)
  initTree(project)
  const outside = makeWorkspace()
  t.after(() => outside.dispose())
  project.remove(ROOT + '/archived')
  symlinkSync(outside.root, join(project.root, ROOT, 'archived'))
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /archive root resolves outside the project root/)
})

test('archive rejects a root .gitkeep and init leaves non-empty folders alone', (t) => {
  const project = makeProject(t)
  project.write(ROOT + '/implemented/feature/2026-10-02-ship.md', IMPLEMENTED)
  const initialized = run(project, ['init'])
  assert.equal(initialized.status, 0, initialized.stdout)
  assert.equal(project.exists(`${ROOT}/implemented/feature/.gitkeep`), false)
  project.write(ROOT + '/archived/.gitkeep', '')
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED))
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unexpected root file/)
})

test('archive rejects an unsupported manifest schema', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/manifest.json', JSON.stringify({ version: 2, files: {} }, null, 2) + '\n')
  project.commit('bad manifest')
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unsupported manifest version/)
})

test('archive rejects a malformed manifest hash', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(
    ROOT + '/archived/manifest.json',
    JSON.stringify({ version: 1, files: { 'feature/2026-10-02-ship.md': 'not-a-hash' } }, null, 2) + '\n',
  )
  project.commit('bad hash')
  const result = run(project, ['archive'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /invalid content hash/)
})

test('check reports an unreadable note instead of crashing', (t) => {
  const project = makeProject(t)
  const note = ROOT + '/proposed/process/2026-10-01-x.md'
  project.write(note, PROPOSED)
  chmodSync(join(project.root, note), 0o000)
  t.after(() => {
    if (project.exists(note)) chmodSync(join(project.root, note), 0o644)
  })
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unreadable note/)
})

test('archive reports an unreadable artifact instead of crashing', (t) => {
  const project = makeProject(t)
  initTree(project)
  const note = ROOT + '/archived/feature/2026-10-02-ship.md'
  project.write(note, archived(IMPLEMENTED))
  chmodSync(join(project.root, note), 0o000)
  t.after(() => {
    if (project.exists(note)) chmodSync(join(project.root, note), 0o644)
  })
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /unreadable file/)
})

test('archive seals a unit whose fenced example shows a status line', (t) => {
  const project = makeProject(t)
  initTree(project)
  const note =
    archived(IMPLEMENTED) +
    '\n## Example\n\n\x60\x60\x60markdown\nStatus: implemented\nArchived: 2026-10-03\n\x60\x60\x60\n'
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', note)
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 0, result.stdout)
})

test('init rejects a symlinked lifecycle folder that escapes the checkout', (t) => {
  const project = makeProject(t)
  initTree(project)
  const outside = makeWorkspace()
  t.after(() => outside.dispose())
  project.remove(ROOT + '/implemented')
  symlinkSync(outside.root, join(project.root, ROOT, 'implemented'))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /resolves outside the project root/)
  assert.equal(outside.exists('feature'), false)
})

test('init rejects a symlinked archived folder that escapes the checkout', (t) => {
  const project = makeProject(t)
  initTree(project)
  const outside = makeWorkspace()
  t.after(() => outside.dispose())
  project.remove(ROOT + '/archived')
  symlinkSync(outside.root, join(project.root, ROOT, 'archived'))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /resolves outside the project root/)
  assert.equal(outside.exists('feature'), false)
})

test('init rejects a class symlink into the project Git directory', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.remove(`${ROOT}/archived/feature`)
  project.mkdir('.git/fake-class')
  symlinkSync(join(project.root, '.git', 'fake-class'), join(project.root, ROOT, 'archived', 'feature'))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inside the project's Git directory/)
  assert.equal(project.exists('.git/fake-class/.gitkeep'), false)
})

test('init rejects a dangling root symlink once', (t) => {
  const project = makeProject(t)
  project.mkdir('.agents')
  symlinkSync(join(project.root, 'missing-target'), join(project.root, ROOT))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /dangling symlink/)
  assert.equal(result.stdout.split('\n').filter((line) => line.includes('dangling symlink')).length, 1)
})

test('init writes nothing when a skeleton obstacle is found', (t) => {
  const project = makeProject(t)
  project.write(ROOT + '/proposed', 'not a directory\n')
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.equal(project.exists(`${ROOT}/implemented`), false)
  assert.equal(project.exists(`${ROOT}/archived`), false)
})

test('check rejects a class entry inside the project Git directory', (t) => {
  const project = makeProject(t)
  project.mkdir(`${ROOT}/implemented`)
  project.mkdir('.git/fake-class')
  project.write('.git/fake-class/2026-10-02-ship.md', IMPLEMENTED)
  symlinkSync(join(project.root, '.git', 'fake-class'), join(project.root, ROOT, 'implemented', 'feature'))
  const result = run(project, ['check'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /resolves inside the project's Git directory/)
})

test('archive --write ignores a frozen companion whose suffix is no longer declared', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-a.md', archived(IMPLEMENTED))
  project.write(ROOT + '/archived/feature/2026-10-02-a.i18n.yaml', 'en.md: 0\n')
  const first = run(project, ['archive', '--write', '--companion', '.i18n.yaml'])
  assert.equal(first.status, 0, first.stdout)
  project.commit('seal with sidecar')
  project.write(ROOT + '/archived/feature/2026-10-03-b.md', archived(IMPLEMENTED))
  const second = run(project, ['archive', '--write'])
  assert.equal(second.status, 0, second.stdout)
})

test('archive --write keeps a frozen Markdown companion when its suffix is dropped', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-a.md', archived(IMPLEMENTED))
  project.write(ROOT + '/archived/feature/2026-10-02-a.zh.md', archived(IMPLEMENTED))
  const first = run(project, ['archive', '--write', '--companion', '.zh.md'])
  assert.equal(first.status, 0, first.stdout)
  project.commit('seal with translation')
  project.write(ROOT + '/archived/feature/2026-10-03-b.md', archived(IMPLEMENTED))
  const second = run(project, ['archive', '--write'])
  assert.equal(second.status, 0, second.stdout)
})

test('init rejects a lifecycle folder symlink into the project Git directory', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.remove(`${ROOT}/implemented`)
  project.mkdir('.git/fake-lifecycle')
  symlinkSync(join(project.root, '.git', 'fake-lifecycle'), join(project.root, ROOT, 'implemented'))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inside the project's Git directory/)
})

test('init rejects an archived folder symlink into the project Git directory', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.remove(`${ROOT}/archived`)
  project.mkdir('.git/fake-archive')
  symlinkSync(join(project.root, '.git', 'fake-archive'), join(project.root, ROOT, 'archived'))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /inside the project's Git directory/)
})

test('init rejects a class folder symlink that resolves outside the project', (t) => {
  const project = makeProject(t)
  initTree(project)
  const outside = makeWorkspace()
  t.after(() => outside.dispose())
  project.remove(ROOT + '/archived/feature')
  symlinkSync(outside.root, join(project.root, ROOT, 'archived', 'feature'))
  const result = run(project, ['init'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /resolves outside the project root/)
})

test('init rejects a notes root inside a nested Git checkout', (t) => {
  const project = makeProject(t)
  project.write('vendor/README.md', '# vendor\n')
  project.gitOk('-C', 'vendor', 'init', '-q')
  const result = run(project, ['init', '--root', 'vendor/notes'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /different Git checkout/)
  assert.equal(project.exists('vendor/notes'), false)
})

test('archive --write rejects two prose Status lines', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-ship.md', archived(IMPLEMENTED) + '\nStatus: implemented\n')
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /exactly one Status: line/)
})

test('archive --write rejects a new undeclared non-Markdown artifact', (t) => {
  const project = makeProject(t)
  initTree(project)
  project.write(ROOT + '/archived/feature/2026-10-02-a.md', archived(IMPLEMENTED))
  project.write(ROOT + '/archived/feature/2026-10-02-a.sidecar', 'not declared\n')
  const result = run(project, ['archive', '--write'])
  assert.equal(result.status, 1)
  assert.match(result.stdout, /not a Markdown note or a declared companion suffix/)
})

/**
 * Ported from dsh scripts/verify-archived-agent-notes.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 */
/** Verify and append-seal the frozen Agent Note archive. */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AGENT_NOTE_CLASSES, agentNoteRoot } from './agent-note-tree.ts'
import { parseScopeArgs, readGateScope } from './gate-scope.ts'
import { notesRootExists } from './notes-root.ts'
import {
  extendArchiveManifest,
  parseArchiveManifest,
  renderArchiveManifest,
  validateArchiveArtifacts,
  validateArchiveManifestExtension,
  type ArchiveManifest,
} from './archived-agent-notes.ts'

const gate = 'verify-archived-agent-notes'

// The seal is a whole-archive assertion against a committed baseline, so this gate takes `--all`
// and walks the archive; a file list cannot express "everything that is sealed".
readGateScope(gate)
const parsed = parseScopeArgs(process.argv.slice(2))
const writeMode = parsed.rest.includes('--write')
const unknown = parsed.rest.filter(argument => argument !== '--write')
if (unknown.length > 0) {
  console.error(`${gate}: unknown flag(s) ${unknown.join(', ')} — usage: node ${gate}.ts --root <project> --all [--write]`)
  process.exit(2)
}

const archiveRoot = resolve(agentNoteRoot, 'archived')
const manifestPath = resolve(archiveRoot, 'manifest.json')
const repositoryRoot = resolve(agentNoteRoot, '../../..')
const manifestRepoPath = '.agents/dsh-spec/notes/archived/manifest.json'
const errors: string[] = []
const allowedRootFiles = new Set(['AGENTS.md', 'manifest.json'])
const kinds = new Set<string>()

if (!notesRootExists(agentNoteRoot)) {
  console.error(`${gate}: no Agent Note tree at ${agentNoteRoot} — check --root or AGENT_NOTES_ROOT.`)
  process.exit(1)
}

if (!existsSync(resolve(archiveRoot, 'AGENTS.md'))) errors.push('archived/AGENTS.md is required')
const artifacts = new Map<string, Buffer>()
for (const entry of readdirSync(archiveRoot, { withFileTypes: true })) {
  if (entry.isFile()) {
    if (!allowedRootFiles.has(entry.name)) errors.push(`archived/${entry.name}: unexpected root file`)
    continue
  }
  if (!entry.isDirectory()) {
    errors.push(`archived/${entry.name}: only regular files and kind directories are allowed`)
    continue
  }
  if (!(AGENT_NOTE_CLASSES as readonly string[]).includes(entry.name)) {
    errors.push(`archived/${entry.name}/: unknown Agent Note kind`)
    continue
  }
  kinds.add(entry.name)
  for (const child of readdirSync(resolve(archiveRoot, entry.name), { withFileTypes: true })) {
    const rel = `${entry.name}/${child.name}`
    if (!child.isFile()) {
      errors.push(`${rel}: archived kind directories contain regular files only`)
      continue
    }
    artifacts.set(rel, readFileSync(resolve(archiveRoot, rel)))
  }
}
// The six kind directories are required once the archive holds something, and not before: an
// empty directory is not a thing Git can carry, so requiring all six unconditionally made every
// fresh clone of a project that has archived nothing yet fail this gate — the exact state this
// gate's own empty-archive report below describes as consistent. No artifact can hide in a kind
// directory that does not exist, so nothing this rule protects is lost by waiting.
if (artifacts.size > 0) {
  for (const kind of AGENT_NOTE_CLASSES) {
    if (!kinds.has(kind)) errors.push(`archived/${kind}/: required kind directory is missing`)
  }
}
errors.push(...validateArchiveArtifacts(artifacts))

function runGit(args: string[]): string {
  const result = spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git exited with status ${result.status}`)
  return result.stdout
}

function readBaselineManifest(ref: string): ArchiveManifest {
  runGit(['cat-file', '-e', `${ref}^{commit}`])
  const manifestEntry = runGit(['ls-tree', '--name-only', ref, '--', manifestRepoPath]).trim()
  if (manifestEntry === '') return { version: 1, files: {} }
  return parseArchiveManifest(runGit(['show', `${ref}:${manifestRepoPath}`]))
}

let manifest: ArchiveManifest = { version: 1, files: {} }
if (existsSync(manifestPath)) {
  try {
    manifest = parseArchiveManifest(readFileSync(manifestPath, 'utf8'))
  } catch (error: unknown) {
    errors.push(`archived/manifest.json: ${error instanceof Error ? error.message : String(error)}`)
  }
} else if (!writeMode && artifacts.size > 0) {
  // A manifest is required only once there is something to seal. A project that has archived
  // nothing yet is consistent with an absent seal, and demanding one would make this gate
  // unsatisfiable: `--write` refuses to record an empty archive by design.
  errors.push('archived/manifest.json is required; seal new artifacts by re-running this gate with `--write`')
}

// The append-only seal compares against a committed baseline, so it needs a repository.
const insideRepository = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: repositoryRoot, encoding: 'utf8' }).status === 0
if (!insideRepository) {
  console.error(`verify-archived-agent-notes: ${repositoryRoot} is not inside a git repository; the append-only seal compares against a committed baseline. Run this gate from the project's working tree.`)
  process.exit(1)
}

// CI supplies its trusted pre-change commit; local writes compare with committed HEAD.
const baselineRef = process.env.ARCHIVE_BASE_REF ?? 'HEAD'
// A baseline this gate cannot read is not an archive-rule violation: no artifact under archived/ has
// been shown to break a rule. It is the precondition the append-only seal cannot run without, so it
// gets its own diagnosis — which baseline was unreadable, and how to supply one — and stays non-zero,
// because a freeze this gate could not compare is not a freeze it may report as intact.
let unreadableBaseline: string | undefined
// A baseline is the precondition of the append-only *comparison*, not of an empty tree: an archive
// that holds neither an artifact nor a seal has nothing to compare, and demanding a commit for it
// would fail a project that runs this check before its first commit.
const nothingToSeal = artifacts.size === 0 && !existsSync(manifestPath)
if (nothingToSeal) {
  unreadableBaseline = undefined
} else try {
  const baseline = readBaselineManifest(baselineRef)
  errors.push(...validateArchiveManifestExtension(baseline, manifest))
} catch (error: unknown) {
  const detail = error instanceof Error ? error.message : String(error)
  const hasCommit = spawnSync('git', ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], { cwd: repositoryRoot, encoding: 'utf8' }).status === 0
  unreadableBaseline = hasCommit
    ? `cannot read the archive baseline ${JSON.stringify(baselineRef)} for ${agentNoteRoot} — ${detail}. The append-only seal compares archived/ against a committed baseline; set ARCHIVE_BASE_REF to a commit that exists, or unset it to compare with HEAD.`
    : `cannot read the archive baseline ${JSON.stringify(baselineRef)} for ${agentNoteRoot} — this repository has no commit yet (${detail}), and the append-only seal compares archived/ against a committed baseline. Make a first commit, or set ARCHIVE_BASE_REF to a commit that exists; nothing under archived/ can be verified until one does.`
}

const extended = extendArchiveManifest(manifest, artifacts)
errors.push(...extended.errors)
if (!writeMode) {
  for (const path of extended.added) errors.push(`${path}: archived artifact is not sealed in manifest.json`)
}

if (unreadableBaseline !== undefined) console.error(`verify-archived-agent-notes: ${unreadableBaseline}`)
if (errors.length > 0) {
  console.error('verify-archived-agent-notes: archive rules violated:')
  for (const error of errors) console.error(`  ${error}`)
}
if (unreadableBaseline !== undefined || errors.length > 0) process.exit(1)

if (writeMode && extended.added.length === 0 && !existsSync(manifestPath)) {
  console.error('verify-archived-agent-notes: nothing to seal — the archive holds no artifacts yet, so a manifest would record an empty archive. Archive a note first.')
  process.exit(1)
}

if (writeMode) {
  const rendered = renderArchiveManifest(extended.files)
  if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== rendered) {
    writeFileSync(manifestPath, rendered)
  }
  console.log(`verify-archived-agent-notes: sealed ${extended.added.length} new artifact(s); existing seals unchanged.`)
} else if (artifacts.size === 0) {
  console.log(`verify-archived-agent-notes: the archive is empty — 0 frozen artifact(s) to check and no seal recorded yet; all ${AGENT_NOTE_CLASSES.length} kind directories are required once a note is archived.`)
} else {
  console.log(`verify-archived-agent-notes: ${artifacts.size} frozen artifact(s) checked across ${kinds.size} kind(s).`)
}

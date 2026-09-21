/**
 * The scope a gate is handed, and the scope a dispatcher expands.
 *
 * A gate no longer discovers its own corpus. It is handed either `--all`, which means "walk your
 * own root" and is reserved for an assertion *about a tree*, or a list of repository-relative
 * paths — on the command line or through `--files-from -` — which it checks and nothing more. The
 * kind is not the caller's choice: it is the gate's own record in the manifest, so the dispatcher
 * and the gate cannot disagree about whether a tree walk or a file list is what this check reads.
 *
 * Two failures are deliberately different. A missing or contradictory scope is a **usage** error
 * (exit 2), because nothing was checked and the caller must fix its invocation. A path that exists
 * outside the gate's scope is a **violation** (exit 1), because a dispatcher that assembled the
 * wrong list must be visible rather than silently ignored. A path the change reports as deleted is
 * accepted: a deletion is a legitimate part of a change set, and what a missing file means is the
 * gate's decision — a broken pair for the pairing check, nothing to read for the markdown ones.
 *
 * Zero external dependencies.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { isActiveNotePath, walkAgentNoteTree } from './agent-note-tree.ts'
import { isTranslationScopeFile } from './i18n-scope.ts'
import { readGateScopes } from './manifest.ts'
import { scopedMarkdown, scopeReason } from './md-scope.ts'
import { archivedNotesPrefixes, notesRootPrefixes, resolveNotesRoot } from './notes-root.ts'
import { resolveRepoRoot } from './repo-root.ts'
import type { GateScopeKey, GateSelection } from './manifest.ts'

/** What a gate was handed: the project root, and either the whole tree or an explicit file list. */
export interface GateScope {
  root: string
  kind: GateSelection
  /** Repository-relative entries; empty when the gate walks its own root. */
  entries: string[]
}

/** One parsed command line, before the gate's own flags are consumed. */
export interface ScopeArgs {
  all: boolean
  paths: string[]
  filesFrom?: string
  /** Arguments the scope parser did not consume, for the gate's own flag handling. */
  rest: string[]
}

/** The engine directory this process runs from, derived from the script path. */
function engineDirectory(): string {
  return dirname(resolve(process.argv[1] ?? import.meta.dirname))
}

/** Exit 2 with the gate's usage. */
function usage(gate: string, selection: GateSelection, detail?: string): never {
  if (detail !== undefined) console.error(`${gate}: ${detail}`)
  const scope = selection === 'root'
    ? '--all'
    : '<path...> | --files-from -'
  console.error(`${gate}: usage: node ${gate}.ts --root <project> ${scope}`)
  process.exit(2)
}

/** Exit 1 with a located failure. */
function fail(gate: string, message: string): never {
  console.error(`${gate}: ${message}`)
  process.exit(1)
}

/**
 * The gate's own recorded selection kind.
 * @param gate - the gate's name, as the manifest records it.
 * @returns `root` or `files`, or exits when the record cannot be read.
 */
export function readGateScopeKind(gate: string): GateSelection {
  const reading = readGateScopes(engineDirectory())
  if (!reading.ok) fail(gate, reading.error)
  const record = reading.scopes.get(gate)
  if (record === undefined) fail(gate, `no scope is recorded for \`${gate}\` in the manifest, so it cannot tell what it is allowed to read`)
  return record.selection
}

/**
 * Separate the scope arguments from the gate's own flags.
 *
 * Only the four scope forms are recognised — `--root <path>`, `--all`, `--files-from <file|->` and
 * bare paths — and everything else is returned untouched, so a gate keeps its own flags without
 * this parser having to know them.
 *
 * @param argv - `process.argv.slice(2)`.
 * @returns the scope arguments and the leftover flags.
 */
export function parseScopeArgs(argv: readonly string[]): ScopeArgs {
  const paths: string[] = []
  const rest: string[] = []
  let all = false
  let filesFrom: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? ''
    if (argument === '--root') {
      index += 1
      continue
    }
    if (argument === '--all') {
      all = true
      continue
    }
    if (argument === '--files-from') {
      filesFrom = argv[index + 1]
      index += 1
      continue
    }
    if (argument.startsWith('--')) {
      rest.push(argument)
      continue
    }
    paths.push(argument)
  }
  return { all, paths, filesFrom, rest }
}

/** Normalize one entry to a repository-relative POSIX path, or report why it cannot be one. */
function normalize(gate: string, entry: string, selection: GateSelection): string {
  const trimmed = entry.trim().replace(/^\.\//, '')
  if (trimmed === '') usage(gate, selection, 'an empty path is not a scope entry')
  if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) {
    usage(gate, selection, `the scope entry ${JSON.stringify(entry)} is absolute — scope entries are repository-relative`)
  }
  return trimmed.split(sep).join('/')
}

/** The path list `--files-from` names, read from a file or from stdin. */
function readFilesFrom(gate: string, selection: GateSelection, source: string): string[] {
  const text = source === '-'
    ? readFileSync(0, 'utf8')
    : existsSync(source) ? readFileSync(source, 'utf8') : fail(gate, `--files-from ${source} cannot be read`)
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '')
  if (lines.length === 0) usage(gate, selection, `--files-from ${source} listed no path — an empty scope is not a clean run`)
  return lines
}

/**
 * Resolve the scope a gate must check, refusing a scope that contradicts what it reads.
 * @param gate - the gate's name.
 * @returns the root and the scope entries.
 */
export function readGateScope(gate: string): GateScope {
  const selection = readGateScopeKind(gate)
  const parsed = parseScopeArgs(process.argv.slice(2))
  const root = resolveRepoRoot()
  if (selection === 'root') {
    if (parsed.paths.length > 0 || parsed.filesFrom !== undefined || parsed.all === false) {
      if (parsed.paths.length > 0 || parsed.filesFrom !== undefined) {
        usage(gate, selection, 'this gate asserts over a tree, so it takes --all rather than a path list')
      }
      usage(gate, selection, 'this gate reads a whole tree, so it needs --all')
    }
    return { root, kind: 'root', entries: [] }
  }
  if (parsed.all) usage(gate, selection, 'this gate reads the paths it is handed, so --all is not one of its scopes')
  const raw = [...parsed.paths, ...(parsed.filesFrom === undefined ? [] : readFilesFrom(gate, selection, parsed.filesFrom))]
  if (raw.length === 0) usage(gate, selection, 'this gate needs a path list or --files-from -')
  const entries = [...new Set(raw.map(entry => normalize(gate, entry, selection)))]
  return { root, kind: 'files', entries }
}

/**
 * Refuse entries that exist but belong to another check's surface.
 *
 * The gate owns this predicate, because the gate owns the module that defines its corpus; a
 * deletion is not refused, since the caller cannot hand what does not exist and the gate decides
 * what a missing file means.
 *
 * @param gate - the gate's name.
 * @param scope - the scope it was handed.
 * @param isInScope - the gate's own predicate over repository-relative paths.
 */
export function refuseOutOfScope(gate: string, scope: GateScope, isInScope: (entry: string) => boolean): void {
  const refused = scope.entries.filter(entry => existsSync(resolve(scope.root, entry)) && !isInScope(entry))
  if (refused.length === 0) return
  console.error(`${gate}: ${refused.length} path(s) outside this check's scope:`)
  for (const entry of refused) console.error(`  ${entry}`)
  console.error(`${gate}: the caller assembled the scope, and a path this check does not read is a mistake rather than a skip`)
  process.exit(1)
}

/**
 * The whole surface one scope key names, as repository-relative paths.
 *
 * This is the dispatcher's half of the contract: a full-corpus run of a file-selection gate needs
 * the gate's own surface expanded into a path list, and the expansion goes through the module that
 * defines that surface rather than through a second copy of the rule.
 *
 * @param root - absolute project root.
 * @param key - the scope key to expand.
 * @returns repository-relative paths, in stable order.
 */
export function expandScope(root: string, key: GateScopeKey): string[] {
  const rel = (absolute: string): string => relative(root, absolute).split(sep).join('/')
  if (key === 'markdown') return scopedMarkdown(root).map(file => rel(file.abs))
  if (key === 'pairs') return scopedMarkdown(root).map(file => rel(file.abs)).filter(entry => isTranslationScopeFile(entry))
  if (key === 'notes') {
    const notesRoot = resolveNotesRoot()
    return walkAgentNoteTree().notes.map(note => `${rel(notesRoot)}/${note.rel}`)
  }
  return []
}

/**
 * Whether a changed path belongs to the surface one gate answers for.
 *
 * The two selection kinds ask different questions of the same key, and the difference is the point.
 * A `root`-selection gate asserts over a tree, so any change inside that tree — a file added, an
 * unknown folder created — is its business. A `files`-selection gate reads files, so only a path
 * that is one of the files it reads counts: a change to `notes/README.md` belongs to the markdown
 * and pairing checks, and not to the note-format check, which would refuse it.
 *
 * @param record - the gate's recorded scope.
 * @param path - one repository-relative path from the change.
 * @returns true when this gate owes that path.
 */
export function pathInGateScope(record: { keys: readonly GateScopeKey[], selection: GateSelection }, path: string): boolean {
  const notesRoots = notesRootPrefixes()
  const archivedRoots = archivedNotesPrefixes()
  const inNotes = notesRoots.some(prefix => path.startsWith(prefix))
  const inArchive = archivedRoots.some(prefix => path.startsWith(prefix))
  const active = inNotes && !inArchive
  if (record.selection === 'root') {
    // `notes` owns the active tree and `notes-archived` the frozen one; neither is a file selection.
    return record.keys.some((key) => {
      if (key === 'notes') return active
      if (key === 'notes-archived') return inArchive
      if (key === 'markdown') return path.endsWith('.md') && scopeReason(path) === ''
      return isTranslationScopeFile(path)
    })
  }
  return record.keys.some((key) => {
    if (key === 'notes') return isActiveNotePath(path)
    if (key === 'notes-archived') return false
    if (key === 'markdown') return path.endsWith('.md') && scopeReason(path) === ''
    return isTranslationScopeFile(path)
  })
}

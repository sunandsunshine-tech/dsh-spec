/**
 * The Markdown corpus the prose gates read, and the trees they refuse to read.
 *
 * The three gates here were recovered from the deleted `dsh-doc` skill, which read its scope — the
 * patterns and the paths no gate reads — from the project's `doc-tiers` ledger key. The ledger is
 * deleted, so the defaults below replace it and every exclusion carries the reason it is out of
 * scope. A project whose layout differs adapts these lists; there is no second place to record them.
 *
 * The Agent Note tree stays in scope: its own gates check classification, format and the frozen
 * archive, and none of them checks whether a note's links still resolve. Only the archive is out,
 * because a sealed note is history whose outbound links are frozen.
 */

import { archivedNotesPrefixes } from './notes-root.ts'
import { type RepoFile, uniqueRepoFiles } from './repo-files.ts'

/**
 * Repository-relative globs naming the prose this collection authors. `**&#47;*.md` does not descend
 * into a dot-directory, so `.agents/` — where the Agent Note tree lives — needs its own pattern.
 */
export const MARKDOWN_PATTERNS: readonly string[] = ['**/*.md', '.agents/**/*.md']

/**
 * Directory names holding dependencies or build output. A type is matched as a path segment rather
 * than as a root prefix, because a vendored or generated tree can sit at any depth — inside a
 * package, or inside a submodule.
 */
const DEPENDENCY_TREES: readonly string[] = [
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  'target',
  'coverage',
  '__pycache__',
  '.venv',
  '.cache',
  '.pnpm-store',
]

/** Repository-relative prefixes outside the prose gates' scope, each with the reason it is out. */
const EXCLUDED_PREFIXES: ReadonlyArray<readonly [prefix: string, reason: string]> = [
  ['submodules/', 'a nested repository, whose Markdown belongs to its own owner'],
  ['.agents/skills/', 'the installed collection is a deployment of `skills/`, not a second source'],
]

/**
 * Why a repository-relative path is outside the prose gates' scope.
 * @param file - repository-relative POSIX path.
 * @returns the reason, or an empty string when the gates read the file.
 */
export function scopeReason(file: string): string {
  const archived = archivedNotesPrefixes().find(prefix => file.startsWith(prefix))
  if (archived !== undefined) return `under \`${archived}\` — an archived note is frozen history`
  const excluded = EXCLUDED_PREFIXES.find(([prefix]) => file.startsWith(prefix))
  if (excluded !== undefined) return `under \`${excluded[0]}\` — ${excluded[1]}`
  const tree = file.split('/').find(part => DEPENDENCY_TREES.includes(part))
  return tree === undefined ? '' : `under \`${tree}/\` — dependency or build output, never authored prose`
}

/**
 * Every in-scope Markdown file, deduplicated by canonical path.
 * @param root - absolute repository root.
 * @param patterns - repository-relative globs; the caller's when given, the defaults otherwise.
 * @returns matching files in stable first-seen order.
 */
export function scopedMarkdown(root: string, patterns: readonly string[] = MARKDOWN_PATTERNS): RepoFile[] {
  return uniqueRepoFiles(root, patterns, file => scopeReason(file) !== '')
}

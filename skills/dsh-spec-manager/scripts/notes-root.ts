/**
 * Resolve the Agent Note tree an extracted gate operates on.
 *
 * The tree is `.agents/dsh-spec/notes` inside the audited repository, so the gates accept
 * `--root <repo>` rather than deriving the repository from their own location.
 * `AGENT_NOTES_ROOT` supplies an absolute notes root directly, which is useful when a
 * project keeps its notes elsewhere.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Default notes root, relative to the audited repository root. The `dsh-spec` segment is a
 * namespace: `.agents` is shared with other tools, so this pattern's own state lives under one
 * directory that no other tool claims.
 */
export const NOTES_SUBPATH = '.agents/dsh-spec/notes'

/** The un-namespaced notes root this pattern was extracted from, tried when the namespaced one is absent. */
const LEGACY_NOTES_SUBPATH = '.agents/notes'

/** POSIX-relative prefix that identifies an archived note, used by the prose gates. */
export const ARCHIVED_NOTES_PREFIX = `${NOTES_SUBPATH}/archived/`

/**
 * Every repository-relative prefix an archived note can sit under. A repository being audited may
 * keep its notes at this pattern's path or at the un-namespaced `.agents/notes/` this pattern was
 * extracted from, and a gate that excludes one but not the other treats a frozen archived note as
 * live source prose. `AGENT_NOTES_ROOT` is not consulted here: it carries an absolute path for
 * resolving the tree, while these prefixes classify repository-relative paths.
 * @returns the archived-note prefixes, longest first.
 */
export function archivedNotesPrefixes(): string[] {
  return [ARCHIVED_NOTES_PREFIX, `${LEGACY_NOTES_SUBPATH}/archived/`].sort((a, b) => b.length - a.length)
}

/**
 * The notes-root prefixes a gate should treat as documentation rather than as source.
 * @returns every repository-relative notes root, plus the configured override when set.
 */
export function notesRootPrefixes(): string[] {
  return [`${NOTES_SUBPATH}/`, `${LEGACY_NOTES_SUBPATH}/`].sort((a, b) => b.length - a.length)
}

/**
 * Return the absolute Agent Note root the gates walk.
 * @returns absolute path to the directory holding the Agent Note lifecycle folders.
 */
export function resolveNotesRoot(): string {
  const configured = process.env.AGENT_NOTES_ROOT
  if (configured !== undefined && configured !== '') return resolve(configured)
  const flagIndex = process.argv.indexOf('--root')
  const repositoryRoot = flagIndex === -1 ? process.cwd() : process.argv[flagIndex + 1] ?? process.cwd()
  const namespaced = resolve(repositoryRoot, NOTES_SUBPATH)
  // A repository being audited may predate the namespace, or may keep its notes at the
  // un-namespaced path on purpose. Prefer this pattern's path, then the one it was extracted from.
  if (existsSync(namespaced)) return namespaced
  const legacy = resolve(repositoryRoot, LEGACY_NOTES_SUBPATH)
  return existsSync(legacy) ? legacy : namespaced
}

/**
 * Report whether the notes root exists, so a gate can fail with a located message
 * instead of an empty walk that reads as a pass.
 * @param notesRoot - absolute notes root.
 * @returns true when the directory exists.
 */
export function notesRootExists(notesRoot: string): boolean {
  return existsSync(notesRoot)
}

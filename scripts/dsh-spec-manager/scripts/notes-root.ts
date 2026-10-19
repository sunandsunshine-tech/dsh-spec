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
 * The notes root, relative to the audited repository root. The `dsh-spec` segment is a namespace:
 * `.agents` is shared with other tools, so this pattern's own state lives under one directory that
 * no other tool claims.
 */
export const NOTES_SUBPATH = '.agents/dsh-spec/notes'

/** POSIX-relative prefix of the notes root, for classifying a repository-relative path. */
export const NOTES_ROOT_PREFIX = `${NOTES_SUBPATH}/`

/** POSIX-relative prefix that identifies an archived note, used by the prose gates. */
export const ARCHIVED_NOTES_PREFIX = `${NOTES_SUBPATH}/archived/`

/**
 * Return the absolute Agent Note root the gates walk.
 *
 * A project's notes live at this pattern's path. `AGENT_NOTES_ROOT` replaces that with an absolute
 * path, which is how a repository that keeps its notes elsewhere is audited; `resolveNotesRoot`
 * consults the variable and nothing else, so a project has one answer rather than a search order.
 * @returns absolute path to the directory holding the Agent Note lifecycle folders.
 */
export function resolveNotesRoot(): string {
  const configured = process.env.AGENT_NOTES_ROOT
  if (configured !== undefined && configured !== '') return resolve(configured)
  const flagIndex = process.argv.indexOf('--root')
  const repositoryRoot = flagIndex === -1 ? process.cwd() : process.argv[flagIndex + 1] ?? process.cwd()
  return resolve(repositoryRoot, NOTES_SUBPATH)
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

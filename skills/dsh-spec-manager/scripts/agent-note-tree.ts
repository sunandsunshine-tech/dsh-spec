/**
 * Ported from dsh scripts/agent-note-tree.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 * Shared structural source of truth for the Agent Note tree. Lifecycle and class
 * sets are closed under `.agents/dsh-spec/notes/README.md`; importing this module is pure.
 */

import { globSync, readdirSync } from 'node:fs'
import { sep } from 'node:path'
import { notesRootPrefixes, resolveNotesRoot } from './notes-root.ts'

export const agentNoteRoot = resolveNotesRoot()

/** The closed set of active Agent Note lifecycles (top-level folders under .agents/dsh-spec/notes/). */
const AGENT_NOTE_LIFECYCLES = ['proposed', 'implemented', 'rejected'] as const

/**
 * The closed set of Agent Note classes (nested folder under each lifecycle). Adding a
 * class is a deliberate act: extend this list AND the README's Classification
 * section. The gate rejects any folder not listed here.
 */
export const AGENT_NOTE_CLASSES = ['feature', 'bug-fix', 'simplification', 'architecture', 'process', 'testing'] as const

/** Historical implemented notes live outside the active lifecycle tree. */
const AGENT_NOTE_ARCHIVE = 'archived'

/** Non-Agent Note Markdown allowed to sit directly at a lifecycle root. */
const ROOT_ALLOWLIST = new Set(['AGENTS.md', 'CLAUDE.md'])

/**
 * Directories the walker tolerates at the notes root without treating them as a lifecycle.
 * `scripts/` holds the gates that enforce this tree, so an initialized project has it by
 * design; anything else is a lifecycle folder or a mistake.
 */
const ROOT_DIRECTORY_ALLOWLIST = new Set(['scripts'])

/** One Agent Note file, as discovered by the walker. */
export interface AgentNote {
  lifecycle: string
  /** Path relative to .agents/dsh-spec/notes. */
  rel: string
  /** `yyyy-mm-dd` from the filename. */
  date: string
}

/**
 * Walk the Agent Note tree, enforcing the structure rules. Returns every valid Agent Note
 * plus one error string per violation (unknown lifecycle or class folder, bad
 * depth, or bad filename). Callers treat a non-empty error list as fatal.
 */
export function walkAgentNoteTree(): { notes: AgentNote[]; errors: string[] } {
  const notes: AgentNote[] = []
  const errors: string[] = []
  // The lifecycle set is closed too: any directory under .agents/dsh-spec/notes/ that is not
  // a known lifecycle would otherwise hold Agent Notes invisible to the walk below.
  for (const entry of readdirSync(agentNoteRoot, { withFileTypes: true })) {
    if (entry.name === 'INDEX.md') {
      errors.push('structure: INDEX.md — centralized Agent Note indexes are forbidden; browse the lifecycle/class tree or search the repository')
      continue
    }
    if (entry.isDirectory()
      && entry.name !== AGENT_NOTE_ARCHIVE
      && !ROOT_DIRECTORY_ALLOWLIST.has(entry.name)
      && !(AGENT_NOTE_LIFECYCLES as readonly string[]).includes(entry.name)) {
      errors.push(`structure: ${entry.name}/ — unknown lifecycle folder (allowed: ${AGENT_NOTE_LIFECYCLES.join(', ')}, plus ${AGENT_NOTE_ARCHIVE}/)`)
    }
  }
  for (const lifecycle of AGENT_NOTE_LIFECYCLES) {
    for (const match of globSync(`${lifecycle}/**/*.md`, { cwd: agentNoteRoot }).map(path => path.split(sep).join('/')).sort()) {
      const segs = match.split('/')
      // Allowlisted file directly at the lifecycle root (e.g. implemented/AGENTS.md).
      if (segs.length === 2 && ROOT_ALLOWLIST.has(segs[1] ?? '')) continue
      // A Chinese counterpart (foo.zh.md, README.zh.md) is the SAME Agent Note,
      // indexed via its English filename; the pairing gate owns its consistency.
      if (match.endsWith('.zh.md')) continue
      const cls = segs[1]
      const base = segs[2]
      if (segs.length !== 3 || cls === undefined || base === undefined) {
        errors.push(`structure: ${match} — expected {lifecycle}/{class}/file.md (got depth ${segs.length})`)
        continue
      }
      if (!(AGENT_NOTE_CLASSES as readonly string[]).includes(cls)) {
        errors.push(`structure: ${match} — unknown class folder "${cls}" (allowed: ${AGENT_NOTE_CLASSES.join(', ')})`)
        continue
      }
      if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(base)) {
        errors.push(`structure: ${match} — filename must be yyyy-mm-dd-topic.md`)
        continue
      }
      notes.push({ lifecycle, rel: match, date: base.slice(0, 10) })
    }
  }
  return { notes, errors }
}

/**
 * The lifecycle folders a note can live in, as the file side of the tree rule sees them.
 *
 * Exported so the scope module can answer "is this path an active note" without walking anything:
 * a check handed a file list has to reject a path that is not one of the files it reads, and the
 * rule for what a note path looks like belongs here rather than in a caller.
 */
export const ACTIVE_LIFECYCLES: readonly string[] = AGENT_NOTE_LIFECYCLES

/**
 * Whether one repository-relative path is an active Agent Note.
 *
 * The English side only: a `.zh.md` counterpart is the same note indexed by its English name, and
 * the pairing gate owns its consistency. `README.md`, `AGENTS.md` and `CLAUDE.md` sit inside the
 * notes tree without being notes, and the archive is not an active lifecycle.
 *
 * @param path - repository-relative POSIX path.
 * @returns true when the path is `{lifecycles}/{class}/yyyy-mm-dd-topic.md` under a notes root.
 */
export function isActiveNotePath(path: string): boolean {
  const prefix = notesRootPrefixes().find(candidate => path.startsWith(candidate))
  if (prefix === undefined) return false
  const segments = path.slice(prefix.length).split('/')
  if (segments.length !== 3) return false
  const [lifecycle, cls, base] = segments
  if (lifecycle === undefined || cls === undefined || base === undefined) return false
  if (!(AGENT_NOTE_LIFECYCLES as readonly string[]).includes(lifecycle)) return false
  if (!(AGENT_NOTE_CLASSES as readonly string[]).includes(cls)) return false
  return /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(base)
}

/**
 * Read one active note from its repository-relative path, for a check handed a file list.
 *
 * The same rule as the walker, from the other direction: the walker asks what a directory holds,
 * and this asks whether one path the caller named is a note it may read.
 *
 * @param path - repository-relative POSIX path.
 * @returns the note, or why the path is not one.
 */
export function noteFromRel(path: string): { ok: true, note: AgentNote } | { ok: false, error: string } {
  if (!isActiveNotePath(path)) {
    return { ok: false, error: `${path} is not an active Agent Note — the path is \`{proposed,implemented,rejected}/{class}/yyyy-mm-dd-topic.md\` under a notes root` }
  }
  const prefix = notesRootPrefixes().find(candidate => path.startsWith(candidate))
  const rel = path.slice((prefix ?? '').length)
  const segments = rel.split('/')
  const lifecycle = segments[0] ?? ''
  const base = segments[2] ?? ''
  return { ok: true, note: { lifecycle, rel, date: base.slice(0, 10) } }
}

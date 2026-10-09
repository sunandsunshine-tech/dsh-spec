/**
 * Merging what a project holds with the text the installed revision ships.
 *
 * `replace` is a contract document, `rows` keeps a terminology table's own rows, and `section` keeps
 * everything outside the marked blocks — the project's standing orders — while replacing, appending
 * and removing the blocks the collection owns.
 *
 * Zero external dependencies.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SectionHook } from './sections.ts'

/**
 * How a managed file's existing content merges with the text the collection ships.
 *
 * `replace` is a contract document: the mechanism's wording has to be identical in every project,
 * and a project's own decisions live in notes rather than in the contract's prose. `rows` keeps
 * everything below the terminology table's header, because a row is the maintainer's decision.
 * `section` keeps everything outside the marked blocks — the project's standing orders.
 */
export type Merge = 'replace' | 'rows' | 'section'
/** One file whose text the collection owns, and how it merges with what the project holds. */
export interface ManagedFile {
  path: string
  template: string
  merge: Merge
  /** Template for the `.zh.md` counterpart, where the collection ships one. */
  counterpartTemplate?: string
}
/**
 * The files a sync brings up to the installed revision, in the order they are reported.
 *
 * The notes contract and its three `AGENTS.md` files are synced only where the notes tree exists:
 * an adoption creates it, and a refresh does not give it back to a project that does not have it.
 * The search exclusion belongs to that tree for the same reason. The delivery-plan contract and its
 * orders follow the same rule against the plan tree. The documentation files always exist: the
 * vocabulary table is what every pair obeys, and the orders beside it are where that rule lives.
 */
export function managedFiles(root: string, notesDir: string, docsDir: string, plansDir: string): ManagedFile[] {
  const notes: ManagedFile[] = [
    { path: `${notesDir}/README.md`, template: 'notes-README.md.template', merge: 'replace', counterpartTemplate: 'notes-README.zh.md.template' },
    { path: `${notesDir}/AGENTS.md`, template: 'notes-AGENTS.md.template', merge: 'replace' },
    { path: `${notesDir}/implemented/AGENTS.md`, template: 'notes-implemented-AGENTS.md.template', merge: 'replace' },
    { path: `${notesDir}/archived/AGENTS.md`, template: 'notes-archived-AGENTS.md.template', merge: 'replace' },
    { path: '.rgignore', template: 'rgignore.template', merge: 'replace' },
  ]
  const plans: ManagedFile[] = [
    { path: `${plansDir}/README.md`, template: 'plans-README.md.template', merge: 'replace', counterpartTemplate: 'plans-README.zh.md.template' },
    { path: `${plansDir}/AGENTS.md`, template: 'plans-AGENTS.md.template', merge: 'replace' },
  ]
  const docs: ManagedFile[] = [
    { path: `${docsDir}/terminology.md`, template: 'terminology.md.template', merge: 'rows' },
    { path: `${docsDir}/AGENTS.md`, template: 'docs-AGENTS.md.template', merge: 'replace' },
  ]
  // The standing orders are the project's; only the marked blocks inside them are the collection's.
  const orders: ManagedFile[] = [
    { path: 'AGENTS.md', template: 'AGENTS.md.template', merge: 'section' },
  ]
  const trees = [
    ...(existsSync(resolve(root, notesDir)) ? notes : []),
    ...(existsSync(resolve(root, plansDir)) ? plans : []),
  ]
  return [...trees, ...docs, ...orders]
}
/** The lines below a Markdown table's header separator, which a project owns. */
export function tableRows(source: string): string {
  const lines = source.split('\n')
  const separator = lines.findIndex(line => /^\|(?:\s*:?-+:?\s*\|)+$/.test(line.trim()))
  if (separator < 0) return ''
  return lines.slice(separator + 1).join('\n').replace(/^\n+/, '').replace(/\s+$/, '')
}
/**
 * The reciprocal language switcher a paired document needs, added to the English side.
 *
 * The shipped templates are English-only, because init writes the contract alone; a project that
 * adds the Chinese counterpart declares a pair, and a pair is complete only when both sides link to
 * each other. The Chinese template already carries its half, so the English side gets its half here.
 *
 * @param source - the English document's text.
 * @param counterpart - the counterpart's file name, as the link target.
 * @returns the text with a switcher after its first heading.
 */
export function withSwitcher(source: string, counterpart: string): string {
  const lines = source.split('\n')
  if (lines.some(line => /^English \| \[中文\]\(/.test(line))) return source
  const heading = lines.findIndex(line => line.startsWith('# '))
  if (heading < 0) return source
  lines.splice(heading + 1, 0, '', `English | [中文](${counterpart})`)
  return lines.join('\n')
}
/**
 * Merge what a project holds with the text the installed revision ships.
 *
 * A `replace` file keeps none of the project's copy: it is the mechanism's own text, and a project
 * expresses itself in notes rather than by editing it. A `rows` file keeps the project's data rows
 * under the fresh header, because a terminology row is a maintainer's decision. A `section` file
 * keeps everything outside the marked blocks, because those are the project's standing orders.
 */
export function mergeManaged(existing: string | undefined, rendered: string, merge: Merge, hooks: readonly SectionHook[]): string {
  if (existing === undefined || merge === 'replace') return rendered
  if (merge === 'rows') {
    const rows = tableRows(existing)
    return rows === '' ? rendered : `${rendered.trimEnd()}\n${rows}\n`
  }
  return mergeSections(existing, hooks)
}
/**
 * Replace each marked block in place, append the ones the text lacks, and remove the ones it must not
 * carry.
 *
 * Everything outside the markers is the project's own standing orders and is kept byte for byte; a
 * block whose inner text was edited is replaced whole, which is what makes the mechanism's text
 * identical in every project. A missing block is appended after everything already there, separated
 * from it by one blank line, so a second run reads back the file the first one wrote. A block whose
 * surface the project no longer holds is removed — the file must not point at a workspace that is
 * gone — and the seam it leaves is closed to one blank line.
 *
 * @param existing - the instruction file as the project holds it.
 * @param hooks - the blocks the collection owns, in the order a missing one is appended.
 * @returns the file's new text, newline-terminated.
 */
export function mergeSections(existing: string, hooks: readonly SectionHook[]): string {
  let text = existing
  const missing: SectionHook[] = []
  for (const hook of hooks) {
    const start = text.indexOf(hook.start)
    const end = start < 0 ? -1 : text.indexOf(hook.end, start + hook.start.length)
    if (end < 0) {
      if (hook.active()) missing.push(hook)
      continue
    }
    text = hook.active()
      ? text.slice(0, start) + hook.render().trimEnd() + text.slice(end + hook.end.length)
      : closeSeam(text.slice(0, start), text.slice(end + hook.end.length))
  }
  let merged = text.replace(/\s+$/, '')
  for (const hook of missing) merged += merged === '' ? hook.render().trimEnd() : `\n\n${hook.render().trimEnd()}`
  return `${merged}\n`
}
/** What is left of a file when the block between two offsets is cut out: one blank line at the seam. */
export function closeSeam(before: string, after: string): string {
  const head = before.replace(/\s+$/, '')
  const tail = after.replace(/^\n+/, '').replace(/\s+$/, '')
  if (head === '') return tail === '' ? '' : `${tail}\n`
  if (tail === '') return `${head}\n`
  return `${head}\n\n${tail}\n`
}

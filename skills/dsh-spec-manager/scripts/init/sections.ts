/**
 * The marked blocks the collection injects into an instruction file.
 *
 * A hook is the pair of markers plus the function that renders what sits between them, so the merge
 * can replace each block in place, append the ones an instruction file lacks and remove the ones it
 * must not carry. Whether the delivery-plan block belongs at all is a question about the installed
 * set, which is what `planSurfaceInstalled` answers.
 *
 * Zero external dependencies.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { PLAN_SURFACE_SKILL, PLANS_SECTION_END, PLANS_SECTION_START } from '../plan-surface.ts'

/** Marks the injected Agent Note section, so a re-run can find and skip it. */
const NOTES_SECTION_START = '<!-- dsh-spec:agent-notes -->'
const NOTES_SECTION_END = '<!-- /dsh-spec:agent-notes -->'
/** The Agent Note section appended to an instruction file, so a reader finds the rules. */
export function notesSection(notesDir: string, skillDirectory: string): string {
  return `${NOTES_SECTION_START}
## Decision records

Add or update an Agent Note in the same change only for lasting decision rationale that code, tests, and existing documentation do not explain; mechanical or local edits are exempt ([scope](${notesDir}/README.md#when-to-write-one)). Archived notes are frozen: never edit them or treat them as current authority ([archive policy](${notesDir}/README.md#archiving-and-deletion)).

Read \`${notesDir}/README.md\` for the layout, the classes, and the in-file format, and keep every note inside the closed lifecycle and class folders the checks enforce. The checks are not copied into this project: they ship inside the installed skills and are reached through the entry point in \`${skillDirectory}/scripts/\`. Run a check through it after adding a note.

${NOTES_SECTION_END}
`
}
/** The delivery-plan section appended to an instruction file, so a reader finds the trigger. */
export function plansSection(plansDir: string): string {
  return `${PLANS_SECTION_START}
## Delivery plans

A delivery that spans more than one step records its plan in \`${plansDir}/\` before it starts; a single-step or mechanical change does not. Read [the contract](${plansDir}/README.md) for the plan's fields, the state read from its working copy, its dependency line, and the start-and-finish rules.

${PLANS_SECTION_END}
`
}
/**
 * One marked block the collection owns inside a project's standing orders.
 *
 * A hook is the pair of markers plus the function that renders what sits between them, so the merge
 * can replace each block in place, append the ones an instruction file lacks and remove the ones it
 * must not carry, without knowing which block it is handling.
 */
export interface SectionHook {
  /** The marker that opens the block. */
  start: string
  /** The marker that closes it. */
  end: string
  /** How the report names this block. */
  label: string
  /** The block's text, markers included and newline-terminated. */
  render: () => string
  /** Whether this project holds the surface the block belongs to. */
  active: () => boolean
}
/**
 * Whether the optional skill that owns the delivery-plan surface is installed here.
 *
 * The installed directory is the state, not a flag: a project that removed the skill has removed the
 * surface, and one that has it holds the surface whether or not a refresh has reached the tree yet.
 */
export function planSurfaceInstalled(root: string, skillsDirectory: string): boolean {
  return existsSync(resolve(root, skillsDirectory, PLAN_SURFACE_SKILL))
}
/** Every marked block an instruction file may carry, in the order a missing one is appended. */
export function sectionHooks(options: { notesDir: string, plansDir: string, skillDirectory: string, planSurface: boolean }): SectionHook[] {
  return [
    { start: NOTES_SECTION_START, end: NOTES_SECTION_END, label: 'the Agent Note section', render: () => notesSection(options.notesDir, options.skillDirectory), active: () => true },
    { start: PLANS_SECTION_START, end: PLANS_SECTION_END, label: 'the delivery-plan section', render: () => plansSection(options.plansDir), active: () => options.planSurface },
  ]
}

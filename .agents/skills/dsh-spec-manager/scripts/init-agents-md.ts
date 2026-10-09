/**
 * Initialize a project's agent instructions, and drive the sync half.
 *
 * This file is the entry point: it reads the command line, decides where the collection landed,
 * prints the inventory, writes what is missing and reports what it did. The templates, the plan of
 * every tree, the marked blocks and the merge rules live in `init/`, and the sync itself in
 * `init/sync.ts`.
 *
 * It writes the root `AGENTS.md`, the Agent Note tree with the contract that governs it, the
 * delivery-plan tree with its contract where the optional skill that owns it is installed, and the
 * documentation folder's standing orders with an empty terminology table. It writes nothing until
 * `--write` is passed, so the default run is a safe inventory, and it never overwrites content it did
 * not create: an existing `AGENTS.md` keeps every line and gains only the marked sections it is
 * missing, and an existing tree or terminology table is left alone.
 *
 * Zero external dependencies by design: it runs under `node` in a project that has no
 * `node_modules` — Node 22.19 strips the types itself.
 */

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { exitsOf, flagValue, hasFlag } from './cli-args.ts'
import { ensureDirectory, findInstructions, findTemplate, present, planDocsTree, planNotesTree, planPlansTree, trackedOrUntrackedFiles } from './init/templates.ts'
import { mergeSections } from './init/merge.ts'
import { planSurfaceInstalled, sectionHooks } from './init/sections.ts'
import { recordPair, syncManagedFiles } from './init/sync.ts'
import { readGateRecord } from './manifest.ts'
import { PLAN_SURFACE_SKILL, PLANS_DIR } from './plan-surface.ts'

/** The exit this entry prints under. */
const { fail } = exitsOf('dsh-spec-init')

const root = resolve(flagValue('--root') ?? process.cwd())
const write = hasFlag('--write')
const syncMode = hasFlag('--sync')

if (!existsSync(root) || !statSync(root).isDirectory()) {
  fail(`${root} is not a directory — pass --root <project>.`)
}
/** This skill's own directory, so every template resolves the same way from any cwd. */
const skillRoot = resolve(import.meta.dirname, '..')
/** Trees the walk refused to enter, with the rule that refused them, for the report. */
const skippedTrees: { path: string, why: string }[] = []
const visibleFiles = trackedOrUntrackedFiles(root)
/**
 * Every gate the record names, in record order.
 *
 * The manifest is the statement of which gates exist, so a record that cannot be read stops the
 * initialization before it writes anything: a project told to run a gate nobody recorded would be
 * a project told to run a command that does not resolve.
 */
const reading = readGateRecord(import.meta.dirname)
if (!reading.ok) {
  fail(reading.error)
}
const gates = reading.names
/**
 * Where the collection is installed for this project, and the dispatcher inside it.
 *
 * The managed text names the *installed* engine directory, not the directory this script happens to
 * run from: the same text is written into every project, a project reads it after the collection is
 * installed, and this repository keeps both an authored tree and an installed copy — deriving the
 * path from the running copy wrote `skills/dsh-spec-manager/scripts` into a project whose commands
 * then resolved nowhere. The skill's own name is the one thing taken from the running copy, because
 * the name is the same in both trees.
 */
const skillsDirectory = flagValue('--dir') ?? join('.agents', 'skills')
const skillDirectory = present(root, `${skillsDirectory}/${basename(resolve(import.meta.dirname, '..'))}`)
const layerDirectory = `${skillDirectory}/scripts`
const dispatcher = `${layerDirectory}/dsh-spec.ts`

/** Whether the optional skill that owns the delivery-plan surface is installed in this project. */
const planSurface = planSurfaceInstalled(root, skillsDirectory)

// ---------------------------------------------------------------- inventory
const target = resolve(root, 'AGENTS.md')
const reported = findInstructions(root, visibleFiles, skippedTrees, root, 0)
const rootInstruction = reported.find(entry => entry.path === 'AGENTS.md')
const subtreeInstructions = reported.filter(entry => entry.path !== 'AGENTS.md')
const notesDir = '.agents/dsh-spec/notes'
const plansDir = PLANS_DIR
const docsDir = 'docs'
const existingRoot = rootInstruction === undefined ? undefined : readFileSync(target, 'utf8')
const hooks = sectionHooks({ notesDir, plansDir, skillDirectory, planSurface })
const missingHooks = hooks.filter(hook => hook.active() && existingRoot?.includes(hook.start) !== true)

// Sync is the other half of the same contract: init writes what is missing and never touches what
// it finds, and sync then brings the files whose text the collection owns up to this revision.
if (syncMode) {
  syncManagedFiles({ root, write, notesDir, docsDir, plansDir, skillRoot, layerDirectory, dispatcher, hooks })
  process.exit(0)
}

console.log(`dsh-spec-init: project root ${root}`)
console.log('')
console.log('  Agent instructions')
if (rootInstruction === undefined) {
  console.log('    root AGENTS.md: missing — will be created from the template, with the marked sections')
} else if (missingHooks.length === 0) {
  console.log(`    root AGENTS.md: present (${rootInstruction.lines} lines), already carries ${hooks.filter(hook => hook.active()).map(hook => hook.label).join(' and ')}`)
} else {
  console.log(`    root AGENTS.md: present (${rootInstruction.lines} lines) — content preserved; ${missingHooks.map(hook => hook.label).join(' and ')} will be appended`)
}
if (subtreeInstructions.length === 0) {
  console.log('    subtree AGENTS.md: none')
} else {
  console.log(`    subtree AGENTS.md: ${subtreeInstructions.length}`)
  for (const entry of subtreeInstructions) console.log(`      ${entry.path} (${entry.lines} lines)`)
}
if (skippedTrees.length > 0) {
  // A maintainer has to be able to check the scan's judgement: every tree it refused to read is
  // named with the rule that refused it.
  console.log('')
  console.log(`  Not scanned (${skippedTrees.length} tree(s) — confirm none of these is yours):`)
  for (const entry of skippedTrees.slice(0, 12)) console.log(`    ${entry.path} — ${entry.why}`)
  if (skippedTrees.length > 12) console.log(`    … and ${skippedTrees.length - 12} more`)
}

console.log('')
console.log('  Agent Note tree')
{
  const notesRoot = resolve(root, notesDir)
  if (!existsSync(notesRoot)) {
    console.log(`    ${notesDir}/: missing — will be created with its contract and gates`)
  } else {
    const planned = planNotesTree(notesDir)
    const missing = planned.filter(entry => !existsSync(resolve(root, entry.path)))
    console.log(`    ${notesDir}/: present — ${planned.length - missing.length}/${planned.length} planned paths exist`)
    for (const entry of missing.slice(0, 12)) console.log(`      missing: ${entry.path}`)
    if (missing.length > 12) console.log(`      … and ${missing.length - 12} more`)
  }
}

console.log('')
console.log('  Delivery plans')
{
  const plansRoot = resolve(root, plansDir)
  const surface = planSurface
  if (!existsSync(plansRoot)) {
    console.log(surface
      ? `    ${plansDir}/: missing — will be created with its contract, its Chinese counterpart and its orders`
      : `    ${plansDir}/: not created — the surface belongs to the optional ${PLAN_SURFACE_SKILL} skill, which is not installed`)
  } else if (!surface) {
    console.log(`    ${plansDir}/: present — kept; the optional ${PLAN_SURFACE_SKILL} skill that owns it is not installed`)
  } else {
    const planned = planPlansTree(plansDir, planSurface)
    const missing = planned.filter(entry => !existsSync(resolve(root, entry.path)))
    console.log(`    ${plansDir}/: present — ${planned.length - missing.length}/${planned.length} planned paths exist`)
    for (const entry of missing) console.log(`      missing: ${entry.path}`)
  }
}

console.log('')
console.log('  Documentation')
{
  const planned = planDocsTree(docsDir)
  const missing = planned.filter(entry => !existsSync(resolve(root, entry.path)))
  console.log(`    ${docsDir}/: ${planned.length - missing.length}/${planned.length} planned path(s) exist`)
  for (const entry of missing) console.log(`      missing: ${entry.path}`)
}

if (!write) {
  console.log('')
  console.log('  dry run — pass --write to apply, then fill every <placeholder> by hand')
  process.exit(0)
}
// ---------------------------------------------------------------- write
/** Paths written in this run, for the closing report. */
const written: string[] = []
/** Paths left untouched because they already existed. */
const kept: string[] = []
/**
 * Write one template into the project, resolving `{gate-dir}` to this script's engine directory and
 * `{notes-dir}` to the notes tree it is creating, and attaching the marked blocks the caller names.
 *
 * Only the initializer knows where the collection landed, so the engine path is filled here rather
 * than left for a person to complete: a placeholder that survives into the project points nowhere.
 * The blocks go through the same merge a sync reads them back with, so an adoption and the refresh
 * that follows it write the same bytes.
 *
 * @param templateName - template name under `templates/`.
 * @param absoluteTarget - where the rendered text is written.
 * @param sections - the marked blocks the created file carries; none for a file that holds only the
 * collection's own contract.
 */
function copyTemplate(templateName: string, absoluteTarget: string, sections: readonly SectionHook[] = []): void {
  const template = findTemplate(skillRoot, templateName)
  if (template === undefined) {
    fail(`template ${templateName} not found beside this skill — restore it and re-run.`)
  }
  ensureDirectory(dirname(absoluteTarget))
  const rendered = readFileSync(template, 'utf8')
    .split('{gate-dir}').join(layerDirectory)
    .split('{notes-dir}').join(notesDir)
  const text = sections.length === 0 ? rendered : mergeSections(`${rendered.trimEnd()}\n`, sections)
  writeFileSync(absoluteTarget, text)
  written.push(relative(root, absoluteTarget).split(sep).join('/'))
}

if (rootInstruction === undefined) {
  copyTemplate('AGENTS.md.template', target, hooks)
} else if (missingHooks.length > 0) {
  writeFileSync(target, mergeSections(existingRoot ?? '', missingHooks))
  written.push(`AGENTS.md (${missingHooks.map(hook => hook.label).join(' and ')} appended; existing content untouched)`)
} else {
  kept.push(`AGENTS.md (already carries ${hooks.filter(hook => hook.active()).map(hook => hook.label).join(' and ')})`)
}

{
  for (const entry of planNotesTree(notesDir)) {
    const absolute = resolve(root, entry.path)
    if (existsSync(absolute)) {
      kept.push(entry.path)
      continue
    }
    if (entry.template === undefined && entry.body === undefined) {
      ensureDirectory(absolute)
      written.push(`${entry.path}/`)
      continue
    }
    if (entry.template === undefined) {
      ensureDirectory(dirname(absolute))
      writeFileSync(absolute, entry.body ?? '')
      written.push(entry.path)
      continue
    }
    copyTemplate(entry.template, absolute)
  }
}

for (const entry of planPlansTree(plansDir, planSurface)) {
  const absolute = resolve(root, entry.path)
  if (existsSync(absolute)) {
    kept.push(entry.path)
    continue
  }
  if (entry.template === undefined) continue
  copyTemplate(entry.template, absolute)
}
// A pair the create half just deployed has no record yet: the sidecar is generated from the two
// files, so the initializer records it here exactly as a sync re-records one it replaces. An
// existing record is left alone — a project that edited both sides keeps its own recognition of that.
if (planSurface && existsSync(resolve(root, plansDir, 'README.zh.md')) && !existsSync(resolve(root, plansDir, 'README.i18n.yaml'))) {
  recordPair(root, dispatcher, `${plansDir}/README.md`)
}

for (const entry of planDocsTree(docsDir)) {
  const absolute = resolve(root, entry.path)
  if (existsSync(absolute)) {
    kept.push(entry.path)
    continue
  }
  if (entry.template === undefined) continue
  copyTemplate(entry.template, absolute)
}
// ---------------------------------------------------------------- report

console.log('')
console.log(`  wrote ${written.length} path(s):`)
for (const entry of written) console.log(`    ${entry}`)
if (kept.length > 0) {
  console.log(`  kept ${kept.length} existing path(s) untouched`)
}
console.log('')
console.log('  next, by hand:')
console.log('    1. replace every <angle-bracket> placeholder in AGENTS.md and .agents/dsh-spec/notes/README.md')
console.log('       with facts you read from this project, or ask the maintainer for')
console.log('    2. never fill a placeholder by guessing: an invented command, path, or rule is worse than an empty section')
console.log('    3. edit .agents/dsh-spec/notes/README.md for this project: point it at this project\'s lifecycle and class set,')
console.log('       and mark or delete the source project\'s history it still describes')
console.log('    4. fill docs/terminology.md as terms are decided — it ships empty on purpose, and every row')
console.log('       binds both sides of a pair, so ask the maintainer before adding one (docs/AGENTS.md says why)')
console.log('    5. run the checks from the collection and wire them into the project check. They are not')
console.log(`       copied into the project; the layer sits at ${layerDirectory}, and every command is`)
console.log(`       reached through ${dispatcher}:`)
if (gates.length === 0) {
  console.log('         none — the record names no gate, so reinstall the collection')
}
console.log(`         node ${dispatcher} check --all --root .                    # the note tree and the frozen archive`)
console.log(`         node ${dispatcher} notes check <note...> --root .          # the notes this change touched`)
console.log(`         node ${dispatcher} md-links check <markdown...> --root .   # the links in the files named`)
console.log(`         node ${dispatcher} translation-pair check <pair...> --root .  # the pairs named`)
console.log(`         node ${dispatcher} check --base <ref> --root .             # the checks a change owes`)
console.log('           the entry point refuses to run when the recorded gate names and the `verify-*.ts`')
console.log('           scripts beside it disagree, so a gate whose script is gone is reported, not skipped')

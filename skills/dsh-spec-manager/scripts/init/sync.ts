/**
 * Bringing the managed text up to the installed revision.
 *
 * A sync reads every file the collection owns, merges it with what the project holds, prints the
 * unified diff a dry run shows, and re-records the pairs it changed. Nothing outside that list is
 * read or written.
 *
 * Zero external dependencies.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { readNorms, normsPathOf } from '../norms.ts'
import { applyNormsHook, readNormsRecord, recordPathOf } from '../norms-apply.ts'
import type { Norm } from '../norms.ts'
import { exitsOf } from '../cli-args.ts'
import { ensureDirectory, findTemplate, substitute } from './templates.ts'
import { managedFiles, mergeManaged, mergeSections, withSwitcher } from './merge.ts'
import type { SectionHook } from './sections.ts'

/** The exit this module's failures print under: the initializer is the entry it belongs to. */
const { fail } = exitsOf('dsh-spec-init')

/** What one sync run needs: the project, the mode, and the paths the entry resolved. */
export interface SyncOptions {
  root: string
  write: boolean
  notesDir: string
  docsDir: string
  plansDir: string
  skillRoot: string
  layerDirectory: string
  dispatcher: string
  hooks: readonly SectionHook[]
}

/** How many lines of one managed file's diff a dry run prints before it truncates. */
const DIFF_LINE_LIMIT = 40
/**
 * The unified diff between the file a project holds and the text a sync would write.
 *
 * The two texts go to a temporary directory and `git diff --no-index` compares them there, so no
 * repository is read and no index is written: the comparison is local to this process and works in a
 * project without git. `git diff --no-index` exits 1 when the inputs differ, which is the expected
 * outcome here rather than an error.
 *
 * @param path - the project-relative path, for the header line.
 * @param existing - the file as the project holds it.
 * @param rendered - the text a sync would write.
 * @returns the diff, or a description of why it could not be produced.
 */
export function unifiedDiff(path: string, existing: string, rendered: string): string {
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-spec-diff-'))
  try {
    const before = join(scratch, 'before')
    const after = join(scratch, 'after')
    writeFileSync(before, existing)
    writeFileSync(after, rendered)
    const result = spawnSync('git', ['diff', '--no-index', '--unified=3', '--', before, after], { encoding: 'utf8' })
    if (result.error !== undefined) return `  (no diff: git could not be run — ${result.error.message})`
    if (result.status === 0) return ''
    if (result.status !== 1) return `  (no diff: git diff exited ${String(result.status)})`
    const lines = (result.stdout ?? '').split('\n').filter(line => !line.startsWith('diff --git ') && !line.startsWith('index '))
    // `@@ -0,0 +1,7 @@` is not what a maintainer reads; the two labels are. Everything from the first
    // hunk marker is kept as it came, blank context lines included — a dropped blank line is a
    // diff that no longer reads as the file.
    const header = [`--- ${path} (as it is)`, `+++ ${path} (as sync would write it)`]
    const hunk = lines.findIndex(line => line.startsWith('@@'))
    const body = lines.slice(hunk < 0 ? 0 : hunk)
    const kept = body.slice(0, DIFF_LINE_LIMIT)
    const rest = body.length - kept.length
    const suffix = rest > 0 ? [`  … ${rest} more line(s) of the diff`] : []
    return [...header, ...kept, ...suffix].join('\n').trimEnd()
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}
/**
 * Bring the files whose text the collection owns up to the installed revision.
 *
 * This is the half of a refresh that reaches the project's own tree: `init` creates these files
 * once, and a project that edits the contract's prose, or keeps an older revision's copy, drifts
 * from every other project. The merge rules keep the two things a project owns — the vocabulary
 * rows and its standing orders outside the marked block — while the mechanism's text is identical
 * everywhere. Nothing outside the managed list is read or written.
 */
export function syncManagedFiles(options: SyncOptions): void {
  const { root, write, notesDir, docsDir, plansDir, skillRoot, layerDirectory, dispatcher, hooks } = options
  /** The norms this project applies, in catalog order, which is what the `AGENTS.md` hook renders.
   * A record or catalog that cannot be read is treated as none: a project's norms must not fail a
   * sync. */
  const appliedNorms = (): Norm[] => {
    try {
      const record = readNormsRecord(recordPathOf(root))
      if (record.norms.length === 0) return []
      const catalog = readNorms(normsPathOf(resolve(import.meta.dirname, '..')))
      return record.norms
        .map(entry => catalog.norms.find(norm => norm.id === entry.id))
        .filter((norm): norm is Norm => norm !== undefined)
    } catch {
      return []
    }
  }
  const applied = appliedNorms()
  const updated: string[] = []
  const created: string[] = []
  /** The `(existing, rendered)` text of each updated file, so a dry run can show what changes. */
  const updates: { path: string, existing: string, rendered: string }[] = []
  /** Managed documents whose counterpart exists, so their pair has to be re-recorded. */
  const pairs: string[] = []
  let unchanged = 0
  for (const file of managedFiles(root, notesDir, docsDir, plansDir)) {
    const absolute = resolve(root, file.path)
    const template = findTemplate(skillRoot, file.template)
    if (template === undefined) {
      fail(`template ${file.template} not found beside this skill — restore it and re-run.`)
    }
    const rendered = substitute(readFileSync(template, 'utf8'), layerDirectory, notesDir)
    const existing = existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
    // A created instruction file carries every marked block, through the same merge the next sync
    // reads it back with, so the two halves write the same bytes.
    let merged = file.merge === 'section' && existing === undefined
      ? mergeSections(`${rendered.trimEnd()}\n`, hooks)
      : mergeManaged(existing, rendered, file.merge, hooks)
    // The one other dynamic region of `AGENTS.md`: a project carries it only while it applies norms.
    if (file.merge === 'section') merged = applyNormsHook(merged, applied)
    // A managed document a project translated has two sides. The English side carries its half of
    // the switcher the moment the counterpart exists, so the text this loop compares is the merged
    // text *with* that switcher — computing it here is what keeps a no-op sync from reporting a
    // change it does not make, and keeps the file from passing through a switcher-less state.
    const counterpart = file.path.endsWith('.md') && file.counterpartTemplate !== undefined
      ? `${file.path.slice(0, -'.md'.length)}.zh.md`
      : undefined
    if (counterpart !== undefined && existsSync(resolve(root, counterpart))) {
      merged = withSwitcher(merged, counterpart.split('/').pop() ?? counterpart)
      pairs.push(file.path)
    }
    if (existing === merged) {
      unchanged += 1
      continue
    }
    if (existing === undefined) created.push(file.path)
    else {
      updated.push(file.path)
      updates.push({ path: file.path, existing, rendered: merged })
    }
    if (write) {
      ensureDirectory(dirname(absolute))
      writeFileSync(absolute, merged)
    }
  }
  // The counterpart side of every pair the loop above found: replaced from its shipped template
  // when it differs, and the pair re-recorded afterwards. Where the collection ships no counterpart
  // template, the pair is named so a person can bring that side along instead.
  for (const file of managedFiles(root, notesDir, docsDir, plansDir)) {
    if (!file.path.endsWith('.md') || file.counterpartTemplate === undefined) continue
    const counterpart = `${file.path.slice(0, -'.md'.length)}.zh.md`
    if (!existsSync(resolve(root, counterpart))) continue
    const template = findTemplate(skillRoot, file.counterpartTemplate)
    if (template === undefined) {
      fail(`template ${file.counterpartTemplate} not found beside this skill — restore it and re-run.`)
    }
    const rendered = substitute(readFileSync(template, 'utf8'), layerDirectory, notesDir)
    const existing = readFileSync(resolve(root, counterpart), 'utf8')
    if (existing === rendered) continue
    updated.push(counterpart)
    updates.push({ path: counterpart, existing, rendered })
    if (write) writeFileSync(resolve(root, counterpart), rendered)
  }

  console.log(`dsh-spec-sync: project root ${root}`)
  if (!write) console.log('  dry run — pass --write to apply')
  for (const path of updated) console.log(`  ${write ? 'updated' : 'would update'} ${path}`)
  for (const path of created) console.log(`  ${write ? 'created' : 'would create'} ${path}`)
  console.log(`  ${unchanged} managed file(s) already match the installed revision`)
  // What a sync would change, line by line: a plan that names files leaves a maintainer to compute
  // the difference by hand, and this is the half where a project's own rows and standing orders are
  // merged, so the interesting question is exactly which lines move.
  if (!write) {
    for (const update of updates) console.log(unifiedDiff(update.path, update.existing, update.rendered))
  }
  for (const path of pairs) {
    const counterpart = `${path.slice(0, -'.md'.length)}.zh.md`
    if (!updated.includes(path) && !updated.includes(counterpart)) continue
    if (!write) {
      console.log(`  would re-record the pair ${path}`)
      continue
    }
    recordPair(root, dispatcher, path)
  }
}
/**
 * Record a bilingual pair through the entry point, so the sidecar is the one the pairing gate checks.
 *
 * A sidecar is generated from the two files rather than installed beside them, which is why a pair an
 * initializer just created needs this step: without the record the two sides exist and the pair is
 * still incomplete.
 *
 * @param path - the pair's English side, project-relative.
 */
export function recordPair(root: string, dispatcher: string, path: string): void {
  const recorded = spawnSync(process.execPath, [resolve(root, dispatcher), 'translation-pair', 'write', path, '--root', root], { stdio: 'inherit' })
  if ((recorded.status ?? 1) !== 0) {
    fail(`the pair ${path} could not be recorded — run the pairing gate by hand`)
  }
}

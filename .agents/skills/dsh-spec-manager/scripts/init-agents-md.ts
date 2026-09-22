/**
 * Initialize a project's agent instructions, and sync the files whose text the collection owns.
 *
 * `init` writes the root `AGENTS.md`, the Agent Note tree with the contract that governs it, and the
 * documentation folder's standing orders with an empty terminology table. It writes nothing until
 * `--write` is passed, so the default run is a safe inventory, and it never overwrites content it did
 * not create: an existing `AGENTS.md` keeps every line and gains only the marked Agent Note section,
 * and an existing notes tree or terminology table is left alone.
 *
 * `--sync` is the other half, and it is what keeps every project's mechanism text identical to the
 * installed revision: the contract documents are replaced, a terminology table keeps its rows, and
 * the standing orders keep everything outside the marked section.
 *
 * Zero external dependencies by design: it runs under `node` in a project that has no
 * `node_modules` — Node 22.19 strips the types itself.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { readGateRecord } from './manifest.ts'
import { applyNormsHook, readNormsRecord, recordPathOf } from './norms-apply.ts'

/**
 * Directories never descended into when looking for existing instruction files.
 *
 * A nested repository is skipped by the walk itself rather than by this set: its instruction files
 * belong to whoever owns that repository, and reporting them as this project's subtree orders sends
 * a maintainer to files they must not edit.
 */
const SKIP_DIRECTORIES = new Set([
  '.git', 'node_modules', 'vendor', 'target', 'build', 'dist', 'out', 'bin', 'obj',
  '.venv', 'venv', '__pycache__', '.gradle', '.mvn', '.idea', '.vscode', '.cache',
  'coverage', 'Pods', 'DerivedData',
])

/** Names a subtree instruction file may use. */
const INSTRUCTION_NAMES = ['AGENTS.md', 'CLAUDE.md']

/** How deep to search for subtree instruction files. */
const MAX_DEPTH = 4

/** The closed set of active Agent Note lifecycles. Mirrors `scripts/agent-note-tree.ts`. */
const LIFECYCLES = ['proposed', 'implemented', 'rejected'] as const

/** The closed set of Agent Note classes. Must match the contract the classification gate reads. */
const CLASSES = ['architecture', 'bug-fix', 'feature', 'process', 'simplification', 'testing'] as const

/** The frozen archive holds implemented notes only, so `implemented` is absent from it. */
const ARCHIVE_CLASSES = ['architecture', 'bug-fix', 'feature', 'process', 'simplification', 'testing'] as const

/** Marks the injected Agent Note section, so a re-run can find and skip it. */
const NOTES_SECTION_START = '<!-- dsh-spec:agent-notes -->'
const NOTES_SECTION_END = '<!-- /dsh-spec:agent-notes -->'

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

const root = resolve(flagValue('--root') ?? process.cwd())
const write = hasFlag('--write')
const syncMode = hasFlag('--sync')

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`dsh-spec-init: ${root} is not a directory — pass --root <project>.`)
  process.exit(1)
}

/** This skill's own directory, so every template resolves the same way from any cwd. */
const skillRoot = resolve(import.meta.dirname, '..')

/**
 * Locate a template this skill installs.
 * @param name - template name under `templates/`.
 * @returns the absolute path, or undefined when no candidate is a readable file.
 */
function findTemplate(name: string): string | undefined {
  const candidates = [resolve(skillRoot, 'templates', name), resolve(import.meta.dirname, name)]
  // A candidate must be a readable file: `existsSync` alone also matches a directory whose
  // name happens to equal the template's, which then fails on read.
  return candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile())
}

/** One agent instruction file already present in the project. */
interface FoundInstruction {
  /** Project-relative POSIX path. */
  path: string
  /** Line count. */
  lines: number
}

/**
 * Dependency markers: a directory holding one of these *and* a lockfile manages its own
 * dependencies, so it is a library somebody else owns rather than part of this project. Neither
 * signal alone is evidence — a workspace member has a manifest too, and only the root normally has
 * a lockfile.
 */
const DEPENDENCY_MANIFESTS = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json']
const DEPENDENCY_LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'poetry.lock', 'uv.lock', 'Cargo.lock', 'go.sum', 'composer.lock', 'Gemfile.lock']

/** Trees the walk refused to enter, with the rule that refused them, for the report. */
const skippedTrees: { path: string, why: string }[] = []

/** Paths git does not ignore, or undefined when the project is not a git work tree. */
function trackedOrUntrackedFiles(): Set<string> | undefined {
  const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' })
  if (probe.status !== 0 || probe.stdout.trim() !== 'true') return undefined
  const listed = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
  if (listed.status !== 0) return undefined
  return new Set(listed.stdout.split('\n').filter(line => line !== '').map(line => line.split(sep).join('/')))
}

const visibleFiles = trackedOrUntrackedFiles()

/**
 * Find every agent instruction file under the project.
 *
 * The scan respects the project's own ignore scope: git's view of the tree decides what is part of
 * the project, so an ignored path is never read and a submodule's contents are never entered.
 * Without git, the walk falls back to directory names. A dependency tree that git does *not* ignore
 * — a vendored library committed on purpose — is still skipped, because its instructions are
 * another owner's; every such decision is reported so a maintainer can check it.
 *
 * @param directory - absolute directory to scan.
 * @param depth - current depth, used to bound the walk.
 * @returns discovered instruction files in walk order.
 */
function findInstructions(directory: string, depth: number): FoundInstruction[] {
  const found: FoundInstruction[] = []
  if (depth > MAX_DEPTH) return found
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) continue
      const nested = join(directory, entry.name)
      const shown = relative(root, nested).split(sep).join('/')
      if (existsSync(join(nested, '.git'))) {
        skippedTrees.push({ path: shown, why: 'a nested repository' })
        continue
      }
      if (visibleFiles !== undefined && ![...visibleFiles].some(file => file.startsWith(`${shown}/`))) {
        skippedTrees.push({ path: shown, why: 'ignored by git' })
        continue
      }
      const ownManifest = DEPENDENCY_MANIFESTS.some(name => existsSync(join(nested, name)))
      const ownLockfile = DEPENDENCY_LOCKFILES.some(name => existsSync(join(nested, name)))
      if (ownManifest && ownLockfile) {
        skippedTrees.push({ path: shown, why: 'a dependency tree — its own manifest and lockfile' })
        continue
      }
      found.push(...findInstructions(nested, depth + 1))
      continue
    }
    if (!entry.isFile() || !INSTRUCTION_NAMES.includes(entry.name)) continue
    const absolute = join(directory, entry.name)
    const path = relative(root, absolute).split(sep).join('/')
    if (visibleFiles !== undefined && !visibleFiles.has(path)) continue
    found.push({ path, lines: readFileSync(absolute, 'utf8').split('\n').length })
  }
  return found
}

/** The Agent Note section appended to an instruction file, so a reader finds the rules. */
function notesSection(notesDir: string): string {
  return `${NOTES_SECTION_START}
## Decision records

Add or update an Agent Note in the same change only for lasting decision rationale that code, tests, and existing documentation do not explain; mechanical or local edits are exempt. **A decision agreed in conversation counts**: record it as a \`proposed\` note before the change exists, because a conclusion that lives only in a transcript is invisible to the next session, the next collaborator, and the next device. Update that note as the design moves, and move it to \`implemented\` when it ships.

Read \`${notesDir}/README.md\` for the layout, the classes, and the in-file format, and keep every note inside the closed lifecycle and class folders the checks enforce. The checks are not copied into this project: they ship inside the installed skills and are reached through the entry point in \`${skillDirectory}/scripts/\`. Run a check through it after adding a note.

${NOTES_SECTION_END}
`
}

/**
 * Every gate the record names, in record order.
 *
 * The manifest is the statement of which gates exist, so a record that cannot be read stops the
 * initialization before it writes anything: a project told to run a gate nobody recorded would be
 * a project told to run a command that does not resolve.
 */
const reading = readGateRecord(import.meta.dirname)
if (!reading.ok) {
  console.error(`dsh-spec-init: ${reading.error}`)
  process.exit(1)
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
const skillDirectory = present(`${skillsDirectory}/${basename(resolve(import.meta.dirname, '..'))}`)
const layerDirectory = `${skillDirectory}/scripts`
const dispatcher = `${layerDirectory}/dsh-spec.ts`

/** A path outside the project is written absolute, so the recorded value still resolves. */
function present(candidate: string): string {
  return candidate.startsWith('..') || candidate === ''
    ? resolve(root, candidate).split(sep).join('/')
    : candidate.split(sep).join('/')
}

/** One path the notes tree needs, with the template written into it. */
interface PlannedFile {
  /** Path relative to the project root. */
  path: string
  /** Template file name, or undefined for a directory this script creates. */
  template?: string
}

function planNotesTree(notesDir: string): PlannedFile[] {
  // Templates install under their destination names; the `.template` suffix marks them as
  // sources, and the pair's sidecar is deliberately not installed (see the README template).
  const planned: PlannedFile[] = [
    { path: `${notesDir}/README.md`, template: 'notes-README.md.template' },
    { path: `${notesDir}/AGENTS.md`, template: 'notes-AGENTS.md.template' },
    { path: `${notesDir}/implemented/AGENTS.md`, template: 'notes-implemented-AGENTS.md.template' },
    { path: `${notesDir}/archived/AGENTS.md`, template: 'notes-archived-AGENTS.md.template' },
    // The archive's search exclusion belongs to the notes tree: it exists because a frozen note is
    // history rather than current authority, so the two are created and removed together.
    { path: '.rgignore', template: 'rgignore.template' },
  ]
  // The gates are deliberately absent: they stay in the collection, which the project references
  // through the dispatcher beside the manager skill, so there is exactly one copy to keep current.
  for (const lifecycle of LIFECYCLES) {
    for (const cls of CLASSES) planned.push({ path: `${notesDir}/${lifecycle}/${cls}` })
  }
  for (const cls of ARCHIVE_CLASSES) planned.push({ path: `${notesDir}/archived/${cls}` })
  return planned
}

/**
 * The two paths init writes into the documentation folder.
 *
 * The vocabulary table is released empty: every row binds both sides of a bilingual pair, so a row
 * copied from the collection or invented by the initializer would be a decision nobody made. The
 * orders beside it state that, and are what a project's own editor reads before adding a row.
 */
function planDocsTree(docsDir: string): PlannedFile[] {
  return [
    { path: `${docsDir}/terminology.md`, template: 'terminology.md.template' },
    { path: `${docsDir}/AGENTS.md`, template: 'docs-AGENTS.md.template' },
  ]
}

/**
 * How a managed file's existing content merges with the text the collection ships.
 *
 * `replace` is a contract document: the mechanism's wording has to be identical in every project,
 * and a project's own decisions live in notes rather than in the contract's prose. `rows` keeps
 * everything below the terminology table's header, because a row is the maintainer's decision.
 * `section` keeps everything outside the marked Agent Note block — the project's standing orders.
 */
type Merge = 'replace' | 'rows' | 'section'

/** One file whose text the collection owns, and how it merges with what the project holds. */
interface ManagedFile {
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
 * The search exclusion belongs to that tree for the same reason. The documentation files always
 * exist: the vocabulary table is what every pair obeys, and the orders beside it are where that
 * rule lives.
 */
function managedFiles(notesDir: string, docsDir: string): ManagedFile[] {
  const notes: ManagedFile[] = [
    { path: `${notesDir}/README.md`, template: 'notes-README.md.template', merge: 'replace', counterpartTemplate: 'notes-README.zh.md.template' },
    { path: `${notesDir}/AGENTS.md`, template: 'notes-AGENTS.md.template', merge: 'replace' },
    { path: `${notesDir}/implemented/AGENTS.md`, template: 'notes-implemented-AGENTS.md.template', merge: 'replace' },
    { path: `${notesDir}/archived/AGENTS.md`, template: 'notes-archived-AGENTS.md.template', merge: 'replace' },
    { path: '.rgignore', template: 'rgignore.template', merge: 'replace' },
  ]
  const docs: ManagedFile[] = [
    { path: `${docsDir}/terminology.md`, template: 'terminology.md.template', merge: 'rows' },
    { path: `${docsDir}/AGENTS.md`, template: 'docs-AGENTS.md.template', merge: 'replace' },
  ]
  // The standing orders are the project's; only the marked block inside them is the collection's.
  const orders: ManagedFile[] = [
    { path: 'AGENTS.md', template: 'AGENTS.md.template', merge: 'section' },
  ]
  return existsSync(resolve(root, notesDir)) ? [...notes, ...docs, ...orders] : [...docs, ...orders]
}

/** The template text with the placeholders only this script can fill. */
function substitute(text: string): string {
  return text.split('{gate-dir}').join(layerDirectory).split('{notes-dir}').join(notesDir)
}

/** The lines below a Markdown table's header separator, which a project owns. */
function tableRows(source: string): string {
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
function withSwitcher(source: string, counterpart: string): string {
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
 * keeps everything outside the marked block, because those are the project's standing orders.
 */
function mergeManaged(existing: string | undefined, rendered: string, merge: Merge): string {
  if (existing === undefined || merge === 'replace') return rendered
  if (merge === 'rows') {
    const rows = tableRows(existing)
    return rows === '' ? rendered : `${rendered.trimEnd()}\n${rows}\n`
  }
  const start = existing.indexOf(NOTES_SECTION_START)
  const end = existing.indexOf(NOTES_SECTION_END)
  const before = (start < 0 ? existing : existing.slice(0, start)).replace(/\s+$/, '')
  const after = start < 0 || end < 0 ? '' : existing.slice(end + NOTES_SECTION_END.length).replace(/^\n+/, '').replace(/\s+$/, '')
  const head = before === '' ? '' : `${before}\n\n`
  const tail = after === '' ? '' : `\n${after}`
  return `${head}${notesSection(notesDir).trimEnd()}${tail}\n`
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
function unifiedDiff(path: string, existing: string, rendered: string): string {
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
function syncManagedFiles(): void {
  /** Whether this project applies any norm, which is what the `AGENTS.md` hook reports. A record
   * that cannot be read is treated as none: a project's norms must not fail a sync. */
  const appliesNorms = (): boolean => {
    try {
      return readNormsRecord(recordPathOf(root)).norms.length > 0
    } catch {
      return false
    }
  }
  const applied = appliesNorms()
  const updated: string[] = []
  const created: string[] = []
  /** The `(existing, rendered)` text of each updated file, so a dry run can show what changes. */
  const updates: { path: string, existing: string, rendered: string }[] = []
  /** Managed documents whose counterpart exists, so their pair has to be re-recorded. */
  const pairs: string[] = []
  let unchanged = 0
  for (const file of managedFiles(notesDir, docsDir)) {
    const absolute = resolve(root, file.path)
    const template = findTemplate(file.template)
    if (template === undefined) {
      console.error(`dsh-spec-init: template ${file.template} not found beside this skill — restore it and re-run.`)
      process.exit(1)
    }
    const rendered = substitute(readFileSync(template, 'utf8'))
    const existing = existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
    let merged = file.merge === 'section' && existing === undefined
      ? `${rendered.trimEnd()}\n\n${notesSection(notesDir).trimEnd()}\n`
      : mergeManaged(existing, rendered, file.merge)
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
  for (const file of managedFiles(notesDir, docsDir)) {
    if (!file.path.endsWith('.md') || file.counterpartTemplate === undefined) continue
    const counterpart = `${file.path.slice(0, -'.md'.length)}.zh.md`
    if (!existsSync(resolve(root, counterpart))) continue
    const template = findTemplate(file.counterpartTemplate)
    if (template === undefined) {
      console.error(`dsh-spec-init: template ${file.counterpartTemplate} not found beside this skill — restore it and re-run.`)
      process.exit(1)
    }
    const rendered = substitute(readFileSync(template, 'utf8'))
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
    const recorded = spawnSync(process.execPath, [resolve(root, dispatcher), 'translation-pair', 'write', path, '--root', root], { stdio: 'inherit' })
    if ((recorded.status ?? 1) !== 0) {
      console.error(`dsh-spec-sync: the pair ${path} could not be re-recorded — run the pairing gate by hand`)
      process.exit(1)
    }
  }
}

// ---------------------------------------------------------------- inventory

const target = resolve(root, 'AGENTS.md')
const reported = findInstructions(root, 0)
const rootInstruction = reported.find(entry => entry.path === 'AGENTS.md')
const subtreeInstructions = reported.filter(entry => entry.path !== 'AGENTS.md')
const notesDir = '.agents/dsh-spec/notes'
const docsDir = 'docs'
const existingRoot = rootInstruction === undefined ? undefined : readFileSync(target, 'utf8')

// Sync is the other half of the same contract: init writes what is missing and never touches what
// it finds, and sync then brings the files whose text the collection owns up to this revision.
if (syncMode) {
  syncManagedFiles()
  process.exit(0)
}

console.log(`dsh-spec-init: project root ${root}`)
console.log('')
console.log('  Agent instructions')
if (rootInstruction === undefined) {
  console.log('    root AGENTS.md: missing — will be created from the template, with the Agent Note section')
} else if (existingRoot?.includes(NOTES_SECTION_START) === true) {
  console.log(`    root AGENTS.md: present (${rootInstruction.lines} lines), already carries the Agent Note section`)
} else {
  console.log(`    root AGENTS.md: present (${rootInstruction.lines} lines) — content preserved; the Agent Note section will be appended`)
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

function ensureDirectory(absolutePath: string): void {
  mkdirSync(absolutePath, { recursive: true })
}

/**
 * Write one template into the project, resolving `{gate-dir}` to this script's engine directory and
 * `{notes-dir}` to the notes tree it is creating, and appending any suffix the caller supplies.
 *
 * Only the initializer knows where the collection landed, so the engine path is filled here rather
 * than left for a person to complete: a placeholder that survives into the project points nowhere.
 */
function copyTemplate(templateName: string, absoluteTarget: string, suffix = ''): void {
  const template = findTemplate(templateName)
  if (template === undefined) {
    console.error(`dsh-spec-init: template ${templateName} not found beside this skill — restore it and re-run.`)
    process.exit(1)
  }
  ensureDirectory(dirname(absoluteTarget))
  const rendered = readFileSync(template, 'utf8')
    .split('{gate-dir}').join(layerDirectory)
    .split('{notes-dir}').join(notesDir) + suffix
  writeFileSync(absoluteTarget, rendered)
  written.push(relative(root, absoluteTarget).split(sep).join('/'))
}

if (rootInstruction === undefined) {
  copyTemplate('AGENTS.md.template', target, `\n${notesSection(notesDir)}`)
} else if (existingRoot?.includes(NOTES_SECTION_START) !== true) {
  const separator = existingRoot?.endsWith('\n') === true ? '' : '\n'
  writeFileSync(target, `${existingRoot ?? ''}${separator}\n${notesSection(notesDir)}`)
  written.push('AGENTS.md (Agent Note section appended; existing content untouched)')
} else {
  kept.push('AGENTS.md (already carries the Agent Note section)')
}

{
  for (const entry of planNotesTree(notesDir)) {
    const absolute = resolve(root, entry.path)
    if (existsSync(absolute)) {
      kept.push(entry.path)
      continue
    }
    if (entry.template === undefined) {
      ensureDirectory(absolute)
      written.push(`${entry.path}/`)
      continue
    }
    copyTemplate(entry.template, absolute)
  }
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

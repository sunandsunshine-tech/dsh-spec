/**
 * Initialize a project's agent instructions: the root `AGENTS.md`, and the Agent Note tree
 * with the contract and gates that govern it.
 *
 * Zero external dependencies by design: it runs under `pnpm dlx tsx` in a project that has no
 * `node_modules`. The script writes nothing until `--write` is passed, so the default run is a
 * safe inventory. It never overwrites content it did not create: an existing `AGENTS.md` keeps
 * every line and gains only the marked Agent Note section, and an existing notes tree is left
 * alone.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { readGateRecord } from './manifest.ts'

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
const skipNotes = hasFlag('--no-notes')

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

Non-trivial changes add or update one Agent Note in the same change — a proposed, implemented, or rejected record under \`${notesDir}/\`, carrying the rationale, the alternatives that lost, and the required verification. Only mechanical or local edits are exempt.

Read \`${notesDir}/README.md\` for the layout, the classes, and the in-file format, and keep every note inside the closed lifecycle and class folders the gates check. The gates are not copied into this project: they ship inside the installed skills and are addressed by name through the dispatcher beside \`${skillDirectory}/scripts/\`. Run a gate through the dispatcher after adding a note.

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
 * The skill directory this script runs from, the layer it carries, and the dispatcher.
 *
 * The gates are referenced where they ship, never copied into the project, and a documented command
 * resolves a gate name through the dispatcher rather than spelling a gate's path. Both are derived
 * from where this script runs, because only the initializer knows where the collection landed.
 */
const skillDirectory = present(relative(root, resolve(import.meta.dirname, '..')))
const layerDirectory = `${skillDirectory}/scripts`
const dispatcher = `${layerDirectory}/run.ts`

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
  /** Template file name, or undefined for a path this script writes directly. */
  template?: string
  /** Literal text to write when no template supplies it. */
  content?: string
}

function planNotesTree(notesDir: string): PlannedFile[] {
  // Templates install under their destination names; the `.template` suffix marks them as
  // sources, and the pair's sidecar is deliberately not installed (see the README template).
  const planned: PlannedFile[] = [
    { path: `${notesDir}/README.md`, template: 'notes-README.md.template' },
    { path: `${notesDir}/AGENTS.md`, template: 'notes-AGENTS.md.template' },
    { path: `${notesDir}/implemented/AGENTS.md`, template: 'notes-implemented-AGENTS.md.template' },
    { path: `${notesDir}/archived/AGENTS.md`, template: 'notes-archived-AGENTS.md.template' },
  ]
  // The gates are deliberately absent: they stay in the collection, which the project references
  // through the dispatcher beside the manager skill, so there is exactly one copy to keep current.
  for (const lifecycle of LIFECYCLES) {
    for (const cls of CLASSES) planned.push({ path: `${notesDir}/${lifecycle}/${cls}` })
  }
  for (const cls of ARCHIVE_CLASSES) planned.push({ path: `${notesDir}/archived/${cls}` })
  return planned
}

// ---------------------------------------------------------------- inventory

const target = resolve(root, 'AGENTS.md')
const reported = findInstructions(root, 0)
const rootInstruction = reported.find(entry => entry.path === 'AGENTS.md')
const subtreeInstructions = reported.filter(entry => entry.path !== 'AGENTS.md')
const notesDir = '.agents/dsh-spec/notes'
const existingRoot = rootInstruction === undefined ? undefined : readFileSync(target, 'utf8')

console.log(`dsh-spec-init: project root ${root}`)
console.log('')
console.log('  Agent instructions')
if (rootInstruction === undefined) {
  console.log('    root AGENTS.md: missing — will be created from the template')
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
if (skipNotes) {
  console.log('    skipped (--no-notes)')
} else {
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

function copyTemplate(templateName: string, absoluteTarget: string): void {
  const template = findTemplate(templateName)
  if (template === undefined) {
    console.error(`dsh-spec-init: template ${templateName} not found beside this skill — restore it and re-run.`)
    process.exit(1)
  }
  ensureDirectory(dirname(absoluteTarget))
  writeFileSync(absoluteTarget, readFileSync(template, 'utf8'))
  written.push(relative(root, absoluteTarget).split(sep).join('/'))
}

if (rootInstruction === undefined) {
  copyTemplate('AGENTS.md.template', target)
} else if (existingRoot?.includes(NOTES_SECTION_START) !== true) {
  const separator = existingRoot?.endsWith('\n') === true ? '' : '\n'
  writeFileSync(target, `${existingRoot ?? ''}${separator}\n${notesSection(notesDir)}`)
  written.push('AGENTS.md (Agent Note section appended; existing content untouched)')
} else {
  kept.push('AGENTS.md (already carries the Agent Note section)')
}

if (!skipNotes) {
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
console.log('    4. run the gates from the collection and wire them into the project check. They are not')
console.log(`       copied into the project; the layer sits at ${layerDirectory}, and`)
console.log(`       every gate is addressed by name through ${dispatcher}:`)
if (gates.length === 0) {
  console.log('         none — the record names no gate, so reinstall the collection')
}
for (const gate of gates) {
  console.log(`         pnpm dlx --allow-build=esbuild tsx@4.22.4 ${dispatcher} ${gate} --root .`)
}
console.log(`         pnpm dlx --allow-build=esbuild tsx@4.22.4 ${dispatcher} --all --root .`)
console.log('           this one is the whole check: it runs every recorded gate, and it refuses to run when')
console.log('           the record and the `verify-*.ts` scripts beside the dispatcher disagree, so a gate that')
console.log('           disappears, or a script nobody recorded, is reported instead of being run')

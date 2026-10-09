/**
 * The instruction files a project holds, the templates this skill installs, and the plans for the
 * trees init creates.
 *
 * Discovery respects the project's own ignore scope and reports every tree it refused to read; the
 * three plan functions say which path each tree needs and which template fills it; `substitute` is
 * the one place the placeholders only an initializer can resolve are filled in.
 *
 * Zero external dependencies.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { AGENT_NOTE_CLASS_PLACEHOLDER } from '../agent-note-tree.ts'

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
/**
 * Locate a template this skill installs.
 * @param name - template name under `templates/`.
 * @returns the absolute path, or undefined when no candidate is a readable file.
 */
export function findTemplate(skillRoot: string, name: string): string | undefined {
  const candidates = [resolve(skillRoot, 'templates', name), resolve(skillRoot, 'scripts', name)]
  // A candidate must be a readable file: `existsSync` alone also matches a directory whose
  // name happens to equal the template's, which then fails on read.
  return candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile())
}
/** Create a directory a planned path needs. */
export function ensureDirectory(absolutePath: string): void {
  mkdirSync(absolutePath, { recursive: true })
}

/** One agent instruction file already present in the project. */
export interface FoundInstruction {
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
/** Paths git does not ignore, or undefined when the project is not a git work tree. */
export function trackedOrUntrackedFiles(root: string): Set<string> | undefined {
  const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' })
  if (probe.status !== 0 || probe.stdout.trim() !== 'true') return undefined
  const listed = spawnSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })
  if (listed.status !== 0) return undefined
  return new Set(listed.stdout.split('\n').filter(line => line !== '').map(line => line.split(sep).join('/')))
}
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
export function findInstructions(root: string, visibleFiles: Set<string> | undefined, skippedTrees: { path: string, why: string }[], directory: string, depth: number): FoundInstruction[] {
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
      found.push(...findInstructions(root, visibleFiles, skippedTrees, nested, depth + 1))
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
/** A path outside the project is written absolute, so the recorded value still resolves. */
export function present(root: string, candidate: string): string {
  return candidate.startsWith('..') || candidate === ''
    ? resolve(root, candidate).split(sep).join('/')
    : candidate.split(sep).join('/')
}
/** One path a tree's plan needs, with the template written into it. */
export interface PlannedFile {
  /** Path relative to the project root. */
  path: string
  /** Template file name, or undefined for a directory or a literal file this script creates. */
  template?: string
  /** Literal body, written as-is when `template` is absent. */
  body?: string
}
export function planNotesTree(notesDir: string): PlannedFile[] {
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
  // The archive's class directories carry a placeholder as well as existing: the gate requires all
  // six whether or not they hold a frozen artifact, and Git carries files rather than directories,
  // so an empty one would be absent from every clone and fail the gate there.
  for (const cls of ARCHIVE_CLASSES) {
    planned.push({ path: `${notesDir}/archived/${cls}` })
    planned.push({
      path: `${notesDir}/archived/${cls}/${AGENT_NOTE_CLASS_PLACEHOLDER}`,
      body: `# Keeps this class directory in the revision when it holds no frozen artifact.\n# The archive gate requires all ${ARCHIVE_CLASSES.length} class directories; it reads this file as a\n# marker rather than as an archived artifact, so nothing is sealed under it.\n`,
    })
  }
  return planned
}
/**
 * The three paths init writes into the delivery-plan tree, where that tree is installed at all.
 *
 * The tree is the workspace of one optional skill, so a project that did not take that skill gets no
 * tree and the hook that would point at it. Where it is taken, the contract is a pair: the English
 * side, the shipped Chinese side, and the sidecar the initializer records once both exist — a
 * record is generated from the two files rather than installed beside them. The plans themselves are
 * the project's own writing and are never planned.
 */
export function planPlansTree(plansDir: string, planSurface: boolean): PlannedFile[] {
  if (!planSurface) return []
  return [
    { path: `${plansDir}/README.md`, template: 'plans-README.md.template' },
    { path: `${plansDir}/README.zh.md`, template: 'plans-README.zh.md.template' },
    { path: `${plansDir}/AGENTS.md`, template: 'plans-AGENTS.md.template' },
  ]
}
/**
 * The two paths init writes into the documentation folder.
 *
 * The vocabulary table is released empty: every row binds both sides of a bilingual pair, so a row
 * copied from the collection or invented by the initializer would be a decision nobody made. The
 * orders beside it state that, and are what a project's own editor reads before adding a row.
 */
export function planDocsTree(docsDir: string): PlannedFile[] {
  return [
    { path: `${docsDir}/terminology.md`, template: 'terminology.md.template' },
    { path: `${docsDir}/AGENTS.md`, template: 'docs-AGENTS.md.template' },
  ]
}
/** The template text with the placeholders only this script can fill. */
export function substitute(text: string, layerDirectory: string, notesDir: string): string {
  return text.split('{gate-dir}').join(layerDirectory).split('{notes-dir}').join(notesDir)
}

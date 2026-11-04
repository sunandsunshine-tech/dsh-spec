/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-alpha.2` (`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// Filesystem and Git guards: canonical paths, project containment and the one project layout a
// command resolves before it touches the notes tree.

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, type Dirent } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { ARCHIVE, DEFAULT_ROOT, MANIFEST } from './constants.ts'

/**
 * One rule violation: the exact text the CLI prints after its `  - ` marker. A check builds the
 * whole diagnostic where it knows the rule, so this type carries no structure.
 */
export type Violation = string

/** The project checkout: its canonical root, the containment boundary and the Git directory. */
export interface ProjectLayout {
  readonly projectRoot: string
  readonly projectReal: string
  readonly gitDirectory: string | undefined
  isInsideProject(path: string): boolean
  isInsideGitDirectory(path: string): boolean
}

export type PathProblem = 'unreadable' | 'not-a-directory' | 'outside-project' | 'inside-git'

/** A path canonicalized through its deepest existing ancestor, or the first problem it hits. */
export type PathResolution = { ok: true; path: string } | { ok: false; problem: PathProblem; path: string }

/** The resolved notes root, the frozen archive below it and the manifest inside the archive. */
export interface NotesPaths {
  readonly root: string
  readonly archiveRoot: string
  readonly manifestPath: string
}

export function display(projectRoot: string, path: string): string {
  return relative(projectRoot, path).split(sep).join('/')
}

export function safeRealpath(path: string): string | undefined {
  try {
    return realpathSync(path)
  } catch {
    return undefined
  }
}

export function isInside(parent: string, child: string): boolean {
  return child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep)
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

export function errorCode(error: unknown, fallback: string): string {
  return error instanceof Error && 'code' in error ? String(error.code) : fallback
}

export function safeReaddir(dir: string, errors: Violation[], label: string): Dirent[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    errors.push(label + ': unreadable directory (' + errorCode(error, 'read error') + ')')
    return []
  }
}

export function safeReadFile(path: string, errors: Violation[], label: string): Buffer | undefined {
  try {
    return readFileSync(path)
  } catch (error) {
    errors.push(label + ': unreadable file (' + errorCode(error, 'read error') + ')')
    return undefined
  }
}

export function git(projectRoot: string, args: readonly string[]): string {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8' })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git exited with status ${result.status}`)
  return result.stdout
}

export function gitDirectory(cwd: string): string | undefined {
  try {
    return realpathSync(resolve(cwd, git(cwd, ['rev-parse', '--absolute-git-dir']).trim()))
  } catch {
    return undefined
  }
}

export function detectProjectRoot(): string | undefined {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
  if (result.status === 0 && result.stdout.trim() !== '') return realpathSync(result.stdout.trim())
  return undefined
}

export function isBareRepository(): boolean {
  const result = spawnSync('git', ['rev-parse', '--is-bare-repository'], { encoding: 'utf8' })
  return result.status === 0 && result.stdout.trim() === 'true'
}

/**
 * Resolve the project root once. Every containment check reads this layout, so the notes root,
 * the archive root and every walked entry are judged against the same canonical boundary.
 */
export function resolveProjectLayout(projectRoot: string): ProjectLayout {
  const projectReal = safeRealpath(projectRoot) ?? resolve(projectRoot)
  const projectGitDirectory = gitDirectory(projectRoot)
  return {
    projectRoot,
    projectReal,
    gitDirectory: projectGitDirectory,
    isInsideProject: (path: string): boolean => isInside(projectReal, path),
    isInsideGitDirectory: (path: string): boolean =>
      projectGitDirectory !== undefined && isInside(projectGitDirectory, path),
  }
}

/**
 * Canonicalize a target that may not exist yet by resolving its deepest existing ancestor and
 * appending the missing names, then judge the result against the project layout.
 */
export function resolveProjectPath(layout: ProjectLayout, target: string): PathResolution {
  const missing: string[] = []
  let existing = target
  while (!existsSync(existing) && dirname(existing) !== existing) {
    missing.unshift(basename(existing))
    existing = dirname(existing)
  }
  const existingReal = safeRealpath(existing)
  if (existingReal === undefined) return { ok: false, problem: 'unreadable', path: target }
  if (existsSync(existingReal) && !isDirectory(existingReal)) {
    return { ok: false, problem: 'not-a-directory', path: existingReal }
  }
  const canonical = resolve(existingReal, ...missing)
  if (!layout.isInsideProject(canonical)) return { ok: false, problem: 'outside-project', path: canonical }
  if (layout.isInsideGitDirectory(canonical)) return { ok: false, problem: 'inside-git', path: canonical }
  return { ok: true, path: canonical }
}

export function resolveNotesPaths(projectRoot: string, rootOption: string | undefined): NotesPaths {
  const root = resolve(projectRoot, rootOption ?? DEFAULT_ROOT)
  const archiveRoot = join(root, ARCHIVE)
  return { root, archiveRoot, manifestPath: join(archiveRoot, MANIFEST) }
}

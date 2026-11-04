/**
 * Scratch repositories for the functional suite.
 *
 * Every case needs a real repository rather than a mocked filesystem: the DCO gate reads a range
 * out of `git log` and resolves a commit's identity against GitHub. A fixture is a temporary
 * directory with its own `git init`, its files, and one commit — nothing outside it is read, and
 * `dispose()` removes it.
 *
 * Zero dependencies: `node:fs`, `node:os` and `git`.
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** This repository's root. */
export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** One scratch repository. */
export interface Fixture {
  readonly root: string
  /** Write a file, creating its parent directories. */
  write(rel: string, text: string): void
  /** Read a file that a check or a command was expected to write. */
  read(rel: string): string
  /** Create a directory. */
  mkdir(rel: string): void
  /** Remove a file, as a deletion looks to git. */
  remove(rel: string): void
  /** Run git in the fixture and return its result. */
  git(...args: string[]): { status: number, stdout: string, stderr: string }
  /** Stage everything and commit it. */
  commit(message: string): void
  /** Every repository-relative path, including untracked ones, sorted. */
  paths(): string[]
  /** Dispose the fixture. */
  dispose(): void
}

/**
 * Build a scratch repository.
 * @param files - repository-relative path to content, written before the initial commit.
 * @returns the fixture, whose `root` is an absolute path.
 */
export function makeFixture(files: Record<string, string> = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'dsh-spec-test-'))
  const gitRun = (...args: string[]): { status: number, stdout: string, stderr: string } => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
    return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
  }
  gitRun('init', '-q')
  gitRun('config', 'user.email', 'suite@example.invalid')
  gitRun('config', 'user.name', 'suite')
  const fixture: Fixture = {
    root,
    write(rel, text) {
      const absolute = join(root, rel)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, text)
    },
    read(rel) {
      return readFileSync(join(root, rel), 'utf8')
    },
    mkdir(rel) {
      mkdirSync(join(root, rel), { recursive: true })
    },
    remove(rel) {
      rmSync(join(root, rel), { force: true })
    },
    git: gitRun,
    commit(message) {
      gitRun('add', '-A')
      gitRun('commit', '-q', '--allow-empty', '-m', message)
    },
    paths() {
      return walk(root).sort()
    },
    dispose() {
      rmSync(root, { recursive: true, force: true })
    },
  }
  for (const [rel, text] of Object.entries(files)) fixture.write(rel, text)
  return fixture
}

/** Every file under one directory, as repository-relative POSIX paths. */
function walk(directory: string, base = directory): string[] {
  const out: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...walk(absolute, base))
    else if (statSync(absolute).isFile()) out.push(relative(base, absolute).split(sep).join('/'))
  }
  return out
}

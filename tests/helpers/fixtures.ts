/**
 * Scratch repositories for the functional suite.
 *
 * Every check in this collection reads a project through `--root`, so a test needs a real
 * repository rather than a mocked filesystem: the archive seal compares against a committed
 * baseline, the pairing record hashes git blobs, and the change scope reads git's index. A fixture
 * is a temporary directory with its own `git init`, its files, and one commit — nothing outside it
 * is read, and `dispose()` removes it.
 *
 * Zero dependencies: `node:fs`, `node:os` and `git`.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** This repository's root: the suite tests the source engine, never the installed copy. */
export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** The Agent Note tree an initialized project carries. */
export const NOTES = '.agents/dsh-spec/notes'

/** The six classes the archive tree requires once it holds an artifact. */
export const CLASSES = ['feature', 'bug-fix', 'simplification', 'architecture', 'process', 'testing'] as const

/** The three active lifecycles; `archived` is deliberately not one of them. */
export const LIFECYCLES = ['proposed', 'implemented', 'rejected'] as const

/** One scratch repository. */
export interface Fixture {
  readonly root: string
  /** Write a file, creating its parent directories. */
  write(rel: string, text: string): void
  /** Read a file that a check or a command was expected to write. */
  read(rel: string): string
  /** Create a directory, which is how the archive's empty class folders exist at all. */
  mkdir(rel: string): void
  /** Remove a file, as a deletion looks to git. */
  remove(rel: string): void
  /** Run git in the fixture and return its result. */
  git(...args: string[]): { status: number, stdout: string, stderr: string }
  /** Stage everything and commit it, which is what a sealed baseline needs. */
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

/** A file's content plus its byte length, for proving that a dry run changed nothing. */
export function snapshot(root: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const rel of walk(root)) out.set(rel, statSync(join(root, rel)).size)
  return out
}

/** Whether a fixture path exists. */
export function exists(root: string, rel: string): boolean {
  return existsSync(join(root, rel))
}

/** A note body the format gate accepts, for the lifecycle it sits in. */
export function noteText(title: string, lifecycle: string): string {
  const body = lifecycle === 'proposed'
    ? '## Proposal\n\nIt should be done this way.\n\n## Acceptance criteria\n\nThe behavior is observable.\n\n## Risks\n\nA risk is named.\n'
    : '## Decision\n\nIt was decided.\n\n## Alternatives considered\n\nThe other option lost because it was worse.\n\n## Consequences\n\nThe decision holds.\n'
  return `# Agent Note: ${title}\n\nStatus: ${lifecycle}\n\n## Problem\n\nSomething needed deciding.\n\n${body}`
}

/** Write one note at a path built from its lifecycle, class and name. */
export function writeNote(fixture: Fixture, name: string, options: { lifecycle?: string, cls?: string, body?: string } = {}): string {
  const lifecycle = options.lifecycle ?? 'implemented'
  const cls = options.cls ?? 'process'
  const rel = `${NOTES}/${lifecycle}/${cls}/${name}`
  fixture.write(rel, options.body ?? noteText(name.replace(/\.md$/, ''), lifecycle))
  return rel
}

/**
 * An archive that holds nothing: its `AGENTS.md` is required, its six kind directories are not.
 * A fixture that lets the archive check run needs this, because a notes tree without `archived/`
 * is not a shape the contract defines.
 */
export function writeEmptyArchive(fixture: Fixture): void {
  fixture.write(`${NOTES}/archived/AGENTS.md`, '# Archived Agent Notes\n')
}

/**
 * The six archive class directories, which an archive holding an artifact must carry.
 *
 * They are created empty on purpose: a kind directory that holds a placeholder file would be read
 * as an archived artifact, and an empty directory is exactly the state git cannot carry, which is
 * why the gate requires them only once something has been archived.
 */
export function writeArchiveKindDirs(fixture: Fixture): void {
  for (const cls of CLASSES) fixture.mkdir(`${NOTES}/archived/${cls}`)
  fixture.write(`${NOTES}/archived/AGENTS.md`, '# Archived Agent Notes\n')
}

/** A complete archived triplet, unsealed. */
export function writeArchivedTriplet(fixture: Fixture, name: string, cls = 'process'): string {
  const rel = `${NOTES}/archived/${cls}/${name}.md`
  fixture.write(rel, noteText(name, 'implemented'))
  fixture.write(`${NOTES}/archived/${cls}/${name}.zh.md`, noteText(name, 'implemented'))
  fixture.write(`${NOTES}/archived/${cls}/${name}.i18n.yaml`, `${name}.md: 0000\n${name}.zh.md: 0000\n`)
  return rel
}

/** A bilingual pair, both sides carrying their half of the switcher. */
export function writePair(fixture: Fixture, anchor: string, options: { switcher?: boolean } = {}): void {
  const stem = anchor.slice(0, -'.md'.length)
  const zh = `${stem}.zh.md`
  const englishSwitch = options.switcher === false ? '' : `English | [中文](${zh.split('/').pop()})\n\n`
  fixture.write(anchor, `# Guide\n\n${englishSwitch}Some text.\n`)
  fixture.write(zh, `# 指南\n\n[English](${anchor.split('/').pop()}) | 中文\n\n一些文字。\n`)
}

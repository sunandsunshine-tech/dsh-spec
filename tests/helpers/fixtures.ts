/**
 * Scratch repositories for the functional suite.
 *
 * Every case needs a real repository rather than a mocked filesystem: the DCO gate reads a range
 * out of `git log` and resolves a commit's identity against GitHub. A fixture is a temporary
 * directory with its own `git init` and files; a case makes its commits, and `dispose()` removes
 * it.
 *
 * A case that needs Git to behave the same on every machine asks for an isolated fixture:
 * `HOME` and `XDG_CONFIG_HOME` then point inside the fixture and the commit identity is fixed,
 * so the machine's own Git configuration is neither read nor written.
 *
 * Zero dependencies: `node:fs`, `node:os` and `git`.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** This repository's root. */
export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** One Git command's outcome. */
export interface GitResult {
  status: number
  stdout: string
  stderr: string
}

/** Environment variables for a fixture's Git commands. A value of `undefined` removes a variable. */
export type FixtureEnvironment = Record<string, string | undefined>

/** The part of a test context a fixture needs: a hook run after the case. */
export interface CleanupContext {
  after(callback: () => void): void
}

/** Options for a scratch repository. */
export interface FixtureOptions {
  /** Extra environment for every Git command; `undefined` removes an inherited variable. */
  env?: FixtureEnvironment
  /** A test context that disposes the fixture when the case ends. */
  cleanup?: CleanupContext
}

/** One scratch repository. */
export interface Fixture {
  readonly root: string
  /** The environment every Git command and script run against this fixture sees. */
  readonly env: FixtureEnvironment
  /** Write a file, creating its parent directories. */
  write(rel: string, text: string): void
  /** Read a file that a check or a command was expected to write. */
  read(rel: string): string
  /** Whether a path exists. */
  exists(rel: string): boolean
  /** Create a directory. */
  mkdir(rel: string): void
  /** Remove a file or directory, as a deletion looks to git. */
  remove(rel: string): void
  /** Run git in the fixture and return its result. */
  git(...args: string[]): GitResult
  /** Run git in the fixture and return stdout, throwing when the command fails. */
  gitOk(...args: string[]): string
  /** Stage everything and commit it; a commit with no change is skipped. */
  commit(message: string): void
  /** Every repository-relative path, including untracked ones, sorted. */
  paths(): string[]
  /** Dispose the fixture. */
  dispose(): void
}

/**
 * The environment that keeps Git away from the machine's own configuration.
 * @param home - the directory `HOME` and `XDG_CONFIG_HOME` point into.
 * @param extra - overrides; a variable set to `undefined` is removed rather than inherited.
 * @returns the environment for one repository's Git commands.
 */
export function isolatedGitEnv(home: string, extra: FixtureEnvironment = {}): FixtureEnvironment {
  return mergeEnvironment(
    {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      HOME: home,
      XDG_CONFIG_HOME: join(home, '.config'),
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
    extra,
  )
}

/**
 * Run one Git command in a directory.
 * @param directory - the working directory; it need not be a fixture.
 * @param args - arguments passed to `git`.
 * @param env - the environment; an isolated one rooted at the directory by default.
 * @returns the exit status and both streams.
 */
export function runGit(
  directory: string,
  args: string[],
  env: FixtureEnvironment = isolatedGitEnv(directory),
): GitResult {
  const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8', env })
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/**
 * Build a scratch repository.
 * @param files - repository-relative path to content, written before the first commit a case makes.
 * @param options - environment overrides and disposal; the process environment is inherited.
 * @returns the fixture, whose `root` is an absolute path.
 */
export function makeFixture(files: Record<string, string> = {}, options: FixtureOptions = {}): Fixture {
  return createFixture(files, options, false)
}

/**
 * Build a scratch repository whose Git commands do not see the machine's configuration.
 * @param files - repository-relative path to content, written before the first commit a case makes.
 * @param options - extra environment, overrides included, and disposal; `HOME` and
 * `XDG_CONFIG_HOME` default inside the fixture.
 * @returns the isolated fixture, whose `root` is an absolute path.
 */
export function makeIsolatedFixture(files: Record<string, string> = {}, options: FixtureOptions = {}): Fixture {
  return createFixture(files, options, true)
}

/**
 * Build one scratch repository.
 * @param files - repository-relative path to content, written after `git init`.
 * @param options - environment overrides and disposal.
 * @param isolated - point `HOME` and `XDG_CONFIG_HOME` inside the fixture and ignore the
 * machine's Git configuration.
 * @returns the fixture, whose `root` is an absolute path.
 */
function createFixture(files: Record<string, string>, options: FixtureOptions, isolated: boolean): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'dsh-spec-test-'))
  const dispose = (): void => {
    rmSync(root, { recursive: true, force: true })
  }
  options.cleanup?.after(dispose)
  const env = isolated ? isolatedGitEnv(root, options.env) : mergeEnvironment({ ...process.env }, options.env)
  const gitRun = (...args: string[]): GitResult => runGit(root, args, env)
  const gitOrThrow = (...args: string[]): string => {
    const result = gitRun(...args)
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed in ${root}: ${result.stderr}`)
    return result.stdout
  }
  gitOrThrow('init', '-q')
  gitOrThrow('config', 'user.email', 'suite@example.invalid')
  gitOrThrow('config', 'user.name', 'suite')
  const fixture: Fixture = {
    root,
    env,
    write(rel, text) {
      const absolute = join(root, rel)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, text)
    },
    read(rel) {
      return readFileSync(join(root, rel), 'utf8')
    },
    exists(rel) {
      return existsSync(join(root, rel))
    },
    mkdir(rel) {
      mkdirSync(join(root, rel), { recursive: true })
    },
    remove(rel) {
      rmSync(join(root, rel), { recursive: true, force: true })
    },
    git: gitRun,
    gitOk: gitOrThrow,
    commit(message) {
      gitOrThrow('add', '-A')
      if (gitRun('diff', '--cached', '--quiet').status === 0) return
      gitOrThrow('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', message)
    },
    paths() {
      return walk(root).sort()
    },
    dispose,
  }
  for (const [rel, text] of Object.entries(files)) fixture.write(rel, text)
  return fixture
}

/** Apply overrides to an environment, removing variables set to `undefined`. */
function mergeEnvironment(environment: FixtureEnvironment, extra: FixtureEnvironment = {}): FixtureEnvironment {
  for (const [name, value] of Object.entries(extra)) {
    if (value === undefined) delete environment[name]
    else environment[name] = value
  }
  return environment
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

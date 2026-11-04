/**
 * Scratch workspaces for the skill-workspace tooling tests.
 *
 * The lifecycle CLI and the installed-copy refresh run against a directory tree rather than a
 * Git repository, so a case only needs a temporary root, files written into it, and a disposal.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** One scratch workspace. */
export interface Workspace {
  readonly root: string
  /** Write a file, creating its parent directories. */
  write(rel: string, text: string): void
  /** Read one file. */
  read(rel: string): string
  /** Whether a path exists. */
  exists(rel: string): boolean
  /** The entries of one directory, sorted. */
  entries(rel: string): string[]
  /** Create a directory. */
  mkdir(rel: string): void
  /** Remove a path. */
  remove(rel: string): void
  /** Dispose the workspace. */
  dispose(): void
}

/** Create one scratch workspace under the system temporary directory. */
export function makeWorkspace(): Workspace {
  const root = mkdtempSync(join(tmpdir(), 'skill-workspace-'))
  return {
    root,
    write(rel, text) {
      mkdirSync(dirname(join(root, rel)), { recursive: true })
      writeFileSync(join(root, rel), text)
    },
    read(rel) {
      return readFileSync(join(root, rel), 'utf8')
    },
    exists(rel) {
      return existsSync(join(root, rel))
    },
    entries(rel) {
      return existsSync(join(root, rel)) ? readdirSync(join(root, rel)).sort() : []
    },
    mkdir(rel) {
      mkdirSync(join(root, rel), { recursive: true })
    },
    remove(rel) {
      rmSync(join(root, rel), { recursive: true, force: true })
    },
    dispose() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

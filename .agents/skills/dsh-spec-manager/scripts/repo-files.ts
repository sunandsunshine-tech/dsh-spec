/**
 * SPDX-License-Identifier: MIT
 * Ported from dsh scripts/repo-files.ts @ 00102833dfaee1da9f48a3a8eae9d34005a75218 (submodules/dsh). Relation: adapted.
 */
/** Shared repository file discovery and line scanning, for the prose gates. */

import { globSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

/** One authored path plus its canonical target for symlink deduplication. */
export interface RepoFile {
  /** Absolute path matched by the caller's glob. */
  abs: string
  /** Absolute canonical path used only for deduplication. */
  real: string
}

/** A rejected line-oriented repository reference. */
export interface ReferenceViolation {
  /** Repo-relative file containing the reference. */
  file: string
  /** 1-based line containing the reference. */
  line: number
  /** Normalized reference text. */
  ref: string
}

/**
 * Expand repository-relative globs and deduplicate symlinked files.
 * @param root - absolute repository root.
 * @param patterns - repository-relative glob patterns, processed in order.
 * @param isExcluded - optional predicate over each matched relative path.
 * @returns matched files in stable first-seen order.
 */
export function uniqueRepoFiles(
  root: string,
  patterns: readonly string[],
  isExcluded: (relativePath: string) => boolean = () => false,
): RepoFile[] {
  const seen = new Set<string>()
  const files: RepoFile[] = []
  for (const pattern of patterns) {
    for (const match of globSync(pattern, { cwd: root })) {
      // `globSync` may hand back an absolute or a relative match depending on the platform and the
      // pattern. Normalize before anything else: an exclusion predicate compares repository-relative
      // paths, and handing it an absolute one silently disables every exclusion.
      const abs = resolve(root, match)
      const repoPath = relative(root, abs).split(sep).join('/')
      if (isExcluded(repoPath)) continue
      // A selector may be a directory prefix, and a glob on one matches the directory itself.
      // A gate reads files, so anything that is not one is skipped here rather than failing later.
      if (!statSync(abs).isFile()) continue
      const real = realpathSync(abs)
      if (seen.has(real)) continue
      seen.add(real)
      files.push({ abs, real })
    }
  }
  return files
}

/**
 * Scan regex matches line by line and return the normalized matches a caller rejects.
 *
 * A gate that reads source lines rather than the parsed tree needs this: a link a bulk rewrite
 * mangled, a repository path that no longer resolves, a term that must not appear. What counts as a
 * violation stays with the caller; the loop, the line numbers, and the choice of a range to leave
 * unread live here.
 *
 * @param root - absolute repository root used for violation paths.
 * @param absPath - absolute text-file path to scan.
 * @param pattern - global regex matched independently against each line.
 * @param normalize - maps raw regex text to the reference the gate evaluates.
 * @param isViolation - returns true when the normalized reference is invalid.
 * @param excludedRange - optional selector of a zero-based, end-exclusive line range to leave unread, for a document that must keep one region exactly as it was; a gate that passes this reports the range it skipped rather than staying silent about it.
 * @returns every rejected reference in source order.
 */
export function findReferenceViolations(
  root: string,
  absPath: string,
  pattern: RegExp,
  normalize: (raw: string) => string,
  isViolation: (ref: string) => boolean,
  excludedRange?: (file: string, source: string) => readonly [number, number] | undefined,
): ReferenceViolation[] {
  const file = relative(root, absPath).split(sep).join('/')
  const out: ReferenceViolation[] = []
  const source = readFileSync(absPath, 'utf8')
  const lines = source.split('\n')
  const excluded = excludedRange?.(file, source)
  for (let i = 0; i < lines.length; i++) {
    if (excluded !== undefined && i >= excluded[0] && i < excluded[1]) continue
    const line = lines[i]
    if (line === undefined) continue
    for (const match of line.matchAll(pattern)) {
      const ref = normalize(match[0])
      if (isViolation(ref)) out.push({ file, line: i + 1, ref })
    }
  }
  return out
}

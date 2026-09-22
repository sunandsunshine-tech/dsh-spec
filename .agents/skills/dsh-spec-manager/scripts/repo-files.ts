/**
 * SPDX-License-Identifier: MIT
 * Ported from dsh scripts/repo-files.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: split.
 */
/** Shared repository file discovery, for the prose gates that walk Markdown. */

import { globSync, realpathSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

/** One authored path plus its canonical target for symlink deduplication. */
export interface RepoFile {
  /** Absolute path matched by the caller's glob. */
  abs: string
  /** Absolute canonical path used only for deduplication. */
  real: string
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

/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-alpha.2` (`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// The frozen archive manifest: its schema, canonical rendering, content hashes and the Git
// baseline that keeps it append-only.

import { createHash } from 'node:crypto'
import { HASH } from './constants.ts'
import { git, type Violation } from './guards.ts'

export interface Manifest {
  version: 1
  files: Record<string, string>
}

export interface ManifestExtension {
  files: Record<string, string>
  added: string[]
  errors: Violation[]
}

export function emptyManifest(): Manifest {
  return { version: 1, files: {} }
}

export function contentHash(content: Buffer): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

export function parseManifest(content: string): Manifest {
  const value: unknown = JSON.parse(content)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('expected a JSON object')
  const fields = Object.keys(value).sort()
  if (fields.join(',') !== 'files,version') throw new Error('expected exactly the fields `version` and `files`')
  const record = value as Record<string, unknown>
  if (record.version !== 1) throw new Error('unsupported manifest version (expected 1)')
  if (typeof record.files !== 'object' || record.files === null || Array.isArray(record.files)) {
    throw new Error('`files` must be an object')
  }
  const files: Record<string, string> = {}
  for (const [path, hash] of Object.entries(record.files as Record<string, unknown>)) {
    if (typeof hash !== 'string' || !HASH.test(hash)) throw new Error(`invalid content hash for ${path}`)
    files[path] = hash
  }
  return { version: 1, files }
}

/** Code-point path order, so the rendered manifest is deterministic across locales. */
export function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function renderManifest(files: Record<string, string>): string {
  const sorted = Object.fromEntries(Object.entries(files).sort(([left], [right]) => comparePaths(left, right)))
  return `${JSON.stringify({ version: 1, files: sorted }, null, 2)}\n`
}

export function readBaseline(projectRoot: string, ref: string, manifestRepoPath: string): Manifest {
  git(projectRoot, ['cat-file', '-e', `${ref}^{commit}`])
  const entry = git(projectRoot, ['ls-tree', '--name-only', ref, '--', manifestRepoPath]).trim()
  if (entry === '') return emptyManifest()
  return parseManifest(git(projectRoot, ['show', `${ref}:${manifestRepoPath}`]))
}

export function extendManifest(manifest: Manifest, artifacts: Map<string, Buffer>): ManifestExtension {
  const errors: Violation[] = []
  const files = { ...manifest.files }
  for (const [path, expected] of Object.entries(manifest.files)) {
    const content = artifacts.get(path)
    if (content === undefined) errors.push(`archive: ${path} — sealed artifact is missing`)
    else if (contentHash(content) !== expected) errors.push(`archive: ${path} — sealed content hash changed`)
  }
  const added: string[] = []
  for (const path of [...artifacts.keys()].sort(comparePaths)) {
    if (files[path] !== undefined) continue
    const content = artifacts.get(path)
    if (content === undefined) continue
    files[path] = contentHash(content)
    added.push(path)
  }
  return { files, added, errors }
}

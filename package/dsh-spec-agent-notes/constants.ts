/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// The closed vocabulary and grammars the notes gate enforces: lifecycles, classes, reserved
// names and the shapes a filename, date, hash and companion suffix must match.

export type Lifecycle = 'proposed' | 'implemented' | 'rejected'
export type ClassKind = 'feature' | 'bug-fix' | 'simplification' | 'architecture' | 'process' | 'testing'

export const LIFECYCLES: readonly Lifecycle[] = ['proposed', 'implemented', 'rejected']
export const CLASSES: readonly ClassKind[] = [
  'feature',
  'bug-fix',
  'simplification',
  'architecture',
  'process',
  'testing',
]

export const ARCHIVE = 'archived'
export const MANIFEST = 'manifest.json'
export const DEFAULT_ROOT = '.agents/dsh-spec-agent-notes'
export const ROOT_ALLOWLIST: ReadonlySet<string> = new Set(['AGENTS.md', 'CLAUDE.md'])
export const ARCHIVE_ROOT_ALLOWLIST: ReadonlySet<string> = new Set([MANIFEST, 'AGENTS.md'])
export const GITKEEP = '.gitkeep'

export const FILENAME = /^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/
export const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
export const HASH = /^sha256:[0-9a-f]{64}$/
export const COMPANION = /^\.[A-Za-z0-9._-]*[A-Za-z0-9]$/

export function isLifecycle(value: string): value is Lifecycle {
  return (LIFECYCLES as readonly string[]).includes(value)
}

export function isClassKind(value: string): value is ClassKind {
  return (CLASSES as readonly string[]).includes(value)
}

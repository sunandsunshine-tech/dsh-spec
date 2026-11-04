/**
 * The generated vendored-packages table in THIRD_PARTY_NOTICES.md.
 *
 * The table is derived from the shipped bundles (see vendor-packages.ts); this module renders it,
 * replaces the region between its markers, and reports whether the file changed. It runs from
 * scripts/sync-vendored-notices.ts and after every bundle publish, so a stale table cannot be
 * committed.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readInlinePackages } from './vendor-packages.ts'

/** The markers around the generated table. */
export const START = '<!-- vendored-packages:start -->'
export const END = '<!-- vendored-packages:end -->'

/**
 * Render the generated table.
 * @param packages - package name to version, sorted.
 * @returns the markdown table with a trailing newline.
 */
export function renderVendoredTable(packages: Map<string, string>): string {
  return [
    '| Package | Version |',
    '|---|---|',
    ...[...packages.entries()].map(([name, version]) => '| `' + name + '` | ' + version + ' |'),
    '',
  ].join('\n')
}

/**
 * Rewrite the generated table in THIRD_PARTY_NOTICES.md.
 * @param repoRoot - the repository root.
 * @param options - `write: false` compares without touching the file.
 * @returns whether the file is stale, and the packages the table now lists.
 * @throws when the markers are missing, reversed or duplicated, or the input is unusable.
 */
export function syncVendoredNotices(
  repoRoot: string,
  options: { write?: boolean } = {},
): { changed: boolean; packages: Map<string, string> } {
  const path = join(repoRoot, 'THIRD_PARTY_NOTICES.md')
  const text = readFileSync(path, 'utf8')
  const start = text.indexOf(START)
  const end = text.indexOf(END)
  if (start < 0 || end < 0 || start >= end || text.indexOf(START, start + 1) >= 0 || text.indexOf(END, end + 1) >= 0) {
    throw new Error('THIRD_PARTY_NOTICES.md must contain exactly one ' + START + ' / ' + END + ' pair in order')
  }
  const packages = readInlinePackages(repoRoot)
  const table = renderVendoredTable(packages)
  const next = text.slice(0, start + START.length) + '\n' + table + text.slice(end)
  if (next === text) return { changed: false, packages }
  if (options.write !== false) writeFileSync(path, next)
  return { changed: true, packages }
}

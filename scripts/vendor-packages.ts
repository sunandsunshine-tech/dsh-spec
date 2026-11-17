/**
 * The npm packages the shipped script bundles inline.
 *
 * The bundles are the source of truth: every bundled module carries a
 * `node_modules/.pnpm/<package>@<version>/` comment, and the two bundle families are scanned
 * together. `punycode.js` is inlined inside markdown-it's dist without a package-file boundary,
 * so its version is read from the root lockfile. The generated notice table and the dependency
 * submission both consume this module.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** One npm package version inlined by a shipped bundle. */
export interface InlinePackage {
  name: string
  version: string
}

/**
 * Discover the shipped script bundles under skills/<skill>/scripts/.
 * @param repoRoot - the repository root.
 * @returns bundle paths relative to the repository root, sorted.
 */
export function discoverBundlePaths(repoRoot: string): string[] {
  const skillsRoot = join(repoRoot, 'skills')
  const bundles: string[] = []
  for (const skill of readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const scripts = join(skillsRoot, skill.name, 'scripts')
    if (!existsSync(scripts)) continue
    for (const file of readdirSync(scripts)) {
      if (file.endsWith('.mjs')) bundles.push('skills/' + skill.name + '/scripts/' + file)
    }
  }
  return bundles.sort()
}

/**
 * Read the packages one bundle inlines, from its package-file boundary comments.
 * @param repoRoot - the repository root.
 * @param bundle - the bundle path, relative to the repository root.
 * @returns distinct name/version rows in bundle order.
 */
export function readBundlePackages(repoRoot: string, bundle: string): InlinePackage[] {
  const packages = new Map<string, InlinePackage>()
  const text = readFileSync(join(repoRoot, bundle), 'utf8')
  for (const match of text.matchAll(/node_modules\/\.pnpm\/(@[^/]+\+[^/@]+|[^/@][^/]*)@([^/]+)\//g)) {
    const name = match[1].includes('+') ? match[1].replace('+', '/') : match[1]
    const version = match[2]
    packages.set(name + '@' + version, { name, version })
  }
  return [...packages.values()]
}

/**
 * Read the inlined packages and their versions from the shipped bundles.
 * @param repoRoot - the repository root.
 * @returns distinct name/version rows, sorted by name and version.
 * @throws when a bundle is missing or no package is found.
 */
export function readInlinePackages(repoRoot: string): InlinePackage[] {
  const packages = new Map<string, InlinePackage>()
  for (const bundle of discoverBundlePaths(repoRoot)) {
    for (const item of readBundlePackages(repoRoot, bundle)) {
      packages.set(item.name + '@' + item.version, item)
    }
  }
  if (
    [...packages.values()].some((item) => item.name === 'markdown-it') &&
    ![...packages.values()].some((item) => item.name === 'punycode.js')
  ) {
    const lock = readFileSync(join(repoRoot, 'pnpm-lock.yaml'), 'utf8')
    const match = lock.match(/^ {2}punycode\.js@([0-9][^:]+):$/m)
    if (match === null) throw new Error('punycode.js is inlined by markdown-it but is absent from pnpm-lock.yaml')
    packages.set('punycode.js@' + match[1], { name: 'punycode.js', version: match[1] })
  }
  if (packages.size === 0) throw new Error('no inlined package was found; the bundle markers are missing')
  return [...packages.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.version.localeCompare(right.version, undefined, { numeric: true }),
  )
}

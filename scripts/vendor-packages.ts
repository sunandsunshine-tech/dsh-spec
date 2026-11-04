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
 * @returns package name to version.
 */
export function readBundlePackages(repoRoot: string, bundle: string): Map<string, string> {
  const packages = new Map<string, string>()
  const text = readFileSync(join(repoRoot, bundle), 'utf8')
  for (const match of text.matchAll(/node_modules\/\.pnpm\/(@[^/]+\+[^/@]+|[^/@][^/]*)@([^/]+)\//g)) {
    const name = match[1].includes('+') ? match[1].replace('+', '/') : match[1]
    packages.set(name, match[2])
  }
  return packages
}

/**
 * Read the inlined packages and their versions from the shipped bundles.
 * @param repoRoot - the repository root.
 * @returns package name to version, sorted by package name.
 * @throws when a bundle is missing, its markers disagree, or no package is found.
 */
export function readInlinePackages(repoRoot: string): Map<string, string> {
  const packages = new Map<string, string>()
  for (const bundle of discoverBundlePaths(repoRoot)) {
    for (const [name, version] of readBundlePackages(repoRoot, bundle)) {
      const known = packages.get(name)
      if (known !== undefined && known !== version) {
        throw new Error(
          bundle + ' inlines ' + name + '@' + version + ' while another bundle inlines ' + name + '@' + known,
        )
      }
      packages.set(name, version)
    }
  }
  if (packages.has('markdown-it') && !packages.has('punycode.js')) {
    const lock = readFileSync(join(repoRoot, 'pnpm-lock.yaml'), 'utf8')
    const match = lock.match(/^ {2}punycode\.js@([0-9][^:]+):$/m)
    if (match === null) throw new Error('punycode.js is inlined by markdown-it but is absent from pnpm-lock.yaml')
    packages.set('punycode.js', match[1])
  }
  if (packages.size === 0) throw new Error('no inlined package was found; the bundle markers are missing')
  return new Map([...packages.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

#!/usr/bin/env node
// Rebuild every skill script bundle into a temporary directory and compare it with the
// committed copy under skills/<skill>/scripts/.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+, with the pinned Vite+ devDependency installed
// input          the working directory as the repository root
// output         one line per mismatch, then a summary
// exit           0 every bundle matches · 1 a bundle differs, is missing or is extra · 2 usage error

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const USAGE = `usage: check-bundles.ts [--help]

Rebuild every skill script bundle into a temporary directory and fail when a byte differs from
the committed copy under skills/<skill>/scripts/. Run the command from the repository root.

exit: 0 every bundle matches · 1 a bundle differs, is missing or is extra · 2 usage error`

/**
 * Compare a freshly built bundle tree with the committed one.
 * @param repoRoot - the repository root, whose skills/ tree is the committed side.
 * @param builtRoot - the temporary build output root.
 * @returns human-readable diagnostics, and the number of built bundles compared.
 */
export function compareBundles(repoRoot: string, builtRoot: string): { lines: string[]; count: number } {
  const lines: string[] = []
  const builtSkills = readdirSync(builtRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  if (builtSkills.length === 0) {
    return { lines: ['check-bundles.ts: the build produced no bundle; nothing to check'], count: 0 }
  }
  const seen = new Set<string>()
  for (const skill of builtSkills) {
    const builtScripts = join(builtRoot, skill, 'scripts')
    if (!existsSync(builtScripts)) continue
    const landedScripts = join(repoRoot, 'skills', skill, 'scripts')
    for (const name of readdirSync(builtScripts)
      .filter((file) => file.endsWith('.mjs'))
      .sort()) {
      seen.add(join(skill, 'scripts', name))
      const landed = join(landedScripts, name)
      if (!existsSync(landed)) {
        lines.push('check-bundles.ts: missing ' + relative(repoRoot, landed))
        continue
      }
      if (!readFileSync(join(builtScripts, name)).equals(readFileSync(landed))) {
        lines.push('check-bundles.ts: changed ' + relative(repoRoot, landed) + ' (rebuild and publish)')
      }
    }
  }
  for (const skill of readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    const landedScripts = join(repoRoot, 'skills', skill, 'scripts')
    if (!existsSync(landedScripts)) continue
    for (const name of readdirSync(landedScripts).filter((file) => file.endsWith('.mjs'))) {
      if (!seen.has(join(skill, 'scripts', name))) {
        lines.push('check-bundles.ts: extra ' + relative(repoRoot, join(landedScripts, name)))
      }
    }
  }
  return { lines, count: seen.size }
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  if (args.length > 0) {
    console.error('check-bundles.ts: unknown option: ' + args.join(' '))
    console.error('run "check-bundles.ts --help" for usage')
    process.exitCode = 2
    return
  }
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const temp = mkdtempSync(join(tmpdir(), 'dsh-spec-bundles-'))
  let exitCode = 0
  try {
    const build = spawnSync(process.execPath, [join(repoRoot, 'scripts/build-skills.ts')], {
      cwd: repoRoot,
      env: { ...process.env, SKILL_OUT_ROOT: temp },
      encoding: 'utf8',
    })
    if (build.status !== 0) {
      process.stdout.write(build.stdout ?? '')
      process.stderr.write(build.stderr ?? '')
      exitCode = build.status ?? 1
    } else {
      const result = compareBundles(repoRoot, temp)
      for (const line of result.lines) console.error(line)
      exitCode = result.lines.length > 0 ? 1 : 0
      if (exitCode === 0) console.log('check-bundles: ' + result.count + ' bundle(s) match skills/<name>/scripts/')
    }
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
  process.exitCode = exitCode
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()

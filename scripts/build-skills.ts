#!/usr/bin/env node
// Build selected skill script packages. With no argument (or --all) every package under
// package/*/ that has a build.ts is built; with skill names only those packages are built.

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..')
const packageRoot = join(repoRoot, 'package')
const names = readdirSync(packageRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(packageRoot, entry.name, 'build.ts')))
  .map((entry) => entry.name)
  .sort()
const args = process.argv.slice(2).filter((arg) => arg !== '--')
const all = args.length === 0 || args.includes('--all')
const selected = all ? names : args
for (const name of selected) {
  if (!names.includes(name)) {
    console.error('build-skills: unknown skill package ' + JSON.stringify(name) + '; known: ' + names.join(', '))
    process.exit(2)
  }
}
for (const name of selected) {
  const result = spawnSync(process.execPath, [join(packageRoot, name, 'build.ts')], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

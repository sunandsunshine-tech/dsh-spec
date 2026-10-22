#!/usr/bin/env node
// Synchronize the repository's skills into the installed copies under .agents/skills/.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+
// input          the working directory as the repository root
// output         one line per skill on stdout
// exit           0 every skill was synchronized · 1 an action or precondition failed · 2 usage error

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, relative } from 'node:path'

const USAGE = `usage: refresh-skills.ts [--dry-run] [--help]

Copy each skills/<name>/ into .agents/skills/<name>/ exactly, leaving every other installed
skill alone. The working directory is the repository root.

options:
  --dry-run   print the skills that would be synchronized and change nothing
  --help, -h  print this and exit 0

A failed copy removes its staging directory; a failed swap keeps the previous copy under
.agents/.refresh for inspection.

exit: 0 every skill was synchronized · 1 an action or precondition failed · 2 usage error`

class RefreshError extends Error {}

interface Result {
  readonly skill: string
  readonly ok: boolean
  readonly detail: string
}

const relativeToCwd = (path: string): string => relative(process.cwd(), path) || '.'

const isDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const removeTree = (path: string): void => {
  rmSync(path, { recursive: true, force: true })
}

/** Hash every file under `root`, keyed by its relative path. */
function hashTree(root: string): Map<string, string> {
  const files = new Map<string, string>()
  if (!isDirectory(root)) return files
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path, name)
      else if (entry.isFile()) files.set(name, createHash('sha256').update(readFileSync(path)).digest('hex'))
      else if (entry.isSymbolicLink()) files.set(name, `link:${readlinkSync(path)}`)
    }
  }
  walk(root, '')
  return files
}

function assertTreesEqual(expected: string, actual: string, label: string): void {
  const left = hashTree(expected)
  const right = hashTree(actual)
  const missing = [...left.keys()].filter((path) => !right.has(path))
  const extra = [...right.keys()].filter((path) => !left.has(path))
  const changed = [...left.keys()].filter((path) => right.has(path) && left.get(path) !== right.get(path))
  if (missing.length === 0 && extra.length === 0 && changed.length === 0) return
  const detail = [
    ...missing.map((path) => `missing ${path}`),
    ...extra.map((path) => `extra ${path}`),
    ...changed.map((path) => `changed ${path}`),
  ]
  throw new RefreshError(`${label} does not match: ${detail.slice(0, 3).join(', ')}`)
}

/** Replace one directory with the staged one, keeping the previous directory until the swap ends. */
function swapDir(stage: string, target: string, backup: string): void {
  removeTree(backup)
  const hadTarget = existsSync(target)
  if (hadTarget) renameSync(target, backup)
  try {
    renameSync(stage, target)
  } catch (error) {
    if (hadTarget && existsSync(backup)) renameSync(backup, target)
    throw error
  }
  removeTree(backup)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}
let dryRun = false
for (const arg of args) {
  if (arg === '--dry-run') {
    dryRun = true
    continue
  }
  console.error(`Error: unknown option: ${arg}`)
  console.error(USAGE)
  process.exit(2)
}

const cwd = process.cwd()
const skillsDir = join(cwd, 'skills')
const installedDir = join(cwd, '.agents', 'skills')
const stagingRoot = join(cwd, '.agents', '.refresh')
const skills = isDirectory(skillsDir)
  ? readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort()
  : []

if (skills.length === 0) {
  console.error(`Error: no skills under ${relativeToCwd(skillsDir)}; nothing to synchronize`)
  process.exit(1)
}

const results: Result[] = []
for (const name of skills) {
  const source = join(skillsDir, name)
  const destination = join(installedDir, name)
  const stage = join(stagingRoot, name)
  const backup = join(stagingRoot, `${name}.previous`)
  const files = hashTree(source).size

  if (dryRun) {
    results.push({ skill: name, ok: true, detail: `would mirror ${files} file(s)` })
    continue
  }

  try {
    removeTree(stage)
    mkdirSync(stagingRoot, { recursive: true })
    cpSync(source, stage, { recursive: true })
    assertTreesEqual(source, stage, `${name} staging`)
    mkdirSync(dirname(destination), { recursive: true })
    swapDir(stage, destination, backup)
    assertTreesEqual(source, destination, name)
    results.push({ skill: name, ok: true, detail: `mirrored ${files} file(s)` })
  } catch (error) {
    results.push({ skill: name, ok: false, detail: error instanceof Error ? error.message : String(error) })
    if (existsSync(backup)) console.error(`warning: a failed swap kept ${relativeToCwd(backup)} for inspection`)
    else removeTree(stage)
    break
  }
}

try {
  rmdirSync(stagingRoot)
} catch {
  // The staging directory still holds a failed copy; leave it for inspection.
}

const failed = results.filter((result) => !result.ok).length
for (const result of results) {
  const mark = result.ok ? (dryRun ? 'would' : 'ok  ') : 'FAIL'
  console.log(`${mark} ${result.skill} — ${result.detail}`)
}
console.log(`${results.length} skill(s), ${failed} failed${dryRun ? ' (dry run)' : ''}`)
process.exit(failed === 0 ? 0 : 1)

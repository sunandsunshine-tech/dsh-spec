/**
 * Compare a ported file with the dsh original it came from.
 *
 * The registry records the upstream path and sha; this command is what turns that record into a
 * diff, so a future iteration can decide whether upstream moved and whether the change matters. It
 * is deliberately **not shipped** with the collection — it reads the pinned submodule, which an
 * installed project does not have — and it never writes:
 *
 *   node scripts/ports.ts --list                  # the registry, one line per port
 *   node scripts/ports.ts --diff <local>          # upstream blob against the local file
 *   node scripts/ports.ts --status                # what upstream has changed since the recorded sha
 *
 * Zero dependencies, like the engine: `node:fs`, `node:path` and git.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const repositoryRoot = resolve(dirname(resolve(process.argv[1] ?? import.meta.dirname)), '..')
const registryPath = join(repositoryRoot, 'scripts', 'ports.json')
const engineDirectory = join(repositoryRoot, 'skills', 'dsh-spec-manager', 'scripts')

interface Port {
  local: string
  upstream: string
  sha: string
  relation: string
  note?: string
}

interface Registry {
  baseline: { repo: string, ref: string, sha: string, submodule: string }
  ports: Port[]
}

function usage(message?: string): never {
  if (message !== undefined) console.error(`ports: ${message}`)
  console.error('ports: usage: node scripts/ports.ts --list | --diff <local> | --status')
  process.exit(2)
}

if (!existsSync(registryPath)) {
  console.error(`ports: no registry at ${registryPath}`)
  process.exit(1)
}

const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
const submodulePath = resolve(repositoryRoot, registry.baseline.submodule)

/** The upstream blob's text, or `undefined` when git cannot produce it. */
function upstreamText(port: Port): string | undefined {
  try {
    return execFileSync('git', ['-C', submodulePath, 'show', `${port.sha}:${port.upstream}`], { encoding: 'utf8' })
  } catch {
    return undefined
  }
}

/** Git's stdout, or an empty string when the command fails. */
function git(args: string[]): string {
  try {
    return execFileSync('git', ['-C', submodulePath, ...args], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

/**
 * A unified diff of two texts, with the common head and tail trimmed.
 *
 * A full LCS would print prettier hunks, and this is deliberately not one: the question a reader
 * brings to a ported file is "what did we change", and trimmed head and tail answer it with the
 * exact lines while keeping the command free of a diff library.
 */
function unifiedDiff(upstream: string, local: string): string {
  const a = upstream.split('\n')
  const b = local.split('\n')
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head += 1
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1
  const removed = a.slice(head, a.length - tail)
  const added = b.slice(head, b.length - tail)
  if (removed.length === 0 && added.length === 0) return ''
  const lines = [`@@ -${head + 1},${removed.length} +${head + 1},${added.length} @@`]
  for (const line of removed) lines.push(`-${line}`)
  for (const line of added) lines.push(`+${line}`)
  return `${lines.join('\n')}\n`
}

const args = process.argv.slice(2)
if (args[0] === '--list') {
  console.log(`ports: ${registry.ports.length} port(s) from ${registry.baseline.repo} at ${registry.baseline.ref} (${registry.baseline.sha.slice(0, 8)})`)
  for (const port of registry.ports) {
    console.log(`  ${port.relation.padEnd(8)} ${port.local} ← ${port.upstream}@${port.sha.slice(0, 8)}`)
    if (port.note !== undefined && port.note !== '') console.log(`           ${port.note}`)
  }
  process.exit(0)
}

if (args[0] === '--diff') {
  const local = args[1] ?? usage('`--diff` needs a local file name')
  const port = registry.ports.find(candidate => candidate.local === local)
  if (port === undefined) usage(`\`${local}\` is not in ${registryPath}; --list names the recorded ports`)
  const upstream = upstreamText(port)
  if (upstream === undefined) {
    console.error(`ports: cannot read ${port.upstream} at ${port.sha} — fetch the pin in ${registry.baseline.submodule}`)
    process.exit(1)
  }
  const localPath = join(engineDirectory, port.local)
  if (!existsSync(localPath)) {
    console.error(`ports: ${port.local} is recorded but missing from ${engineDirectory}`)
    process.exit(1)
  }
  const diff = unifiedDiff(upstream, readFileSync(localPath, 'utf8'))
  if (diff === '') {
    console.log(`ports: ${port.local} is identical to ${port.upstream}@${port.sha.slice(0, 8)}`)
    process.exit(0)
  }
  console.log(`--- a/${port.upstream}@${port.sha.slice(0, 8)}`)
  console.log(`+++ b/${port.local}`)
  process.stdout.write(diff)
  process.exit(0)
}

if (args[0] === '--status') {
  const head = git(['rev-parse', 'HEAD']).trim()
  console.log(`ports: baseline ${registry.baseline.ref} at ${registry.baseline.sha.slice(0, 8)}; submodule HEAD ${head.slice(0, 8) || 'unknown'}`)
  let moved = 0
  for (const port of registry.ports) {
    if (port.relation === 'mirrors') continue
    const commits = git(['log', '--oneline', `${port.sha}..HEAD`, '--', port.upstream]).trim()
    if (commits === '') continue
    moved += 1
    console.log(`  ${port.local}: upstream moved`)
    for (const line of commits.split('\n')) console.log(`    ${line}`)
  }
  console.log(moved === 0 ? 'ports: no recorded upstream path changed since the recorded sha' : `ports: ${moved} ported path(s) changed upstream — moving the pin is a deliberate act, not a refresh`)
  process.exit(0)
}

usage()

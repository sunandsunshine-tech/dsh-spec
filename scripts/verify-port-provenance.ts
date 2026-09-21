/**
 * Reconcile the provenance registry with the code and the pinned baseline.
 *
 * The registry (`scripts/ports.json`) is the record a reader reviews and a future iteration reads;
 * the one-line header inside each ported module is the same fact where the code is. Neither alone is
 * enough: a record with no header describes a file nobody can trace from the file itself, and a
 * header with no record cannot be enumerated, so this gate holds the two against each other and
 * against `submodules/dsh`, exactly the way `run.ts` holds the recorded gate names against the
 * scripts beside it.
 *
 * It is deliberately **not shipped** with the collection: it reads the pinned submodule, which a
 * project that installed the skills does not have. Run it from this repository:
 *
 *   node scripts/verify-port-provenance.ts
 *
 * Four things must hold, and an empty registry is the first failure rather than a clean run:
 * every recorded port exists and names its upstream path and sha in its header; every recorded
 * upstream path exists at that sha; the baseline ref is the pin the root `AGENTS.md` states; and
 * every engine file that exists upstream is recorded, so a new port cannot be forgotten.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** Where this gate sits: `scripts/`, so its parent is the repository root. */
const repositoryRoot = resolve(dirname(resolve(process.argv[1] ?? import.meta.dirname)), '..')

/** The engine directory whose files are compared against upstream. */
const engineDirectory = join(repositoryRoot, 'skills', 'dsh-spec-manager', 'scripts')

/** The registry's path. */
const registryPath = join(repositoryRoot, 'scripts', 'ports.json')

/** How a ported file relates to its upstream original; the value decides how a diff should be read. */
const RELATIONS = ['verbatim', 'adapted', 'split', 'rewrite', 'mirrors'] as const

/** One recorded port. */
interface Port {
  local: string
  upstream: string
  sha: string
  relation: (typeof RELATIONS)[number]
  note?: string
}

/** The registry's shape. */
interface Registry {
  baseline: { repo: string, ref: string, sha: string, submodule: string }
  ports: Port[]
}

const errors: string[] = []

if (!existsSync(registryPath)) {
  console.error(`verify-port-provenance: no registry at ${registryPath} — there is nothing to reconcile, so the record of what was borrowed is missing`)
  process.exit(1)
}

let registry: Registry
try {
  registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Registry
} catch (error) {
  console.error(`verify-port-provenance: ${registryPath} is not readable JSON: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

if (registry.ports.length === 0) {
  console.error(`verify-port-provenance: ${registryPath} records no port — an empty registry is not a record, so re-seed it rather than reporting a clean run`)
  process.exit(1)
}

/** Run git and return its stdout, or `undefined` when it fails. */
function git(cwd: string, args: string[]): string | undefined {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return undefined
  }
}

const submodulePath = resolve(repositoryRoot, registry.baseline.submodule)
if (git(submodulePath, ['rev-parse', '--git-dir']) === undefined) {
  errors.push(`the baseline submodule ${registry.baseline.submodule} is not a git checkout — initialise it before trusting the registry`)
} else if (git(submodulePath, ['cat-file', '-e', `${registry.baseline.sha}^{commit}`]) === undefined) {
  errors.push(`the baseline commit ${registry.baseline.sha} is not in ${registry.baseline.submodule} — fetch the pin before trusting the registry`)
}

/** The pin the root `AGENTS.md` states, so a submodule bump cannot orphan the registry silently. */
const rootInstructions = readFileSync(join(repositoryRoot, 'AGENTS.md'), 'utf8')
if (!rootInstructions.includes(registry.baseline.ref)) {
  errors.push(`the root AGENTS.md does not name the baseline ref ${registry.baseline.ref} — the pin a reader sees and the registry disagree`)
}

const recorded = new Set<string>()
for (const port of registry.ports) {
  recorded.add(port.local)
  if (!RELATIONS.includes(port.relation)) {
    errors.push(`${port.local}: unknown relation ${JSON.stringify(port.relation)} — the values are ${RELATIONS.join(', ')}`)
  }
  if (!/^[0-9a-f]{40}$/.test(port.sha)) {
    errors.push(`${port.local}: the upstream sha ${JSON.stringify(port.sha)} is not a full commit sha, so a diff cannot be pinned to it`)
  }
  const localPath = join(engineDirectory, port.local)
  if (!existsSync(localPath)) {
    errors.push(`${port.local}: recorded but missing from ${engineDirectory}`)
    continue
  }
  const header = readFileSync(localPath, 'utf8').split('\n').slice(0, 40).join('\n')
  if (!header.includes(port.upstream)) {
    errors.push(`${port.local}: its header does not name the upstream path ${port.upstream} — a reader of the file cannot find the original`)
  }
  if (!header.includes(port.sha)) {
    errors.push(`${port.local}: its header does not name the upstream sha ${port.sha}`)
  }
  if (port.relation !== 'mirrors' && git(submodulePath, ['cat-file', '-e', `${port.sha}:${port.upstream}`]) === undefined) {
    errors.push(`${port.local}: ${port.upstream} does not exist at ${port.sha} in ${registry.baseline.submodule}`)
  }
}

// Completeness: an engine file that exists upstream and is not recorded is a port nobody can trace.
for (const entry of readdirSync(engineDirectory, { withFileTypes: true })) {
  if (!entry.isFile()) continue
  if (recorded.has(entry.name)) continue
  if (git(submodulePath, ['cat-file', '-e', `${registry.baseline.sha}:scripts/${entry.name}`]) !== undefined) {
    errors.push(`${entry.name}: exists upstream at ${registry.baseline.sha} but the registry does not record it — add it, or rename the file so it is honestly ours`)
  }
}

if (errors.length > 0) {
  console.error('verify-port-provenance: provenance rules violated:')
  for (const error of errors) console.error(`  ${error}`)
  process.exit(1)
}

console.log(`verify-port-provenance: ${registry.ports.length} ported file(s) reconciled against ${registry.baseline.submodule} at ${registry.baseline.ref} (${registry.baseline.sha.slice(0, 8)}).`)

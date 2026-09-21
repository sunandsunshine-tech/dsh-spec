/**
 * Run a gate of this collection from the project it was released into.
 *
 * The collection has one code home, this directory, and a gate is a name the manifest records,
 * backed by a `<name>.ts` script here. The record is what a reader reviews and what a name is
 * resolved against; the script is what makes that name runnable; neither alone is a gate. So this
 * dispatcher reconciles the record against the files beside it before it dispatches anything, and
 * a disagreement is a refusal rather than a warning: a recorded gate with no `verify-*.ts` script
 * beside the dispatcher, or a `verify-*.ts` file the record does not name, is reported with both
 * sides named and exits non-zero **without running a single gate**. That is what keeps a helper
 * module which happens to be named `verify-*` from ever running as one — only the record is
 * runnable, and its disagreement with the directory stops the run instead of being absorbed.
 *
 * Beyond that, the existing rules hold: a name outside the record is refused rather than run, and
 * `--all` runs every recorded gate and fails when one fails **or when the record names none**,
 * because an aggregate that reports success over an empty engine is the defect this collection
 * exists to prevent.
 *
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --changed --base <ref> --root .
 *
 * `--changed` is the diff-scoped half of the same record: the gates whose recorded surface the
 * change touches. It prints what it skipped and why, so a scoped run is never mistaken for the
 * aggregate.
 */

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { expandScope, pathInGateScope } from './gate-scope.ts'
import { resolveRepoRoot } from './repo-root.ts'
import { manifestPathOf, readGateRecord, readGateScopes } from './manifest.ts'
import type { GateScopeRecord } from './manifest.ts'

/** Where this script lives: a skill's `scripts/`, the collection's one code home. */
const scriptDir = dirname(resolve(process.argv[1] ?? __dirname))
const projectRoot = resolve(scriptDir, '..', '..', '..', '..')
/** The record this dispatcher resolves a gate name against, and reconciles against the files here. */
const manifestPath = manifestPathOf(scriptDir)

function fail(message: string): never {
  console.error(`run: ${message}`)
  process.exit(1)
}

const reading = readGateRecord(scriptDir)
if (!reading.ok) fail(reading.error)
/** The gates, in the order the record names them: the only names this dispatcher will run. */
const gates: readonly string[] = reading.names
if (gates.length === 0) {
  fail(`${manifestPath} records no gate — there is nothing to dispatch, so reinstall the collection`)
}

/**
 * The `verify-*.ts` files beside the dispatcher.
 *
 * Evidence to reconcile the record against, never a statement of which gates exist: a file here is
 * a gate only when the record names it, and one the record does not name is a mismatch.
 *
 * @returns the names of those files, without the `.ts` suffix, sorted.
 */
function scriptsBesideDispatcher(): string[] {
  return readdirSync(scriptDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.startsWith('verify-') && entry.name.endsWith('.ts'))
    .map(entry => entry.name.slice(0, -'.ts'.length))
    .sort()
}

/** Print a list of names for a report, or `none` when there are none. */
function list(names: readonly string[]): string {
  return names.length === 0 ? 'none' : names.map(name => `\`${name}\``).join(', ')
}

/**
 * Refuse to run anything unless the record and the engine directory agree.
 *
 * Both sides are printed in full, and then every disagreement is named from the side it was found
 * on, so a reader sees the record, the directory, and the exact pair that failed to match.
 */
function reconcile(): void {
  const beside = scriptsBesideDispatcher()
  const unbacked = gates.filter(name => !beside.includes(name))
  const unrecorded = beside.filter(name => !gates.includes(name))
  if (unbacked.length === 0 && unrecorded.length === 0) return
  console.error('run: refusing to run anything — the gate record and the scripts beside the dispatcher disagree')
  console.error(`run:   the record ${manifestPath} names ${gates.length} gate(s): ${list(gates)}`)
  console.error(`run:   ${scriptDir} holds ${beside.length} \`verify-*.ts\` script(s): ${list(beside)}`)
  for (const name of unbacked) console.error(`run:   recorded but no \`${name}.ts\` beside the dispatcher`)
  for (const name of unrecorded) console.error(`run:   \`${name}.ts\` is beside the dispatcher but the record does not name it`)
  process.exit(1)
}

reconcile()

/**
 * Resolve one gate to the script `run.ts` will execute. A name the record does not hold is this
 * gate failing, never a reason to abandon the other gates in an `--all` run.
 */
function gatePath(gate: string): { path: string } | { error: string } {
  if (!gates.includes(gate)) {
    return { error: `no gate \`${gate}\` in ${manifestPath} — the record holds ${gates.length} gate(s): ${list(gates)}` }
  }
  return { path: join(scriptDir, `${gate}.ts`) }
}

/** Run one gate; a resolution failure is this gate's failure, not the run's. */
function runGate(gate: string, args: string[]): number {
  const resolved = gatePath(gate)
  if ('error' in resolved) {
    console.error(`run: ${resolved.error}`)
    return 1
  }
  const result = spawnSync(
    process.execPath,
    [resolved.path, ...args],
    // A gate resolves `--root .` against the process it runs in, so it must run where the
    // caller stands: the climb above lands one level short in the source tree and one level
    // long in the installed copy, and either way a relative root would point outside the project.
    { stdio: 'inherit', cwd: process.cwd() },
  )
  return result.status ?? 1
}

/** The paths a change touched, relative to the project root, or `undefined` when git cannot say. */
function changedPaths(base: string): string[] | undefined {
  const diff = spawnSync('git', ['diff', '--name-only', base, '--'], { cwd: process.cwd(), encoding: 'utf8' })
  if ((diff.status ?? 1) !== 0) return undefined
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: process.cwd(), encoding: 'utf8' })
  const paths = `${diff.stdout}\n${untracked.stdout ?? ''}`
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
  return [...new Set(paths)]
}

/**
 * The arguments that hand one gate its scope.
 *
 * A tree-selection gate takes `--all`; a file-selection gate takes the paths it owns, and a full
 * run expands that surface through the module that defines it rather than through a second copy of
 * the rule.
 */
function scopeArgsFor(gate: string, record: GateScopeRecord, root: string, changed: readonly string[] | undefined): string[] | undefined {
  if (record.selection === 'root') {
    // A tree-selection gate still owes nothing unless the change touched the tree it asserts about.
    return changed === undefined || changed.some(path => pathInGateScope(record, path)) ? ['--all'] : undefined
  }
  const entries = changed === undefined
    ? record.keys.flatMap(key => expandScope(root, key))
    : changed.filter(path => pathInGateScope(record, path))
  const unique = [...new Set(entries)]
  return unique.length === 0 ? undefined : unique
}

const argv = process.argv.slice(2)
// `--all` means "every recorded gate" only as the invocation's own flag. A gate that takes `--all`
// itself is reached with `--gate <name>`, so its arguments are passed through untouched instead of
// being captured by the aggregate.
const gateFlag = argv.indexOf('--gate')
const namedGate = gateFlag === -1 ? undefined : argv[gateFlag + 1]
const rest = gateFlag === -1 ? argv : [...argv.slice(0, gateFlag), ...argv.slice(gateFlag + 2)]

const changedFlag = rest.indexOf('--changed')
if (namedGate === undefined && changedFlag >= 0) {
  const baseFlag = rest.indexOf('--base')
  const base = baseFlag === -1 ? 'HEAD' : rest[baseFlag + 1]
  if (base === undefined) fail('`--base` needs a ref — pass the branch or commit the change is measured against')
  const paths = changedPaths(base)
  if (paths === undefined) {
    fail(`cannot read the change set against ${base} from ${process.cwd()} — --changed needs a git working tree`)
  }
  const scopeReading = readGateScopes(scriptDir)
  if (!scopeReading.ok) fail(scopeReading.error)
  const args = rest.filter((value, index) => value !== '--changed' && value !== '--base' && index !== baseFlag + 1)
  const root = resolveRepoRoot()
  const runs: { gate: string, scope: string[] }[] = []
  const skipped: { gate: string, reason: string }[] = []
  for (const gate of gates) {
    const record = scopeReading.scopes.get(gate)
    if (record === undefined) fail(`no scope is recorded for \`${gate}\``)
    const scope = scopeArgsFor(gate, record, root, paths)
    if (scope === undefined) skipped.push({ gate, reason: `nothing changed under ${record.keys.join(', ')}` })
    else runs.push({ gate, scope })
  }
  console.log(`run: ${paths.length} changed path(s) against ${base}; ${runs.length} of ${gates.length} recorded gate(s) own them`)
  for (const entry of skipped) console.log(`run: skipped ${entry.gate} — ${entry.reason}`)
  let failed = 0
  for (const entry of runs) {
    const status = runGate(entry.gate, [...args, ...entry.scope])
    console.log(`run: ${status === 0 ? 'ok  ' : 'FAIL'} ${entry.gate}`)
    if (status !== 0) failed += 1
  }
  console.log(`run: ${runs.length} of ${gates.length} gate(s) run, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

if (namedGate === undefined && rest.includes('--all')) {
  const args = rest.filter((a) => a !== '--all')
  const scopeReading = readGateScopes(scriptDir)
  if (!scopeReading.ok) fail(scopeReading.error)
  let failed = 0
  let ran = 0
  for (const gate of gates) {
    const record = scopeReading.scopes.get(gate)
    if (record === undefined) fail(`no scope is recorded for \`${gate}\``)
    const scope = scopeArgsFor(gate, record, resolveRepoRoot(), undefined)
    if (scope === undefined) {
      console.log(`run: skipped ${gate} — its scope holds no file to hand it`)
      continue
    }
    ran += 1
    const status = runGate(gate, [...args, ...scope])
    console.log(`run: ${status === 0 ? 'ok  ' : 'FAIL'} ${gate}`)
    if (status !== 0) failed += 1
  }
  console.log(`run: ${ran} of ${gates.length} gate(s) run, ${failed} failed`)
  process.exit(failed === 0 ? 0 : 1)
}

const gate = namedGate ?? rest[0]
if (gate === undefined || gate.startsWith('--')) {
  fail(`name a gate, pass \`--gate <name>\` when the gate has its own flags, or pass --all; the gates are the names recorded in ${manifestPath}`)
}
const args = namedGate === undefined ? rest.slice(1) : rest
process.exit(runGate(gate, args))

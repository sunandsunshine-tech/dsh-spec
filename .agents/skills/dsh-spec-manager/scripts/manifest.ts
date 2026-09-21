/**
 * The manifest: the one record this collection reads and writes nothing into.
 *
 * It decides which skills a project installs, the revision they all come from, and which gates
 * this collection publishes. The gate field is a record rather than a reading of the engine
 * directory: a name written down is reviewable in a diff, and `run.ts` resolves a gate against it
 * and reconciles it with the `verify-*.ts` scripts beside the dispatcher before anything runs, so
 * a recorded name and its file have to agree or nothing is dispatched at all.
 *
 * The scope record answers the two questions a dispatcher asks about one gate: **which surface**
 * it answers for, as scope keys a single owner module resolves, and **how it is selected** —
 * `root` when the gate walks its own tree, because its assertion is about the tree, or `files`
 * when it reads exactly the paths it is handed. One entry per recorded gate, because a gate with
 * no scope would have to be guessed and a scope for a gate that does not exist is a typo.
 *
 * Zero external dependencies.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** The grammar a recorded gate name must match, because the name becomes a file beside the dispatcher. */
export const GATE_NAME = /^verify-[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * The surfaces a gate may claim, each named by the module that already owns its paths.
 *
 * `notes` is the three active lifecycles and `notes-archived` the frozen archive, because the two
 * are governed by different rules; `markdown` resolves through `md-scope.ts`, `pairs` through the
 * pairing module, and there is no key for the whole tracked corpus any more — the credential scan
 * that owned it is gone.
 */
export const GATE_SCOPE_KEYS = ['notes', 'notes-archived', 'markdown', 'pairs'] as const

/** One scope key a gate may claim. */
export type GateScopeKey = (typeof GATE_SCOPE_KEYS)[number]

/**
 * How a gate is handed its scope: `root` means it walks the tree itself, which only a tree
 * assertion may do, and `files` means it reads exactly the paths it is given.
 */
export const GATE_SELECTIONS = ['root', 'files'] as const

/** One gate's selection kind. */
export type GateSelection = (typeof GATE_SELECTIONS)[number]

/** What one gate's record says: the surfaces it answers for, and how it is handed them. */
export interface GateScopeRecord {
  keys: readonly GateScopeKey[]
  selection: GateSelection
}

/** What one reading of the recorded gate scopes produced. */
export type GateScopeReading =
  | { ok: true, scopes: ReadonlyMap<string, GateScopeRecord> }
  | { ok: false, error: string }

/**
 * The manifest's path, derived from the engine directory it sits beside.
 *
 * One literal, one owner: the dispatcher, the initializer and the manager all read the record
 * through this function rather than each spelling the path from where it happens to run.
 *
 * @param scriptDir - absolute path of the collection's engine directory, `scripts/`.
 * @returns the absolute path of `references/manifest.json`.
 */
export function manifestPathOf(scriptDir: string): string {
  return resolve(scriptDir, '..', 'references', 'manifest.json')
}

/** What one reading of the recorded gate names produced. */
export type GateRecordReading =
  | { ok: true, names: readonly string[] }
  | { ok: false, error: string }

/**
 * Read the gates this collection records, in record order.
 *
 * The record is the only statement of which gates exist, so every way it can fail to be one is an
 * error rather than a default: a missing or unreadable manifest, no `gates` array, an entry that
 * is not a gate name, and a name recorded twice. An empty array is a reading, not a malformed
 * record — whether zero gates is acceptable belongs to the caller that would run them.
 *
 * @param scriptDir - absolute path of the collection's engine directory, `scripts/`.
 * @returns the recorded names, or why the record could not be read.
 */
export function readGateRecord(scriptDir: string): GateRecordReading {
  const path = manifestPathOf(scriptDir)
  if (!existsSync(path)) {
    return { ok: false, error: `no manifest at ${path} — the record of which gates exist is missing, so no gate can be resolved` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return { ok: false, error: `${path} is not readable JSON: ${(error as Error).message}` }
  }
  const gates = (parsed as { gates?: unknown }).gates
  if (!Array.isArray(gates)) {
    return { ok: false, error: `${path} carries no \`gates\` array — a gate is a name that record holds, so none can be resolved` }
  }
  const names: string[] = []
  for (const entry of gates) {
    if (typeof entry !== 'string' || entry === '') {
      return { ok: false, error: `${path} has a \`gates\` entry that is not a name` }
    }
    if (!GATE_NAME.test(entry)) {
      return { ok: false, error: `${path} records the gate \`${entry}\`, which is not a gate name — a name becomes \`<name>.ts\` beside the dispatcher, so only ${GATE_NAME} is accepted` }
    }
    if (names.includes(entry)) {
      return { ok: false, error: `${path} records the gate \`${entry}\` twice` }
    }
    names.push(entry)
  }
  return { ok: true, names }
}

/**
 * Read the surface and the selection kind of every recorded gate.
 *
 * Completeness is validated rather than assumed, because both halves have a silent failure: a gate
 * with no entry would have its scope guessed by the dispatcher, and an entry for a gate that does
 * not exist is a rename somebody forgot. A key outside {@link GATE_SCOPE_KEYS} is refused for the
 * same reason — a scope nobody resolves reads as "no changed path belongs to this gate" and drops
 * the check — and an empty key list is a gate that claims no surface at all.
 *
 * @param scriptDir - absolute path of the collection's engine directory, `scripts/`.
 * @returns the scope record by gate name, or why the record could not be read.
 */
export function readGateScopes(scriptDir: string): GateScopeReading {
  const path = manifestPathOf(scriptDir)
  if (!existsSync(path)) {
    return { ok: false, error: `no manifest at ${path} — the record of which gates exist is missing` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return { ok: false, error: `${path} is not readable JSON: ${(error as Error).message}` }
  }
  const record = readGateRecord(scriptDir)
  if (!record.ok) return { ok: false, error: record.error }
  const scopes = (parsed as { scopes?: unknown }).scopes
  if (typeof scopes !== 'object' || scopes === null || Array.isArray(scopes)) {
    return { ok: false, error: `${path} carries no \`scopes\` record — a diff-scoped run cannot tell which gate answers for which surface` }
  }
  const reading = new Map<string, GateScopeRecord>()
  for (const [gate, value] of Object.entries(scopes as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { ok: false, error: `${path} gives \`${gate}\` a scope that is not a record — each entry names \`keys\` and \`selection\`` }
    }
    const { keys, selection } = value as { keys?: unknown, selection?: unknown }
    if (!Array.isArray(keys) || keys.length === 0) {
      return { ok: false, error: `${path} gives \`${gate}\` no scope key — every recorded gate names at least one surface` }
    }
    for (const key of keys) {
      if (typeof key !== 'string' || !(GATE_SCOPE_KEYS as readonly string[]).includes(key)) {
        return { ok: false, error: `${path} gives \`${gate}\` the unknown scope ${JSON.stringify(key)} — the keys are ${GATE_SCOPE_KEYS.join(', ')}` }
      }
    }
    if (selection !== 'root' && selection !== 'files') {
      return { ok: false, error: `${path} gives \`${gate}\` the unknown selection ${JSON.stringify(selection)} — it is ${GATE_SELECTIONS.join(' or ')}` }
    }
    if (!record.names.includes(gate)) {
      return { ok: false, error: `${path} gives \`${gate}\` a scope but the \`gates\` record does not name it` }
    }
    reading.set(gate, { keys: keys as GateScopeKey[], selection })
  }
  for (const gate of record.names) {
    if (!reading.has(gate)) {
      return { ok: false, error: `${path} records the gate \`${gate}\` with no scope — the dispatcher would have to guess which surface it answers for` }
    }
  }
  return { ok: true, scopes: reading }
}

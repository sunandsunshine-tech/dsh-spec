/**
 * The manifest: the one record this collection reads and writes nothing into.
 *
 * It decides which skills a project installs, the revision they all come from, and which gates
 * this collection publishes. The gate field is a record rather than a reading of the engine
 * directory: a name written down is reviewable in a diff, and `run.ts` resolves a gate against it
 * and reconciles it with the `verify-*.ts` scripts beside the dispatcher before anything runs, so
 * a recorded name and its file have to agree or nothing is dispatched at all.
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
 * A scope is a key rather than a path so the path keeps one owner: `notes` resolves through
 * `notes-root.ts`, `markdown` and `pairs` through the two scope modules the gates themselves read,
 * and `tracked` is every path git reports — the credential scan's surface, because any file can
 * carry one.
 */
export const GATE_SCOPE_KEYS = ['notes', 'markdown', 'pairs', 'tracked'] as const

/** One scope key a gate may claim. */
export type GateScopeKey = (typeof GATE_SCOPE_KEYS)[number]

/** What one reading of the recorded gate scopes produced. */
export type GateScopeReading =
  | { ok: true, scopes: ReadonlyMap<string, readonly GateScopeKey[]> }
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
 * Read the surface each recorded gate claims, so a diff can select the gates it owes.
 *
 * Every recorded gate needs an entry: an absent one would silently widen a scoped run, and the
 * record is the place a reader sees which check answers for which surface. A key outside
 * {@link GATE_SCOPE_KEYS} is refused rather than ignored, because a scope nobody resolves would
 * read as "no changed path belongs to this gate" and quietly drop the check.
 *
 * @param scriptDir - absolute path of the collection's engine directory, `scripts/`.
 * @returns the scopes by gate name, or why the record could not be read.
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
  const scopes = (parsed as { scopes?: unknown }).scopes
  if (typeof scopes !== 'object' || scopes === null || Array.isArray(scopes)) {
    return { ok: false, error: `${path} carries no \`scopes\` record — a diff-scoped run cannot tell which gate answers for which surface` }
  }
  const reading = new Map<string, readonly GateScopeKey[]>()
  for (const [gate, keys] of Object.entries(scopes as Record<string, unknown>)) {
    if (!Array.isArray(keys) || keys.length === 0) {
      return { ok: false, error: `${path} gives \`${gate}\` no scope — every recorded gate names at least one surface` }
    }
    for (const key of keys) {
      if (typeof key !== 'string' || !(GATE_SCOPE_KEYS as readonly string[]).includes(key)) {
        return { ok: false, error: `${path} gives \`${gate}\` the unknown scope ${JSON.stringify(key)} — the keys are ${GATE_SCOPE_KEYS.join(', ')}` }
      }
    }
    reading.set(gate, keys as GateScopeKey[])
  }
  return { ok: true, scopes: reading }
}

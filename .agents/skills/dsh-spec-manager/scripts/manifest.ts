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

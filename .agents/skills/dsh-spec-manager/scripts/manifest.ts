/**
 * The manifest: the one record this collection reads and writes nothing into.
 *
 * It decides which skills a project installs and which gates this collection publishes. It does not
 * declare a revision: the manager reads that from the ref `gh skill install` injected into its own
 * installed `SKILL.md`, so a skill set is pinned by the file that runs rather than by a field here.
 *
 * The gate field is a record rather than a reading of the engine directory: a name written down is
 * reviewable in a diff, and `dsh-spec.ts` resolves a gate against it and the entry point reconciles
 * it with the `verify-*.ts` scripts beside it before anything runs, so a recorded name and its file
 * have to agree or nothing is dispatched at all.
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
import { exitsOf } from './cli-args.ts'

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

// ------------------------------------------------------------------ the skill set

/** The exits this reading's failure prints under. */
const { fail } = exitsOf('dsh-spec-manager')

/** The grammar a skill name must match before it becomes a path. */
export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The manifest this script reads and never writes. */
export interface Manifest {
  repo: string
  /** Every skill the collection ships; a project installs the ones `optional` does not name. */
  skills: string[]
  /** The skills a project may leave out — a subset of `skills`, derived from nothing else. */
  optional: string[]
}

/** What one reading of the manifest produced: the record, or why it is not one. */
export type ManifestReading =
  | { ok: true, manifest: Manifest }
  | { ok: false, error: string }

/**
 * Read and validate the manifest, as a value rather than an exit.
 *
 * The manager's verbs stop on a malformed record, and the decision to stop is the caller's: keeping
 * the reading separate is what lets each way a manifest can fail be observed as the message that
 * names it. `optional` is validated as a subset of `skills` rather than trusted — a name that is not
 * shipped cannot be left out, and a typo would make a required skill look optional — and the field
 * is additive, so a manifest written before it existed names nothing optional and installs
 * everything.
 *
 * @param path - the manifest to read; this copy's by default.
 * @returns the repo, every skill name, and the optional subset.
 */
export function readManifestRecord(path: string = manifestPathOf(import.meta.dirname)): ManifestReading {
  if (!existsSync(path)) {
    return { ok: false, error: `no manifest at ${path} — the skill is incomplete, so it cannot say what to install` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return { ok: false, error: `${path} is not readable JSON: ${(error as Error).message}` }
  }
  const candidate = parsed as { repo?: unknown, skills?: unknown, optional?: unknown }
  const repo = candidate.repo
  if (typeof repo !== 'string' || repo === '') return { ok: false, error: `${path} names no \`repo\`` }
  if (!Array.isArray(candidate.skills) || candidate.skills.length === 0) {
    return { ok: false, error: `${path} names no skills — an empty manifest would install nothing and report success` }
  }
  const skills: string[] = []
  for (const entry of candidate.skills) {
    if (typeof entry !== 'string' || entry === '') return { ok: false, error: `${path} has a skill entry with no name` }
    if (!SKILL_NAME.test(entry)) {
      return { ok: false, error: `${path} names the skill \`${entry}\`, which is not a skill name — a name becomes a path under the skills directory, so only ${SKILL_NAME} is accepted` }
    }
    skills.push(entry)
  }
  const optional: string[] = []
  if (candidate.optional !== undefined) {
    if (!Array.isArray(candidate.optional)) {
      return { ok: false, error: `${path} carries an \`optional\` that is not a list — it names the skills a project may leave out, so it is an array of skill names` }
    }
    for (const entry of candidate.optional) {
      if (typeof entry !== 'string' || entry === '') return { ok: false, error: `${path} has an \`optional\` entry with no name` }
      if (!SKILL_NAME.test(entry)) {
        return { ok: false, error: `${path} names the optional skill \`${entry}\`, which is not a skill name — a name becomes a path under the skills directory, so only ${SKILL_NAME} is accepted` }
      }
      if (optional.includes(entry)) return { ok: false, error: `${path} names the optional skill \`${entry}\` twice` }
      if (!skills.includes(entry)) {
        return { ok: false, error: `${path} names \`${entry}\` optional but \`skills\` does not — \`optional\` is a subset of the skills the collection ships, and nothing else can be left out` }
      }
      optional.push(entry)
    }
  }
  return { ok: true, manifest: { repo, skills, optional } }
}

/**
 * The skills a project installs unless it leaves one out: `skills` minus `optional`.
 *
 * Derived rather than recorded a second time, so the two lists cannot disagree: a skill is required
 * exactly when the manifest does not name it optional, and an older manifest that names none
 * optional requires all of them.
 *
 * @param manifest - the manifest as read.
 * @returns the required skill names, in manifest order.
 */
export function requiredSkills(manifest: Manifest): string[] {
  return manifest.skills.filter((skill) => !manifest.optional.includes(skill))
}

/**
 * Read and validate a manifest; a missing or empty one is a failure.
 *
 * The default is this copy's own manifest, which is the one a verb installs from. An upgrade that
 * replaces the manager passes the replacement's path instead: from then on the replacement is the
 * copy in the project, so it is the one whose skill list the install owes.
 *
 * @param path - the manifest to read; this copy's by default.
 * @returns the repo, every skill name, and the optional subset.
 */
export function readManifest(path: string = manifestPathOf(import.meta.dirname)): Manifest {
  const reading = readManifestRecord(path)
  if (!reading.ok) fail(reading.error)
  return reading.manifest
}


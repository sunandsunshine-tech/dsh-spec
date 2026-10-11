/**
 * The norms a project applies are a render of the catalog, and the render is what ships.
 *
 * Three artifacts derive from `references/norms.json`: the marked section in the root `AGENTS.md`,
 * `.agents/dsh-spec/norms/norms.md`, and the record beside it. Nothing about the derivation shows in
 * a diff, so a catalog edited without `norms update` left every check green while the tree published
 * a hook its owner does not say (`owner.ssot`). This gate replays the derivation read-only — the same
 * plan `norms update` computes — and asserts the three artifacts are byte-equal to it.
 *
 * The catalog read is the engine's own, because that is the one `norms update` renders from. It is a
 * tree assertion: the three artifacts are one derivation, so it walks its whole root under `--all`
 * rather than reading a list of changed paths. A project that applies no norms is a legitimate state
 * and not an empty corpus — it must carry no hook — and a catalog that holds no norm at all is
 * refused, because then there is no derivation to assert.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { readGateScope } from './gate-scope.ts'
import { helpLanguage } from './help.ts'
import { applyNormsHook, filePathOf, normsPlan, readNormsRecord, recordPathOf, renderNormsRecord } from './norms-apply.ts'
import { normsPathOf, readNorms } from './norms.ts'
import type { Norm } from './norms.ts'

const gate = 'verify-norms-render'

/** The instruction file the hook lives in, as git writes the path. */
const INSTRUCTIONS = 'AGENTS.md'

// A tree assertion: `--all`, and only that.
const scope = readGateScope(gate)

const catalogPath = normsPathOf(import.meta.dirname)
let catalog: ReturnType<typeof readNorms>
try {
  catalog = readNorms(catalogPath)
} catch (error) {
  console.error(`${gate}: ${(error as Error).message}`)
  process.exit(1)
}
if (catalog.norms.length === 0) {
  console.error(`${gate}: the catalog at ${catalogPath} holds no norm — there is no render to assert.`)
  process.exit(1)
}

// The language only reaches a section this render creates, so an existing file renders the same
// whichever language the environment names; it is read the way the writing command reads it.
const language = helpLanguage([])
if (typeof language !== 'string') {
  console.error(`${gate}: ${language.error}`)
  process.exit(1)
}

let record: ReturnType<typeof readNormsRecord>
try {
  record = readNormsRecord(recordPathOf(scope.root))
} catch (error) {
  console.error(`${gate}: ${(error as Error).message}`)
  process.exit(1)
}

const path = filePathOf(scope.root)
const held = existsSync(path) ? readFileSync(path, 'utf8') : undefined
const plan = normsPlan(catalog, record, held, { verb: 'update', ids: record.norms.map(entry => entry.id) }, language)

// Every report names the artifact the way git does, so a reader can find it in a diff.
const asWritten = (absolute: string): string => relative(scope.root, absolute).split(sep).join('/')
const recordPath = recordPathOf(scope.root)
const drifts: string[] = []

// A block the plan keeps is one the byte comparison below cannot see: `norms update` leaves a block
// this project edited by hand where it is and refuses with `drifted`, and a block the file lost comes
// back as `missing`, so `plan.file` equals the file either way. Both mean the file is not the
// catalog's render, and each names the remedy its own verb accepts.
for (const outcome of plan.outcomes) {
  if (outcome.state === 'drifted') {
    drifts.push(`${asWritten(path)} holds a block edited by hand (${outcome.id}) — \`norms update --force\` takes the catalog's text back`)
  } else if (outcome.state === 'missing') {
    drifts.push(`${asWritten(path)} is missing the block for ${outcome.id} — \`norms install ${outcome.id}\` writes it back`)
  }
}

const attributes = [
  { path: asWritten(path), rendered: plan.file, held },
  { path: asWritten(recordPath), rendered: renderNormsRecord(plan.record), held: existsSync(recordPath) ? readFileSync(recordPath, 'utf8') : undefined },
] as const
// Nothing applied and nothing written is the render of an empty selection: `norms update` would
// create the two files, but their absence says the same thing and no norm is unaccounted for.
const unwritten = plan.record.norms.length === 0 && attributes.every(attribute => attribute.held === undefined)
if (!unwritten) {
  for (const attribute of attributes) {
    const as = attribute.held ?? ''
    if (as === attribute.rendered) continue
    drifts.push(attribute.held === undefined
      ? `${attribute.path} is missing — \`norms update\` writes it`
      : `${attribute.path} is not the catalog's render — \`norms update\` brings it back (\`--force\` for a block edited by hand)`)
  }
}

// The hook exists exactly while the project applies norms, so its absence and its text are both
// assertions: `applyNormsHook` adds, refreshes or removes the section to the catalog's render.
const instructions = join(scope.root, INSTRUCTIONS)
if (!existsSync(instructions)) {
  if (plan.record.norms.length > 0) {
    drifts.push(`${INSTRUCTIONS} is missing, so nothing points at the ${plan.record.norms.length} norm(s) this project applies — \`norms update\` adds the section`)
  }
} else {
  const current = readFileSync(instructions, 'utf8')
  const applied = plan.record.norms
    .map(entry => catalog.norms.find(norm => norm.id === entry.id))
    .filter((norm): norm is Norm => norm !== undefined)
  if (applyNormsHook(current, applied) !== current) {
    drifts.push(`${INSTRUCTIONS}'s marked section is not the catalog's render — \`norms update\` brings it back`)
  }
}

if (drifts.length > 0) {
  console.error(`${gate}: the render has drifted from the catalog at ${catalogPath}:`)
  for (const drift of drifts) console.error(`  ${drift}`)
  process.exit(1)
}

console.log(`${gate}: the hook, the file and the record are the catalog's render (${plan.record.norms.length} norm(s) applied, none drifted).`)

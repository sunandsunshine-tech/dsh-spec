/**
 * SPDX-License-Identifier: MIT
 * Ported from dsh scripts/verify-agent-note-format.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 * Enforce Agent Note headers, lifecycle-specific sections, alternatives, and retired
 * marker rules. Classification and filenames belong to the sibling tree gate;
 * translation structure belongs to the pairing gate. Exact format and
 * grandfathering rules live in `.agents/dsh-spec/notes/README.md`.
 *
 * This gate reads exactly the paths it is handed: the tree walk belongs to classification, which
 * asserts about the tree, and a check that only reads note bodies has no business enumerating one.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { agentNoteRoot, isActiveNotePath, noteFromRel, type AgentNote } from './agent-note-tree.ts'
import { readGateScope, refuseOutOfScope } from './gate-scope.ts'
import { notesRootExists } from './notes-root.ts'

const gate = 'verify-agent-note-format'

/** The date these format rules took effect; the grandfather comment is valid only before it. */
const FORMAT_ADOPTED = '2026-07-05'

/** The exact comment a pre-format Agent Note carries in place of `## Alternatives considered`. */
const GRANDFATHER = '<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->'

/** The retired debt marker that flagged pre-format bodies; banned so it cannot creep back. */
const LEGACY_MARKERS = ['XXX: legacy ADR/RFC body format', 'XXX: legacy ADR/Agent Note body format']

/** Status-line grammar per lifecycle folder. */
const STATUS: Record<string, RegExp> = {
  proposed: /^Status: proposed$/,
  implemented: /^Status: implemented$/,
  rejected: /^Status: rejected — .+$/,
}

/** Required `##` headings per lifecycle, beyond the universal `## Problem` opener. */
const REQUIRED: Record<string, string[]> = {
  proposed: ['## Proposal', '## Acceptance criteria', '## Risks'],
  implemented: ['## Decision', '## Consequences'],
  rejected: ['## Proposal'],
}

/** Headings banned in `implemented/` — proposal-era spec-speak per the slop checklist. */
const BANNED_IMPLEMENTED = /^## (?:Proposal\b|Plan\b|Migration plan\b|Acceptance criteria\b)/i

/**
 * Check one note's body against the format contract.
 * @param note - the note the path names.
 * @param lines - its text, split into lines.
 * @param errors - the report this gate accumulates into.
 */
function checkNote(note: AgentNote, lines: string[], errors: string[]): void {
  const fail = (msg: string): void => {
    errors.push(`format: ${note.rel} — ${msg}`)
  }
  // Format tokens inside fenced examples are not document structure.
  let inFence = false
  const prose = lines.filter((l) => {
    if (l.startsWith('```')) {
      inFence = !inFence
      return false
    }
    return !inFence
  })

  if (!/^# Agent Note: \S/.test(lines[0] ?? '')) fail('line 1 must be `# Agent Note: <title>`')
  if (lines[1] !== '') fail('line 2 must be blank')
  const status = STATUS[note.lifecycle]
  if (status !== undefined && !status.test(lines[2] ?? '')) {
    fail(`line 3 must match the ${note.lifecycle} status grammar (${String(status)})`)
  }
  if (lines[3] !== '') fail('line 4 must be blank')
  const statusLines = prose.filter(l => l.startsWith('Status:') && l !== lines[2])
  if (statusLines.length > 0 || prose.filter(l => l === lines[2]).length > 1) {
    fail('the line-3 `Status:` line must be the only one in the file')
  }

  const h2s = prose.filter(l => l.startsWith('## ')).map(l => l.trimEnd())
  if (h2s[0] !== '## Problem') fail(`the first section must be \`## Problem\` (got ${JSON.stringify(h2s[0] ?? '<none>')})`)
  for (const required of REQUIRED[note.lifecycle] ?? []) {
    if (!h2s.includes(required)) fail(`missing the required \`${required}\` section`)
  }
  if (note.lifecycle === 'implemented') {
    for (const h2 of h2s.filter(h => BANNED_IMPLEMENTED.test(h))) {
      fail(`\`${h2}\` is a proposal-era heading; an implemented Agent Note states what is (fold it into Decision/Consequences/Testing)`)
    }
  }

  const hasSection = h2s.includes('## Alternatives considered')
  const hasGrandfather = prose.includes(GRANDFATHER)
  if (hasSection && hasGrandfather) fail('carries both `## Alternatives considered` and the grandfather comment — drop the comment')
  if (!hasSection && !hasGrandfather) fail('missing `## Alternatives considered` (a pre-format Agent Note whose alternatives are not reconstructible carries the grandfather comment instead — see .agents/dsh-spec/notes/README.md § The file format)')
  if (hasGrandfather && note.date >= FORMAT_ADOPTED) fail(`the grandfather comment is only valid for Agent Notes dated before ${FORMAT_ADOPTED}`)

  if (prose.some(line => LEGACY_MARKERS.some(marker => line.includes(marker)))) fail('carries the retired legacy-format debt marker')
}

const scope = readGateScope(gate)
refuseOutOfScope(gate, scope, isActiveNotePath)

if (!notesRootExists(agentNoteRoot)) {
  console.error(`${gate}: no Agent Note tree at ${agentNoteRoot} — check --root or AGENT_NOTES_ROOT.`)
  process.exit(1)
}

const errors: string[] = []
let checked = 0
let counterparts = 0
for (const entry of scope.entries) {
  const absolute = resolve(scope.root, entry)
  // A path the change reports as deleted has no body to read; its structural side belongs to the
  // classification gate, which walks the tree.
  if (!existsSync(absolute)) continue
  // A Chinese counterpart is the same Agent Note, and its section names are its own language's:
  // the format grammar reads the English side, and the pairing gate holds the counterpart to its
  // sibling's structure section for section. Upstream draws the same line.
  if (entry.endsWith('.zh.md')) {
    counterparts += 1
    continue
  }
  const parsed = noteFromRel(entry)
  if (!parsed.ok) {
    errors.push(`format: ${entry} — ${parsed.error}`)
    continue
  }
  checked += 1
  checkNote(parsed.note, readFileSync(absolute, 'utf8').split('\n'), errors)
}

if (counterparts > 0) {
  console.log(`${gate}: ${counterparts} Chinese counterpart(s) skipped — the format grammar reads the English side, and the pairing gate checks the pair's structure.`)
}

// Every handed path is a deletion or a counterpart: the change removed notes, and a removed note
// has no body to read. That is a fact about the change rather than a scope nobody assembled.
if (checked === 0) {
  console.log(`${gate}: no English note body to read among the ${scope.entries.length} path(s) handed in.`)
  process.exit(0)
}

if (errors.length === 0) {
  console.log(`${gate}: ${checked} Agent Note(s) checked, all conform to .agents/dsh-spec/notes/README.md § The file format.`)
  process.exit(0)
}

console.error(`${gate}: violations found:`)
for (const e of errors) console.error(`  ${e}`)
process.exit(1)

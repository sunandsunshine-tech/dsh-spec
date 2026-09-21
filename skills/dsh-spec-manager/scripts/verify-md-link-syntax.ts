/**
 * Ported from dsh scripts/verify-md-link-syntax.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 * Reject the two link shapes a bulk rewrite produces and a link resolver cannot see.
 *
 * `verify-md-links` resolves links that parse. A rewrite that replaces a target with prose leaves
 * text that does not parse as a link at all, so the resolver reads no link there and reports
 * nothing:
 *
 * - `[label (reference)` — a link whose target became a parenthesised reference. Markdown renders
 *   the brackets literally, so a reader sees `[label (reference)` in the middle of a sentence.
 * - `[[label](target)](target)` — a nested link, which is invalid Markdown and renders as two.
 *
 * This gate reads the source lines rather than the parsed tree, and reads exactly the paths it is
 * handed — no cross-file meaning exists here, so a file selection decides the same question a full
 * scan does.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readGateScope, refuseOutOfScope } from './gate-scope.ts'
import { scopeReason } from './md-scope.ts'

const gate = 'verify-md-link-syntax'

/** A bracketed span followed by a parenthesised one, which is what a mangled link looks like. */
const MANGLED = /\[[^\]\n]{1,160} \([^)\n]{1,160}\)/g
/** A link whose own text is a link. */
const NESTED = /\[\[[^\]\n]*\]\([^)\n]*\)\]\([^)\n]*\)/g
/** Inside a fenced block, both shapes are illustrations rather than defects. */
const FENCE = /^\s*(```|~~~)/

const scope = readGateScope(gate)
refuseOutOfScope(gate, scope, entry => entry.endsWith('.md') && scopeReason(entry) === '')

const failures: string[] = []
let read = 0

for (const entry of scope.entries) {
  const absolute = resolve(scope.root, entry)
  // A path the change reports as deleted carries no line to read.
  if (!existsSync(absolute)) continue
  read += 1
  const lines = readFileSync(absolute, 'utf8').split('\n')
  let fenced = false
  for (const [index, line] of lines.entries()) {
    if (FENCE.test(line)) { fenced = !fenced; continue }
    if (fenced) continue
    for (const pattern of [MANGLED, NESTED]) {
      pattern.lastIndex = 0
      const match = pattern.exec(line)
      if (match === null) continue
      // `[text](target)` followed by nothing is a link; the mangled form has no `](` at all.
      if (line.includes(`${match[0]}](`)) continue
      failures.push(`${entry}:${index + 1} ${JSON.stringify(match[0].slice(0, 60))} — a link rewritten into prose; restore the target or drop the brackets`)
    }
  }
}

if (read === 0) {
  console.error(`${gate}: none of the ${scope.entries.length} path(s) handed in exists — check the scope the caller assembled`)
  process.exit(1)
}

if (failures.length > 0) {
  console.error(`${gate} failed:\n`)
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`${gate}: ${read} file(s) read; no link was rewritten into prose.`)

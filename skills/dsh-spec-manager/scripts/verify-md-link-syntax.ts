/**
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
 * This gate reads the source lines rather than the parsed tree.
 *
 * Run it from the project root:
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/verify-md-link-syntax.ts --root .
 */

import { readFileSync } from 'node:fs'
import { resolveRepoRoot } from './repo-root.ts'
import { scopedMarkdown } from './md-scope.ts'

/** A bracketed span followed by a parenthesised one, which is what a mangled link looks like. */
const MANGLED = /\[[^\]\n]{1,160} \([^)\n]{1,160}\)/g
/** A link whose own text is a link. */
const NESTED = /\[\[[^\]\n]*\]\([^)\n]*\)\]\([^)\n]*\)/g
/** Inside a fenced block, both shapes are illustrations rather than defects. */
const FENCE = /^\s*(```|~~~)/

const root = resolveRepoRoot()
const files = scopedMarkdown(root)
const failures: string[] = []

for (const file of files) {
  const shown = file.abs.slice(root.length + 1).split(/[\\/]/).join('/')
  const lines = readFileSync(file.abs, 'utf8').split('\n')
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
      failures.push(`${shown}:${index + 1} ${JSON.stringify(match[0].slice(0, 60))} — a link rewritten into prose; restore the target or drop the brackets`)
    }
  }
}

if (files.length === 0) {
  console.error(`verify-md-link-syntax: no Markdown found under ${root} — check --root, or adapt MARKDOWN_PATTERNS in md-scope.ts to this repository's layout.`)
  process.exit(1)
}

if (failures.length > 0) {
  console.error('verify-md-link-syntax failed:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`verify-md-link-syntax: ${files.length} file(s) read; no link was rewritten into prose.`)

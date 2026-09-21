/**
 * Reject malformed YAML frontmatter: the block a bulk reflow joins onto one line.
 *
 * Frontmatter is data to a parser and opaque to the gates that read a document's body: a reflow
 * that rewrites
 *
 *   ---
 *   name: example
 *   description: …
 *   ---
 *
 * as `--- name: example description: … ---` leaves invalid YAML that nothing else notices, because
 * every line of it still looks like ordinary prose to the other checks. This gate reads the block.
 *
 * It checks structure, not YAML semantics: the fence is a `---` line of its own, and a line at the
 * block's own indentation is a `key: value` pair. Frontmatter here is a mapping.
 *
 * Run it from the project root:
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-prose-standard/scripts/verify-md-metadata.ts --root .
 */

import { readFileSync } from 'node:fs'
import { resolveRepoRoot } from './repo-root.ts'
import { MARKDOWN_PATTERNS, scopeReason } from './md-scope.ts'
import { uniqueRepoFiles } from './repo-files.ts'

/** The line that opens and closes a frontmatter block, and carries nothing else. */
const FENCE = '---'
/** A mapping entry: `key:` or `key: value`. */
const KEY = /^[A-Za-z_][A-Za-z0-9_.-]*:(\s|$)/
/** A blank line or a comment is legal inside a block. */
const INERT = /^\s*(#|$)/

const root = resolveRepoRoot()
const files = uniqueRepoFiles(root, MARKDOWN_PATTERNS)
const skipped = new Map<string, number>()
const failures: string[] = []
let withBlock = 0
const scopeHint = ` — check --root, or adapt MARKDOWN_PATTERNS in md-scope.ts to this repository's layout`

for (const file of files) {
  const shown = file.abs.slice(root.length + 1).split(/[\\/]/).join('/')
  // The scope exclusions decide which files this gate reads; the report below names each deciding
  // rule with its count, so a silent corpus is impossible.
  const reason = scopeReason(shown)
  if (reason !== '') {
    skipped.set(reason, (skipped.get(reason) ?? 0) + 1)
    continue
  }
  const lines = readFileSync(file.abs, 'utf8').split('\n')
  const first = lines[0] ?? ''
  if (!first.startsWith(FENCE)) continue
  if (first !== FENCE) {
    failures.push(`${shown}:1 the first line starts with \`---\` but is not a \`---\` line of its own — a reflow joined the frontmatter block onto one line`)
    continue
  }
  const closing = lines.indexOf(FENCE, 1)
  if (closing === -1) {
    failures.push(`${shown}:1 the frontmatter block is never closed by a \`---\` line of its own`)
    continue
  }
  withBlock++
  for (let index = 1; index < closing; index++) {
    const line = lines[index] ?? ''
    // An indented line continues the entry above it, which is how nested maps and lists are written.
    if (INERT.test(line) || /^\s/.test(line)) continue
    if (!KEY.test(line)) {
      failures.push(`${shown}:${index + 1} ${JSON.stringify(line.slice(0, 60))} is not a \`key: value\` line — a frontmatter block is a mapping`)
    }
  }
}

const skippedTotal = [...skipped.values()].reduce((sum, count) => sum + count, 0)
const checked = files.length - skippedTotal

if (checked === 0) {
  console.error(`verify-md-metadata: no Markdown found under ${root}${scopeHint}.`)
  process.exit(1)
}

if (failures.length > 0) {
  console.error('verify-md-metadata failed:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

if (withBlock === 0) {
  console.error(`verify-md-metadata: ${checked} file(s) read, none carrying a frontmatter block${scopeHint}.`)
  process.exit(1)
}

const skips = [...skipped.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([reason, count]) => `${count} ${reason}`)
  .join('; ')
console.log(`verify-md-metadata: ${checked} file(s) read, ${withBlock} with frontmatter, no malformed block.${skippedTotal === 0 ? '' : ` Skipped ${skippedTotal}: ${skips}.`}`)

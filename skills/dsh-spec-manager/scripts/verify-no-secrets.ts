/**
 * Fail on a credential-shaped value in the text this repository tracks.
 *
 * Three rules govern what an agent writes, and they are not the same kind of rule. Text an agent
 * did not author is evidence rather than instruction, and a claim about a command is only as good as
 * the execution behind it: both are judgements about meaning, and a gate over either would guess.
 * A secret is a shape, and a shape is something a script can see — a provider's token prefix, a PEM
 * private-key header, a long value assigned to a name such as `token` or `password`. This gate reads
 * the tracked corpus and fails on a line carrying one of those shapes.
 *
 * Two properties of the report are deliberate. It names the file, the line number and the pattern,
 * and never the matched text, because a scanner that prints the credential has copied it into a
 * second place. And the pattern list stays short and shaped, because a scanner that flags an example
 * or a variable named `token` gets disabled, and a disabled scanner reports nothing at all.
 *
 * The corpus is every path git's index holds, minus the trees the scope owner refuses: `submodules/`
 * is a pinned baseline this repository does not own, `.agents/skills/` is a deployment of `skills/`,
 * the frozen archive is history, and dependency or build output is nobody's authored text here. A
 * line already carrying `[REDACTED_SECRET]`, and a value written as a placeholder in angle brackets,
 * are not findings. Skips are reported with the rule that decided them, and an empty corpus is a
 * failure rather than a clean run.
 *
 * Run it from the project root:
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/verify-no-secrets.ts --root .
 */

import { readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { scopeReason } from './md-scope.ts'
import { resolveRepoRoot } from './repo-root.ts'

/** One credential shape, named for the report. The match itself never leaves this file. */
interface SecretShape {
  /** The pattern's name, the only description of a match that reaches the report. */
  name: string
  /** The shape, matched against one line at a time. */
  pattern: RegExp
  /** The capture group holding the value, when the shape wraps one. */
  value?: number
}

/**
 * The shapes this gate reads as credential material.
 *
 * Provider prefixes come before the general assignment so that a line carrying both is reported by
 * the name that says what it is. Every quantifier is long enough that an ordinary word cannot
 * satisfy it: a short value assigned to `token` is a variable name, not a credential.
 */
const SHAPES: readonly SecretShape[] = [
  { name: 'github-token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/ },
  { name: 'openai-key', pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9]{32,}/ },
  { name: 'anthropic-key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'aws-access-key-id', pattern: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASCA)[0-9A-Z]{16}\b/ },
  { name: 'slack-token', pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'stripe-secret-key', pattern: /\b[rs]k_live_[A-Za-z0-9]{16,}\b/ },
  { name: 'gitlab-token', pattern: /\bglpat-[A-Za-z0-9_-]{20,}/ },
  { name: 'npm-token', pattern: /\bnpm_[A-Za-z0-9]{36}\b/ },
  { name: 'pypi-token', pattern: /\bpypi-[A-Za-z0-9_-]{50,}/ },
  { name: 'huggingface-token', pattern: /\bhf_[A-Za-z0-9]{30,}\b/ },
  { name: 'private-key-header', pattern: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/ },
  {
    name: 'assigned-credential',
    pattern: /\b(?:token|secret|secret[_-]?key|password|passwd|pwd|api[_-]?key|apikey|access[_-]?key|auth[_-]?token|client[_-]?secret|private[_-]?key)\b\s*[:=]\s*["'`]?([A-Za-z0-9_\-+/=.<>]{16,})/i,
    value: 1,
  },
]

/**
 * The redaction convention the Agent Notes contract fixes. A line carrying it has already been
 * sanitized by its author, and a scanner that re-reported it would teach writers to leave the value
 * in place instead of naming the credential.
 */
const REDACTED = '[REDACTED_SECRET]'
/**
 * A value that is a stub rather than a credential: an angle-bracket placeholder naming where a value
 * goes, which is also the shape a TypeScript generic takes.
 */
const ANGLE_PLACEHOLDER = /^<[^<>]*>$/
/**
 * A value that names where a credential lives instead of carrying one: a dotted path of short
 * identifier segments — a lookup chain, not a credential's long payload — or an environment
 * variable's own name. Reading a secret from the environment is the practice this gate exists to
 * encourage, so the assignment shape must not flag it.
 */
const REFERENCE = /^(?:[A-Za-z_$][A-Za-z0-9_$]{0,23}(?:\.[A-Za-z_$][A-Za-z0-9_$]{0,23})+|[A-Z][A-Z0-9_]*)$/

/**
 * Whether one captured value is not itself a credential.
 * @param value - the text captured after the assignment.
 * @returns true when the value is an angle-bracket stub or a reference to where a value lives.
 */
function isInertValue(value: string): boolean {
  return ANGLE_PLACEHOLDER.test(value) || REFERENCE.test(value)
}

/**
 * Every path git's index holds, repository-relative.
 * @param root - absolute repository root.
 * @returns the tracked paths in git's own order.
 * @throws Error when git cannot run or the root is not a repository.
 */
function trackedPaths(root: string): string[] {
  const result = spawnSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`)
  return result.stdout.split('\0').filter(Boolean)
}

const root = resolveRepoRoot()
const skipped = new Map<string, number>()
const files: Array<{ abs: string; shown: string }> = []

/** Record one path this gate did not read, under the rule or the condition that decided it. */
function skip(reason: string): void {
  skipped.set(reason, (skipped.get(reason) ?? 0) + 1)
}

let tracked: string[]
try {
  tracked = trackedPaths(root)
} catch (error) {
  console.error(`verify-no-secrets: cannot list the tracked corpus under ${root} — ${error instanceof Error ? error.message : String(error)}; a root with no tracked text cannot be reported clean.`)
  process.exit(1)
}

for (const repoPath of tracked) {
  // The scope owner decides which trees this gate reads, and its answer is reported below rather
  // than discarded: a file this gate never opened must be traceable to a rule.
  const reason = scopeReason(repoPath)
  if (reason !== '') {
    skip(reason)
    continue
  }
  const abs = resolve(root, repoPath)
  let isFile = false
  try {
    isFile = statSync(abs).isFile()
  } catch {
    skip('absent from the working tree — deleted, and still in the index')
    continue
  }
  if (!isFile) {
    skip('at a path that is not a regular file — a submodule gitlink or a directory entry')
    continue
  }
  const content = readFileSync(abs)
  if (content.includes(0)) {
    skip('with binary content — a byte stream rather than text')
    continue
  }
  files.push({ abs, shown: repoPath })
}

const failures: string[] = []
for (const file of files) {
  for (const [index, line] of readFileSync(file.abs, 'utf8').split('\n').entries()) {
    // The convention the notes contract fixes marks a line its author already sanitized, and the
    // rule is per line because a note writes about secrets as well as beside them.
    if (line.includes(REDACTED)) continue
    for (const shape of SHAPES) {
      const match = shape.pattern.exec(line)
      if (match === null) continue
      if (shape.value !== undefined && isInertValue(match[shape.value] ?? '')) continue
      failures.push(`${file.shown}:${index + 1} [${shape.name}] — replace the value with \`[REDACTED_SECRET]\` and rotate the credential`)
      break
    }
  }
}

const skippedTotal = [...skipped.values()].reduce((sum, count) => sum + count, 0)
const skipSummary = [...skipped.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([reason, count]) => `${count} ${reason}`)
  .join('; ')

if (files.length === 0) {
  const why = skippedTotal === 0
    ? `nothing is tracked under it`
    : `every tracked path was skipped (${skipSummary})`
  console.error(`verify-no-secrets: no tracked text to read under ${root} — ${why}; an empty corpus cannot be reported clean.`)
  process.exit(1)
}

if (failures.length > 0) {
  console.error('verify-no-secrets failed:\n')
  for (const failure of failures) console.error(`  ${failure}`)
  process.exit(1)
}

console.log(`verify-no-secrets: ${files.length} tracked file(s) read, no credential-shaped value found.${skippedTotal === 0 ? '' : ` Skipped ${skippedTotal}: ${skipSummary}.`}`)

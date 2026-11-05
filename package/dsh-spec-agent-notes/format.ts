/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// Agent Note grammar: the header and skeleton every note carries, the alternatives rule, the
// companion suffixes that identify one unit's Markdown sides, and the date grammar.

import { readFileSync } from 'node:fs'
import { DATE, type Lifecycle } from './constants.ts'
import { display, errorCode, type Violation } from './guards.ts'

const STATUS: Record<Lifecycle, RegExp> = {
  proposed: /^Status: proposed$/,
  implemented: /^Status: implemented$/,
  rejected: /^Status: rejected — .+$/,
}

const REQUIRED: Record<Lifecycle, readonly string[]> = {
  proposed: ['## Proposal', '## Acceptance criteria', '## Risks'],
  implemented: ['## Decision', '## Consequences'],
  rejected: ['## Proposal'],
}

const BANNED_IMPLEMENTED = /^## (?:Proposal\b|Plan\b|Migration plan\b|Acceptance criteria\b)/i
const GRANDFATHER = '<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->'

/** The declared suffix a filename ends with, preferring the longest and then the smallest. */
export function companionSuffixOf(name: string, companions: readonly string[]): string | undefined {
  const ordered = [...companions].sort((a, b) => b.length - a.length || a.localeCompare(b))
  return ordered.find((suffix) => name.endsWith(suffix))
}

export function validDate(value: string): boolean {
  const match = DATE.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** The lines outside fenced code blocks, where headings and metadata are read from. */
export function proseLines(lines: readonly string[]): string[] {
  const prose: string[] = []
  let inFence = false
  for (const line of lines) {
    if (line.startsWith('```')) {
      inFence = !inFence
      continue
    }
    if (!inFence) prose.push(line)
  }
  return prose
}

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8').split('\n')
}

/** The header, required sections, proposal-era headings and alternatives rule for one note. */
export function formatErrors(
  projectRoot: string,
  file: string,
  lifecycle: Lifecycle,
  noteDate: string,
  formatAdopted: string | undefined,
): Violation[] {
  const errors: Violation[] = []
  const fail = (message: string): void => {
    errors.push(`format: ${display(projectRoot, file)} — ${message}`)
  }
  let lines: string[]
  try {
    lines = readLines(file)
  } catch (error) {
    fail('unreadable note (' + errorCode(error, 'read error') + ')')
    return errors
  }
  const prose = proseLines(lines)
  if (!/^# Agent Note: \S/.test(lines[0] ?? '')) fail('line 1 must be `# Agent Note: <title>`')
  if (lines[1] !== '') fail('line 2 must be blank')
  const status = STATUS[lifecycle]
  if (!status.test(lines[2] ?? '')) {
    fail(`line 3 must match the ${lifecycle} status grammar (${String(status)})`)
  }
  if (lines[3] !== '') fail('line 4 must be blank')
  const statusLines = prose.filter((line) => line.startsWith('Status:') && line !== lines[2])
  if (statusLines.length > 0 || prose.filter((line) => line === lines[2]).length > 1) {
    fail('the line-3 `Status:` line must be the only one in the file')
  }
  const h2s = prose.filter((line) => line.startsWith('## ')).map((line) => line.trimEnd())
  if (h2s[0] !== '## Problem')
    fail(`the first section must be \`## Problem\` (got ${JSON.stringify(h2s[0] ?? '<none>')})`)
  for (const required of REQUIRED[lifecycle]) {
    if (!h2s.includes(required)) fail(`missing the required \`${required}\` section`)
  }
  if (lifecycle === 'implemented') {
    for (const h2 of h2s.filter((heading) => BANNED_IMPLEMENTED.test(heading))) {
      fail(`\`${h2}\` is a proposal-era heading; an implemented note states what is`)
    }
  }
  const hasSection = h2s.includes('## Alternatives considered')
  const hasGrandfather = prose.includes(GRANDFATHER)
  if (hasSection && hasGrandfather)
    fail('carries both `## Alternatives considered` and the pre-format comment — drop the comment')
  if (!hasSection && !hasGrandfather)
    fail('missing `## Alternatives considered` (each genuine alternative and why it lost)')
  if (hasGrandfather) {
    if (formatAdopted === undefined) {
      fail('the pre-format alternatives comment requires --format-adopted <yyyy-mm-dd>')
    } else if (noteDate >= formatAdopted) {
      fail(`the pre-format alternatives comment is only valid for notes dated before ${formatAdopted}`)
    }
  }
  return errors
}

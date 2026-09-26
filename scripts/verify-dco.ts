/**
 * SPDX-License-Identifier: MIT
 *
 * A repository's own gate: every commit a change offers carries the
 * Developer Certificate of Origin's `Signed-off-by:` trailer, and the line
 * names the commit's author, or its committer where the two differ. A machine does not sign for a person, and a
 * person does not sign for a machine, so the trailer is compared against the
 * commit's own author record rather than trusted.
 *
 * Reads a range: `--base=<ref>` (or `DCO_BASE`) to `--head=<ref>` (or
 * `DCO_HEAD`, default `HEAD`). An empty range fails: a gate that passes on an
 * empty corpus is worse than no gate.
 *
 *   node scripts/verify-dco.ts --base=origin/main
 */

import { execFileSync } from 'node:child_process'

const US = '\u001f'
const RS = '\u001e'

function arg(name: string, fallback: string): string {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : (process.env[`DCO_${name.toUpperCase()}`] ?? fallback)
}

const base = arg('base', 'origin/main')
const head = arg('head', 'HEAD')
const range = `${base}..${head}`

function git(...a: string[]): string {
  return execFileSync('git', a, { encoding: 'utf8' })
}

let log: string
try {
  log = git('log', `--format=%H${US}%an${US}%ae${US}%cn${US}%ce${US}%B${RS}`, range)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`verify-dco: the range ${range} could not be read — ${message.trim().split('\n')[0]}`)
  console.error('verify-dco: name the base the change is offered against, e.g. --base=origin/main')
  process.exit(1)
}

const commits = log.split(RS).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0)
if (commits.length === 0) {
  console.error(`verify-dco: the range ${range} holds no commit; nothing was checked`)
  process.exit(1)
}

const failures: string[] = []
for (const chunk of commits) {
  const [sha, authorName, authorEmail, committerName, committerEmail, ...rest] = chunk.split(US)
  const message = rest.join(US)
  const trailer = message
    .split('\n')
    .map((line) => line.trimEnd())
    .find((line) => /^Signed-off-by:\s+/i.test(line))
  const author = `${authorName} <${authorEmail}>`
  const committer = `${committerName} <${committerEmail}>`
  if (!trailer) {
    failures.push(`${sha.slice(0, 12)}  no Signed-off-by trailer (author ${author})`)
    continue
  }
  const named = trailer.replace(/^Signed-off-by:\s+/i, '').trim()
  if (named !== author && named !== committer) {
    failures.push(`${sha.slice(0, 12)}  signs ${named}, but the commit's author is ${author} and its committer is ${committer}`)
  }
}

if (failures.length > 0) {
  console.error(`verify-dco: ${failures.length} of ${commits.length} commit(s) in ${range} are not signed off:`)
  for (const line of failures) console.error(`  ${line}`)
  console.error('verify-dco: sign with `git commit --signoff`, or amend the commit that is missing it')
  process.exit(1)
}

console.log(`verify-dco: ${commits.length} commit(s) in ${range} carry a Signed-off-by naming their author.`)

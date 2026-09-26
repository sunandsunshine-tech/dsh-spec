/**
 * SPDX-License-Identifier: MIT
 *
 * Submits the bundled npm packages as a dependency snapshot, so Dependabot
 * sees them in the dependency graph and can raise an alert when one of them
 * gets an advisory. The list is read from `THIRD_PARTY_NOTICES.md` — that
 * table is the bundle's own record, so nothing here repeats a version.
 *
 * The submission API needs `contents: write`; the read-only pull-request
 * workflow cannot call it, so this runs from `vendored.yml` on a push to a
 * protected branch, where no untrusted input reaches the job.
 *
 *   node scripts/submit-vendored.ts --dry-run   # print the payload, submit nothing
 *   GITHUB_TOKEN=… node scripts/submit-vendored.ts
 */

import { readFileSync } from 'node:fs'

const OWNER = process.env.GITHUB_REPOSITORY ?? 'sunandsunshine-tech/dsh-spec'
const SHA = process.env.GITHUB_SHA ?? ''
const REF = process.env.GITHUB_REF ?? 'refs/heads/main'
const TOKEN = process.env.GITHUB_TOKEN ?? ''
const dryRun = process.argv.includes('--dry-run')

function packages(): Array<{ name: string; version: string }> {
  const text = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8')
  const start = text.indexOf('## Vendored npm packages')
  const block = start < 0 ? text : text.slice(start)
  return block
    .split('\n')
    .map((line) => line.match(/^\|\s*`([^`]+)`\s*\|\s*`?([0-9][^`|\s]*)`?\s*\|$/))
    .filter((hit): hit is RegExpMatchArray => hit !== null)
    .map((hit) => ({ name: hit[1], version: hit[2] }))
}

const found = packages()
if (found.length === 0) {
  console.error('submit-vendored: no package row was read from THIRD_PARTY_NOTICES.md; nothing to submit')
  process.exit(1)
}
if (!dryRun && (TOKEN === '' || SHA === '')) {
  console.error('submit-vendored: GITHUB_TOKEN and GITHUB_SHA are required outside --dry-run')
  process.exit(1)
}

const resolved: Record<string, unknown> = {}
for (const { name, version } of found) {
  resolved[`pkg:npm/${name}@${version}`] = {
    package_url: `https://www.npmjs.com/package/${name}`,
    relationship: 'direct',
    scope: 'runtime',
  }
}

const payload = {
  version: 0,
  sha: SHA || 'HEAD',
  ref: REF,
  // The snapshot API rejects a payload without it — `422 scanned is required` — and it is what dates
  // the snapshot on the graph.
  scanned: new Date().toISOString(),
  job: { id: `vendored-${SHA || 'local'}`, correlator: 'vendored-notices', html_url: `https://github.com/${OWNER}/actions` },
  detector: { name: 'dsh-spec vendored notices', version: '1', url: `https://github.com/${OWNER}` },
  manifests: {
    'THIRD_PARTY_NOTICES.md': { name: 'THIRD_PARTY_NOTICES.md', resolved },
  },
}

if (dryRun) {
  console.log(JSON.stringify(payload, null, 2))
  console.log(`submit-vendored: ${found.length} package(s) in the payload; nothing was submitted`)
  process.exit(0)
}

const response = await fetch(`https://api.github.com/repos/${OWNER}/dependency-graph/snapshots`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${TOKEN}`,
    accept: 'application/vnd.github+json',
    'content-type': 'application/json',
    'user-agent': 'dsh-spec-vendored-notices',
  },
  body: JSON.stringify(payload),
})
if (!response.ok) {
  console.error(`submit-vendored: the submission failed — ${response.status} ${response.statusText}`)
  console.error((await response.text()).slice(0, 500))
  process.exit(1)
}
console.log(`submit-vendored: ${found.length} package(s) submitted for ${SHA}.`)

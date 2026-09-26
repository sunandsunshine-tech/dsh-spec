/**
 * The vendored-notices snapshot: the payload the dependency-submission endpoint accepts.
 *
 * The script submits what the bundled packages are, so the dependency graph shows them against this
 * repository rather than only against the project they were borrowed from. It had never run against
 * the live endpoint, and its first real run was rejected — `422 scanned is required` — after the
 * repository became public and the graph became available. These cases hold every field the endpoint
 * requires, so the next omission fails here instead of in a job nobody reads.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runScript } from './helpers/cli.ts'

/**
 * The payload the script would post. A dry run prints it and submits nothing, so no token is needed.
 * @returns The parsed snapshot.
 */
function payload(): Record<string, unknown> {
  const result = runScript('scripts/submit-vendored.ts', ['--dry-run'])
  assert.equal(result.status, 0, result.output)
  const start = result.stdout.indexOf('{')
  const end = result.stdout.lastIndexOf('}')
  assert.ok(start >= 0 && end > start, `the dry run printed no payload:\n${result.output}`)
  return JSON.parse(result.stdout.slice(start, end + 1)) as Record<string, unknown>
}

test('the submission carries every field the snapshot endpoint requires', () => {
  const body = payload()
  for (const field of ['version', 'sha', 'ref', 'job', 'detector', 'manifests', 'scanned']) {
    assert.ok(field in body, `${field} is missing, and the endpoint rejects a payload without it`)
  }
})

test('scanned is the instant the endpoint dates the snapshot with', () => {
  const scanned = payload().scanned
  assert.equal(typeof scanned, 'string')
  assert.equal(new Date(scanned as string).toISOString(), scanned, `not an ISO 8601 instant: ${String(scanned)}`)
})

test('the notice file is the manifest, and each package resolves as a direct runtime dependency', () => {
  const manifests = payload().manifests as Record<string, { resolved: Record<string, { package_url: string, relationship: string, scope: string }> }>
  const entry = manifests['THIRD_PARTY_NOTICES.md']
  assert.ok(entry, 'the payload does not name the file the packages were read from')
  const names = Object.keys(entry.resolved)
  assert.ok(names.length > 0, 'no vendored package was resolved')
  for (const name of names) {
    assert.match(name, /^pkg:npm\//, `${name} is not a package URL`)
    // The endpoint decodes this field as a package URL too, and a registry page is not one.
    assert.equal(entry.resolved[name].package_url, name, `${name} names something else as its package url`)
    assert.equal(entry.resolved[name].relationship, 'direct', `${name} is not a direct dependency`)
    assert.equal(entry.resolved[name].scope, 'runtime', `${name} is not a runtime dependency`)
  }
})

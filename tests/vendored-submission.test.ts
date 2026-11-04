/**
 * The vendored-notices snapshot: the payload the dependency-submission endpoint accepts.
 *
 * The script submits what the bundled packages are, so the dependency graph shows them against this
 * repository rather than only against the project they were borrowed from. The endpoint rejects a
 * payload that omits a required field — a missing `scanned` is answered `422 scanned is required` —
 * so these cases hold every field it requires, and the next omission fails here instead of in a job
 * nobody reads.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'
import { discoverBundlePaths, readBundlePackages, readInlinePackages } from '../scripts/vendor-packages.ts'
import { END, renderVendoredTable, START, syncVendoredNotices } from '../scripts/vendored-notices.ts'

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

test('the vendored table is generated from the packages the shipped bundles inline', () => {
  const packages = readInlinePackages(REPO_ROOT)
  assert.ok(packages.size > 0, 'no inlined package was found')
  const notices = readFileSync(join(REPO_ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  const expected = START + '\n' + renderVendoredTable(packages) + END
  assert.ok(notices.includes(expected), 'THIRD_PARTY_NOTICES.md is stale; run pnpm run notices:sync')
})

test('the check mode reports a stale table without writing it, and scoped packages are read', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendored-notices-'))
  try {
    const bundles = discoverBundlePaths(REPO_ROOT)
    const write = (path: string, text: string): void => {
      const absolute = join(root, path)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, text)
    }
    for (const bundle of bundles) {
      write(bundle, 'const a = 1 // node_modules/.pnpm/alpha@1.2.3/node_modules/alpha/index.js\n')
    }
    write(bundles[0], 'const a = 1 // node_modules/.pnpm/@scope+pkg@2.0.0/node_modules/@scope/pkg/index.js\n')
    write('pnpm-lock.yaml', '  punycode.js@2.3.1:\n')
    const stale = '# notices\n\n' + START + '\n| Package | Version |\n|---|---|\n| `stale` | 9.9.9 |\n' + END + '\n'
    write('THIRD_PARTY_NOTICES.md', stale)

    const compared = syncVendoredNotices(root, { write: false })
    assert.equal(compared.changed, true)
    assert.equal(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'), stale, 'check mode wrote the file')
    assert.deepEqual([...compared.packages.keys()], ['@scope/pkg', 'alpha'])
    assert.equal(compared.packages.get('@scope/pkg'), '2.0.0')

    const written = syncVendoredNotices(root)
    assert.equal(written.changed, true)
    const updated = readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')
    assert.ok(updated.includes(renderVendoredTable(compared.packages)), 'the stale table was not replaced')
    assert.equal(syncVendoredNotices(root, { write: false }).changed, false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('punycode is injected only when markdown-it is inlined', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendored-notices-punycode-'))
  try {
    const write = (path: string, text: string): void => {
      const absolute = join(root, path)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, text)
    }
    write('skills/alpha/scripts/a.mjs', '// node_modules/.pnpm/alpha@1.2.3/node_modules/alpha/index.js\n')
    write('pnpm-lock.yaml', '  punycode.js@2.3.1:\n')
    assert.deepEqual([...readInlinePackages(root).keys()], ['alpha'])
    write('skills/alpha/scripts/a.mjs', '// node_modules/.pnpm/markdown-it@15.0.3/node_modules/markdown-it/index.js\n')
    assert.deepEqual([...readInlinePackages(root).keys()], ['markdown-it', 'punycode.js'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('bundle discovery follows the skills tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendored-bundles-'))
  try {
    const write = (path: string): void => {
      const absolute = join(root, path)
      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, '// bundle\n')
    }
    write('skills/alpha/scripts/a.mjs')
    write('skills/beta/scripts/b.mjs')
    assert.deepEqual(discoverBundlePaths(root), ['skills/alpha/scripts/a.mjs', 'skills/beta/scripts/b.mjs'])
    rmSync(join(root, 'skills/beta'), { recursive: true, force: true })
    assert.deepEqual(discoverBundlePaths(root), ['skills/alpha/scripts/a.mjs'])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

// punycode.js is inlined inside markdown-it's dist without a package-file boundary. A skill whose
// bundles inline markdown-it must list it even though no marker names it; any skill that lists it
// must record a 2.x version.
test('each skill-root bundled-package list matches the packages its bundles inline', () => {
  const skills = new Map<string, string[]>()
  const bundles = discoverBundlePaths(REPO_ROOT)
  for (const bundle of bundles) {
    const skill = bundle.split('/')[1]
    assert.ok(skill, 'the bundle path names no skill: ' + bundle)
    skills.set(skill, [...(skills.get(skill) ?? []), bundle])
  }
  assert.equal(
    [...skills.values()].flat().length,
    bundles.length,
    'every shipped bundle must be covered by a skill-root notices check',
  )

  for (const [skill, bundles] of skills) {
    const expected = new Map<string, string>()
    for (const bundle of bundles) {
      for (const [name, version] of readBundlePackages(REPO_ROOT, bundle)) expected.set(name, version)
    }
    const notices = readFileSync(join(REPO_ROOT, 'skills', skill, 'THIRD_PARTY_NOTICES'), 'utf8')
    const listed = new Map<string, string>()
    for (const line of notices.split('\n')) {
      const row = /^- ([A-Za-z0-9@._-]+) ([0-9][^\s(]*)/.exec(line)
      if (row) listed.set(row[1], row[2])
    }
    for (const [name, version] of expected) {
      assert.equal(listed.get(name), version, skill + ' notices must list ' + name + '@' + version)
    }
    const punycode = listed.get('punycode.js')
    if (expected.has('markdown-it')) {
      assert.ok(punycode !== undefined, skill + ' notices must list punycode.js (inlined by markdown-it)')
    }
    if (punycode !== undefined) {
      assert.match(punycode, /^2\./, skill + ' notices must record a 2.x punycode.js version')
    }
    for (const [name, version] of listed) {
      if (expected.has(name)) continue
      assert.ok(name === 'punycode.js', skill + ' notices list ' + name + '@' + version + ' but no bundle inlines it')
    }
  }
})

test('the root vendored table is covered by the skill-root notices', () => {
  const listed = new Set<string>()
  for (const bundle of discoverBundlePaths(REPO_ROOT)) {
    const skill = bundle.split('/')[1]
    const notices = readFileSync(join(REPO_ROOT, 'skills', skill, 'THIRD_PARTY_NOTICES'), 'utf8')
    for (const line of notices.split('\n')) {
      const row = /^- ([A-Za-z0-9@._-]+) ([0-9][^\s(]*)/.exec(line)
      if (row) listed.add(row[1])
    }
  }
  for (const name of readInlinePackages(REPO_ROOT).keys()) {
    assert.ok(listed.has(name), name + ' is in the root table but no skill-root notices list it')
  }
})

test('the check command reports a stale table without writing it', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendored-notices-cli-'))
  try {
    for (const path of [
      ...discoverBundlePaths(REPO_ROOT),
      'pnpm-lock.yaml',
      'THIRD_PARTY_NOTICES.md',
      'scripts/vendor-packages.ts',
      'scripts/vendored-notices.ts',
      'scripts/sync-vendored-notices.ts',
    ]) {
      const target = join(root, path)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(join(REPO_ROOT, path), target)
    }
    const noticesPath = join(root, 'THIRD_PARTY_NOTICES.md')
    const stale = readFileSync(noticesPath, 'utf8').replace('| `ccount` | 2.0.1 |', '| `ccount` | 2.0.2 |')
    writeFileSync(noticesPath, stale)
    const before = readFileSync(noticesPath)
    const result = spawnSync(process.execPath, [join(root, 'scripts/sync-vendored-notices.ts'), '--check'], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /stale/)
    assert.deepEqual(readFileSync(noticesPath), before, 'check mode wrote the file')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('the notice file is the manifest, and each package resolves as a direct runtime dependency', () => {
  const manifests = payload().manifests as Record<
    string,
    { resolved: Record<string, { package_url: string; relationship: string; scope: string }> }
  >
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

/**
 * Provenance: what was borrowed from dsh, from which revision, and how far it diverged.
 *
 * The record exists for the next iteration — a diff against upstream is only cheap when the
 * upstream path and sha are recorded and something checks that the record still matches the code.
 * These cases are what keep the registry from becoming a prose table nobody reads.
 */

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'

interface PortEntry {
  local: string
  upstream: string
  sha: string
  relation: 'verbatim' | 'adapted' | 'split' | 'rewrite' | 'mirrors'
}

interface Ports {
  baseline: { submodule: string, ref: string, sha: string }
  ports: PortEntry[]
}

/** The registry, or a readable failure when it is not there yet. */
function readPorts(): Ports {
  const path = join(REPO_ROOT, 'scripts', 'ports.json')
  assert.ok(existsSync(path), `${path} does not exist yet`)
  return JSON.parse(readFileSync(path, 'utf8')) as Ports
}

test('the registry records a baseline and at least one port', () => {
  const ports = readPorts()

  assert.match(ports.baseline.sha, /^[0-9a-f]{40}$/, 'the baseline needs a full commit sha, not a tag')
  assert.ok(ports.ports.length > 0, 'an empty registry is not a record')
  for (const entry of ports.ports) {
    assert.ok(entry.local !== '', 'every entry names its local file')
    assert.ok(entry.upstream !== '', 'every entry names its upstream path')
    assert.match(entry.sha, /^[0-9a-f]{40}$/, `${entry.local} needs a full upstream sha`)
    assert.ok(['verbatim', 'adapted', 'split', 'rewrite', 'mirrors'].includes(entry.relation), `${entry.local} has an unknown relation`)
  }
})

test('every recorded upstream path exists at its recorded sha', () => {
  const ports = readPorts()

  for (const entry of ports.ports) {
    if (entry.relation === 'mirrors') continue
    const result = spawnSync('git', ['-C', join(REPO_ROOT, ports.baseline.submodule), 'cat-file', '-e', `${entry.sha}:${entry.upstream}`])
    assert.equal(result.status, 0, `${entry.upstream} does not exist at ${entry.sha}`)
  }
})

test('every ported file names its upstream path and sha in its header', () => {
  const ports = readPorts()

  for (const entry of ports.ports) {
    const path = join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'scripts', entry.local)
    assert.ok(existsSync(path), `${entry.local} is recorded but missing`)
    const header = readFileSync(path, 'utf8').split('\n').slice(0, 40).join('\n')
    assert.match(header, new RegExp(entry.upstream.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${entry.local} does not name ${entry.upstream} in its header`)
    assert.match(header, new RegExp(entry.sha), `${entry.local} does not name ${entry.sha} in its header`)
  }
})

test('every provenance header in the engine directory is recorded', () => {
  const ports = readPorts()
  const recorded = new Set(ports.ports.map(entry => entry.local))
  const engineDirectory = join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'scripts')
  const claimants = readdirSync(engineDirectory)
    .filter(name => name.endsWith('.ts'))
    .filter(name => /\bPorted from dsh\b/.test(readFileSync(join(engineDirectory, name), 'utf8').split('\n').slice(0, 40).join('\n')))

  assert.ok(claimants.length > 0, 'no engine file names a dsh origin — this case would pass on an empty corpus')
  for (const name of claimants) {
    assert.ok(recorded.has(name), `${name} claims a dsh origin in its header but scripts/ports.json does not record it`)
  }
})

test('the submodule checkout is the baseline the registry records', () => {
  const ports = readPorts()
  const result = spawnSync('git', ['-C', join(REPO_ROOT, ports.baseline.submodule), 'rev-parse', 'HEAD'], { encoding: 'utf8' })

  assert.equal(result.status, 0, `cannot read the submodule HEAD: ${result.stderr}`)
  assert.equal(result.stdout.trim(), ports.baseline.sha, 'the submodule is checked out elsewhere than the registry baseline')
})

test('the offline provenance gate accepts this repository', () => {
  const result = runScript('scripts/verify-port-provenance.ts')

  assert.equal(result.status, 0, result.output)
})

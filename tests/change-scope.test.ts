/**
 * The bundled change-scope report: the outgoing scope a pre-push check selection reads.
 *
 * Every case runs the report against its own scratch Git repository and removes it afterwards, so the
 * suite needs no network, no clock and no repository state beyond the bundle. The bundle resolves
 * the way the suite resolves the forge's scripts: the work draft while it exists, the landed path
 * after landing removes the work directory.
 */

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { makeFixture } from './helpers/fixtures.ts'
import { skillBundle } from './helpers/bundles.ts'
import type { Fixture } from './helpers/fixtures.ts'
import { runScript } from './helpers/cli.ts'
import type { CliResult } from './helpers/cli.ts'
import { renderChangeScope } from '../package/dsh-spec-pre-push-checks/change-scope.ts'

const bundle = skillBundle('dsh-spec-pre-push-checks', 'change-scope.mjs')

/** The report's public shape, format version 1. */
interface ChangeScopeReport {
  formatVersion: number
  repositoryRoot: string
  input: { base: string; head: string }
  resolved: { baseSha: string; headSha: string; mergeBaseSha: string }
  paths: { committed: string[]; staged: string[]; unstaged: string[]; untracked: string[] }
}

/** Run the bundled report inside one fixture. */
function runReport(fixture: Fixture, ...args: string[]): CliResult {
  return runScript(bundle, args, fixture.root)
}

/** A successful report, parsed. */
function parseReport(result: CliResult): ChangeScopeReport {
  assert.equal(result.status, 0, result.output)
  return JSON.parse(result.stdout) as ChangeScopeReport
}

/** One commit's full object name as the fixture records it. */
function shaOf(fixture: Fixture, rev: string): string {
  const result = fixture.git('rev-parse', '--verify', `${rev}^{commit}`)
  assert.equal(result.status, 0, `cannot resolve ${rev}: ${result.stderr}`)
  return result.stdout.trim()
}

/** The branch the fixture is on. */
function currentBranch(fixture: Fixture): string {
  return fixture.git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim()
}

/** Run one case against a fresh fixture and dispose it afterwards. */
function withFixture(check: (fixture: Fixture) => void): void {
  const fixture = makeFixture()
  try {
    check(fixture)
  } finally {
    fixture.dispose()
  }
}

/** Run one case against a fresh directory outside every Git worktree and remove it afterwards. */
function outsideWorktree(check: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), 'change-scope-norepo-'))
  try {
    check(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('reports the committed, staged, unstaged and untracked path sets', () => {
  withFixture((fixture) => {
    fixture.write('base.txt', 'base\n')
    fixture.commit('base')
    const base = currentBranch(fixture)
    fixture.git('checkout', '-q', '-b', 'feature')
    fixture.write('feature.txt', 'feature\n')
    fixture.commit('feature work')
    // The base side advances after the branch forked, so its paths are not part of the outgoing
    // change: the committed set is relative to the resolved merge base, not to the base tip.
    fixture.git('checkout', '-q', base)
    fixture.write('advanced.txt', 'advanced\n')
    fixture.commit('base advances')
    fixture.git('checkout', '-q', 'feature')
    fixture.write('staged.txt', 'staged\n')
    fixture.git('add', 'staged.txt')
    fixture.write('base.txt', 'changed in the worktree\n')
    fixture.write('untracked.txt', 'untracked\n')

    const report = parseReport(runReport(fixture, '--base', base))

    assert.equal(report.formatVersion, 1)
    assert.equal(report.repositoryRoot, fixture.git('rev-parse', '--show-toplevel').stdout.trim())
    assert.deepEqual(report.input, { base, head: 'HEAD' })
    assert.deepEqual(report.resolved, {
      baseSha: shaOf(fixture, base),
      headSha: shaOf(fixture, 'HEAD'),
      mergeBaseSha: fixture.git('merge-base', base, 'HEAD').stdout.trim(),
    })
    assert.deepEqual(report.paths, {
      committed: ['feature.txt'],
      staged: ['staged.txt'],
      unstaged: ['base.txt'],
      untracked: ['untracked.txt'],
    })
  })
})

test('resolves the base and head, and --head defaults to HEAD', () => {
  withFixture((fixture) => {
    fixture.write('base.txt', 'base\n')
    fixture.commit('base')
    const base = currentBranch(fixture)
    fixture.git('checkout', '-q', '-b', 'feature')
    // Written out of alphabetical order: the report sorts every path list.
    fixture.write('two.txt', 'two\n')
    fixture.write('one.txt', 'one\n')
    fixture.commit('first feature commit')
    const firstHead = shaOf(fixture, 'HEAD')
    fixture.write('three.txt', 'three\n')
    fixture.commit('second feature commit')
    const baseSha = shaOf(fixture, base)

    const explicit = parseReport(runReport(fixture, '--base', base, '--head', firstHead))
    assert.deepEqual(explicit.input, { base, head: firstHead })
    assert.deepEqual(explicit.resolved, { baseSha, headSha: firstHead, mergeBaseSha: baseSha })
    assert.deepEqual(explicit.paths.committed, ['one.txt', 'two.txt'])

    const defaulted = parseReport(runReport(fixture, '--base', base))
    assert.deepEqual(defaulted.input, { base, head: 'HEAD' })
    assert.deepEqual(defaulted.resolved, {
      baseSha,
      headSha: shaOf(fixture, 'HEAD'),
      mergeBaseSha: baseSha,
    })
    assert.deepEqual(defaulted.paths.committed, ['one.txt', 'three.txt', 'two.txt'])
  })
})

test('--help prints usage and exits 0 before any Git work', () => {
  outsideWorktree((directory) => {
    const result = runScript(bundle, ['--help'], directory)

    assert.equal(result.status, 0, result.output)
    assert.equal(result.stderr, '')
    assert.match(result.stdout, /^usage: change-scope\.mjs --base <ref> \[--head <ref>\] \[--help\]$/m)
    assert.match(result.stdout, /exit: 0 a report was printed · 1 a Git or ref resolution failure · 2 usage error/)
    assert.match(result.stdout, /--base <ref> +the ref the change is reviewed against \(required\)/)
    assert.match(result.stdout, /--head <ref> +the commit to inspect against that base \(default: HEAD\)/)

    // Parsed anywhere, before the arguments or the repository are looked at.
    const anywhere = runScript(bundle, ['--base', 'anything', '-h'], directory)
    assert.equal(anywhere.status, 0, anywhere.output)
    assert.equal(anywhere.stdout, result.stdout)
  })
})

test('a missing --base is a usage error', () => {
  withFixture((fixture) => {
    const result = runReport(fixture)

    assert.equal(result.status, 2, result.output)
    assert.equal(result.stdout, '')
    assert.match(
      result.stderr,
      /^change-scope\.mjs: missing required --base <ref>\nrun "change-scope\.mjs --help" for usage\n$/,
    )
  })
})

test('an unknown option is a usage error', () => {
  withFixture((fixture) => {
    const result = runReport(fixture, '--base', 'HEAD', '--bogus')

    assert.equal(result.status, 2, result.output)
    assert.equal(result.stdout, '')
    assert.match(
      result.stderr,
      /^change-scope\.mjs: unknown option: --bogus\nrun "change-scope\.mjs --help" for usage\n$/,
    )
  })
})

test('an unexpected positional is a usage error', () => {
  withFixture((fixture) => {
    const result = runReport(fixture, '--base', 'HEAD', 'stray')

    assert.equal(result.status, 2, result.output)
    assert.equal(result.stdout, '')
    assert.match(
      result.stderr,
      /^change-scope\.mjs: unexpected positional argument: stray\nrun "change-scope\.mjs --help" for usage\n$/,
    )
  })
})

test('an unresolvable base fails instead of fetching or guessing one', () => {
  withFixture((fixture) => {
    fixture.write('base.txt', 'base\n')
    fixture.commit('base')
    const result = runReport(fixture, '--base', 'does-not-exist')

    assert.equal(result.status, 1, result.output)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /^change-scope\.mjs: base ref "does-not-exist" does not resolve to a commit:/m)
  })
})

test('an ambiguous ref fails rather than picking one', () => {
  withFixture((fixture) => {
    fixture.write('base.txt', 'base\n')
    fixture.commit('base')
    const base = currentBranch(fixture)
    fixture.git('checkout', '-q', '-b', 'feature')
    fixture.write('feature.txt', 'feature\n')
    fixture.commit('feature')
    // A branch and a tag share one name, so the name alone does not identify a commit.
    fixture.git('branch', 'duplicate', base)
    fixture.git('tag', 'duplicate')

    const result = runReport(fixture, '--base', 'duplicate')

    assert.equal(result.status, 1, result.output)
    assert.equal(result.stdout, '')
    assert.match(
      result.stderr,
      /change-scope\.mjs: base ref "duplicate" is ambiguous; use a fully qualified ref or commit ID/,
    )
  })
})

test('a base and head with no merge base fail', () => {
  withFixture((fixture) => {
    fixture.write('base.txt', 'base\n')
    fixture.commit('base')
    const base = currentBranch(fixture)
    // An orphan history shares no commit with the branch it is reported against.
    fixture.git('checkout', '-q', '--orphan', 'unrelated')
    fixture.git('rm', '-q', '-rf', '--ignore-unmatch', '.')
    fixture.write('other.txt', 'other\n')
    fixture.commit('unrelated root')

    const result = runReport(fixture, '--base', base, '--head', 'unrelated')

    assert.equal(result.status, 1, result.output)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /change-scope\.mjs: base and head do not have a merge base:/)
  })
})

test('a directory outside a Git worktree fails', () => {
  outsideWorktree((directory) => {
    const result = runScript(bundle, ['--base', 'HEAD'], directory)

    assert.equal(result.status, 1, result.output)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /^change-scope\.mjs: cannot locate a Git worktree:/m)
  })
})

test('the exported renderer returns one versioned report and throws on an unresolved ref', () => {
  const fixture = makeFixture()
  try {
    fixture.write('tracked.txt', 'tracked\n')
    fixture.commit('base')
    const report = JSON.parse(renderChangeScope(['--base', 'HEAD'], fixture.root)) as ChangeScopeReport
    assert.equal(report.formatVersion, 1)
    assert.deepEqual(report.paths.committed, [])
    assert.throws(
      () => renderChangeScope(['--base', 'missing-ref'], fixture.root),
      /base ref "missing-ref" does not resolve to a commit/,
    )
  } finally {
    fixture.dispose()
  }
})

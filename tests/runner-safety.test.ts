/** Focused negative controls for the model-eval runner's filesystem and Git boundaries. */
import assert from 'node:assert/strict'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const safety = (await import('./skill-evals/runner-safety.mjs' as string)) as {
  assertEvidenceRunPath(root: string, output: string, expectedSkill?: string): void
  assertInputFile(root: string, file: string, label: string): string
  assertProjectPath(project: string, path: string, label: string): string
  capabilityMaskPaths(browserEnabled: boolean, mediaEnabled: boolean): string[]
  copyTrustedGit(project: string, destination: string): void
  hashFileNoFollow(path: string): string
  modeBits(path: string): string
  parseNulSeparatedPaths(output: string): string[]
  removeModelTree(path: string): void
  resolveCapability(name: string, requested: boolean | undefined, available: boolean): boolean
  trustedGitArgs(gitDirectory: string, project: string, args: string[]): string[]
}

function git(cwd: string, args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', ...env },
  })
}

test('eval staging rejects traversal and symlinked inputs', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-input-safety-'))
  try {
    const files = join(root, 'evals', 'files')
    mkdirSync(files, { recursive: true })
    writeFileSync(join(files, 'ok.md'), '# ok\n')
    assert.equal(safety.assertInputFile(root, 'evals/files/ok.md', 'input'), join(files, 'ok.md'))
    assert.throws(() => safety.assertInputFile(root, 'evals/files/../evals.json', 'traversal'), /escapes|symbolic link/)
    const outside = join(root, 'outside.md')
    writeFileSync(outside, '# outside\n')
    symlinkSync(outside, join(files, 'outside.md'))
    assert.throws(() => safety.assertInputFile(root, 'evals/files/outside.md', 'link'), /symbolic link|escapes/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('retained outputs cannot traverse a symlinked project component', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-output-safety-'))
  try {
    const project = join(root, 'project')
    const outside = join(root, 'outside')
    mkdirSync(project)
    mkdirSync(outside)
    writeFileSync(join(outside, 'result.txt'), 'outside\n')
    symlinkSync(outside, join(project, 'evidence'))
    assert.throws(() => safety.assertProjectPath(project, 'evidence/result.txt', 'output'), /escapes|symbolic link/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('evidence output replacement requires a date, skill and run leaf', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-replace-safety-'))
  try {
    const evidence = join(root, 'evidence')
    const valid = join(evidence, '2026-11-23-pr121', 'dsh-spec-example', 'run-1')
    mkdirSync(valid, { recursive: true })
    assert.doesNotThrow(() => safety.assertEvidenceRunPath(evidence, valid, 'dsh-spec-example'))
    assert.throws(() => safety.assertEvidenceRunPath(evidence, join(evidence, '2026-11-23-pr121')), /date.*skill.*run/)
    assert.throws(
      () =>
        safety.assertEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-23-pr121', 'dsh-spec-other', 'run-1'),
          'dsh-spec-example',
        ),
      /expected dsh-spec-example/,
    )
    assert.throws(
      () =>
        safety.assertEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-23-pr121', 'dsh-spec-example', '.old-run'),
          'dsh-spec-example',
        ),
      /date.*skill.*run/,
    )
    const outside = join(root, 'outside')
    mkdirSync(outside)
    symlinkSync(outside, join(evidence, '2026-11-23-pr121', 'dsh-spec-example', 'linked'))
    assert.throws(
      () =>
        safety.assertEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-23-pr121', 'dsh-spec-example', 'linked'),
          'dsh-spec-example',
        ),
      /escapes|symbolic link/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('trusted Git inspection ignores model-controlled hooks and commondir', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-git-safety-'))
  try {
    const project = join(root, 'project')
    const trusted = join(root, 'trusted-git')
    const marker = join(root, 'hook-ran')
    mkdirSync(project)
    assert.equal(git(project, ['init', '-q']).status, 0)
    assert.equal(git(project, ['config', 'user.name', 'Runner']).status, 0)
    assert.equal(git(project, ['config', 'user.email', 'runner@example.invalid']).status, 0)
    writeFileSync(join(project, 'tracked.txt'), 'base\n')
    assert.equal(git(project, ['add', '-A']).status, 0)
    assert.equal(git(project, ['commit', '-qm', 'base']).status, 0)
    safety.copyTrustedGit(project, trusted)

    const hook = join(project, '.git', 'hooks', 'post-index-change')
    mkdirSync(dirname(hook), { recursive: true })
    writeFileSync(hook, '#!/bin/sh\nprintf hook > ' + JSON.stringify(marker) + '\n')
    chmodSync(hook, 0o755)
    writeFileSync(join(project, 'tracked.txt'), 'candidate\n')

    const index = join(root, 'inspection.index')
    const result = spawnSync('git', safety.trustedGitArgs(trusted, project, ['read-tree', 'HEAD']), {
      cwd: project,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_INDEX_FILE: index,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(existsSync(marker), false)

    const hidden = join(root, 'hidden-git')
    mkdirSync(hidden)
    writeFileSync(join(hidden, 'config'), '[diff]\n\texternal = /bin/false\n')
    writeFileSync(join(project, '.git', 'commondir'), hidden + '\n')
    const diff = spawnSync('git', safety.trustedGitArgs(trusted, project, ['diff', '--no-ext-diff', '--stat']), {
      cwd: project,
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
    })
    assert.equal(diff.status, 0, diff.stderr)
    assert.equal(existsSync(marker), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('capability defaults follow host state and explicit requirements fail closed', async () => {
  assert.equal(safety.resolveCapability('browser', undefined, false), false)
  assert.equal(safety.resolveCapability('media', undefined, true), true)
  assert.equal(safety.resolveCapability('media', false, true), false)
  assert.throws(() => safety.resolveCapability('media', true, false), /requires media/)
  assert.ok(safety.capabilityMaskPaths(false, false).includes('/usr/bin/ffmpeg'))
  assert.ok(safety.capabilityMaskPaths(false, false).includes('/usr/bin/chromium'))
  assert.deepEqual(safety.capabilityMaskPaths(true, true), [])
})

test('input modes are bound in the manifest format', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-mode-safety-'))
  try {
    const file = join(root, 'script.sh')
    writeFileSync(file, '#!/bin/sh\n')
    chmodSync(file, 0o755)
    assert.equal(safety.modeBits(file), '0755')
    assert.equal(readFileSync(file, 'utf8'), '#!/bin/sh\n')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('machine paths retain spaces and non-ASCII names and artifact hashing refuses links', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-path-safety-'))
  try {
    assert.deepEqual(safety.parseNulSeparatedPaths('café.txt\0name  with  spaces.md\0'), [
      'café.txt',
      'name  with  spaces.md',
    ])
    const target = join(root, 'café.txt')
    writeFileSync(target, 'content\n')
    assert.match(safety.hashFileNoFollow(target), /^[0-9a-f]{64}$/)
    symlinkSync(target, join(root, 'linked.txt'))
    assert.throws(() => safety.hashFileNoFollow(join(root, 'linked.txt')), /ELOOP|regular file/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('temporary cleanup repairs model-created permissions without following links', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-cleanup-safety-'))
  try {
    const runRoot = join(root, 'run')
    const locked = join(runRoot, 'locked')
    const outside = join(root, 'outside.txt')
    mkdirSync(locked, { recursive: true })
    writeFileSync(outside, 'outside\n')
    writeFileSync(join(locked, 'created.txt'), 'created\n')
    symlinkSync(outside, join(runRoot, 'outside-link'))
    chmodSync(locked, 0o000)
    assert.doesNotThrow(() => safety.removeModelTree(runRoot))
    assert.equal(existsSync(runRoot), false)
    assert.equal(readFileSync(outside, 'utf8'), 'outside\n')
  } finally {
    const locked = join(root, 'run', 'locked')
    if (existsSync(locked)) chmodSync(locked, 0o700)
    rmSync(root, { recursive: true, force: true })
  }
})

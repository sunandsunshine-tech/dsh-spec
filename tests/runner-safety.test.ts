/** Focused negative controls for the model-eval runner's filesystem and Git boundaries. */
import assert from 'node:assert/strict'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import http from 'node:http'
import { test } from 'node:test'

const safety = (await import('./skill-evals/runner-safety.mjs' as string)) as {
  MODEL_EVIDENCE_LIMITS: {
    artifactBytes: number
    artifactFiles: number
    artifactFileBytes: number
    finalResponseBytes: number
    workspaceBytes: number
    workspaceEntries: number
  }
  acquireFileLock(path: string): Promise<{ release(): Promise<void> }>
  addOutputBytes(currentBytes: number, chunk: string, limitBytes: number, label: string): number
  assertCredentialFreeBaseUrl(value: string, label: string): URL
  assertEvidenceRunPath(root: string, output: string, expectedSkill?: string, label?: string): void
  assertInputFile(root: string, file: string, label: string): string
  assertProjectPath(project: string, path: string, label: string): string
  assertTriggerEvidenceRunPath(
    root: string,
    output: string,
    expectedSkill?: string,
    expectedTriggerId?: string,
    label?: string,
  ): void
  capabilityMaskPaths(browserEnabled: boolean, mediaEnabled: boolean): string[]
  collectArtifactSources(
    project: string,
    paths: string[],
    declaredOutputs: string[],
    limits?: Record<string, number>,
  ): Array<{ path: string; source: string }>
  copyTreeBounded(options: {
    sourceRoot: string
    destinationRoot: string
    maxEntries: number
    maxBytes: number
    maxFileBytes: number
    skip?: (relative: string) => boolean
  }): { bytes: number; entries: number; files: number }
  copyTrustedGit(project: string, destination: string): void
  executableFile(path: string): boolean
  hashFileNoFollow(path: string, maxBytes?: number): string
  isolatedGitEnvironment(
    extra?: Record<string, string | undefined>,
    inherited?: NodeJS.ProcessEnv,
  ): Record<string, string>
  mediaExecutablePaths(): string[]
  modeBits(path: string): string
  parseNulSeparatedPaths(output: string): string[]
  proxyProviderLines(lines: string[], proxyUrl: string, proxyToken: string): string[]
  readFileNoFollowLimited(path: string, label: string, maxBytes: number): Buffer
  readSafeModelCatalog(sourceHome: string, value: string): string
  removeModelTree(path: string): void
  resolveCapability(name: string, requested: boolean | undefined, available: boolean): boolean
  resolveExecutableFile(path: string): string | undefined
  resolveMiseMediaRoot(miseInstalls: string): string | undefined
  sanitizeHostAccountText(text: string, username: string): string
  sandboxTmpfsArgs(limits?: Record<string, number>, options?: { includeWorkspace?: boolean }): string[]
  singleTomlStringField(lines: string[], key: string, label: string): string | undefined
  tomlField(lines: string[], key: string): string | undefined
  tomlStringValue(line: string): string | undefined
  trustedGitArgs(gitDirectory: string, project: string, args: string[]): string[]
}
const policy = (await import('./skill-evals/evidence-policy.mjs' as string)) as {
  assertComparableEvidenceArms(
    candidate: unknown,
    baseline: unknown,
    options: {
      scenario: { id: string; prompt: string; comparison: Record<string, unknown> }
      candidateEvidenceSha256: string
      baselineEvidenceSha256: string
    },
  ): { candidate: unknown; baseline: unknown }
  hashEvidenceMetadata(root: string, canaries?: Array<{ set: string; value: string }>): string
  privacyCanariesFor(
    skill: string,
    scenarioId: string,
    options?: { includeCurrentHome?: boolean; currentHome?: string },
  ): Array<{ set: string; value: string }>
}

function git(cwd: string, args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: safety.isolatedGitEnvironment(env),
  })
}

function createFakeCodexHarness(root: string): { codexHome: string; bin: string } {
  const codexHome = join(root, 'codex-home')
  const bin = join(root, 'bin')
  mkdirSync(codexHome, { recursive: true })
  mkdirSync(bin, { recursive: true })
  writeFileSync(
    join(codexHome, 'config.toml'),
    [
      'model = "gpt-5"',
      'model_provider = "test"',
      '',
      '[model_providers.test]',
      'name = "test"',
      'base_url = "https://provider.example/v1"',
      'wire_api = "responses"',
      '',
    ].join('\n'),
  )
  return { codexHome, bin }
}

function writeFakeCodex(path: string, lines: string[]): void {
  writeFileSync(path, ['#!/usr/bin/env node', ...lines, ''].join('\n'))
  chmodSync(path, 0o755)
}

function runFakeModelRunner(
  repository: string,
  codexHome: string,
  codex: string,
  args: string[],
): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [join(repository, 'tests/skill-evals/run-model-eval.mjs'), ...args], {
    cwd: repository,
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_BIN: codex,
      CODEX_HOME: codexHome,
    },
    maxBuffer: 8 * 1024 * 1024,
    timeout: 15_000,
  })
}

function createNeverRunCodex(root: string) {
  const codexHome = join(root, 'isolated-codex-home')
  const bin = join(root, 'never-run-bin')
  const marker = join(root, 'codex-invoked')
  mkdirSync(codexHome, { recursive: true })
  mkdirSync(bin, { recursive: true })
  const codex = join(bin, 'codex')
  writeFakeCodex(codex, [
    "const fs = require('node:fs')",
    `fs.writeFileSync(${JSON.stringify(marker)}, 'invoked\\n')`,
    'process.exit(90)',
  ])
  return {
    marker,
    run(repository: string, args: string[]) {
      return spawnSync(process.execPath, [join(repository, 'tests/skill-evals/run-model-eval.mjs'), ...args], {
        cwd: repository,
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEX_BIN: codex,
          CODEX_HOME: codexHome,
        },
        maxBuffer: 8 * 1024 * 1024,
        timeout: 5_000,
      })
    },
  }
}

function createTriggerRunnerRepository(root: string, sourceRepository: string): string {
  const repository = join(root, 'repository')
  for (const file of [
    'tests/skill-evals/run-model-eval.mjs',
    'tests/skill-evals/evidence-policy.mjs',
    'tests/skill-evals/runner-safety.mjs',
    'tests/skill-evals/model-auth-proxy.mjs',
    'tests/skill-evals/model-sandbox-entrypoint.mjs',
  ]) {
    mkdirSync(dirname(join(repository, file)), { recursive: true })
    cpSync(join(sourceRepository, file), join(repository, file))
  }
  cpSync(
    join(sourceRepository, 'skills/dsh-spec-ci-test-reliability'),
    join(repository, 'skills/dsh-spec-ci-test-reliability'),
    { recursive: true },
  )
  const corpusRoot = join(repository, 'tests/skill-evals/dsh-spec-ci-test-reliability')
  mkdirSync(join(corpusRoot, 'trigger-fixtures/executable-probe'), { recursive: true })
  cpSync(
    join(sourceRepository, 'tests/skill-evals/dsh-spec-ci-test-reliability/trigger-fixtures/AGENTS.md'),
    join(corpusRoot, 'trigger-fixtures/AGENTS.md'),
  )
  const probe = join(corpusRoot, 'trigger-fixtures/executable-probe/probe.sh')
  writeFileSync(probe, '#!/bin/sh\nexit 0\n')
  chmodSync(probe, 0o755)
  const corpus = JSON.parse(
    readFileSync(join(sourceRepository, 'tests/skill-evals/dsh-spec-ci-test-reliability/trigger-evals.json'), 'utf8'),
  ) as { queries: Array<{ id: string; files?: string[] }> }
  const selected = corpus.queries.find((query) => query.id === 'parallel-port-collision')
  assert.ok(selected)
  selected.files = ['trigger-fixtures/executable-probe/probe.sh']
  writeFileSync(join(corpusRoot, 'trigger-evals.json'), `${JSON.stringify(corpus, null, 2)}\n`)
  mkdirSync(join(repository, 'tests/skill-evals/evidence'), { recursive: true })
  return repository
}

function bwrapAvailable(): boolean {
  const pnpmPath = spawnSync('which', ['pnpm'], { encoding: 'utf8' })
  if (pnpmPath.status !== 0 || !pnpmPath.stdout.trim()) return false
  const nodeRuntimeRoot = dirname(dirname(realpathSync(process.execPath)))
  const pnpmRuntimeRoot = dirname(realpathSync(pnpmPath.stdout.trim()))
  const probe = spawnSync(
    'bwrap',
    [
      '--die-with-parent',
      '--new-session',
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--ro-bind',
      '/usr',
      '/usr',
      '--ro-bind',
      '/bin',
      '/bin',
      '--ro-bind',
      '/lib',
      '/lib',
      '--ro-bind',
      '/lib64',
      '/lib64',
      '--ro-bind',
      nodeRuntimeRoot,
      '/probe-runtime/node',
      '--ro-bind',
      pnpmRuntimeRoot,
      '/probe-runtime/pnpm',
      '--size',
      '1048576',
      '--tmpfs',
      '/workspace-probe',
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '/probe-runtime/node/bin/node',
      '--version',
    ],
    { encoding: 'utf8' },
  )
  return !probe.error && probe.status === 0
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

test('trigger evidence requires a date, skill, trigger directory and query leaf', () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-trigger-path-'))
  try {
    const evidence = join(root, 'evidence')
    const valid = join(evidence, '2026-11-26-issue-144', 'dsh-spec-example', 'trigger', 'positive-case')
    mkdirSync(valid, { recursive: true })
    assert.doesNotThrow(() => safety.assertTriggerEvidenceRunPath(evidence, valid, 'dsh-spec-example', 'positive-case'))
    assert.throws(
      () =>
        safety.assertTriggerEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-26-issue-144', 'dsh-spec-example', 'positive-case'),
          'dsh-spec-example',
          'positive-case',
        ),
      /date.*skill.*trigger.*query-id/,
    )
    assert.throws(
      () =>
        safety.assertTriggerEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-26-issue-144', 'dsh-spec-other', 'trigger', 'positive-case'),
          'dsh-spec-example',
          'positive-case',
        ),
      /expected dsh-spec-example/,
    )
    assert.throws(
      () =>
        safety.assertTriggerEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-26-issue-144', 'dsh-spec-example', 'trigger', '.old-case'),
          'dsh-spec-example',
          '.old-case',
        ),
      /date.*skill.*trigger.*query-id/,
    )
    assert.throws(
      () =>
        safety.assertTriggerEvidenceRunPath(
          evidence,
          join(evidence, '2026-11-26-issue-144', 'dsh-spec-example', 'trigger', 'other-case'),
          'dsh-spec-example',
          'positive-case',
        ),
      /must match expected positive-case/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('trigger runner rejects scenario mode, comparison options and writable workspaces', () => {
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-trigger-negative-'))
  const neverRun = createNeverRunCodex(root)
  const output = join(
    repository,
    'tests/skill-evals/evidence/2099-12-31-trigger-options/dsh-spec-ci-test-reliability/trigger/parallel-port-collision',
  )
  try {
    const bothModes = neverRun.run(repository, [
      '--skill',
      'dsh-spec-ci-test-reliability',
      '--scenario',
      'redesign-slow-repeated-suite',
      '--trigger-id',
      'parallel-port-collision',
      '--output',
      output,
      '--sandbox',
      'read-only',
    ])
    assert.notEqual(bothModes.status, 0)
    assert.match(String(bothModes.stderr), /exactly one of --scenario or --trigger-id/)

    const counterpart = neverRun.run(repository, [
      '--skill',
      'dsh-spec-ci-test-reliability',
      '--trigger-id',
      'parallel-port-collision',
      '--counterpart',
      output,
      '--output',
      output,
      '--sandbox',
      'read-only',
    ])
    assert.notEqual(counterpart.status, 0)
    assert.match(String(counterpart.stderr), /does not accept --counterpart/)

    const writable = neverRun.run(repository, [
      '--skill',
      'dsh-spec-ci-test-reliability',
      '--trigger-id',
      'parallel-port-collision',
      '--output',
      output,
      '--sandbox',
      'workspace-write',
    ])
    assert.notEqual(writable.status, 0)
    assert.match(String(writable.stderr), /requires --sandbox read-only/)

    const mismatched = neverRun.run(repository, [
      '--skill',
      'dsh-spec-ci-test-reliability',
      '--trigger-id',
      'parallel-port-collision',
      '--output',
      join(
        repository,
        'tests/skill-evals/evidence/2099-12-31-trigger-options/dsh-spec-ci-test-reliability/trigger/other-case',
      ),
      '--sandbox',
      'read-only',
      '--replace',
    ])
    assert.notEqual(mismatched.status, 0)
    assert.match(String(mismatched.stderr), /query id must match expected parallel-port-collision/)
    assert.equal(existsSync(neverRun.marker), false, 'a rejected invocation started the Codex executable')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('runner path preflight diagnostics redact configured canaries', () => {
  const repository = dirname(import.meta.dirname)
  const runner = join(repository, 'tests/skill-evals/run-model-eval.mjs')
  const skill = 'dsh-spec-speed-up-perf'
  const scenario = 'measurement-decisions'
  const canaries = policy.privacyCanariesFor(skill, scenario, {
    includeCurrentHome: true,
    currentHome: homedir(),
  })
  const privatePath = join(homedir(), 'evidence-path-canary', 'run')
  const cleanupRoot = join(repository, 'tests/skill-evals/evidence/2099-12-31-path-preflight')
  const output = join(cleanupRoot, skill, 'baseline')
  const assertRedacted = (result: ReturnType<typeof spawnSync>, guidance: RegExp) => {
    assert.notEqual(result.status, 0)
    const stderr = String(result.stderr)
    assert.match(stderr, guidance)
    for (const canary of canaries) assert.ok(!stderr.includes(canary.value), canary.set + ' canary leaked')
  }
  try {
    const invalidOutput = spawnSync(
      process.execPath,
      [runner, '--skill', skill, '--scenario', scenario, '--output', privatePath],
      { cwd: repository, encoding: 'utf8' },
    )
    assertRedacted(invalidOutput, /evidence output must use evidence\/<date>\/<skill>\/<run>/)
    assert.equal(existsSync(privatePath), false)

    const invalidCounterpart = spawnSync(
      process.execPath,
      [
        runner,
        '--skill',
        skill,
        '--scenario',
        scenario,
        '--output',
        output,
        '--counterpart',
        privatePath,
        '--arm',
        'target-absent',
      ],
      { cwd: repository, encoding: 'utf8' },
    )
    assertRedacted(invalidCounterpart, /counterpart evidence path must use evidence\/<date>\/<skill>\/<run>/)
    assert.equal(existsSync(join(repository, output)), false)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
  }
})

test('the runner rejects a target-absent arm before starting a behavior scenario', () => {
  const repository = dirname(import.meta.dirname)
  const output = 'tests/skill-evals/evidence/2099-12-31-target-absent/dsh-spec-error-handling/behavior'
  const result = spawnSync(
    process.execPath,
    [
      join(repository, 'tests/skill-evals/run-model-eval.mjs'),
      '--skill',
      'dsh-spec-error-handling',
      '--scenario',
      'outcome-classification-and-extensible-codes',
      '--output',
      output,
      '--arm',
      'target-absent',
    ],
    { cwd: repository, encoding: 'utf8' },
  )
  assert.notEqual(result.status, 0)
  assert.match(String(result.stderr), /valid only for a comparison claim/)
  assert.equal(existsSync(join(repository, output)), false)
})

test('the runner rejects a target-absent comparison arm without a counterpart before model start', () => {
  const repository = dirname(import.meta.dirname)
  const output = 'tests/skill-evals/evidence/2099-12-31-target-absent-comparison/dsh-spec-speed-up-perf/baseline'
  const result = spawnSync(
    process.execPath,
    [
      join(repository, 'tests/skill-evals/run-model-eval.mjs'),
      '--skill',
      'dsh-spec-speed-up-perf',
      '--scenario',
      'measurement-decisions',
      '--output',
      output,
      '--arm',
      'target-absent',
    ],
    { cwd: repository, encoding: 'utf8' },
  )
  assert.notEqual(result.status, 0)
  assert.match(String(result.stderr), /requires --counterpart/)
  assert.equal(existsSync(join(repository, output)), false)
})

test('evidence output locking is exclusive and released after completion', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-lock-'))
  const lock = join(root, 'evidence.lock')
  let first: { release(): Promise<void> } | undefined
  try {
    first = await safety.acquireFileLock(lock)
    await assert.rejects(() => safety.acquireFileLock(lock), /output lock is held/)
    await first.release()
    first = undefined
    const second = await safety.acquireFileLock(lock)
    await second.release()
  } finally {
    if (first) await first.release()
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
      env: safety.isolatedGitEnvironment({ GIT_INDEX_FILE: index }),
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
      env: safety.isolatedGitEnvironment(),
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

test('host account sanitization targets ownership fields without rewriting technical words', () => {
  const raw = [
    'drwxr-xr-x 2 node node 4096 Nov 26 12:00 project',
    '-rwxr-xr-x 755 node:node /opt/tool',
    'node --version',
    'uid=1000(node) gid=1000(node) groups=1000(node)',
    'node 123 1 0 Nov26 ? 00:00:00 worker',
  ].join('\n')
  const sanitized = safety.sanitizeHostAccountText(raw, 'node')
  assert.match(sanitized, /^drwxr-xr-x 2 eval eval /m)
  assert.match(sanitized, /^-rwxr-xr-x 755 eval:eval /m)
  assert.match(sanitized, /^node --version$/m)
  assert.match(sanitized, /uid=1000\(eval\) gid=1000\(eval\)/)
  assert.match(sanitized, /^eval 123 1 0 /m)

  const encoded = safety.sanitizeHostAccountText(JSON.stringify({ output: raw }), 'node')
  assert.match(encoded, /drwxr-xr-x 2 eval eval /)
  assert.match(encoded, /-rwxr-xr-x 755 eval:eval /)
  assert.match(encoded, /node --version/)
  assert.match(encoded, /uid=1000\(eval\) gid=1000\(eval\)/)
  assert.match(encoded, /\\neval 123 1 0 /)
})

test('media capability resolves executables that can be mounted into the sandbox', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-media-capability-'))
  try {
    const installs = join(root, 'installs')
    const version = join(installs, 'ffmpeg', '9.0.2')
    mkdirSync(join(version, 'bin'), { recursive: true })
    for (const name of ['ffmpeg', 'ffprobe']) {
      writeFileSync(join(version, 'bin', name), '#!/bin/sh\n')
      chmodSync(join(version, 'bin', name), 0o755)
    }
    symlinkSync(version, join(installs, 'ffmpeg', 'latest'))
    assert.equal(safety.resolveMiseMediaRoot(installs), version)
    assert.equal(safety.executableFile(join(version, 'bin', 'ffmpeg')), true)
    assert.equal(
      safety.resolveExecutableFile(join(version, 'bin', 'ffmpeg')),
      realpathSync(join(version, 'bin', 'ffmpeg')),
    )
    symlinkSync(join(version, 'bin', 'ffmpeg'), join(root, 'ffmpeg-link'))
    assert.equal(safety.executableFile(join(root, 'ffmpeg-link')), true)
    assert.equal(safety.resolveExecutableFile(join(root, 'ffmpeg-link')), realpathSync(join(version, 'bin', 'ffmpeg')))
    chmodSync(join(version, 'bin', 'ffprobe'), 0o644)
    assert.equal(safety.resolveMiseMediaRoot(installs), undefined)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('model auth proxy keeps the upstream token outside the model configuration', async (t) => {
  let upstreamAuthorization = ''
  let upstreamBody = ''
  let upstreamPath = ''
  const authToken = 'a'.repeat(64)
  let releaseStall: (() => void) | undefined
  const stallStarted = new Promise<void>((resolve) => {
    releaseStall = resolve
  })
  const upstream = http.createServer((request, response) => {
    upstreamAuthorization = String(request.headers.authorization)
    upstreamPath = String(request.url)
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      upstreamBody += chunk
    })
    request.on('end', () => {
      if (request.headers['x-stall'] === '1') {
        releaseStall?.()
        return
      }
      response.writeHead(200).end('forwarded')
    })
  })
  upstream.listen(0, '127.0.0.1')
  await once(upstream, 'listening')
  t.after(() => upstream.close())
  const address = upstream.address()
  assert.ok(address && typeof address !== 'string')

  const proxy = spawn(process.execPath, [join(import.meta.dirname, 'skill-evals/model-auth-proxy.mjs')], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  t.after(() => proxy.kill('SIGTERM'))
  proxy.send({
    upstream: `http://127.0.0.1:${address.port}/api/v1?api-version=base`,
    token: 'host-only-secret',
    authToken,
  })
  assert.ok(proxy.stdout)
  const [chunk] = await once(proxy.stdout, 'data')
  const { url } = JSON.parse(String(chunk)) as { url: string }
  const response = await fetch(url + '/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}`, 'content-type': 'Application/JSON; charset=utf-8' },
    body: 'request body',
  })
  assert.equal(await response.text(), 'forwarded')
  assert.equal(upstreamAuthorization, 'Bearer host-only-secret')
  assert.equal(upstreamBody, 'request body')
  assert.equal(upstreamPath, '/api/v1/responses?api-version=base')
  const prefixed = await fetch(url + '/v1/responses?request=1', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(await prefixed.text(), 'forwarded')
  assert.equal(upstreamPath, '/api/v1/responses?api-version=base&request=1')
  const provider = safety.proxyProviderLines(
    [
      'name = "provider"',
      'base_url = "https://provider.example"',
      'wire_api = "responses"',
      'experimental_bearer_token = "host-only-secret"',
      'env_key = "HOST_ONLY_SECRET"',
    ],
    url,
    authToken,
  )
  assert.equal(
    provider.some((line) => line.includes('host-only-secret') || line.includes('HOST_ONLY_SECRET')),
    false,
  )
  assert.ok(provider.includes(`experimental_bearer_token = ${JSON.stringify(authToken)}`))
  assert.ok(provider.includes(`base_url = ${JSON.stringify(url)}`))

  const forbiddenPath = await fetch(url + '/not-a-model-endpoint', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(forbiddenPath.status, 403)
  const forbiddenAuth = await fetch(url + '/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer local-model-proxy', 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(forbiddenAuth.status, 403)
  const forbiddenMethod = await fetch(url + '/responses', {
    method: 'GET',
    headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/json' },
  })
  assert.equal(forbiddenMethod.status, 403)
  const forbiddenMediaType = await fetch(url + '/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/jsonp' },
    body: '{}',
  })
  assert.equal(forbiddenMediaType.status, 403)
  const stalled = fetch(url + '/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${authToken}`, 'content-type': 'application/json', 'x-stall': '1' },
    body: '{}',
  }).catch(() => undefined)
  await stallStarted
  const exited = once(proxy, 'exit')
  proxy.kill('SIGTERM')
  await Promise.race([
    exited,
    new Promise((_, reject) => setTimeout(() => reject(new Error('proxy did not exit')), 2_000)),
  ])
  await stalled
})

test('provider TOML parsing accepts standard spacing and quoting before proxy rewriting', () => {
  const section = [
    '  base_url = "https://provider.example/v1" # upstream',
    "  experimental_bearer_token = 'REAL_SECRET'",
  ]
  assert.equal(safety.tomlStringValue(safety.tomlField(section, 'base_url') ?? ''), 'https://provider.example/v1')
  assert.equal(safety.tomlStringValue(safety.tomlField(section, 'experimental_bearer_token') ?? ''), 'REAL_SECRET')
  assert.equal(safety.singleTomlStringField(section, 'base_url', 'base URL'), 'https://provider.example/v1')
  assert.throws(
    () =>
      safety.singleTomlStringField(
        ['base_url = """https://user:secret@provider.example/v1"""'],
        'base_url',
        'base URL',
      ),
    /unparseable/,
  )
  assert.throws(
    () =>
      safety.singleTomlStringField(
        ['base_url = "https://one.example"', 'base_url = "https://two.example"'],
        'base_url',
        'base URL',
      ),
    /more than once/,
  )
})

test('model catalog and base URL validation reject credentials and path escapes', () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-catalog-safety-'))
  try {
    const safeCatalog = '{"models":[{"slug":"safe","display_name":"Safe"}]}'
    writeFileSync(join(root, 'catalog.json'), safeCatalog)
    assert.equal(safety.readSafeModelCatalog(root, 'catalog.json'), `${safeCatalog}\n`)
    for (const payload of [
      '{"OPENAI_API_KEY":"secret"}',
      '{"models":[{"slug":"safe","access_token":"secret"}]}',
      '{"models":[{"slug":"safe","x-api-key":"secret"}]}',
      '{"models":[{"slug":"safe","client_secret":"secret"}]}',
    ]) {
      writeFileSync(join(root, 'secret.json'), payload)
      assert.throws(() => safety.readSafeModelCatalog(root, 'secret.json'), /unknown field|non-empty slug/)
    }
    writeFileSync(join(root, 'auth.json'), safeCatalog)
    assert.throws(() => safety.readSafeModelCatalog(root, 'auth.json'), /reserved/)
    assert.throws(() => safety.readSafeModelCatalog(root, '../catalog.json'), /escapes/)
    assert.equal(
      safety.assertCredentialFreeBaseUrl('https://provider.example/api/v1?api-version=1', 'base URL').pathname,
      '/api/v1',
    )
    assert.throws(
      () => safety.assertCredentialFreeBaseUrl('https://user:secret@provider.example/v1', 'base URL'),
      /userinfo/,
    )
    assert.throws(
      () => safety.assertCredentialFreeBaseUrl('https://provider.example/v1?token=secret', 'base URL'),
      /query/,
    )
    for (const key of [
      'access_token',
      'api_token',
      'client_secret',
      'subscription-key',
      'apiKey',
      'accesstoken',
      'clientsecret',
      'apitoken',
      'subscriptionkey',
      'authkey',
      'authkeyid',
      'authorizationkey',
      'bearerkey',
      'credentialkey',
      'passwordkey',
      'sessionkey',
      'tokenkey',
      '%61uthkey',
    ]) {
      assert.throws(
        () => safety.assertCredentialFreeBaseUrl(`https://provider.example/v1?${key}=secret`, 'base URL'),
        /query/,
      )
    }
    for (const key of ['api-version', 'monkey']) {
      assert.doesNotThrow(() =>
        safety.assertCredentialFreeBaseUrl(`https://provider.example/v1?${key}=value`, 'base URL'),
      )
    }
    const unsafeCatalogValues = [
      'See https://user:secret@provider.example/v1',
      '[provider](https://user:secret@provider.example/v1)',
      'ftp://user:secret@provider.example/v1',
      'https://user:secret@[invalid',
      'https://provider.example/v1?authkey=secret',
    ]
    for (const [index, value] of unsafeCatalogValues.entries()) {
      writeFileSync(
        join(root, 'unsafe-catalog.json'),
        JSON.stringify({
          models: [
            {
              slug: 'safe',
              description: `catalog-${index}`,
              model_messages: { instructions_template: value },
            },
          ],
        }),
      )
      assert.throws(() => safety.readSafeModelCatalog(root, 'unsafe-catalog.json'), /URL|userinfo|query|http|valid/)
    }
    const safeCatalogWithUrl = {
      models: [{ slug: 'safe', description: 'See https://docs.example/v1?api-version=1 for details' }],
    }
    writeFileSync(join(root, 'safe-url-catalog.json'), JSON.stringify(safeCatalogWithUrl))
    assert.equal(safety.readSafeModelCatalog(root, 'safe-url-catalog.json'), `${JSON.stringify(safeCatalogWithUrl)}\n`)
    const safeCatalogWithReferenceSchemes = {
      models: [
        {
          slug: 'safe',
          description:
            'Do not use URI markers such as file://, vscode:// or https://. Open skill://, plugin://{{plugin_id}} or app://{{connector_id}}.',
        },
      ],
    }
    writeFileSync(join(root, 'safe-reference-catalog.json'), JSON.stringify(safeCatalogWithReferenceSchemes))
    assert.equal(
      safety.readSafeModelCatalog(root, 'safe-reference-catalog.json'),
      `${JSON.stringify(safeCatalogWithReferenceSchemes)}\n`,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('input modes are bound in the manifest format', async () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-mode-safety-'))
  try {
    const file = join(root, 'script.sh')
    writeFileSync(file, '#!/bin/sh\n')
    chmodSync(file, 0o755)
    assert.equal(safety.modeBits(file), '0755')
    chmodSync(file, 0o744)
    assert.equal(safety.modeBits(file), '0755')
    chmodSync(file, 0o664)
    assert.equal(safety.modeBits(file), '0644')
    assert.equal(readFileSync(file, 'utf8'), '#!/bin/sh\n')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('model process output remains inside its per-stream byte budget', () => {
  assert.equal(safety.addOutputBytes(0, 'é', 2, 'stdout'), 2)
  assert.throws(() => safety.addOutputBytes(2, 'x', 2, 'stdout'), /stdout exceeds 2 bytes/)
})

test('final responses are read through a logical byte limit', () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-final-limit-'))
  try {
    const final = join(root, 'final.md')
    writeFileSync(final, '')
    truncateSync(final, safety.MODEL_EVIDENCE_LIMITS.finalResponseBytes + 1)
    assert.throws(
      () =>
        safety.readFileNoFollowLimited(final, 'Codex final response', safety.MODEL_EVIDENCE_LIMITS.finalResponseBytes),
      new RegExp(`exceeds ${safety.MODEL_EVIDENCE_LIMITS.finalResponseBytes} bytes`),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('artifact collection bounds files, individual bytes and total bytes before copying', () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-artifact-limit-'))
  try {
    const project = join(root, 'project')
    mkdirSync(project)
    writeFileSync(join(project, 'one.txt'), '1234')
    writeFileSync(join(project, 'two.txt'), '5678')
    assert.throws(
      () =>
        safety.collectArtifactSources(project, ['one.txt', 'two.txt'], [], {
          artifactBytes: 100,
          artifactFiles: 1,
          artifactFileBytes: 100,
        }),
      /more than 1 artifacts/,
    )
    assert.throws(
      () =>
        safety.collectArtifactSources(project, ['one.txt'], [], {
          artifactBytes: 100,
          artifactFiles: 10,
          artifactFileBytes: 3,
        }),
      /above 3 bytes/,
    )
    assert.throws(
      () =>
        safety.collectArtifactSources(project, ['one.txt', 'two.txt'], [], {
          artifactBytes: 7,
          artifactFiles: 10,
          artifactFileBytes: 100,
        }),
      /more than 7 artifact bytes/,
    )
    const oversized = join(project, 'oversized.bin')
    writeFileSync(oversized, '')
    truncateSync(oversized, safety.MODEL_EVIDENCE_LIMITS.artifactFileBytes + 1)
    assert.throws(
      () => safety.collectArtifactSources(project, ['oversized.bin'], [], safety.MODEL_EVIDENCE_LIMITS),
      new RegExp(`above ${safety.MODEL_EVIDENCE_LIMITS.artifactFileBytes} bytes`),
    )
    const aggregatePaths: string[] = []
    for (let index = 0; index < 5; index += 1) {
      const path = `aggregate-${index}.bin`
      aggregatePaths.push(path)
      writeFileSync(join(project, path), '')
      truncateSync(join(project, path), safety.MODEL_EVIDENCE_LIMITS.artifactFileBytes)
    }
    assert.throws(
      () => safety.collectArtifactSources(project, aggregatePaths, [], safety.MODEL_EVIDENCE_LIMITS),
      new RegExp(`more than ${safety.MODEL_EVIDENCE_LIMITS.artifactBytes} artifact bytes`),
    )
    const countedPaths: string[] = []
    for (let index = 0; index <= safety.MODEL_EVIDENCE_LIMITS.artifactFiles; index += 1) {
      const path = `counted-${index}.txt`
      countedPaths.push(path)
      writeFileSync(join(project, path), '')
    }
    assert.throws(
      () => safety.collectArtifactSources(project, countedPaths, [], safety.MODEL_EVIDENCE_LIMITS),
      new RegExp(`more than ${safety.MODEL_EVIDENCE_LIMITS.artifactFiles} artifacts`),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('bounded tree copies enforce entry and byte limits and never follow links', () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-tree-limit-'))
  try {
    const source = join(root, 'source')
    const destination = join(root, 'destination')
    mkdirSync(join(source, 'nested'), { recursive: true })
    writeFileSync(join(source, 'nested', 'value.txt'), 'bounded\n')
    assert.deepEqual(
      safety.copyTreeBounded({
        sourceRoot: source,
        destinationRoot: destination,
        maxEntries: 10,
        maxBytes: 100,
        maxFileBytes: 100,
      }),
      { bytes: 8, entries: 2, files: 1 },
    )
    assert.equal(readFileSync(join(destination, 'nested', 'value.txt'), 'utf8'), 'bounded\n')
    assert.throws(
      () =>
        safety.copyTreeBounded({
          sourceRoot: source,
          destinationRoot: join(root, 'too-large'),
          maxEntries: 10,
          maxBytes: 7,
          maxFileBytes: 100,
        }),
      /exceeds 7 bytes/,
    )
    symlinkSync(join(source, 'nested', 'value.txt'), join(source, 'linked.txt'))
    assert.throws(
      () =>
        safety.copyTreeBounded({
          sourceRoot: source,
          destinationRoot: join(root, 'linked-output'),
          maxEntries: 10,
          maxBytes: 100,
          maxFileBytes: 100,
        }),
      /symbolic link/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('hash streaming keeps memory independent of a sparse file size', () => {
  const root = mkdtempSync(join(tmpdir(), 'runner-hash-memory-'))
  try {
    const file = join(root, 'large.bin')
    writeFileSync(file, '')
    truncateSync(file, 32 * 1024 * 1024)
    const script = [
      "import { hashFileNoFollow } from './tests/skill-evals/runner-safety.mjs'",
      `console.log(hashFileNoFollow(${JSON.stringify(file)}))`,
      "console.log('max-rss-kib=' + process.resourceUsage().maxRSS)",
    ].join(';')
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: dirname(import.meta.dirname),
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /^[0-9a-f]{64}\n/)
    const maxRssKiB = Number(/^max-rss-kib=(\d+)$/m.exec(result.stdout)?.[1])
    assert.ok(maxRssKiB > 0)
    assert.ok(maxRssKiB < 96 * 1024, `hash streaming used ${maxRssKiB} KiB`)
    assert.throws(() => safety.hashFileNoFollow(file, 1024 * 1024), /file hash exceeds 1048576 bytes/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('sandbox mounts put every writable model directory behind a tmpfs size', () => {
  const args = safety.sandboxTmpfsArgs({
    ...safety.MODEL_EVIDENCE_LIMITS,
    workspaceBytes: 11,
    codexHomeBytes: 12,
    responseBytes: 13,
    homeBytes: 14,
    temporaryBytes: 15,
  })
  const mounts = new Map<string, number>()
  for (let index = 0; index < args.length; index += 4) {
    assert.equal(args[index], '--size')
    assert.equal(args[index + 2], '--tmpfs')
    mounts.set(args[index + 3] ?? '', Number(args[index + 1]))
  }
  assert.deepEqual(Object.fromEntries(mounts), {
    '/workspace': 11,
    '/codex-home': 12,
    '/response': 13,
    '/home': 14,
    '/tmp': 15,
  })
  assert.equal(
    safety.sandboxTmpfsArgs(safety.MODEL_EVIDENCE_LIMITS, { includeWorkspace: false }).includes('/workspace'),
    false,
  )
})

test('bwrap enforces the generated workspace tmpfs quota', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const limits = {
    ...safety.MODEL_EVIDENCE_LIMITS,
    workspaceBytes: 1024 * 1024,
    codexHomeBytes: 1024 * 1024,
    responseBytes: 1024 * 1024,
    homeBytes: 1024 * 1024,
    temporaryBytes: 1024 * 1024,
  }
  const result = spawnSync(
    'bwrap',
    [
      '--die-with-parent',
      '--new-session',
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--ro-bind',
      '/usr',
      '/usr',
      '--ro-bind',
      '/bin',
      '/bin',
      '--ro-bind',
      '/lib',
      '/lib',
      '--ro-bind',
      '/lib64',
      '/lib64',
      ...safety.sandboxTmpfsArgs(limits),
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '--chdir',
      '/workspace',
      '/bin/dd',
      'if=/dev/zero',
      'of=/workspace/too-large.bin',
      'bs=1048576',
      'count=2',
    ],
    { encoding: 'utf8' },
  )
  assert.notEqual(result.status, 0, 'workspace tmpfs accepted more than its quota')
  assert.match(result.stderr, /No space left on device/)
})

test('the real model runner seeds tmpfs mounts and collects outputs after model exit', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-model-smoke-'))
  const evidenceDate = '2099-12-31-runner-safety-smoke'
  const evidenceRoot = join(repository, 'tests', 'skill-evals', 'evidence')
  const cleanupRoot = join(evidenceRoot, evidenceDate)
  const output = join(cleanupRoot, 'dsh-spec-error-handling', 'sandbox-report')
  try {
    const codexHome = join(root, 'codex-home')
    const bin = join(root, 'bin')
    mkdirSync(codexHome, { recursive: true })
    mkdirSync(bin, { recursive: true })
    writeFileSync(
      join(codexHome, 'config.toml'),
      [
        'model = "gpt-5"',
        'model_provider = "test"',
        '',
        '[model_providers.test]',
        'name = "test"',
        'base_url = "https://provider.example/v1"',
        'wire_api = "responses"',
        '',
      ].join('\n'),
    )
    const fakeCodex = join(bin, 'fake-codex')
    writeFileSync(
      fakeCodex,
      [
        '#!/usr/bin/env node',
        "const fs = require('node:fs')",
        `if (fs.existsSync(${JSON.stringify(output)})) process.exit(42)`,
        "if (!fs.existsSync('/workspace/.agents/skills/dsh-spec-error-handling/SKILL.md')) process.exit(43)",
        "if (!fs.existsSync('/codex-home/config.toml')) process.exit(44)",
        "fs.mkdirSync('/workspace/evidence', { recursive: true })",
        "fs.writeFileSync('/workspace/evidence/result.txt', 'retained output\\n')",
        "fs.writeFileSync('/response/final.md', 'sandbox smoke\\n')",
        `process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'sandbox smoke\\n' } }) + '\\n')`,
        `process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')`,
        '',
      ].join('\n'),
    )
    chmodSync(fakeCodex, 0o755)
    const result = spawnSync(
      process.execPath,
      [
        join(repository, 'tests/skill-evals/run-model-eval.mjs'),
        '--skill',
        'dsh-spec-error-handling',
        '--scenario',
        'outcome-classification-and-extensible-codes',
        '--output',
        output,
        '--sandbox',
        'workspace-write',
      ],
      {
        cwd: repository,
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEX_BIN: fakeCodex,
          CODEX_HOME: codexHome,
        },
        maxBuffer: 8 * 1024 * 1024,
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(join(output, 'final.md'), 'utf8'), 'sandbox smoke\n')
    assert.equal(readFileSync(join(output, 'artifact/evidence/result.txt'), 'utf8'), 'retained output\n')
    assert.match(readFileSync(join(output, 'status.txt'), 'utf8'), /^status: pending$/m)
    assert.match(readFileSync(join(output, 'changed-paths.json'), 'utf8'), /evidence\/result\.txt/)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real model runner retains typed trigger evidence only for the expected selection', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-trigger-smoke-'))
  const evidenceDate = '2099-12-31-runner-trigger-smoke'
  const evidenceRoot = join(repository, 'tests', 'skill-evals', 'evidence')
  const cleanupRoot = join(evidenceRoot, evidenceDate)
  const wrongEvidenceDate = '2099-12-31-runner-trigger-wrong-marker'
  const wrongCleanupRoot = join(evidenceRoot, wrongEvidenceDate)
  const output = join(cleanupRoot, 'dsh-spec-ci-test-reliability', 'trigger', 'parallel-port-collision')
  try {
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      "if (!fs.existsSync('/workspace/AGENTS.md')) process.exit(42)",
      "if (!fs.readFileSync('/workspace/AGENTS.md', 'utf8').includes('SELECT: dsh-spec-ci-test-reliability')) process.exit(43)",
      "if (!fs.existsSync('/workspace/.agents/skills/dsh-spec-ci-test-reliability/SKILL.md')) process.exit(44)",
      "fs.writeFileSync('/response/final.md', 'The CI test lane matches the installed skill.\\n\\nSELECT: dsh-spec-ci-test-reliability')",
      `process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'The CI test lane matches the installed skill.\\n\\nSELECT: dsh-spec-ci-test-reliability' } }) + '\\n')`,
      "process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')",
    ])
    const args = [
      '--skill',
      'dsh-spec-ci-test-reliability',
      '--trigger-id',
      'parallel-port-collision',
      '--output',
      output,
      '--sandbox',
      'read-only',
      '--deadline-ms',
      '30000',
    ]
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, args)
    assert.equal(result.status, 0, String(result.stderr))
    const metadata = JSON.parse(readFileSync(join(output, 'evidence.json'), 'utf8')) as {
      claim: { type: string; subject: string }
      arm: null
      execution: { sandbox: string }
      evidence: { currentness: Record<string, string> }
    }
    assert.deepEqual(metadata.claim, {
      type: 'trigger',
      subject: 'dsh-spec-ci-test-reliability:trigger',
    })
    assert.equal(metadata.arm, null)
    assert.equal(metadata.execution.sandbox, 'read-only')
    assert.match(metadata.evidence.currentness.trigger_surface_sha256, /^[0-9a-f]{64}$/)
    assert.match(metadata.evidence.currentness.trigger_corpus_sha256, /^[0-9a-f]{64}$/)
    assert.deepEqual(JSON.parse(readFileSync(join(output, 'selection.json'), 'utf8')), {
      id: 'parallel-port-collision',
      should_trigger: true,
      selected: true,
      result: 'pass',
    })
    assert.equal(readFileSync(join(output, 'changed-paths.txt'), 'utf8'), '')

    const wrongOutput = join(wrongCleanupRoot, 'dsh-spec-ci-test-reliability', 'trigger', 'parallel-port-collision')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      "fs.writeFileSync('/response/final.md', 'No installed skill applies.\\n\\nSELECT: none')",
      "process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'No installed skill applies.\\n\\nSELECT: none' } }) + '\\n')",
      "process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')",
    ])
    const wrong = runFakeModelRunner(repository, codexHome, fakeCodex, [
      ...args.slice(0, 5),
      wrongOutput,
      ...args.slice(6),
    ])
    assert.notEqual(wrong.status, 0)
    assert.match(String(wrong.stderr), /trigger response selected the wrong skill/)
    assert.equal(existsSync(wrongOutput), false)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(wrongCleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real trigger runner preserves declared fixture modes', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const sourceRepository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-trigger-mode-'))
  try {
    const repository = createTriggerRunnerRepository(root, sourceRepository)
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      "const probe = '/workspace/executable-probe/probe.sh'",
      'if (!fs.existsSync(probe)) process.exit(42)',
      'if ((fs.statSync(probe).mode & 0o111) === 0) process.exit(43)',
      "fs.writeFileSync('/response/final.md', 'The executable fixture is a relevant input.\\n\\nSELECT: dsh-spec-ci-test-reliability')",
      "process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'The executable fixture is a relevant input.\\n\\nSELECT: dsh-spec-ci-test-reliability' } }) + '\\n')",
      "process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')",
    ])
    const output = join(
      repository,
      'tests/skill-evals/evidence/2099-12-31-trigger-mode/dsh-spec-ci-test-reliability/trigger/parallel-port-collision',
    )
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      'dsh-spec-ci-test-reliability',
      '--trigger-id',
      'parallel-port-collision',
      '--output',
      output,
      '--sandbox',
      'read-only',
      '--deadline-ms',
      '30000',
    ])
    assert.equal(result.status, 0, String(result.stderr))
    assert.match(readFileSync(join(output, 'evidence.json'), 'utf8'), /"trigger_corpus_sha256": "[0-9a-f]{64}"/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('trigger staging rejects traversal, metadata directories, symlinks and overwrite targets', () => {
  const sourceRepository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-trigger-paths-'))
  try {
    const repository = createTriggerRunnerRepository(root, sourceRepository)
    const neverRun = createNeverRunCodex(root)
    const corpusRoot = join(repository, 'tests/skill-evals/dsh-spec-ci-test-reliability')
    const corpusPath = join(corpusRoot, 'trigger-evals.json')
    const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as {
      queries: Array<{ id: string; files?: string[] }>
    }
    const selected = corpus.queries.find((query) => query.id === 'parallel-port-collision')
    assert.ok(selected)
    const symlink = join(corpusRoot, 'trigger-fixtures/symlinked.txt')
    symlinkSync(join(root, 'outside.txt'), symlink)
    writeFileSync(join(root, 'outside.txt'), 'outside\n')
    const cases = [
      ['/absolute.txt', /escapes trigger-fixtures/],
      ['trigger-fixtures/../outside.txt', /forbidden path/],
      ['trigger-fixtures/.git/config', /forbidden path/],
      ['trigger-fixtures/.agents/skills/dsh-spec-ci-test-reliability/SKILL.md', /forbidden path/],
      ['trigger-fixtures/AGENTS.md', /may not overwrite the root agent/],
      ['trigger-fixtures/symlinked.txt', /symbolic link/],
    ] as const
    for (const [index, [file, expected]] of cases.entries()) {
      selected.files = [file]
      writeFileSync(corpusPath, `${JSON.stringify(corpus, null, 2)}\n`)
      const output = join(
        repository,
        'tests/skill-evals/evidence',
        `2099-12-31-trigger-invalid-${index}`,
        'dsh-spec-ci-test-reliability',
        'trigger',
        'parallel-port-collision',
      )
      const result = neverRun.run(repository, [
        '--skill',
        'dsh-spec-ci-test-reliability',
        '--trigger-id',
        'parallel-port-collision',
        '--output',
        output,
        '--sandbox',
        'read-only',
      ])
      assert.notEqual(result.status, 0, file)
      assert.match(String(result.stderr), expected, file)
      assert.equal(existsSync(output), false, file)
      assert.equal(existsSync(neverRun.marker), false, file + ' started the Codex executable')
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real model runner skips final and artifact processing after model failure', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-model-failure-'))
  const evidenceDate = '2099-12-31-runner-safety-failure'
  const evidenceRoot = join(repository, 'tests', 'skill-evals', 'evidence')
  const cleanupRoot = join(evidenceRoot, evidenceDate)
  const output = join(cleanupRoot, 'dsh-spec-error-handling', 'failed-sandbox-report')
  try {
    const codexHome = join(root, 'codex-home')
    const bin = join(root, 'bin')
    mkdirSync(codexHome, { recursive: true })
    mkdirSync(bin, { recursive: true })
    writeFileSync(
      join(codexHome, 'config.toml'),
      [
        'model = "gpt-5"',
        'model_provider = "test"',
        '',
        '[model_providers.test]',
        'name = "test"',
        'base_url = "https://provider.example/v1"',
        'wire_api = "responses"',
        '',
      ].join('\n'),
    )
    const fakeCodex = join(bin, 'fake-codex')
    writeFileSync(
      fakeCodex,
      [
        '#!/usr/bin/env node',
        "const fs = require('node:fs')",
        "fs.writeFileSync('/response/final.md', '')",
        "fs.truncateSync('/response/final.md', 3 * 1024 * 1024)",
        "fs.mkdirSync('/workspace/evidence', { recursive: true })",
        "fs.writeFileSync('/workspace/evidence/oversized.bin', '')",
        "fs.truncateSync('/workspace/evidence/oversized.bin', 20 * 1024 * 1024)",
        'process.exit(1)',
        '',
      ].join('\n'),
    )
    chmodSync(fakeCodex, 0o755)
    const result = spawnSync(
      process.execPath,
      [
        join(repository, 'tests/skill-evals/run-model-eval.mjs'),
        '--skill',
        'dsh-spec-error-handling',
        '--scenario',
        'outcome-classification-and-extensible-codes',
        '--output',
        output,
        '--sandbox',
        'workspace-write',
      ],
      {
        cwd: repository,
        encoding: 'utf8',
        env: {
          ...process.env,
          CODEX_BIN: fakeCodex,
          CODEX_HOME: codexHome,
        },
        maxBuffer: 8 * 1024 * 1024,
      },
    )
    assert.equal(result.status, 1)
    assert.equal(existsSync(output), false)
    assert.doesNotMatch(result.stderr, /Codex final response|artifact above/)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real model runner refuses a zero-exit trace without a terminal turn event', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-terminal-event-'))
  const evidenceDate = '2099-12-31-runner-terminal-event'
  const cleanupRoot = join(repository, 'tests', 'skill-evals', 'evidence', evidenceDate)
  const output = join(cleanupRoot, 'dsh-spec-error-handling', 'missing-terminal-event')
  try {
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      "fs.writeFileSync('/response/final.md', 'incomplete trace\\n')",
      `process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'incomplete trace\\n' } }) + '\\n')`,
    ])
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      'dsh-spec-error-handling',
      '--scenario',
      'outcome-classification-and-extensible-codes',
      '--output',
      output,
      '--sandbox',
      'workspace-write',
    ])
    assert.notEqual(result.status, 0)
    assert.match(String(result.stderr), /terminal turn event/)
    assert.equal(existsSync(output), false)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

// This proves whole-run expiry and pre-promotion rejection; it can expire before Codex starts.
// The lower-level runInterruptible case proves termination of a child that has started.
test('the real model runner enforces its whole-run deadline before promotion', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-deadline-'))
  const evidenceDate = '2099-12-31-runner-deadline'
  const cleanupRoot = join(repository, 'tests', 'skill-evals', 'evidence', evidenceDate)
  const output = join(cleanupRoot, 'dsh-spec-error-handling', 'deadline')
  try {
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, ['setInterval(() => {}, 1000)'])
    const started = performance.now()
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      'dsh-spec-error-handling',
      '--scenario',
      'outcome-classification-and-extensible-codes',
      '--output',
      output,
      '--sandbox',
      'workspace-write',
      '--deadline-ms',
      '750',
    ])
    assert.notEqual(result.status, 0)
    assert.match(String(result.stderr), /run exceeded its(?: 750 ms)? deadline/)
    assert.equal(existsSync(output), false)
    assert.ok(performance.now() - started < 10_000, 'deadline did not terminate the sandbox')
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real model runner binds comparison linkage and rejects stale counterparts', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-target-absent-'))
  const evidenceDate = '2099-12-31-runner-target-absent'
  const cleanupRoot = join(repository, 'tests', 'skill-evals', 'evidence', evidenceDate)
  const skill = 'dsh-spec-speed-up-perf'
  const candidateOutput = join(cleanupRoot, skill, 'candidate')
  const baselineOutput = join(cleanupRoot, skill, 'baseline')
  try {
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      `const target = '/workspace/.agents/skills/${skill}'`,
      'const candidate = fs.existsSync(target)',
      "if (!fs.existsSync('/workspace/.agents/skills')) process.exit(43)",
      "if (candidate !== process.argv.join(' ').includes('Use the installed skill')) process.exit(45)",
      "const message = candidate ? 'candidate arm observed\\n' : 'target-absent arm observed\\n'",
      "fs.writeFileSync('/response/final.md', message)",
      `process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: message } }) + '\\n')`,
      `process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')`,
    ])
    const candidateResult = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      candidateOutput,
      '--sandbox',
      'workspace-write',
      '--deadline-ms',
      '10000',
    ])
    assert.equal(candidateResult.status, 0, String(candidateResult.stderr))
    const candidateEvidencePath = join(candidateOutput, 'evidence.json')
    const candidateEvidenceText = readFileSync(candidateEvidencePath, 'utf8')
    const tamperedCandidate = JSON.parse(candidateEvidenceText) as { deadline_ms: number }
    writeFileSync(
      candidateEvidencePath,
      `${JSON.stringify({ ...tamperedCandidate, deadline_ms: tamperedCandidate.deadline_ms + 1 }, null, 2)}\n`,
    )
    const incompatible = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      baselineOutput,
      '--counterpart',
      candidateOutput,
      '--sandbox',
      'workspace-write',
      '--arm',
      'target-absent',
      '--deadline-ms',
      '10000',
    ])
    assert.notEqual(incompatible.status, 0)
    assert.match(String(incompatible.stderr), /different deadline_ms/)
    assert.equal(existsSync(baselineOutput), false)

    const candidateEvidenceObject = JSON.parse(candidateEvidenceText) as {
      evidence: { currentness: Record<string, string | null> }
      provenance: { dependency_skill_tree_sha256: string; target_skill_tree_sha256: string | null }
    }
    const forgedCurrentnessOutput = join(cleanupRoot, skill, 'forged-currentness')
    writeFileSync(
      candidateEvidencePath,
      `${JSON.stringify(
        {
          ...candidateEvidenceObject,
          evidence: {
            ...candidateEvidenceObject.evidence,
            currentness: {
              ...candidateEvidenceObject.evidence.currentness,
              scenario_prompt_sha256: '0'.repeat(64),
            },
          },
        },
        null,
        2,
      )}\n`,
    )
    const forgedCurrentness = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      forgedCurrentnessOutput,
      '--counterpart',
      candidateOutput,
      '--sandbox',
      'workspace-write',
      '--arm',
      'target-absent',
      '--deadline-ms',
      '10000',
    ])
    assert.notEqual(forgedCurrentness.status, 0)
    assert.match(String(forgedCurrentness.stderr), /currentness/)
    assert.equal(existsSync(forgedCurrentnessOutput), false)

    const forgedProvenanceOutput = join(cleanupRoot, skill, 'forged-provenance')
    writeFileSync(
      candidateEvidencePath,
      `${JSON.stringify(
        {
          ...candidateEvidenceObject,
          provenance: {
            ...candidateEvidenceObject.provenance,
            dependency_skill_tree_sha256: '0'.repeat(64),
          },
        },
        null,
        2,
      )}\n`,
    )
    const forgedProvenance = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      forgedProvenanceOutput,
      '--counterpart',
      candidateOutput,
      '--sandbox',
      'workspace-write',
      '--arm',
      'target-absent',
      '--deadline-ms',
      '10000',
    ])
    assert.notEqual(forgedProvenance.status, 0)
    assert.match(String(forgedProvenance.stderr), /provenance/)
    assert.equal(existsSync(forgedProvenanceOutput), false)
    writeFileSync(candidateEvidencePath, candidateEvidenceText)
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      baselineOutput,
      '--counterpart',
      candidateOutput,
      '--sandbox',
      'workspace-write',
      '--arm',
      'target-absent',
      '--deadline-ms',
      '10000',
    ])
    assert.equal(result.status, 0, String(result.stderr))
    assert.equal(readFileSync(join(baselineOutput, 'skill-hashes.txt'), 'utf8').trim(), '')
    const baselineEvidencePath = join(baselineOutput, 'evidence.json')
    const baselineEvidenceText = readFileSync(baselineEvidencePath, 'utf8')
    const evidence = JSON.parse(baselineEvidenceText) as {
      claim: { type: string }
      arm: string
      comparison: { counterpart_evidence_sha256: string | null; pair_status: string }
      evidence: {
        currentness: {
          scenario_prompt_sha256: string
          rendered_prompt_sha256: string
          arm_instruction_sha256: string
          prompt_guard_sha256: string
        }
      }
      provenance: { target_skill_tree_sha256: string | null; dependency_skill_tree_sha256: string }
      execution: { model_config_sha256: string; model_runtime_sha256: string }
      privacy: { canary_sets: string[]; scope_sha256: string }
    }
    assert.equal(evidence.claim.type, 'comparison')
    assert.equal(evidence.arm, 'target-absent')
    assert.equal(evidence.provenance.target_skill_tree_sha256, null)
    for (const hash of [
      evidence.provenance.dependency_skill_tree_sha256,
      evidence.evidence.currentness.scenario_prompt_sha256,
      evidence.evidence.currentness.rendered_prompt_sha256,
      evidence.execution.model_config_sha256,
      evidence.execution.model_runtime_sha256,
    ]) {
      assert.match(hash, /^[0-9a-f]{64}$/)
    }
    assert.match(evidence.evidence.currentness.arm_instruction_sha256, /^[0-9a-f]{64}$/)
    assert.match(evidence.evidence.currentness.prompt_guard_sha256, /^[0-9a-f]{64}$/)
    assert.equal(evidence.comparison.counterpart_evidence_sha256, policy.hashEvidenceMetadata(candidateOutput))
    assert.equal(evidence.comparison.pair_status, 'paired')
    assert.match(evidence.privacy.scope_sha256, /^[0-9a-f]{64}$/)
    assert.ok(evidence.privacy.canary_sets.includes('local-environment'))
    assert.ok(evidence.privacy.canary_sets.includes('current-home'))
    assert.equal(existsSync(join(baselineOutput, 'artifact', '.agents', 'skills', skill)), false)

    const arbitraryBaselineOutput = join(cleanupRoot, skill, 'candidate-after-arbitrary-baseline')
    writeFileSync(
      baselineEvidencePath,
      `${JSON.stringify(
        {
          ...evidence,
          comparison: {
            ...evidence.comparison,
            counterpart_evidence_sha256: '0'.repeat(64),
          },
        },
        null,
        2,
      )}\n`,
    )
    const arbitraryBaseline = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      arbitraryBaselineOutput,
      '--counterpart',
      baselineOutput,
      '--sandbox',
      'workspace-write',
      '--deadline-ms',
      '10000',
    ])
    assert.notEqual(arbitraryBaseline.status, 0)
    assert.match(String(arbitraryBaseline.stderr), /baseline counterpart evidence hash differs/)
    assert.equal(existsSync(arbitraryBaselineOutput), false)
    writeFileSync(baselineEvidencePath, baselineEvidenceText)

    const staleBaselineOutput = join(cleanupRoot, skill, 'candidate-after-stale-baseline')
    writeFileSync(fakeCodex, `${readFileSync(fakeCodex, 'utf8')}\n// stale baseline candidate runtime\n`)
    const staleBaseline = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'measurement-decisions',
      '--output',
      staleBaselineOutput,
      '--counterpart',
      baselineOutput,
      '--sandbox',
      'workspace-write',
      '--deadline-ms',
      '10000',
    ])
    assert.notEqual(staleBaseline.status, 0)
    assert.match(String(staleBaseline.stderr), /baseline counterpart evidence hash differs/)
    assert.equal(existsSync(staleBaselineOutput), false)

    const candidateEvidence = JSON.parse(readFileSync(join(candidateOutput, 'evidence.json'), 'utf8')) as Record<
      string,
      unknown
    >
    assert.equal((candidateEvidence.comparison as { pair_status?: string }).pair_status, 'candidate-only')
    const corpus = JSON.parse(
      readFileSync(join(repository, 'tests', 'skill-evals', skill, 'evals', 'evals.json'), 'utf8'),
    ) as { evals: Array<{ id: string; prompt: string; comparison: Record<string, unknown> }> }
    const scenario = corpus.evals.find((entry) => entry.id === 'measurement-decisions')
    assert.ok(scenario)
    const candidateEvidenceHash = policy.hashEvidenceMetadata(candidateOutput)
    const baselineEvidenceHash = policy.hashEvidenceMetadata(baselineOutput)
    assert.doesNotThrow(() =>
      policy.assertComparableEvidenceArms(candidateEvidence, evidence, {
        scenario,
        candidateEvidenceSha256: candidateEvidenceHash,
        baselineEvidenceSha256: baselineEvidenceHash,
      }),
    )
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real model runner rejects a privacy canary in model output before promotion', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-privacy-canary-'))
  const evidenceDate = '2099-12-31-runner-privacy-canary'
  const cleanupRoot = join(repository, 'tests', 'skill-evals', 'evidence', evidenceDate)
  const skill = 'dsh-spec-speed-up-perf'
  const output = join(cleanupRoot, skill, 'private-corpus-remains-aggregate')
  try {
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      "const leaked = 'ALICE-SECRET-9182'",
      "fs.writeFileSync('/response/final.md', 'clean answer\\n')",
      `process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'clean answer\\n', aggregated_output: leaked } }) + '\\n')`,
      `process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')`,
    ])
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'private-corpus-remains-aggregate',
      '--output',
      output,
      '--sandbox',
      'workspace-write',
    ])
    assert.notEqual(result.status, 0)
    assert.match(String(result.stderr), /model stdout.*private-performance-corpus/)
    assert.equal(existsSync(output), false)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('the real model runner rejects the raw host home path before sanitization', (t) => {
  if (!bwrapAvailable()) {
    t.skip('bubblewrap namespaces and --size are unavailable on this host')
    return
  }
  const repository = dirname(import.meta.dirname)
  const root = mkdtempSync(join(tmpdir(), 'runner-home-canary-'))
  const evidenceDate = '2099-12-31-runner-home-canary'
  const cleanupRoot = join(repository, 'tests', 'skill-evals', 'evidence', evidenceDate)
  const skill = 'dsh-spec-speed-up-perf'
  const output = join(cleanupRoot, skill, 'private-corpus-remains-aggregate')
  try {
    const { codexHome, bin } = createFakeCodexHarness(root)
    const fakeCodex = join(bin, 'fake-codex')
    writeFakeCodex(fakeCodex, [
      "const fs = require('node:fs')",
      `const leaked = ${JSON.stringify(homedir())}`,
      "fs.writeFileSync('/response/final.md', 'clean answer\\n')",
      `process.stdout.write(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'clean answer\\n', aggregated_output: leaked } }) + '\\n')`,
      `process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }) + '\\n')`,
    ])
    const result = runFakeModelRunner(repository, codexHome, fakeCodex, [
      '--skill',
      skill,
      '--scenario',
      'private-corpus-remains-aggregate',
      '--output',
      output,
      '--sandbox',
      'workspace-write',
    ])
    assert.notEqual(result.status, 0)
    assert.match(String(result.stderr), /model stdout.*current-home/)
    assert.equal(existsSync(output), false)
  } finally {
    rmSync(cleanupRoot, { recursive: true, force: true })
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

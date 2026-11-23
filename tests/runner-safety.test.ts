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
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import http from 'node:http'
import { test } from 'node:test'

const safety = (await import('./skill-evals/runner-safety.mjs' as string)) as {
  acquireFileLock(path: string): Promise<{ release(): Promise<void> }>
  assertEvidenceRunPath(root: string, output: string, expectedSkill?: string): void
  assertInputFile(root: string, file: string, label: string): string
  assertProjectPath(project: string, path: string, label: string): string
  capabilityMaskPaths(browserEnabled: boolean, mediaEnabled: boolean): string[]
  copyTrustedGit(project: string, destination: string): void
  executableFile(path: string): boolean
  hashFileNoFollow(path: string): string
  mediaExecutablePaths(): string[]
  modeBits(path: string): string
  parseNulSeparatedPaths(output: string): string[]
  proxyProviderLines(lines: string[], proxyUrl: string): string[]
  removeModelTree(path: string): void
  resolveCapability(name: string, requested: boolean | undefined, available: boolean): boolean
  resolveMiseMediaRoot(miseInstalls: string): string | undefined
  tomlField(lines: string[], key: string): string | undefined
  tomlStringValue(line: string): string | undefined
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
    symlinkSync(join(version, 'bin', 'ffmpeg'), join(root, 'ffmpeg-link'))
    assert.equal(safety.executableFile(join(root, 'ffmpeg-link')), true)
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

  const proxy = spawn(
    process.execPath,
    [join(import.meta.dirname, 'skill-evals/model-auth-proxy.mjs'), `http://127.0.0.1:${address.port}/v1`],
    {
      env: { ...process.env, MODEL_AUTH_TOKEN: 'host-only-secret' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    },
  )
  t.after(() => proxy.kill('SIGTERM'))
  assert.ok(proxy.stdout)
  const [chunk] = await once(proxy.stdout, 'data')
  const { url } = JSON.parse(String(chunk)) as { url: string }
  const response = await fetch(url + '/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer local-model-proxy', 'content-type': 'application/json' },
    body: 'request body',
  })
  assert.equal(await response.text(), 'forwarded')
  assert.equal(upstreamAuthorization, 'Bearer host-only-secret')
  assert.equal(upstreamBody, 'request body')
  assert.equal(upstreamPath, '/v1/responses')
  const prefixed = await fetch(url + '/v1/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer local-model-proxy', 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(await prefixed.text(), 'forwarded')
  assert.equal(upstreamPath, '/v1/responses')
  const provider = safety.proxyProviderLines(
    [
      'name = "provider"',
      'base_url = "https://provider.example"',
      'wire_api = "responses"',
      'experimental_bearer_token = "host-only-secret"',
      'env_key = "HOST_ONLY_SECRET"',
    ],
    url,
  )
  assert.equal(
    provider.some((line) => line.includes('host-only-secret') || line.includes('HOST_ONLY_SECRET')),
    false,
  )
  assert.ok(provider.includes('experimental_bearer_token = "local-model-proxy"'))
  assert.ok(provider.includes(`base_url = ${JSON.stringify(url)}`))

  const forbidden = await fetch(url + '/not-a-model-endpoint', {
    method: 'POST',
    headers: { authorization: 'Bearer local-model-proxy', 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(forbidden.status, 403)
  const stalled = fetch(url + '/responses', {
    method: 'POST',
    headers: { authorization: 'Bearer local-model-proxy', 'content-type': 'application/json', 'x-stall': '1' },
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

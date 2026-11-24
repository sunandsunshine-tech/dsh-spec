/** Focused negative controls for the model-eval runner's filesystem and Git boundaries. */
import assert from 'node:assert/strict'
import {
  chmodSync,
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
import { tmpdir } from 'node:os'
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
  assertEvidenceRunPath(root: string, output: string, expectedSkill?: string): void
  assertInputFile(root: string, file: string, label: string): string
  assertProjectPath(project: string, path: string, label: string): string
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
  sandboxTmpfsArgs(limits?: Record<string, number>, options?: { includeWorkspace?: boolean }): string[]
  singleTomlStringField(lines: string[], key: string, label: string): string | undefined
  tomlField(lines: string[], key: string): string | undefined
  tomlStringValue(line: string): string | undefined
  trustedGitArgs(gitDirectory: string, project: string, args: string[]): string[]
}

function git(cwd: string, args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: safety.isolatedGitEnvironment(env),
  })
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

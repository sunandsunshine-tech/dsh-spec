import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir, userInfo } from 'node:os'
import { createServer } from 'node:net'
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import {
  MODEL_EVIDENCE_LIMITS,
  assertContained,
  assertCredentialFreeBaseUrl,
  assertEvidenceRunPath,
  assertInputFile,
  assertNoSymlinkComponents,
  assertProjectPath,
  assertRegularNonEmptyFile,
  assertTriggerEvidenceRunPath,
  acquireFileLock,
  browserExecutablePaths,
  capabilityMaskPaths,
  collectArtifactSources,
  copyFileNoFollowLimited,
  copyTrustedGit,
  copyTreeBounded,
  executableFile,
  hashFileNoFollow,
  mediaExecutablePaths,
  modeBits,
  parseNulSeparatedPaths,
  proxyProviderLines,
  readFileNoFollowLimited,
  readSafeModelCatalog,
  removeModelTree,
  resolveCapability,
  resolveExecutableFile,
  resolveMiseMediaRoot,
  runInterruptible,
  sanitizeHostAccountText,
  sandboxTmpfsArgs,
  singleTomlStringField,
  tomlField,
  tomlStringValue,
  trustedGitArgs,
} from './runner-safety.mjs'
import {
  DEFAULT_MODEL_DEADLINE_MS,
  MAX_MODEL_DEADLINE_MS,
  MODEL_EVIDENCE_ARMS,
  assertComparableEvidenceArms,
  assertNoPrivacyCanariesInText,
  assertRetainedRunPolicy,
  claimForScenario,
  canonicalJson,
  createModelEvidenceMetadata,
  createTriggerEvidenceMetadata,
  hashEvidenceMetadata,
  inspectRetainedRun,
  modelPromptComponents,
  privacyCanariesFor,
  readEvidenceMetadataRecord,
  remainingRunDeadline,
  retainedSurfacesSha256,
  retainedSurfacesSnapshot,
  scenarioDefinitionHash,
  sha256,
  terminalTurnEvent,
  triggerCorpusSha256,
  triggerSurfaceSha256,
  validateScenarioClaim,
  validateModelArm,
} from './evidence-policy.mjs'

const REPO_ROOT = resolve(import.meta.dirname, '../..')
const EVAL_ROOT = join(REPO_ROOT, 'tests', 'skill-evals')
const EVIDENCE_ROOT = join(EVAL_ROOT, 'evidence')

function parseOptions() {
  const { values } = parseArgs({
    options: {
      skill: { type: 'string' },
      scenario: { type: 'string' },
      'trigger-id': { type: 'string' },
      output: { type: 'string' },
      sandbox: { type: 'string', default: 'workspace-write' },
      replace: { type: 'boolean', default: false },
      arm: { type: 'string', default: 'target-present' },
      'deadline-ms': { type: 'string', default: String(DEFAULT_MODEL_DEADLINE_MS) },
      counterpart: { type: 'string' },
    },
    strict: true,
  })
  for (const name of ['skill', 'output']) {
    if (!values[name]) throw new Error(`missing --${name}`)
  }
  if (Boolean(values.scenario) === Boolean(values['trigger-id'])) {
    throw new Error('provide exactly one of --scenario or --trigger-id')
  }
  if (!['read-only', 'workspace-write'].includes(values.sandbox)) {
    throw new Error('--sandbox must be read-only or workspace-write')
  }
  if (!MODEL_EVIDENCE_ARMS.includes(values.arm)) throw new Error('--arm must be target-present or target-absent')
  if (!/^\d+$/.test(values['deadline-ms'])) throw new Error('--deadline-ms must be a positive integer')
  values.deadlineMs = Number(values['deadline-ms'])
  if (!Number.isSafeInteger(values.deadlineMs) || values.deadlineMs <= 0 || values.deadlineMs > MAX_MODEL_DEADLINE_MS) {
    throw new Error(`--deadline-ms must be an integer from 1 to ${MAX_MODEL_DEADLINE_MS}`)
  }
  if (values['trigger-id']) {
    if (values.arm !== 'target-present') throw new Error('--trigger-id does not accept a target-absent arm')
    if (values.counterpart) throw new Error('--trigger-id does not accept --counterpart')
    if (values.sandbox !== 'read-only') throw new Error('--trigger-id requires --sandbox read-only')
  }
  return values
}

function hashFile(path) {
  return hashFileNoFollow(path)
}

function listFiles(root, prefix = '') {
  const files = []
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const child = prefix ? join(prefix, entry.name) : entry.name
    if (entry.isDirectory()) files.push(...listFiles(root, child))
    else if (entry.isFile()) files.push(child.split(sep).join('/'))
    else if (entry.isSymbolicLink()) throw new Error(`unexpected symbolic link: ${child}`)
    else throw new Error(`unsupported filesystem entry: ${child}`)
  }
  return files.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
}

function copyFile(source, destination) {
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(source, destination, { recursive: lstatSync(source).isDirectory() })
}

function scenarioProjectPath(scenario, declared, label) {
  if (scenario.project_root === undefined) return declared
  const prefix = `${scenario.project_root}/`
  if (!declared.startsWith(prefix)) throw new Error(`${label} is outside the scenario project root`)
  return declared.slice(prefix.length)
}

function assertEvidenceOutput(output) {
  assertEvidencePathPreflight(
    output,
    options.skill,
    'evidence output',
    Boolean(options['trigger-id']),
    options['trigger-id'],
  )
}

function assertEvidencePathPreflight(
  path,
  expectedSkill,
  label = 'evidence output',
  trigger = false,
  expectedTriggerId,
) {
  try {
    if (trigger) assertTriggerEvidenceRunPath(EVIDENCE_ROOT, path, expectedSkill, expectedTriggerId, label)
    else assertEvidenceRunPath(EVIDENCE_ROOT, path, expectedSkill, label)
  } catch (error) {
    console.error(error instanceof Error ? error.message : `${label} is invalid`)
    process.exit(1)
  }
}

function assertSkillName(skill, label = 'skill') {
  if (!/^dsh-spec-[a-z0-9-]+$/.test(skill)) throw new Error(`${label} has an invalid name: ${skill}`)
}

function stageScenario(skill, scenario, project, arm) {
  assertSkillName(skill)
  const skillRoot = join(REPO_ROOT, 'skills', skill)
  if (!existsSync(join(skillRoot, 'SKILL.md'))) throw new Error(`missing skill: ${skill}`)

  const targetPresent = arm === 'target-present'
  const installedSkills = new Set([...(targetPresent ? [skill] : []), ...(scenario.install ?? [])])
  mkdirSync(join(project, '.agents', 'skills'), { recursive: true })
  if (targetPresent) {
    const targetSkill = assertProjectPath(project, `.agents/skills/${skill}`, 'installed skill')
    copyFile(skillRoot, targetSkill)
  }
  for (const sibling of scenario.install ?? []) {
    assertSkillName(sibling, 'sibling')
    if (sibling === skill) throw new Error(`scenario names its target as a sibling: ${sibling}`)
    const siblingRoot = join(REPO_ROOT, 'skills', sibling)
    if (!existsSync(join(siblingRoot, 'SKILL.md'))) throw new Error(`missing sibling skill: ${sibling}`)
    const targetSibling = assertProjectPath(project, `.agents/skills/${sibling}`, 'installed sibling')
    copyFile(siblingRoot, targetSibling)
  }
  for (const declared of scenario.files ?? []) {
    if (!targetPresent && declared.startsWith(`.agents/skills/${skill}/`)) {
      throw new Error(`target-absent scenario declares a file under the absent target skill: ${declared}`)
    }
    const source = assertInputFile(join(EVAL_ROOT, skill), declared, 'scenario input')
    const destination = scenarioProjectPath(scenario, declared, 'scenario input')

    const sibling = /^\.agents\/skills\/([^/]+)\//.exec(destination)?.[1]
    if (sibling) {
      if (!installedSkills.has(sibling)) {
        copyFile(source, assertProjectPath(project, destination, 'scenario input'))
      }
    } else {
      copyFile(source, assertProjectPath(project, destination, 'scenario input'))
    }
  }
  return installedSkills
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    input: '',
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  })
  if (result.error) throw result.error
  return result
}

const CONTROL_MESSAGE_BYTES = 8 * 1024

function readControlLine(socket) {
  return new Promise((resolveLine, rejectLine) => {
    let contents = ''
    const onData = (chunk) => {
      contents += chunk
      if (Buffer.byteLength(contents) > CONTROL_MESSAGE_BYTES) {
        cleanup()
        rejectLine(new Error('sandbox control message exceeds its byte limit'))
        return
      }
      const newline = contents.indexOf('\n')
      if (newline < 0) return
      cleanup()
      resolveLine(contents.slice(0, newline))
    }
    const onEnd = () => {
      cleanup()
      rejectLine(new Error('sandbox control closed before sending model status'))
    }
    const onError = (error) => {
      cleanup()
      rejectLine(error)
    }
    const cleanup = () => {
      socket.off('data', onData)
      socket.off('end', onEnd)
      socket.off('error', onError)
    }
    socket.on('data', onData)
    socket.once('end', onEnd)
    socket.once('error', onError)
  })
}

function writeControlLine(socket, value) {
  const message = `${JSON.stringify(value)}\n`
  if (Buffer.byteLength(message) > CONTROL_MESSAGE_BYTES) {
    throw new Error('sandbox control message exceeds its byte limit')
  }
  return new Promise((resolveWrite, rejectWrite) => {
    const onError = (error) => {
      cleanup()
      rejectWrite(error)
    }
    const cleanup = () => {
      socket.off('error', onError)
    }
    socket.once('error', onError)
    socket.write(message, (error) => {
      cleanup()
      if (error) rejectWrite(error)
      else resolveWrite()
    })
  })
}

async function startSandboxControl() {
  const root = mkdtempSync(join(tmpdir(), 'skill-eval-control-'))
  const socketPath = join(root, 'control.sock')
  const server = createServer()
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(socketPath, () => {
      server.off('error', rejectListen)
      resolveListen()
    })
  })
  const connection = new Promise((resolveConnection, rejectConnection) => {
    server.once('connection', (socket) => {
      server.close()
      // Deadline teardown can close this socket while an awaited write is in flight. The read and
      // write promises surface that failure; this fallback prevents the same close from becoming an
      // unhandled EventEmitter error.
      socket.on('error', () => {})
      if (existsSync(socketPath)) rmSync(socketPath, { force: true })
      resolveConnection(socket)
    })
    server.once('error', rejectConnection)
  })
  return {
    root,
    socketPath,
    connection,
    async close() {
      if (server.listening) {
        await new Promise((resolveClose) => server.close(resolveClose))
      }
      if (existsSync(socketPath)) rmSync(socketPath, { force: true })
      if (existsSync(root)) rmSync(root, { recursive: true, force: true })
    },
  }
}

function readBwrapChildPid(stream) {
  return new Promise((resolvePid, rejectPid) => {
    let contents = ''
    const onData = (chunk) => {
      contents += chunk
      const lines = contents.split('\n')
      contents = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        const event = JSON.parse(line)
        if (Number.isSafeInteger(event['child-pid']) && event['child-pid'] > 0) {
          cleanup()
          resolvePid(event['child-pid'])
          return
        }
      }
    }
    const onEnd = () => {
      cleanup()
      rejectPid(new Error('bubblewrap exited before reporting its child PID'))
    }
    const onError = (error) => {
      cleanup()
      rejectPid(error)
    }
    const cleanup = () => {
      stream.off('data', onData)
      stream.off('end', onEnd)
      stream.off('error', onError)
    }
    stream.setEncoding('utf8')
    stream.on('data', onData)
    stream.once('end', onEnd)
    stream.once('error', onError)
  })
}

async function runModelSandbox(invocation, control, sandboxOutput, deadlineMs, deadlineAt) {
  let socket
  let child
  let resolveStatusStream
  const statusStream = new Promise((resolveStream) => {
    resolveStatusStream = resolveStream
  })
  const runPromise = runInterruptible(
    invocation.command,
    invocation.args,
    {
      cwd: invocation.cwd,
      env: modelEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
    },
    (spawned) => {
      child = spawned
      resolveStatusStream(spawned.stdio[3])
    },
    { deadlineMs: remainingRunDeadline(deadlineAt) },
  )

  try {
    const [connection, childPid] = await Promise.race([
      Promise.all([control.connection, statusStream.then(readBwrapChildPid)]),
      runPromise.then((result) => {
        if (result.timedOut) throw new Error(`model run exceeded its ${deadlineMs} ms deadline`)
        const detail = result.stderr.trim().slice(0, 8192)
        throw new Error(
          `model sandbox exited before its control channel became ready (exit ${String(result.status)})` +
            (detail ? `\n${detail}` : ''),
        )
      }),
    ])
    socket = connection
    const status = JSON.parse(
      await Promise.race([
        readControlLine(socket),
        runPromise.then((result) => {
          if (result.timedOut) throw new Error(`model run exceeded its ${deadlineMs} ms deadline`)
          const detail = result.stderr.trim().slice(0, 8192)
          throw new Error(
            `model sandbox exited before reporting model status (exit ${String(result.status)})` +
              (detail ? `\n${detail}` : ''),
          )
        }),
      ]),
    )
    if (status.type === 'runner-error') throw new Error(`model sandbox wrapper failed: ${status.message}`)
    if (status.type !== 'model-exit') throw new Error('model sandbox reported an unknown event')

    if (status.status === 0) {
      const processRoot = join('/proc', String(childPid), 'root')
      copyTreeBounded({
        sourceRoot: join(processRoot, 'workspace'),
        destinationRoot: join(sandboxOutput, 'workspace'),
        maxEntries: MODEL_EVIDENCE_LIMITS.workspaceEntries,
        maxBytes: MODEL_EVIDENCE_LIMITS.workspaceBytes,
        maxFileBytes: MODEL_EVIDENCE_LIMITS.workspaceBytes,
        skip: (relative) => relative === '.git',
      })
      copyTreeBounded({
        sourceRoot: join(processRoot, 'response'),
        destinationRoot: join(sandboxOutput, 'response'),
        maxEntries: MODEL_EVIDENCE_LIMITS.responseEntries,
        maxBytes: MODEL_EVIDENCE_LIMITS.responseBytes,
        maxFileBytes: MODEL_EVIDENCE_LIMITS.responseBytes,
      })
    }

    await writeControlLine(socket, { action: status.status === 0 ? 'collect' : 'abort' })
    socket.end()
    const result = await runPromise
    if (result.timedOut) throw new Error(`model run exceeded its ${deadlineMs} ms deadline`)
    if (result.interrupted) throw new Error(`model run interrupted by ${result.interrupted}`)
    if (result.status !== status.status && status.status !== null) {
      throw new Error(`model sandbox exit ${String(result.status)} differs from model exit ${status.status}`)
    }
    return { result, collected: status.status === 0 }
  } catch (error) {
    if (socket && !socket.destroyed) {
      await writeControlLine(socket, { action: 'abort' }).catch(() => {})
      socket.destroy()
    }
    if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    const settled = await runPromise.catch(() => undefined)
    if (settled?.timedOut) throw new Error(`model run exceeded its ${deadlineMs} ms deadline`)
    if (settled?.interrupted) throw new Error(`model run interrupted by ${settled.interrupted}`)
    throw error
  }
}

function modelEnvironment() {
  return {
    HOME: '/tmp',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    PATH: '/usr/local/bin:/usr/bin:/bin',
  }
}

function capabilityMaskArgs(root, browserEnabled, mediaEnabled) {
  const empty = join(root, 'capability-empty')
  writeFileSync(empty, '')
  return capabilityMaskPaths(browserEnabled, mediaEnabled).flatMap((candidate) => {
    const resolved = resolveExecutableFile(candidate)
    if (!resolved) return []
    return /^(?:\/usr|\/bin|\/etc|\/lib(?:64)?)(?:\/|$)/.test(resolved) ? ['--ro-bind', empty, resolved] : []
  })
}

function sanitizeEvidenceText(text) {
  return sanitizeHostAccountText(
    text
      .split(homedir())
      .join('/home/eval')
      .replace(/\/home\/(?!eval(?:\/|$))[^/\s"'`]+\/feedstock_root\/build_artifacts/g, '/opt/build')
      .replace(/\/mnt\/c\//g, '/host/c/')
      .replace(/\/tmp\//g, '/workspace/.runtime/'),
    userInfo().username,
  )
}

function configuredCodexHome() {
  return process.env.CODEX_HOME ?? join(homedir(), '.codex')
}

async function startModelAuthProxy(upstream, token) {
  const authToken = randomBytes(32).toString('hex')
  const child = spawn(process.execPath, [join(EVAL_ROOT, 'model-auth-proxy.mjs')], {
    env: modelEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  try {
    if (!child.connected) throw new Error('model auth proxy did not expose an IPC channel')
    child.send({ upstream, token, authToken })
    const line = await Promise.race([
      new Promise((resolveLine, reject) => {
        let stdout = ''
        child.stdout.setEncoding('utf8')
        child.stdout.on('data', (chunk) => {
          stdout += chunk
          const newline = stdout.indexOf('\n')
          if (newline >= 0) resolveLine(stdout.slice(0, newline))
        })
        child.once('error', reject)
        child.once('exit', (code) => reject(new Error(`model auth proxy exited before ready: ${code}\n${stderr}`)))
      }),
      delay(5_000).then(() => {
        throw new Error('model auth proxy did not become ready')
      }),
    ])
    const { url } = JSON.parse(line)
    return {
      child,
      url,
      token: authToken,
      async stop() {
        if (child.exitCode !== null || child.signalCode !== null) return
        const exited = once(child, 'exit')
        child.kill('SIGTERM')
        const stopped = await Promise.race([exited.then(() => true), delay(2_000).then(() => false)])
        if (!stopped && child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL')
          await Promise.race([exited, delay(1_000)])
        }
      },
    }
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit')
      child.kill('SIGKILL')
      await Promise.race([exited, delay(1_000)])
    }
    throw error
  }
}

async function createIsolatedCodexHome(root) {
  const sourceHome = configuredCodexHome()
  const sourceConfig = readFileSync(join(sourceHome, 'config.toml'), 'utf8')
  const lines = sourceConfig.split('\n')
  const topLevelKeys = new Set([
    'model',
    'model_provider',
    'forced_login_method',
    'model_reasoning_effort',
    'model_catalog_json',
  ])
  const providerKeys = new Set([
    'supports_standalone_web_search',
    'name',
    'base_url',
    'wire_api',
    'experimental_bearer_token',
    'env_key',
    'requires_openai_auth',
  ])
  const topLevel = lines.filter((line) => topLevelKeys.has(line.split('=')[0]?.trim()))
  const modelProviderLine = tomlField(topLevel, 'model_provider')
  const modelProvider = modelProviderLine ? tomlStringValue(modelProviderLine) : undefined
  if (!modelProvider) throw new Error('CODEX_HOME config.toml declares no model_provider')

  const header = `[model_providers.${modelProvider}]`
  const start = lines.findIndex((line) => line.trim() === header)
  if (start === -1) throw new Error(`CODEX_HOME config.toml has no ${header}`)
  const section = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim().startsWith('[')) break
    if (providerKeys.has(line.split('=')[0]?.trim())) section.push(line)
  }
  const bearerToken = singleTomlStringField(
    section,
    'experimental_bearer_token',
    'model provider experimental_bearer_token',
  )
  const baseUrl = singleTomlStringField(section, 'base_url', 'model provider base_url')
  if (bearerToken && !baseUrl) throw new Error('model provider has an inline bearer token but no parseable base_url')
  if (baseUrl) assertCredentialFreeBaseUrl(baseUrl, 'model provider base_url')
  const authProxy = bearerToken && baseUrl ? await startModelAuthProxy(baseUrl, bearerToken) : undefined
  try {
    const providerSection = authProxy ? proxyProviderLines(section, authProxy.url, authProxy.token) : section
    const codexHome = join(root, 'codex-home')
    mkdirSync(codexHome, { recursive: true })
    const modelCatalogLine = tomlField(topLevel, 'model_catalog_json')
    const modelCatalogValue = modelCatalogLine ? tomlStringValue(modelCatalogLine) : undefined
    if (modelCatalogLine && !modelCatalogValue) throw new Error('model_catalog_json is unparseable')
    const modelCatalog = modelCatalogValue ? readSafeModelCatalog(sourceHome, modelCatalogValue) : undefined
    const modelConfigSha256 = sha256(
      canonicalJson({
        top_level: topLevel
          .filter((line) => line.split('=')[0]?.trim() !== 'model_catalog_json')
          .map((line) => line.trim())
          .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
        provider: section
          .filter((line) => line.split('=')[0]?.trim() !== 'experimental_bearer_token')
          .map((line) => line.trim())
          .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
        model_catalog_sha256: modelCatalog ? sha256(modelCatalog) : null,
        credential_mode: authProxy ? 'host-proxy' : 'direct',
      }),
    )
    const rewrittenTopLevel = modelCatalogLine
      ? topLevel.map((line) =>
          line.split('=')[0]?.trim() === 'model_catalog_json' ? 'model_catalog_json = "model-catalog.json"' : line,
        )
      : topLevel
    writeFileSync(
      join(codexHome, 'config.toml'),
      [
        ...rewrittenTopLevel,
        'sandbox_mode = "workspace-write"',
        '',
        header,
        ...providerSection,
        '',
        '[sandbox_workspace_write]',
        'network_access = true',
        '',
      ].join('\n'),
    )
    if (modelCatalog) writeFileSync(join(codexHome, 'model-catalog.json'), modelCatalog)
    return {
      authProxy,
      codexHome,
      credentialMode: authProxy ? 'host-proxy' : 'direct',
      modelConfigSha256,
    }
  } catch (error) {
    if (authProxy) await authProxy.stop()
    throw error
  }
}

function isolatedCodexCommand(
  codexHomeSeed,
  workspaceSeed,
  trustedGit,
  controlRoot,
  sandbox,
  credentialMode,
  capabilities,
  allowSubagents,
  args,
) {
  const codexBinary = process.env.CODEX_BIN ?? 'codex'
  const codexPath = run('which', [codexBinary], {}).stdout.trim()
  if (!codexPath) throw new Error(`cannot find Codex binary: ${codexBinary}`)
  const codexRuntimeSha256 = hashFileNoFollow(realpathSync(codexPath))
  const pnpmPath = run('which', ['pnpm'], {}).stdout.trim()
  if (!pnpmPath) throw new Error('cannot find pnpm')
  const nodeRuntimeRoot = dirname(dirname(realpathSync(process.execPath)))
  const pnpmRuntimeRoot = dirname(realpathSync(pnpmPath))
  const miseInstalls = join(homedir(), '.local', 'share', 'mise', 'installs')
  const playwrightRoot = join(tmpdir(), 'playwright-browsers')
  const chromiumDirectory = existsSync(playwrightRoot)
    ? readdirSync(playwrightRoot)
        .filter((entry) => /^chromium-\d+$/.test(entry))
        .sort((left, right) => Number(/\d+/.exec(left)?.[0]) - Number(/\d+/.exec(right)?.[0]))
        .at(-1)
    : undefined
  const chromiumRoot = chromiumDirectory ? join(playwrightRoot, chromiumDirectory, 'chrome-linux64') : undefined
  const browserLibs = join(tmpdir(), 'browser-libs', 'usr', 'lib', 'x86_64-linux-gnu')
  const hasPlaywrightBrowser = chromiumRoot && executableFile(join(chromiumRoot, 'chrome')) && existsSync(browserLibs)
  const systemBrowser = browserExecutablePaths().map(resolveExecutableFile).find(Boolean)
  const hasBrowser = Boolean(hasPlaywrightBrowser) || Boolean(systemBrowser)
  const bundledMediaRoot = resolveMiseMediaRoot(miseInstalls)
  const systemMedia = mediaExecutablePaths().filter(executableFile)
  const hasSystemMedia = ['ffmpeg', 'ffprobe'].every((name) =>
    systemMedia.some((candidate) => basename(candidate) === name),
  )
  const hasMedia = Boolean(bundledMediaRoot) || hasSystemMedia
  const browserEnabled = resolveCapability('browser', capabilities?.browser ?? false, Boolean(hasBrowser))
  const systemBrowserMount =
    browserEnabled && systemBrowser && !/^(?:\/usr|\/bin|\/etc|\/lib(?:64)?)(?:\/|$)/.test(systemBrowser)
      ? dirname(systemBrowser)
      : undefined
  const mediaEnabled = resolveCapability('media', capabilities?.media ?? false, hasMedia)
  const mediaMount = mediaEnabled && bundledMediaRoot
  const sandboxNode = '/opt/runtime/node'
  const sandboxPnpm = '/opt/runtime/pnpm'
  const workspaceWritable = sandbox === 'workspace-write'
  const toolPath = [
    join(sandboxNode, 'bin'),
    sandboxPnpm,
    ...(mediaMount ? ['/opt/ffmpeg/bin'] : []),
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].join(':')
  return {
    command: 'bwrap',
    modelRuntimeSha256: codexRuntimeSha256,
    args: [
      '--die-with-parent',
      '--new-session',
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--json-status-fd',
      '3',
      '--ro-bind',
      '/usr',
      '/usr',
      '--ro-bind',
      '/bin',
      '/bin',
      '--ro-bind',
      '/etc',
      '/etc',
      ...capabilityMaskArgs(dirname(codexHomeSeed), browserEnabled, mediaEnabled),
      '--ro-bind',
      '/lib',
      '/lib',
      '--ro-bind',
      '/lib64',
      '/lib64',
      '--ro-bind',
      dirname(codexPath),
      '/opt/codex',
      '--ro-bind',
      workspaceSeed,
      '/seed/workspace',
      '--ro-bind',
      codexHomeSeed,
      '/seed/codex-home',
      '--ro-bind',
      join(EVAL_ROOT, 'model-sandbox-entrypoint.mjs'),
      '/opt/runner/model-sandbox-entrypoint.mjs',
      '--ro-bind',
      join(EVAL_ROOT, 'runner-safety.mjs'),
      '/opt/runner/runner-safety.mjs',
      '--ro-bind',
      controlRoot,
      '/run/control',
      ...sandboxTmpfsArgs(MODEL_EVIDENCE_LIMITS, { includeWorkspace: workspaceWritable }),
      ...(workspaceWritable ? [] : ['--ro-bind', workspaceSeed, '/workspace']),
      '--ro-bind',
      trustedGit,
      '/workspace/.git',
      ...(workspaceWritable
        ? ['--ro-bind', join(workspaceSeed, '.agents', 'skills'), '/workspace/.agents/skills']
        : []),
      '--dir',
      '/home/eval',
      '--dir',
      '/opt/runtime',
      '--dir',
      sandboxNode,
      '--dir',
      sandboxPnpm,
      '--ro-bind',
      nodeRuntimeRoot,
      sandboxNode,
      '--ro-bind',
      pnpmRuntimeRoot,
      sandboxPnpm,
      ...(mediaMount ? ['--ro-bind', mediaMount, '/opt/ffmpeg'] : []),
      ...(systemBrowserMount ? ['--ro-bind', systemBrowserMount, systemBrowserMount] : []),
      ...(hasPlaywrightBrowser && browserEnabled
        ? ['--ro-bind', chromiumRoot, '/opt/chrome', '--ro-bind', join(tmpdir(), 'browser-libs'), '/opt/browser-libs']
        : []),
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '--chdir',
      '/workspace',
      'env',
      'HOME=/home/eval',
      'CODEX_HOME=/codex-home',
      'TMPDIR=/tmp',
      `PATH=${toolPath}`,
      ...(hasPlaywrightBrowser && browserEnabled
        ? [
            'CHROME_PATH=/opt/chrome/chrome',
            'LD_LIBRARY_PATH=/opt/browser-libs/usr/lib/x86_64-linux-gnu',
            'EVAL_CHROME_NO_SANDBOX=1',
          ]
        : systemBrowser && browserEnabled
          ? [`CHROME_PATH=${systemBrowser}`]
          : []),
      'node',
      '/opt/runner/model-sandbox-entrypoint.mjs',
      '--workspace-mode',
      sandbox,
      '--control-socket',
      '/run/control/control.sock',
      '--workspace-bytes',
      String(MODEL_EVIDENCE_LIMITS.workspaceBytes),
      '--workspace-entries',
      String(MODEL_EVIDENCE_LIMITS.workspaceEntries),
      '--codex-home-bytes',
      String(MODEL_EVIDENCE_LIMITS.codexHomeBytes),
      '--codex-home-entries',
      String(MODEL_EVIDENCE_LIMITS.codexHomeEntries),
      '--',
      `/opt/codex/${basename(codexPath)}`,
      '--disable',
      'browser_use',
      '--disable',
      'browser_use_external',
      '--disable',
      'computer_use',
      ...(allowSubagents ? [] : ['--disable', 'multi_agent']),
      ...args,
    ],
    cwd: workspaceSeed,
    profile: {
      auth: credentialMode,
      browser: browserEnabled,
      media: mediaEnabled,
      sandbox,
      subagents: allowSubagents,
    },
  }
}

function git(project, args, allowFailure = false, extraEnvironment = {}, gitDirectory) {
  const commandArgs = gitDirectory
    ? trustedGitArgs(gitDirectory, project, args)
    : ['-c', 'core.hooksPath=/dev/null', ...args]
  const result = run('git', commandArgs, {
    cwd: project,
    env: {
      ...modelEnvironment(),
      ...extraEnvironment,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_NO_REPLACE_OBJECTS: '1',
      GIT_OPTIONAL_LOCKS: '0',
    },
  })
  if (!allowFailure && result.status !== 0) throw new Error(result.stderr)
  return result
}

function finalAgentMessage(trace) {
  let final
  for (const line of trace.trim().split('\n').filter(Boolean)) {
    const event = JSON.parse(line)
    if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
      final = event.item.text
    }
  }
  return final
}

function assertAnswerManifestWasNotRead(trace) {
  const forbidden = [
    /(?:^|[/\\])evals[/\\]evals\.json(?:\s|$|['"])/i,
    /(?:^|[/\\])tests[/\\]skill-evals(?:[/\\]|\s|$)/i,
    /\bexpected_output\b/i,
    /(?:^|[/\\])codex-home(?:[/\\]|\s|$)/i,
    /(?:^|[/\\])response(?:[/\\]|\s|$)/i,
  ]
  if (forbidden.some((pattern) => pattern.test(trace))) {
    throw new Error('model read answer-bearing evidence or exposed the runtime/response mount')
  }
}

function skillTreeHashes(project, installedSkills) {
  const lines = []
  for (const skill of [...installedSkills].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))) {
    const root = join(project, '.agents', 'skills', skill)
    for (const file of listFiles(root)) {
      const path = join(root, file)
      lines.push(`${hashFile(path)}  skills/${skill}/${file}  mode=${modeBits(path)}`)
    }
  }
  return lines
}

function skillTreeDigest(project, installedSkills) {
  return sha256(skillTreeHashes(project, installedSkills).join('\n'))
}

function sourceSkillTreeDigest(skill) {
  const root = join(REPO_ROOT, 'skills', skill)
  return sha256(
    listFiles(root)
      .map((file) => {
        const path = join(root, file)
        return `${hashFile(path)}  skills/${skill}/${file}  mode=${modeBits(path)}`
      })
      .join('\n'),
  )
}

function changedPaths(project, base, environment, gitDirectory) {
  return parseNulSeparatedPaths(
    git(project, ['diff', '--cached', '--name-only', '-z', base], false, environment, gitDirectory).stdout,
  )
}

function retainArtifacts(project, output, paths, declaredOutputs) {
  const sources = collectArtifactSources(project, paths, declaredOutputs, MODEL_EVIDENCE_LIMITS)
  const artifactRoot = join(output, 'artifact')
  const manifest = []
  mkdirSync(artifactRoot, { recursive: true })
  for (const { path, source } of sources) {
    const retained = assertNoSymlinkComponents(artifactRoot, join(artifactRoot, path), 'retained artifact')
    const copied = copyFileNoFollowLimited(source, retained, MODEL_EVIDENCE_LIMITS.artifactFileBytes)
    manifest.push(`${copied.sha256}  artifact/${path}`)
  }
  writeFileSync(join(output, 'artifacts.sha256'), manifest.length ? `${manifest.join('\n')}\n` : '')
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label} must be a non-empty string`)
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must be a non-empty array`)
  for (const entry of value) assertNonEmptyString(entry, label)
}

function assertRelativeProjectPath(path, label) {
  assertNonEmptyString(path, label)
  if (isAbsolute(path) || normalize(path) !== path)
    throw new Error(`${label} must be a normalized relative path: ${path}`)
  assertContained('/workspace', resolve('/workspace', path), label)
}

function validateScenario(skill, scenario) {
  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    throw new Error('scenario must be an object')
  }
  const known = new Set([
    'id',
    'prompt',
    'expected_output',
    'assertions',
    'files',
    'change_patch',
    'change_root',
    'install',
    'outputs',
    'capabilities',
    'allow_subagents',
    'comparison',
    'project_root',
  ])
  for (const key of Object.keys(scenario)) {
    if (!known.has(key)) throw new Error(`unknown scenario field: ${key}`)
  }
  assertNonEmptyString(scenario.id, 'scenario id')
  assertNonEmptyString(scenario.prompt, 'scenario prompt')
  assertNonEmptyString(scenario.expected_output, 'scenario expected_output')
  assertStringArray(scenario.assertions, 'scenario assertions')
  assertStringArray(scenario.files, 'scenario files')
  if (scenario.install !== undefined) assertStringArray(scenario.install, 'scenario install')
  if (scenario.outputs !== undefined) assertStringArray(scenario.outputs, 'scenario outputs')
  if (scenario.allow_subagents !== undefined && typeof scenario.allow_subagents !== 'boolean') {
    throw new Error('scenario allow_subagents must be a boolean')
  }
  if (scenario.capabilities !== undefined) {
    if (!scenario.capabilities || typeof scenario.capabilities !== 'object' || Array.isArray(scenario.capabilities)) {
      throw new Error('scenario capabilities must be an object')
    }
    const capabilityKeys = new Set(['browser', 'media'])
    for (const [key, value] of Object.entries(scenario.capabilities)) {
      if (!capabilityKeys.has(key) || typeof value !== 'boolean') {
        throw new Error(`scenario capability ${key} must be a boolean browser or media value`)
      }
    }
  }
  for (const sibling of scenario.install ?? []) {
    assertSkillName(sibling, 'sibling')
    if (sibling === skill) throw new Error(`scenario names its target as a sibling: ${sibling}`)
  }
  for (const file of scenario.files) assertInputFile(join(EVAL_ROOT, skill), file, 'scenario input')
  if (scenario.project_root !== undefined) {
    assertNonEmptyString(scenario.project_root, 'scenario project_root')
    assertRelativeProjectPath(scenario.project_root, 'scenario project_root')
    if (!scenario.project_root.startsWith('evals/files/')) {
      throw new Error('scenario project_root must be inside evals/files')
    }
    if (scenario.change_patch !== undefined) {
      throw new Error('scenario project_root cannot be combined with change_patch')
    }
    const prefix = `${scenario.project_root}/`
    for (const file of scenario.files) {
      if (!file.startsWith(prefix)) {
        throw new Error(`scenario input is outside project_root: ${file}`)
      }
    }
  }
  for (const output of scenario.outputs ?? []) assertRelativeProjectPath(output, 'scenario output')
  if (scenario.change_patch !== undefined) {
    assertNonEmptyString(scenario.change_patch, 'scenario change_patch')
    if (!scenario.files.includes(scenario.change_patch))
      throw new Error('scenario change_patch is not a declared input')
    assertNonEmptyString(scenario.change_root, 'scenario change_root')
    assertRelativeProjectPath(scenario.change_root, 'scenario change_root')
  }
  validateScenarioClaim(skill, scenario)
  return scenario
}

function readScenario(skill, scenarioId) {
  assertSkillName(skill)
  const corpus = JSON.parse(readFileSync(join(EVAL_ROOT, skill, 'evals', 'evals.json'), 'utf8'))
  if (corpus.skill_name !== skill) throw new Error(`scenario corpus names ${corpus.skill_name}, expected ${skill}`)
  if (!Array.isArray(corpus.evals) || corpus.evals.length === 0) throw new Error('scenario corpus must contain evals')
  const ids = new Set()
  for (const entry of corpus.evals) {
    assertNonEmptyString(entry?.id, 'scenario id')
    if (ids.has(entry.id)) throw new Error(`duplicate scenario id: ${entry.id}`)
    ids.add(entry.id)
  }
  const scenario = corpus.evals.find((entry) => entry.id === scenarioId)
  if (!scenario) throw new Error(`missing scenario ${skill}:${scenarioId}`)
  return validateScenario(skill, scenario)
}

function readTrigger(skill, triggerId) {
  assertSkillName(skill)
  assertNonEmptyString(triggerId, 'trigger id')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(triggerId)) throw new Error(`invalid trigger id: ${triggerId}`)
  const corpusRoot = join(EVAL_ROOT, skill)
  const corpusPath = join(corpusRoot, 'trigger-evals.json')
  const corpusBytes = readFileSync(corpusPath)
  let corpus
  try {
    corpus = JSON.parse(corpusBytes.toString('utf8'))
  } catch {
    throw new Error('trigger corpus is not valid JSON')
  }
  if (corpus.skill_name !== skill) throw new Error(`trigger corpus names ${corpus.skill_name}, expected ${skill}`)
  if (corpus.agent_file !== 'trigger-fixtures/AGENTS.md') {
    throw new Error('trigger corpus agent_file must be trigger-fixtures/AGENTS.md')
  }
  if (!Array.isArray(corpus.queries) || corpus.queries.length === 0) {
    throw new Error('trigger corpus must contain queries')
  }
  const ids = new Set()
  const resources = new Map()
  const triggerFixturesRoot = join(corpusRoot, 'trigger-fixtures')
  const fixtureRootStat = lstatSync(triggerFixturesRoot, { throwIfNoEntry: false })
  if (!fixtureRootStat || fixtureRootStat.isSymbolicLink() || !fixtureRootStat.isDirectory()) {
    throw new Error('trigger-fixtures must be a regular directory')
  }
  const readResource = (path) => {
    if (typeof path !== 'string' || !path.startsWith('trigger-fixtures/')) {
      throw new Error(`trigger resource escapes trigger-fixtures: ${String(path)}`)
    }
    const resourcePath = path.slice('trigger-fixtures/'.length)
    const parts = resourcePath.split('/')
    if (
      isAbsolute(path) ||
      resourcePath === '' ||
      resourcePath.includes('\\') ||
      parts.some((part) => part === '' || part === '.' || part === '..' || part === '.git' || part === '.agents')
    ) {
      throw new Error(`trigger resource uses a forbidden path: ${path}`)
    }
    let cached = resources.get(path)
    if (cached) return cached
    const absolute = resolve(triggerFixturesRoot, ...parts)
    assertContained(triggerFixturesRoot, absolute, 'trigger resource')
    assertNoSymlinkComponents(triggerFixturesRoot, absolute, 'trigger resource')
    assertRegularNonEmptyFile(absolute, 'trigger resource')
    cached = {
      bytes: readFileSync(absolute),
      mode: modeBits(absolute),
      destination: parts.join('/'),
    }
    resources.set(path, cached)
    return cached
  }
  for (const query of corpus.queries) {
    assertNonEmptyString(query?.id, 'trigger id')
    assertNonEmptyString(query?.query, `trigger ${query.id} prompt`)
    if (typeof query.should_trigger !== 'boolean') {
      throw new Error(`trigger ${query.id} should_trigger must be boolean`)
    }
    if (ids.has(query.id)) throw new Error(`duplicate trigger id: ${query.id}`)
    ids.add(query.id)
    if (query.files !== undefined) {
      if (!Array.isArray(query.files)) throw new Error(`trigger ${query.id} files must be an array`)
      for (const file of query.files) {
        if (file === corpus.agent_file) {
          throw new Error(`trigger ${query.id} fixture may not overwrite the root agent file`)
        }
        readResource(file)
      }
    }
  }
  const selected = corpus.queries.find((query) => query.id === triggerId)
  if (!selected) throw new Error(`missing trigger ${skill}:${triggerId}`)
  const agentResource = readResource(corpus.agent_file)
  const corpusSha256 = triggerCorpusSha256({
    corpus: corpusBytes,
    agentFile: corpus.agent_file,
    agent: agentResource.bytes,
    files: [...resources]
      .filter(([path]) => path !== corpus.agent_file)
      .map(([path, resource]) => ({ path, ...resource })),
  })
  const surfaceSha256 = triggerSurfaceSha256(readFileSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'), 'utf8'))
  return {
    id: selected.id,
    query: selected.query,
    shouldTrigger: selected.should_trigger,
    agentFile: corpus.agent_file,
    agent: agentResource.bytes,
    files: (selected.files ?? []).map((path) => ({ path, ...resources.get(path) })),
    corpusSha256,
    surfaceSha256,
  }
}

function stageTrigger(skill, trigger, project) {
  assertSkillName(skill)
  const skillRoot = join(REPO_ROOT, 'skills', skill)
  const intendedSkillTreeSha256 = sourceSkillTreeDigest(skill)
  const targetSkill = assertProjectPath(project, `.agents/skills/${skill}`, 'installed trigger skill')
  copyFile(skillRoot, targetSkill)
  writeFileSync(assertProjectPath(project, 'AGENTS.md', 'trigger agent file'), trigger.agent)
  const destinations = new Set()
  for (const file of trigger.files) {
    const destination = file.destination
    if (destination === 'AGENTS.md' || destinations.has(destination)) {
      throw new Error(`trigger fixture would overwrite another staged input: ${file.path}`)
    }
    destinations.add(destination)
    const target = assertProjectPath(project, destination, 'trigger fixture')
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, file.bytes)
    chmodSync(target, Number.parseInt(file.mode, 8))
  }
  if (skillTreeDigest(project, [skill]) !== intendedSkillTreeSha256) {
    throw new Error('trigger fixtures changed the staged skill tree')
  }
  return new Set([skill])
}

function recoverPreviousOutput(output, backup) {
  if (!existsSync(backup)) return
  if (existsSync(output)) {
    removeModelTree(backup)
  } else {
    renameSync(backup, output)
  }
}

function observeCounterpartRun(root, canaries, extraPaths) {
  const before = retainedSurfacesSnapshot(root, canaries, { extraPaths })
  const metadataRecord = readEvidenceMetadataRecord(root, canaries)
  const { metadata } = metadataRecord
  const observation = inspectRetainedRun(root, metadata)
  assertRetainedRunPolicy({
    root,
    metadata,
    observed: observation.currentness,
    provenance: observation.provenance,
    canaries,
    extraPaths,
  })
  const after = retainedSurfacesSnapshot(root, canaries, { extraPaths })
  if (after.snapshotSha256 !== before.snapshotSha256) {
    throw new Error('counterpart evidence changed during validation')
  }
  const evidenceSha256 = after.fileSha256.get('evidence.json')
  if (!evidenceSha256 || metadataRecord.sha256 !== evidenceSha256) {
    throw new Error('counterpart evidence metadata changed during validation')
  }
  return {
    metadata,
    observation,
    snapshotSha256: after.snapshotSha256,
    evidenceSha256,
  }
}

function assertCounterpartIdentity(metadata, scenarioClaim, options) {
  if (metadata.claim.type !== scenarioClaim.type || metadata.claim.subject !== scenarioClaim.subject) {
    throw new Error('counterpart evidence names another comparison claim')
  }
  if (
    metadata.comparison?.baseline !== scenarioClaim.comparison.baseline ||
    metadata.comparison?.candidate !== scenarioClaim.comparison.candidate ||
    metadata.comparison?.conditions_sha256 !== scenarioClaim.comparison.conditionsSha256
  ) {
    throw new Error('counterpart evidence declares different comparison conditions')
  }
  if (metadata.deadline_ms !== options.deadlineMs) {
    throw new Error('counterpart evidence uses a different deadline_ms')
  }
  const expectedArm = options.arm === 'target-present' ? 'target-absent' : 'target-present'
  if (metadata.arm !== expectedArm) throw new Error(`counterpart evidence must use the ${expectedArm} arm`)
}

const options = parseOptions()
const trigger = options['trigger-id'] ? readTrigger(options.skill, options['trigger-id']) : undefined
const scenario = trigger ? undefined : readScenario(options.skill, options.scenario)
const scenarioClaim = scenario ? claimForScenario(options.skill, scenario) : undefined
if (scenarioClaim) validateModelArm(scenarioClaim, options.arm)
const privacyCanaries = privacyCanariesFor(options.skill, trigger ? 'trigger' : options.scenario, {
  includeCurrentHome: true,
})
const output = resolve(REPO_ROOT, options.output)
assertEvidenceOutput(output)
let counterpart
if (options.counterpart) {
  if (!scenarioClaim || scenarioClaim.type !== 'comparison') {
    throw new Error('--counterpart is valid only for a comparison scenario')
  }
  const root = resolve(REPO_ROOT, options.counterpart)
  assertEvidencePathPreflight(root, options.skill, 'counterpart evidence path')
  if (root === output) throw new Error('--counterpart must name a different evidence run')
  const extraPaths = [relative(EVIDENCE_ROOT, root).split(sep).join('/')]
  const observedCounterpart = observeCounterpartRun(root, privacyCanaries, extraPaths)
  const { metadata } = observedCounterpart
  assertCounterpartIdentity(metadata, scenarioClaim, options)
  counterpart = {
    root,
    ...observedCounterpart,
    extraPaths,
  }
} else if (scenarioClaim?.type === 'comparison' && options.arm === 'target-absent') {
  throw new Error('a target-absent comparison arm requires --counterpart')
}
const outputParent = dirname(output)
mkdirSync(outputParent, { recursive: true })
const outputLock = join(outputParent, `.${basename(output)}.lock`)
const backupOutput = `${output}.old`

let temporaryParent
let stagedOutput
let authProxy
let sandboxControl
let outputLockHandle
const runDeadlineAt = performance.now() + options.deadlineMs
try {
  outputLockHandle = await acquireFileLock(outputLock)
  recoverPreviousOutput(output, backupOutput)
  if (existsSync(output) && !options.replace) throw new Error(`output already exists: ${output}`)
  stagedOutput = mkdtempSync(join(outputParent, '.run-'))
  temporaryParent = mkdtempSync(join(tmpdir(), 'skill-eval-project-'))
  const workspaceSeed = join(temporaryParent, 'workspace-seed')
  const isolatedHome = await createIsolatedCodexHome(temporaryParent)
  authProxy = isolatedHome.authProxy
  const codexHome = isolatedHome.codexHome
  const sandboxOutput = join(temporaryParent, 'sandbox-output')
  mkdirSync(workspaceSeed, { recursive: true })
  mkdirSync(sandboxOutput, { recursive: true })
  const installedSkills = trigger
    ? stageTrigger(options.skill, trigger, workspaceSeed)
    : stageScenario(options.skill, scenario, workspaceSeed, options.arm)
  git(workspaceSeed, ['init', '-q'])
  git(workspaceSeed, ['config', 'user.name', 'Skill evaluation'])
  git(workspaceSeed, ['config', 'user.email', 'skill-evaluation@example.invalid'])
  const changeRoot = scenario?.change_root ? ['--directory', scenario.change_root] : []
  if (scenario?.change_patch)
    git(workspaceSeed, ['apply', '--binary', '--reverse', ...changeRoot, scenario.change_patch])
  git(workspaceSeed, ['add', '-A'])
  git(workspaceSeed, ['commit', '-qm', 'fixture: base state'])
  if (scenario?.change_patch) {
    git(workspaceSeed, ['apply', '--binary', ...changeRoot, scenario.change_patch])
    git(workspaceSeed, ['add', '-A'])
    git(workspaceSeed, ['commit', '-qm', 'fixture: candidate state'])
  }
  const trustedHead = git(workspaceSeed, ['rev-parse', 'HEAD']).stdout.trim()
  const trustedGit = join(temporaryParent, 'trusted-git')
  copyTrustedGit(workspaceSeed, trustedGit)
  if (options.sandbox === 'workspace-write') removeModelTree(join(workspaceSeed, '.git'))

  if (trigger) {
    writeFileSync(
      join(stagedOutput, 'trigger-query.json'),
      `${JSON.stringify(
        {
          id: trigger.id,
          query: trigger.query,
          query_sha256: sha256(trigger.query),
          should_trigger: trigger.shouldTrigger,
          agent_file: trigger.agentFile,
          currentness: {
            trigger_surface_sha256: trigger.surfaceSha256,
            trigger_corpus_sha256: trigger.corpusSha256,
          },
        },
        null,
        2,
      )}\n`,
    )
  } else {
    const inputManifest = (scenario.files ?? []).map((path) => {
      const stagedPath = scenarioProjectPath(scenario, path, 'scenario input')
      const absolute = assertProjectPath(workspaceSeed, stagedPath, 'scenario input')
      assertRegularNonEmptyFile(absolute, 'scenario input')
      return `${hashFile(absolute)}  ${path}  mode=${modeBits(absolute)}`
    })
    writeFileSync(join(stagedOutput, 'input-manifest.sha256'), `${inputManifest.join('\n')}\n`)
    writeFileSync(
      join(stagedOutput, 'scenario-definition.sha256'),
      `${scenarioDefinitionHash(scenario)}  ${options.skill}:${options.scenario}\n`,
    )
    writeFileSync(join(stagedOutput, 'scenario-definition.json'), `${JSON.stringify(scenario, null, 2)}\n`)
  }
  const installedBefore = skillTreeHashes(workspaceSeed, installedSkills)
  writeFileSync(join(stagedOutput, 'skill-hashes.txt'), `${installedBefore.join('\n')}\n`)
  if (scenario) {
    writeFileSync(
      join(stagedOutput, 'assertions.expected.txt'),
      `${scenario.assertions.map((assertion) => `PASS ${assertion}`).join('\n')}\n`,
    )
  }

  const started = performance.now()
  const imageArguments = (scenario?.files ?? [])
    .filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file))
    .flatMap((file) => ['--image', `/workspace/${scenarioProjectPath(scenario, file, 'scenario image')}`])
  const promptComponents = scenario ? modelPromptComponents(options.skill, scenario, options.arm) : undefined
  const skillInstruction = promptComponents?.armInstruction ?? ''
  const promptGuard = promptComponents?.promptGuard ?? ''
  const prompt = trigger ? trigger.query : promptComponents?.renderedPrompt
  if (typeof prompt !== 'string') throw new Error('behavior run has no rendered prompt')
  sandboxControl = await startSandboxControl()
  const invocation = isolatedCodexCommand(
    codexHome,
    workspaceSeed,
    trustedGit,
    sandboxControl.root,
    options.sandbox,
    isolatedHome.credentialMode,
    scenario?.capabilities,
    scenario?.allow_subagents ?? false,
    [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--dangerously-bypass-approvals-and-sandbox',
      '-c',
      'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false',
      ...imageArguments,
      '-C',
      '/workspace',
      '--json',
      '-o',
      '/response/final.md',
      prompt,
    ],
  )
  const executionProfile = {
    ...invocation.profile,
    model_config_sha256: isolatedHome.modelConfigSha256,
    model_runtime_sha256: invocation.modelRuntimeSha256,
  }
  writeFileSync(join(stagedOutput, 'capabilities.json'), `${JSON.stringify(invocation.profile, null, 2)}\n`)
  writeFileSync(join(stagedOutput, 'execution.json'), `${JSON.stringify(executionProfile, null, 2)}\n`)
  remainingRunDeadline(runDeadlineAt)
  const { collected, result } = await runModelSandbox(
    invocation,
    sandboxControl,
    sandboxOutput,
    options.deadlineMs,
    runDeadlineAt,
  )
  const elapsed = (performance.now() - started) / 1000
  remainingRunDeadline(runDeadlineAt)

  assertNoPrivacyCanariesInText('model stdout', result.stdout, privacyCanaries)
  assertNoPrivacyCanariesInText('model stderr', result.stderr, privacyCanaries)
  const modelTrace = sanitizeEvidenceText(result.stdout)
  const sanitizedStderr = sanitizeEvidenceText(result.stderr)
  const tracePrefix = scenario
    ? {
        type: 'scenario',
        subject: `${options.skill}:${options.scenario}`,
        path: 'scenario-definition.json',
        sha256: scenarioDefinitionHash(scenario),
      }
    : { type: 'query', id: trigger.id, query_sha256: sha256(trigger.query) }
  const trace = `${JSON.stringify(tracePrefix)}\n${modelTrace}`
  writeFileSync(join(stagedOutput, 'trace.jsonl'), trace)
  writeFileSync(join(stagedOutput, 'stderr.log'), sanitizedStderr)
  writeFileSync(join(stagedOutput, 'time.txt'), `time_seconds: ${elapsed.toFixed(2)}\n`)
  assertAnswerManifestWasNotRead(trace)
  if (!collected || result.status !== 0) {
    console.error(result.stderr)
    process.exitCode = result.status ?? 1
  } else {
    terminalTurnEvent(trace)
    const project = join(sandboxOutput, 'workspace')
    const finalResponse = join(sandboxOutput, 'response', 'final.md')
    const finalText = sanitizeEvidenceText(
      readFileNoFollowLimited(finalResponse, 'Codex final response', MODEL_EVIDENCE_LIMITS.finalResponseBytes).toString(
        'utf8',
      ),
    )
    if (finalText !== finalAgentMessage(trace)) {
      throw new Error('final response differs from the trace agent message')
    }
    writeFileSync(join(stagedOutput, 'final.md'), finalText)

    if (git(project, ['rev-parse', 'HEAD'], false, {}, trustedGit).stdout.trim() !== trustedHead) {
      throw new Error('the model changed Git history; refusing host-side Git inspection')
    }
    const inspectionEnvironment = { GIT_INDEX_FILE: join(temporaryParent, 'inspection.index') }
    git(project, ['read-tree', trustedHead], false, inspectionEnvironment, trustedGit)
    git(project, ['add', '-A'], false, inspectionEnvironment, trustedGit)
    const paths = changedPaths(project, trustedHead, inspectionEnvironment, trustedGit)
    if (paths.length > MODEL_EVIDENCE_LIMITS.workspaceEntries) {
      throw new Error(`the model produced more than ${MODEL_EVIDENCE_LIMITS.workspaceEntries} changed paths`)
    }
    if (trigger && paths.length > 0) {
      throw new Error('the model changed the trigger selection workspace')
    }
    writeFileSync(join(stagedOutput, 'changed-paths.json'), `${JSON.stringify(paths, null, 2)}\n`)
    writeFileSync(join(stagedOutput, 'changed-paths.txt'), paths.length ? `${paths.join('\n')}\n` : '')
    writeFileSync(
      join(stagedOutput, 'patch.diff'),
      git(
        project,
        ['diff', '--no-ext-diff', '--cached', '--binary', trustedHead],
        false,
        inspectionEnvironment,
        trustedGit,
      ).stdout,
    )
    if (paths.some((path) => path.startsWith('.agents/skills/'))) {
      throw new Error('the model changed an installed skill tree')
    }
    if (scenario) retainArtifacts(project, stagedOutput, paths, scenario.outputs ?? [])

    const installedAfter = skillTreeHashes(project, installedSkills)
    if (installedBefore.join('\n') !== installedAfter.join('\n')) {
      throw new Error('the installed skill tree changed during the run')
    }
    remainingRunDeadline(runDeadlineAt)
    writeFileSync(
      join(stagedOutput, 'status.txt'),
      `status: pending\nrun_exit_code: ${result.status ?? 'unknown'}\nassertions: pending\n`,
    )

    let evidenceMetadata
    if (trigger) {
      const marker = finalText.trim().split('\n').at(-1)
      const selected = marker === `SELECT: ${options.skill}`
      if (!selected && marker !== 'SELECT: none') {
        throw new Error('trigger response has no stable selection marker')
      }
      if (selected !== trigger.shouldTrigger) {
        throw new Error('trigger response selected the wrong skill')
      }
      writeFileSync(
        join(stagedOutput, 'selection.json'),
        `${JSON.stringify(
          {
            id: trigger.id,
            should_trigger: trigger.shouldTrigger,
            selected,
            result: 'pass',
          },
          null,
          2,
        )}\n`,
      )
      evidenceMetadata = createTriggerEvidenceMetadata({
        skill: options.skill,
        triggerSurfaceSha256: trigger.surfaceSha256,
        triggerCorpusSha256: trigger.corpusSha256,
        privacyCanaries,
        execution: executionProfile,
        deadlineMs: options.deadlineMs,
      })
    } else {
      evidenceMetadata = createModelEvidenceMetadata({
        skill: options.skill,
        scenario,
        arm: options.arm,
        scenarioSha256: scenarioDefinitionHash(scenario),
        inputManifestSha256: hashFile(join(stagedOutput, 'input-manifest.sha256')),
        targetSkillTreeSha256:
          options.arm === 'target-present' ? skillTreeDigest(workspaceSeed, [options.skill]) : null,
        dependencySkillTreeSha256: skillTreeDigest(workspaceSeed, scenario.install ?? []),
        prompt,
        armInstruction: skillInstruction,
        promptGuard,
        privacyCanaries,
        counterpartEvidenceSha256: counterpart?.evidenceSha256 ?? null,
        execution: executionProfile,
        deadlineMs: options.deadlineMs,
      })
    }
    const evidenceMetadataPath = join(stagedOutput, 'evidence.json')
    writeFileSync(evidenceMetadataPath, `${JSON.stringify(evidenceMetadata, null, 2)}\n`)
    if (counterpart && scenarioClaim) {
      const currentCounterpart = observeCounterpartRun(counterpart.root, privacyCanaries, counterpart.extraPaths)
      if (currentCounterpart.snapshotSha256 !== counterpart.snapshotSha256) {
        throw new Error('counterpart evidence changed after its initial validation')
      }
      assertCounterpartIdentity(currentCounterpart.metadata, scenarioClaim, options)
      const currentEvidenceSha256 = hashEvidenceMetadata(stagedOutput, privacyCanaries)
      if (options.arm === 'target-present') {
        assertComparableEvidenceArms(evidenceMetadata, currentCounterpart.metadata, {
          scenario,
          candidateEvidenceSha256: currentEvidenceSha256,
          baselineEvidenceSha256: currentCounterpart.evidenceSha256,
        })
      } else {
        assertComparableEvidenceArms(currentCounterpart.metadata, evidenceMetadata, {
          scenario,
          candidateEvidenceSha256: currentCounterpart.evidenceSha256,
          baselineEvidenceSha256: currentEvidenceSha256,
        })
      }
    }

    const lastLine = result.stdout.trim().split('\n').filter(Boolean).at(-1)
    const completion = lastLine ? JSON.parse(lastLine) : undefined
    const usage = completion?.type === 'turn.completed' ? completion.usage : undefined
    if (usage) {
      writeFileSync(
        join(stagedOutput, 'usage.txt'),
        `input_tokens: ${usage.input_tokens ?? 'unknown'}\noutput_tokens: ${usage.output_tokens ?? 'unknown'}\n`,
      )
    }
    assertRetainedRunPolicy({
      root: stagedOutput,
      metadata: evidenceMetadata,
      observed: trigger
        ? {
            trigger_surface_sha256: trigger.surfaceSha256,
            trigger_corpus_sha256: trigger.corpusSha256,
          }
        : {
            scenario_sha256: scenarioDefinitionHash(scenario),
            input_manifest_sha256: hashFile(join(stagedOutput, 'input-manifest.sha256')),
            scenario_prompt_sha256: sha256(scenario.prompt),
            arm_instruction_sha256: sha256(skillInstruction),
            prompt_guard_sha256: sha256(promptGuard),
            rendered_prompt_sha256: sha256(prompt),
            execution_sha256: sha256(canonicalJson(executionProfile)),
            ...(scenarioClaim.type === 'comparison'
              ? { comparison_conditions_sha256: scenarioClaim.comparison.conditionsSha256 }
              : {}),
          },
      provenance: trigger
        ? undefined
        : {
            target_skill_tree_sha256:
              options.arm === 'target-present' ? skillTreeDigest(workspaceSeed, [options.skill]) : null,
            dependency_skill_tree_sha256: skillTreeDigest(workspaceSeed, scenario.install ?? []),
          },
      canaries: privacyCanaries,
      extraPaths: [relative(EVIDENCE_ROOT, output).split(sep).join('/')],
    })
    remainingRunDeadline(runDeadlineAt)

    removeModelTree(temporaryParent)
    temporaryParent = undefined
    remainingRunDeadline(runDeadlineAt)

    if (counterpart) {
      const currentSnapshotSha256 = retainedSurfacesSha256(counterpart.root, privacyCanaries, {
        extraPaths: counterpart.extraPaths,
      })
      if (currentSnapshotSha256 !== counterpart.snapshotSha256) {
        throw new Error('counterpart evidence changed before promotion')
      }
      remainingRunDeadline(runDeadlineAt)
    }

    if (existsSync(output)) {
      if (!options.replace) throw new Error(`output already exists: ${output}`)
      renameSync(output, backupOutput)
    }
    try {
      renameSync(stagedOutput, output)
    } catch (error) {
      if (existsSync(backupOutput)) renameSync(backupOutput, output)
      throw error
    }
    if (existsSync(backupOutput)) removeModelTree(backupOutput)
    console.log(`Model run completed. Grade the retained output, then update ${join(output, 'status.txt')}.`)
  }
} finally {
  if (authProxy) await authProxy.stop()
  if (sandboxControl) await sandboxControl.close()
  if (stagedOutput && existsSync(stagedOutput)) rmSync(stagedOutput, { recursive: true, force: true })
  if (temporaryParent && existsSync(temporaryParent)) {
    try {
      removeModelTree(temporaryParent)
    } catch (error) {
      console.error(`Could not remove temporary run root ${temporaryParent}: ${String(error)}`)
    }
  }
  if (outputLockHandle) await outputLockHandle.release()
}

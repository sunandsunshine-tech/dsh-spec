import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import {
  assertContained,
  assertEvidenceRunPath,
  assertInputFile,
  assertNoSymlinkComponents,
  assertProjectPath,
  assertRegularNonEmptyFile,
  acquireFileLock,
  browserExecutablePaths,
  capabilityMaskPaths,
  copyTrustedGit,
  executableFile,
  hashFileNoFollow,
  mediaExecutablePaths,
  modeBits,
  parseNulSeparatedPaths,
  proxyProviderLines,
  removeModelTree,
  resolveCapability,
  resolveMiseMediaRoot,
  tomlField,
  tomlStringValue,
  trustedGitArgs,
} from './runner-safety.mjs'

const REPO_ROOT = resolve(import.meta.dirname, '../..')
const EVAL_ROOT = join(REPO_ROOT, 'tests', 'skill-evals')
const EVIDENCE_ROOT = join(EVAL_ROOT, 'evidence')

function parseOptions() {
  const { values } = parseArgs({
    options: {
      skill: { type: 'string' },
      scenario: { type: 'string' },
      output: { type: 'string' },
      sandbox: { type: 'string', default: 'workspace-write' },
      replace: { type: 'boolean', default: false },
    },
    strict: true,
  })
  for (const name of ['skill', 'scenario', 'output']) {
    if (!values[name]) throw new Error(`missing --${name}`)
  }
  if (!['read-only', 'workspace-write'].includes(values.sandbox)) {
    throw new Error('--sandbox must be read-only or workspace-write')
  }
  return values
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const fields = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    return `{${fields.join(',')}}`
  }
  return JSON.stringify(value)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
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

function assertEvidenceOutput(output) {
  assertEvidenceRunPath(EVIDENCE_ROOT, output, options.skill)
}

function assertSkillName(skill, label = 'skill') {
  if (!/^dsh-spec-[a-z0-9-]+$/.test(skill)) throw new Error(`${label} has an invalid name: ${skill}`)
}

function stageScenario(skill, scenario, project) {
  assertSkillName(skill)
  const skillRoot = join(REPO_ROOT, 'skills', skill)
  if (!existsSync(join(skillRoot, 'SKILL.md'))) throw new Error(`missing skill: ${skill}`)

  const installedSkills = new Set([skill, ...(scenario.install ?? [])])
  const targetSkill = assertProjectPath(project, `.agents/skills/${skill}`, 'installed skill')
  copyFile(skillRoot, targetSkill)
  for (const sibling of scenario.install ?? []) {
    assertSkillName(sibling, 'sibling')
    if (sibling === skill) throw new Error(`scenario names its target as a sibling: ${sibling}`)
    const siblingRoot = join(REPO_ROOT, 'skills', sibling)
    if (!existsSync(join(siblingRoot, 'SKILL.md'))) throw new Error(`missing sibling skill: ${sibling}`)
    const targetSibling = assertProjectPath(project, `.agents/skills/${sibling}`, 'installed sibling')
    copyFile(siblingRoot, targetSibling)
  }
  for (const declared of scenario.files ?? []) {
    const source = assertInputFile(join(EVAL_ROOT, skill), declared, 'scenario input')

    const sibling = /^\.agents\/skills\/([^/]+)\//.exec(declared)?.[1]
    if (sibling) {
      if (!installedSkills.has(sibling)) {
        copyFile(source, assertProjectPath(project, declared, 'scenario input'))
      }
    } else {
      copyFile(source, assertProjectPath(project, declared, 'scenario input'))
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
  return capabilityMaskPaths(browserEnabled, mediaEnabled)
    .filter((candidate) => existsSync(candidate))
    .flatMap((candidate) => ['--ro-bind', empty, candidate])
}

function sanitizeEvidenceText(text) {
  return text
    .split(homedir())
    .join('/home/eval')
    .replace(/\/home\/(?!eval(?:\/|$))[^/\s"'`]+\/feedstock_root\/build_artifacts/g, '/opt/build')
    .replace(/\/mnt\/c\//g, '/host/c/')
    .replace(/\/tmp\//g, '/workspace/.runtime/')
}

function configuredCodexHome() {
  return process.env.CODEX_HOME ?? join(homedir(), '.codex')
}

async function startModelAuthProxy(upstream, token) {
  const child = spawn(process.execPath, [join(EVAL_ROOT, 'model-auth-proxy.mjs'), upstream], {
    env: { ...modelEnvironment(), MODEL_AUTH_TOKEN: token },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  try {
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
      async stop() {
        if (child.exitCode !== null) return
        const exited = once(child, 'exit')
        child.kill('SIGTERM')
        const stopped = await Promise.race([exited.then(() => true), delay(2_000).then(() => false)])
        if (!stopped && child.exitCode === null) {
          child.kill('SIGKILL')
          await Promise.race([exited, delay(1_000)])
        }
      },
    }
  } catch (error) {
    if (child.exitCode === null) {
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
  const bearerLine = tomlField(section, 'experimental_bearer_token')
  const baseUrlLine = tomlField(section, 'base_url')
  const bearerToken = bearerLine ? tomlStringValue(bearerLine) : undefined
  const baseUrl = baseUrlLine ? tomlStringValue(baseUrlLine) : undefined
  if (bearerLine && !bearerToken) throw new Error('model provider has an unparseable inline bearer token')
  if (bearerToken && !baseUrl) throw new Error('model provider has an inline bearer token but no parseable base_url')
  const authProxy = bearerToken && baseUrl ? await startModelAuthProxy(baseUrl, bearerToken) : undefined
  try {
    const providerSection = authProxy ? proxyProviderLines(section, authProxy.url) : section
    const codexHome = join(root, 'codex-home')
    mkdirSync(codexHome, { recursive: true })
    writeFileSync(
      join(codexHome, 'config.toml'),
      [
        ...topLevel,
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
    const modelCatalog = /^model_catalog_json\s*=\s*"([^"]+)"/m.exec(sourceConfig)?.[1]
    if (modelCatalog) copyFile(join(sourceHome, modelCatalog), join(codexHome, modelCatalog))
    return { authProxy, codexHome, credentialMode: authProxy ? 'host-proxy' : 'direct' }
  } catch (error) {
    if (authProxy) await authProxy.stop()
    throw error
  }
}

function isolatedCodexCommand(
  codexHome,
  project,
  responseRoot,
  trustedGit,
  sandbox,
  credentialMode,
  capabilities,
  allowSubagents,
  args,
) {
  const codexBinary = process.env.CODEX_BIN ?? 'codex'
  const codexPath = run('which', [codexBinary], {}).stdout.trim()
  if (!codexPath) throw new Error(`cannot find Codex binary: ${codexBinary}`)
  const miseInstalls = join(homedir(), '.local', 'share', 'mise', 'installs')
  const playwrightRoot = join(tmpdir(), 'playwright-browsers')
  const chromiumDirectory = existsSync(playwrightRoot)
    ? readdirSync(playwrightRoot)
        .filter((entry) => /^chromium-\d+$/.test(entry))
        .sort()
        .at(-1)
    : undefined
  const chromiumRoot = chromiumDirectory ? join(playwrightRoot, chromiumDirectory, 'chrome-linux64') : undefined
  const browserLibs = join(tmpdir(), 'browser-libs', 'usr', 'lib', 'x86_64-linux-gnu')
  const hasPlaywrightBrowser = chromiumRoot && executableFile(join(chromiumRoot, 'chrome')) && existsSync(browserLibs)
  const systemBrowser = browserExecutablePaths().find(executableFile)
  const hasBrowser = Boolean(hasPlaywrightBrowser) || Boolean(systemBrowser)
  const bundledMediaRoot = resolveMiseMediaRoot(miseInstalls)
  const systemMedia = mediaExecutablePaths().filter(executableFile)
  const hasSystemMedia = ['ffmpeg', 'ffprobe'].every((name) =>
    systemMedia.some((candidate) => basename(candidate) === name),
  )
  const hasMedia = Boolean(bundledMediaRoot) || hasSystemMedia
  const browserEnabled = resolveCapability('browser', capabilities?.browser ?? false, Boolean(hasBrowser))
  const mediaEnabled = resolveCapability('media', capabilities?.media ?? false, hasMedia)
  const mediaMount = mediaEnabled && bundledMediaRoot
  const sandboxMise = '/home/eval/.local/share/mise/installs'
  const toolPath = [
    join(sandboxMise, 'node', 'lts', 'bin'),
    join(sandboxMise, 'pnpm', 'latest'),
    ...(mediaMount ? ['/opt/ffmpeg/bin'] : []),
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
  ].join(':')
  return {
    command: 'bwrap',
    args: [
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
      '/etc',
      '/etc',
      ...capabilityMaskArgs(dirname(codexHome), browserEnabled, mediaEnabled),
      '--ro-bind',
      '/lib',
      '/lib',
      '--ro-bind',
      '/lib64',
      '/lib64',
      '--ro-bind',
      dirname(codexPath),
      '/opt/codex',
      sandbox === 'read-only' ? '--ro-bind' : '--bind',
      project,
      '/workspace',
      '--ro-bind',
      join(project, '.agents', 'skills'),
      '/workspace/.agents/skills',
      '--ro-bind',
      trustedGit,
      '/workspace/.git',
      '--bind',
      codexHome,
      '/codex-home',
      '--bind',
      responseRoot,
      '/response',
      '--tmpfs',
      '/home',
      '--dir',
      '/home/eval',
      '--dir',
      sandboxMise,
      '--dir',
      join(sandboxMise, 'node'),
      '--dir',
      join(sandboxMise, 'pnpm'),
      '--ro-bind',
      join(miseInstalls, 'node'),
      join(sandboxMise, 'node'),
      '--ro-bind',
      join(miseInstalls, 'pnpm'),
      join(sandboxMise, 'pnpm'),
      ...(mediaMount ? ['--ro-bind', mediaMount, '/opt/ffmpeg'] : []),
      ...(hasPlaywrightBrowser && browserEnabled
        ? ['--ro-bind', chromiumRoot, '/opt/chrome', '--ro-bind', join(tmpdir(), 'browser-libs'), '/opt/browser-libs']
        : []),
      '--tmpfs',
      '/tmp',
      '--proc',
      '/proc',
      '--dev',
      '/dev',
      '--chdir',
      '/workspace',
      'env',
      'HOME=/home/eval',
      'CODEX_HOME=/codex-home',
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
    cwd: project,
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

function changedPaths(project, base, environment, gitDirectory) {
  return parseNulSeparatedPaths(
    git(project, ['diff', '--cached', '--name-only', '-z', base], false, environment, gitDirectory).stdout,
  )
}

function retainArtifacts(project, output, paths, declaredOutputs) {
  const artifactRoot = join(output, 'artifact')
  const manifest = []
  const retainedPaths = new Set()
  mkdirSync(artifactRoot, { recursive: true })
  const outputPaths = [...paths]
  for (const declared of declaredOutputs) {
    const absolute = assertProjectPath(project, declared, 'declared output')
    const stat = lstatSync(absolute, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isDirectory()) {
      outputPaths.push(...listFiles(absolute).map((file) => join(declared, file)))
    } else {
      outputPaths.push(declared)
    }
  }
  for (const path of outputPaths) {
    if (retainedPaths.has(path)) continue
    if (/[\r\n]/.test(path))
      throw new Error(`the model produced an output path with a line break: ${JSON.stringify(path)}`)
    if (path.startsWith('.agents/skills/')) throw new Error(`the model changed an installed skill: ${path}`)
    const source = assertProjectPath(project, path, 'retained output')
    const stat = lstatSync(source, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isSymbolicLink()) throw new Error(`the model produced a symbolic link: ${path}`)
    if (!stat.isFile()) throw new Error(`the model produced a non-file output: ${path}`)
    const retained = assertNoSymlinkComponents(artifactRoot, join(artifactRoot, path), 'retained artifact')
    copyFile(source, retained)
    manifest.push(`${hashFile(retained)}  artifact/${path}`)
    retainedPaths.add(path)
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
  for (const output of scenario.outputs ?? []) assertRelativeProjectPath(output, 'scenario output')
  if (scenario.change_patch !== undefined) {
    assertNonEmptyString(scenario.change_patch, 'scenario change_patch')
    if (!scenario.files.includes(scenario.change_patch))
      throw new Error('scenario change_patch is not a declared input')
    assertNonEmptyString(scenario.change_root, 'scenario change_root')
    assertRelativeProjectPath(scenario.change_root, 'scenario change_root')
  }
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

function recoverPreviousOutput(output, backup) {
  if (!existsSync(backup)) return
  if (existsSync(output)) {
    removeModelTree(backup)
  } else {
    renameSync(backup, output)
  }
}

const options = parseOptions()
const scenario = readScenario(options.skill, options.scenario)
const output = resolve(REPO_ROOT, options.output)
assertEvidenceOutput(output)
const outputParent = dirname(output)
mkdirSync(outputParent, { recursive: true })
const outputLock = join(outputParent, `.${basename(output)}.lock`)
const backupOutput = `${output}.old`

let temporaryParent
let stagedOutput
let authProxy
let outputLockHandle
try {
  outputLockHandle = await acquireFileLock(outputLock)
  recoverPreviousOutput(output, backupOutput)
  if (existsSync(output) && !options.replace) throw new Error(`output already exists: ${output}`)
  stagedOutput = mkdtempSync(join(outputParent, '.run-'))
  temporaryParent = mkdtempSync(join(tmpdir(), 'skill-eval-project-'))
  const project = join(temporaryParent, 'project')
  const isolatedHome = await createIsolatedCodexHome(temporaryParent)
  authProxy = isolatedHome.authProxy
  const codexHome = isolatedHome.codexHome
  const responseRoot = join(temporaryParent, 'response')
  mkdirSync(project, { recursive: true })
  mkdirSync(responseRoot, { recursive: true })
  const installedSkills = stageScenario(options.skill, scenario, project)
  git(project, ['init', '-q'])
  git(project, ['config', 'user.name', 'Skill evaluation'])
  git(project, ['config', 'user.email', 'skill-evaluation@example.invalid'])
  const changeRoot = scenario.change_root ? ['--directory', scenario.change_root] : []
  if (scenario.change_patch) git(project, ['apply', '--binary', '--reverse', ...changeRoot, scenario.change_patch])
  git(project, ['add', '-A'])
  git(project, ['commit', '-qm', 'fixture: base state'])
  if (scenario.change_patch) {
    git(project, ['apply', '--binary', ...changeRoot, scenario.change_patch])
    git(project, ['add', '-A'])
    git(project, ['commit', '-qm', 'fixture: candidate state'])
  }
  const trustedHead = git(project, ['rev-parse', 'HEAD']).stdout.trim()
  const trustedGit = join(temporaryParent, 'trusted-git')
  copyTrustedGit(project, trustedGit)

  const inputManifest = (scenario.files ?? []).map((path) => {
    const absolute = assertProjectPath(project, path, 'scenario input')
    assertRegularNonEmptyFile(absolute, 'scenario input')
    return `${hashFile(absolute)}  ${path}  mode=${modeBits(absolute)}`
  })
  writeFileSync(join(stagedOutput, 'input-manifest.sha256'), `${inputManifest.join('\n')}\n`)
  writeFileSync(
    join(stagedOutput, 'scenario-definition.sha256'),
    `${sha256(canonicalJson(scenario))}  ${options.skill}:${options.scenario}\n`,
  )
  writeFileSync(join(stagedOutput, 'scenario-definition.json'), `${JSON.stringify(scenario, null, 2)}\n`)
  const installedBefore = skillTreeHashes(project, installedSkills)
  writeFileSync(join(stagedOutput, 'skill-hashes.txt'), `${installedBefore.join('\n')}\n`)
  writeFileSync(
    join(stagedOutput, 'assertions.expected.txt'),
    `${scenario.assertions.map((assertion) => `PASS ${assertion}`).join('\n')}\n`,
  )

  const started = performance.now()
  const imageArguments = (scenario.files ?? [])
    .filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file))
    .flatMap((file) => ['--image', `/workspace/${file}`])
  const subagentInstruction = scenario.allow_subagents ? 'You may spawn subagents.' : 'Do not spawn subagents.'
  const invocation = isolatedCodexCommand(
    codexHome,
    project,
    responseRoot,
    trustedGit,
    options.sandbox,
    isolatedHome.credentialMode,
    scenario.capabilities,
    scenario.allow_subagents ?? false,
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
      `${scenario.prompt}\n\nUse the installed skill at .agents/skills/${options.skill}/SKILL.md for this task. Work only inside the current project. ${subagentInstruction} Do not read outside this project.`,
    ],
  )
  writeFileSync(join(stagedOutput, 'capabilities.json'), `${JSON.stringify(invocation.profile, null, 2)}\n`)
  const result = run(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    env: modelEnvironment(),
  })
  const elapsed = (performance.now() - started) / 1000

  const trace = sanitizeEvidenceText(result.stdout)
  writeFileSync(join(stagedOutput, 'trace.jsonl'), trace)
  writeFileSync(join(stagedOutput, 'stderr.log'), sanitizeEvidenceText(result.stderr))
  writeFileSync(join(stagedOutput, 'time.txt'), `time_seconds: ${elapsed.toFixed(2)}\n`)
  assertAnswerManifestWasNotRead(trace)
  const finalResponse = join(responseRoot, 'final.md')
  assertRegularNonEmptyFile(finalResponse, 'Codex final response')
  const finalText = sanitizeEvidenceText(readFileSync(finalResponse, 'utf8'))
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
  retainArtifacts(project, stagedOutput, paths, scenario.outputs ?? [])

  const installedAfter = skillTreeHashes(project, installedSkills)
  if (installedBefore.join('\n') !== installedAfter.join('\n')) {
    throw new Error('the installed skill tree changed during the run')
  }
  writeFileSync(
    join(stagedOutput, 'status.txt'),
    `status: pending\nrun_exit_code: ${result.status ?? 'unknown'}\nassertions: pending\n`,
  )

  const lastLine = result.stdout.trim().split('\n').filter(Boolean).at(-1)
  const completion = lastLine ? JSON.parse(lastLine) : undefined
  const usage = completion?.type === 'turn.completed' ? completion.usage : undefined
  if (usage) {
    writeFileSync(
      join(stagedOutput, 'usage.txt'),
      `input_tokens: ${usage.input_tokens ?? 'unknown'}\noutput_tokens: ${usage.output_tokens ?? 'unknown'}\n`,
    )
  }

  removeModelTree(temporaryParent)
  temporaryParent = undefined

  if (result.status !== 0) {
    console.error(result.stderr)
    process.exitCode = result.status ?? 1
  } else {
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

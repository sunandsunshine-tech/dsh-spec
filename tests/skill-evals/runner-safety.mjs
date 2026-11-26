import {
  chmodSync,
  closeSync,
  constants,
  cpSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  opendirSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'

const browserCandidates = [
  '/usr/local/bin/chromium',
  '/usr/local/bin/chromium-browser',
  '/usr/local/bin/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/chrome',
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
]

const mediaCandidates = [
  '/usr/local/bin/ffmpeg',
  '/usr/local/bin/ffprobe',
  '/usr/bin/ffmpeg',
  '/usr/bin/ffprobe',
  '/bin/ffmpeg',
  '/bin/ffprobe',
]

export const MODEL_EVIDENCE_LIMITS = Object.freeze({
  artifactBytes: 64 * 1024 * 1024,
  artifactFiles: 256,
  artifactFileBytes: 16 * 1024 * 1024,
  codexHomeBytes: 64 * 1024 * 1024,
  codexHomeEntries: 4096,
  finalResponseBytes: 2 * 1024 * 1024,
  homeBytes: 128 * 1024 * 1024,
  responseBytes: 8 * 1024 * 1024,
  responseEntries: 32,
  stderrBytes: 128 * 1024 * 1024,
  stdoutBytes: 128 * 1024 * 1024,
  temporaryBytes: 512 * 1024 * 1024,
  traceBytes: 128 * 1024 * 1024,
  workspaceBytes: 512 * 1024 * 1024,
  workspaceEntries: 8192,
})

export function sandboxTmpfsArgs(limits = MODEL_EVIDENCE_LIMITS, { includeWorkspace = true } = {}) {
  return [
    ...(includeWorkspace ? ['--size', String(limits.workspaceBytes), '--tmpfs', '/workspace'] : []),
    '--size',
    String(limits.codexHomeBytes),
    '--tmpfs',
    '/codex-home',
    '--size',
    String(limits.responseBytes),
    '--tmpfs',
    '/response',
    '--size',
    String(limits.homeBytes),
    '--tmpfs',
    '/home',
    '--size',
    String(limits.temporaryBytes),
    '--tmpfs',
    '/tmp',
  ]
}

export function isolatedGitEnvironment(extra = {}, inherited = process.env) {
  const environment = Object.fromEntries(
    Object.entries(inherited).filter(([key, value]) => !key.startsWith('GIT_') && value !== undefined),
  )
  return {
    ...environment,
    GIT_CONFIG_COUNT: '0',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_OPTIONAL_LOCKS: '0',
    ...extra,
  }
}

export function assertContained(root, path, label) {
  const local = relative(root, path)
  if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
    throw new Error(`${label} escapes ${root}: ${path}`)
  }
}

export function assertNoSymlinkComponents(root, path, label) {
  const rootReal = realpathSync(root)
  assertContained(rootReal, path, label)
  let current = rootReal
  for (const component of relative(rootReal, path).split(sep).filter(Boolean)) {
    current = join(current, component)
    const stat = lstatSync(current, { throwIfNoEntry: false })
    if (!stat) break
    if (stat.isSymbolicLink()) throw new Error(`${label} contains a symbolic link: ${path}`)
  }
  return path
}

export function assertRealContained(root, path, label) {
  const rootReal = realpathSync(root)
  assertContained(rootReal, path, label)
  let existing = path
  while (!lstatSync(existing, { throwIfNoEntry: false })) {
    const parent = dirname(existing)
    if (parent === existing) throw new Error(`${label} has no existing ancestor: ${path}`)
    existing = parent
  }
  const existingReal = realpathSync(existing)
  assertContained(rootReal, existingReal, label)
  return existingReal
}

export function assertRegularNonEmptyFile(path, label, maxBytes = Number.POSITIVE_INFINITY) {
  const stat = lstatSync(path, { throwIfNoEntry: false })
  if (!stat) throw new Error(`${label} does not exist: ${path}`)
  if (stat.isSymbolicLink()) throw new Error(`${label} is a symbolic link: ${path}`)
  if (!stat.isFile()) throw new Error(`${label} is not a regular file: ${path}`)
  if (stat.size === 0) throw new Error(`${label} is empty: ${path}`)
  if (stat.size > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes: ${path}`)
  return stat
}

export function assertInputFile(inputRoot, file, label) {
  if (!file.startsWith('evals/files/')) throw new Error(`${label} names an input outside evals/files: ${file}`)
  const source = resolve(inputRoot, file)
  assertRealContained(join(inputRoot, 'evals', 'files'), source, label)
  assertNoSymlinkComponents(join(inputRoot, 'evals', 'files'), source, label)
  assertRegularNonEmptyFile(source, label)
  return source
}

export function assertProjectPath(project, path, label) {
  const absolute = resolve(project, path)
  assertRealContained(project, absolute, label)
  assertNoSymlinkComponents(project, absolute, label)
  return absolute
}

const credentialNameParts = new Set([
  'auth',
  'authorization',
  'bearer',
  'credential',
  'credentials',
  'key',
  'password',
  'secret',
  'sig',
  'signature',
  'token',
])

const credentialCompoundNames = new Set([
  'accesskey',
  'accesskeyid',
  'apikey',
  'authkey',
  'authkeyid',
  'authorizationkey',
  'bearerkey',
  'credentialkey',
  'keyid',
  'passwordkey',
  'privatekey',
  'secretkey',
  'sessionkey',
  'subscriptionkey',
  'tokenkey',
])

function isCredentialName(name) {
  const compactName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const parts = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return parts.some(
    (part) =>
      credentialNameParts.has(part) ||
      credentialCompoundNames.has(part) ||
      /(?:token|secret|password|credential|credentials|signature)$/.test(part) ||
      /^(?:access|api|auth|authorization|bearer|client|credential|credentials|password|private|secret|session|signing|subscription|token)key(?:id)?$/.test(
        compactName,
      ),
  )
}

export function assertCredentialFreeBaseUrl(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} is not a valid absolute URL`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`${label} must use http or https`)
  if (url.username || url.password) throw new Error(`${label} contains URL userinfo`)
  for (const key of url.searchParams.keys()) {
    if (isCredentialName(key)) {
      throw new Error(`${label} contains a credential-like query parameter: ${key}`)
    }
  }
  return url
}

const nonNetworkCatalogSchemes = new Set(['app:', 'file:', 'plugin:', 'skill:', 'vscode:'])

function assertCredentialFreeCatalogUrls(value, label) {
  if (Array.isArray(value)) {
    for (const child of value) assertCredentialFreeCatalogUrls(child, label)
    return
  }
  if (typeof value === 'string') {
    for (const match of value.matchAll(/[a-z][a-z0-9+.-]*:\/\/[^\s<>"'`]*/gi)) {
      const candidate = match[0].replace(/[),.;!?}\]]+$/, '')
      if (/^[a-z][a-z0-9+.-]*:\/\/$/i.test(candidate)) continue
      let url
      try {
        url = new URL(candidate)
      } catch {
        throw new Error(`${label} URL is not a valid absolute URL`)
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:' && !nonNetworkCatalogSchemes.has(url.protocol)) {
        throw new Error(`${label} URL must use http or https`)
      }
      if (url.username || url.password) throw new Error(`${label} URL contains URL userinfo`)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue
      for (const key of url.searchParams.keys()) {
        if (isCredentialName(key)) {
          throw new Error(`${label} URL contains a credential-like query parameter: ${key}`)
        }
      }
    }
    return
  }
  if (!value || typeof value !== 'object') return
  for (const child of Object.values(value)) assertCredentialFreeCatalogUrls(child, label)
}

const modelCatalogEntryKeys = new Set([
  'apply_patch_tool_type',
  'auto_compact_token_limit',
  'auto_review_model_override',
  'availability_nux',
  'base_instructions',
  'comp_hash',
  'context_window',
  'default_reasoning_level',
  'default_reasoning_summary',
  'default_service_tier',
  'default_verbosity',
  'description',
  'display_name',
  'effective_context_window_percent',
  'experimental_supported_tools',
  'include_skills_usage_instructions',
  'input_modalities',
  'max_context_window',
  'minimal_client_version',
  'model_messages',
  'multi_agent_version',
  'prefer_websockets',
  'priority',
  'reasoning_summary_format',
  'shell_type',
  'slug',
  'support_verbosity',
  'supported_in_api',
  'supported_reasoning_levels',
  'supports_image_detail_original',
  'supports_parallel_tool_calls',
  'supports_reasoning_summaries',
  'supports_search_tool',
  'tool_mode',
  'truncation_policy',
  'upgrade',
  'use_responses_lite',
  'visibility',
  'web_search_tool_type',
])

const modelCatalogObjectKeys = new Map([
  ['', new Set(['models'])],
  ['models.[]', modelCatalogEntryKeys],
  [
    'models.[].model_messages',
    new Set([
      'approvals',
      'apps',
      'auto_review',
      'collaboration_modes',
      'confirmation_policies',
      'guardian_v2',
      'instructions_template',
      'instructions_variables',
      'multi_agent',
      'permissions',
      'persistent_instructions',
      'token_budget',
      'tools',
    ]),
  ],
  [
    'models.[].model_messages.auto_review',
    new Set(['node_repl_policy', 'policy', 'policy_template', 'rejection_instructions', 'timeout_instructions']),
  ],
  ['models.[].model_messages.collaboration_modes', new Set(['default', 'plan'])],
  ['models.[].model_messages.confirmation_policies', new Set(['browser_use', 'computer_use'])],
  [
    'models.[].model_messages.instructions_variables',
    new Set(['personality_default', 'personality_friendly', 'personality_pragmatic']),
  ],
  ['models.[].model_messages.multi_agent', new Set(['mode', 'role'])],
  ['models.[].model_messages.multi_agent.role', new Set(['root', 'subagent'])],
  [
    'models.[].model_messages.token_budget',
    new Set([
      'auto_compact_fallback_buffer_tokens',
      'auto_compact_fallback_prompt',
      'enabled',
      'guidance_message',
      'reminder_message_template',
      'reminder_threshold_tokens',
      'use_history_notes_extension',
    ]),
  ],
  ['models.[].supported_reasoning_levels.[]', new Set(['description', 'effort'])],
  ['models.[].truncation_policy', new Set(['limit', 'mode'])],
])

function assertModelCatalogShape(value, path = '') {
  if (Array.isArray(value)) {
    for (const child of value) assertModelCatalogShape(child, `${path}.[]`)
    return
  }
  if (!value || typeof value !== 'object') return
  const allowed = modelCatalogObjectKeys.get(path)
  if (!allowed) throw new Error(`model catalog has an unexpected object at ${path || '<root>'}`)
  for (const [key, child] of Object.entries(value)) {
    if (!allowed.has(key)) throw new Error(`model catalog contains an unknown field: ${path ? `${path}.` : ''}${key}`)
    assertModelCatalogShape(child, path ? `${path}.${key}` : key)
  }
}

export function readSafeModelCatalog(sourceHome, value) {
  const source = resolve(sourceHome, value)
  assertContained(sourceHome, source, 'model catalog')
  assertNoSymlinkComponents(sourceHome, source, 'model catalog')
  assertRegularNonEmptyFile(source, 'model catalog')
  if (['auth.json', 'config.toml'].includes(source.split(/[\\/]/).at(-1))) {
    throw new Error('model catalog names a reserved credential-bearing file')
  }
  if (statSync(source).size > 16 * 1024 * 1024) throw new Error('model catalog exceeds 16 MiB')
  const text = readFileSync(source, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('model catalog is not valid JSON')
  }
  assertModelCatalogShape(parsed)
  if (!Array.isArray(parsed?.models) || parsed.models.length === 0) {
    throw new Error('model catalog must contain a non-empty models array')
  }
  for (const [index, model] of parsed.models.entries()) {
    if (!model || typeof model !== 'object' || Array.isArray(model) || typeof model.slug !== 'string' || !model.slug) {
      throw new Error(`model catalog entry ${index} has no non-empty slug`)
    }
  }
  assertCredentialFreeCatalogUrls(parsed, 'model catalog')
  return `${JSON.stringify(parsed)}\n`
}

export function assertEvidenceRunPath(evidenceRoot, output, expectedSkill) {
  const local = relative(evidenceRoot, output)
  const parts = local.split(sep)
  if (
    parts.length !== 3 ||
    parts.some((part) => !part || part === '..') ||
    !/^\d{4}-\d{2}-\d{2}(?:-[a-z0-9][a-z0-9-]*)?$/.test(parts[0] ?? '') ||
    !/^dsh-spec-[a-z0-9-]+$/.test(parts[1] ?? '') ||
    !/^[a-z0-9][a-z0-9-]*$/.test(parts[2] ?? '')
  )
    throw new Error(`evidence output must be evidence/<date>/<skill>/<run>: ${output}`)
  if (expectedSkill !== undefined && parts[1] !== expectedSkill)
    throw new Error(`evidence output names ${parts[1]}, expected ${expectedSkill}: ${output}`)
  assertRealContained(evidenceRoot, output, 'evidence output')
  assertNoSymlinkComponents(evidenceRoot, output, 'evidence output')
}

export function parseNulSeparatedPaths(output) {
  return output.split('\0').filter(Boolean)
}

export function addOutputBytes(currentBytes, chunk, limitBytes, label) {
  const nextBytes = currentBytes + Buffer.byteLength(chunk)
  if (nextBytes > limitBytes) throw new Error(`${label} exceeds ${limitBytes} bytes`)
  return nextBytes
}

export function runInterruptible(command, args, options, onSpawn, { deadlineMs } = {}) {
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) {
    return Promise.reject(new Error('deadlineMs must be a positive integer'))
  }
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
    onSpawn?.(child)
    const stdout = []
    const stderr = []
    let stdoutBytes = 0
    let stderrBytes = 0
    let outputError
    let interrupted
    let timedOut = false
    let killTimer
    let deadlineTimer
    const cleanup = () => {
      process.off('SIGINT', interrupt)
      process.off('SIGTERM', interrupt)
      if (killTimer) clearTimeout(killTimer)
      if (deadlineTimer) clearTimeout(deadlineTimer)
    }
    const terminate = (signal) => {
      child.kill(signal)
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
      }, 2_000)
    }
    const interrupt = (signal) => {
      interrupted = signal
      terminate(signal)
    }
    process.once('SIGINT', interrupt)
    process.once('SIGTERM', interrupt)
    deadlineTimer = setTimeout(() => {
      timedOut = true
      terminate('SIGTERM')
    }, deadlineMs)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      try {
        stdoutBytes = addOutputBytes(stdoutBytes, chunk, MODEL_EVIDENCE_LIMITS.stdoutBytes, 'model stdout')
        stdout.push(chunk)
      } catch (error) {
        outputError ??= error
        child.kill('SIGKILL')
      }
    })
    child.stderr.on('data', (chunk) => {
      try {
        stderrBytes = addOutputBytes(stderrBytes, chunk, MODEL_EVIDENCE_LIMITS.stderrBytes, 'model stderr')
        stderr.push(chunk)
      } catch (error) {
        outputError ??= error
        child.kill('SIGKILL')
      }
    })
    child.once('error', (error) => {
      cleanup()
      rejectRun(error)
    })
    child.once('close', (status, signal) => {
      cleanup()
      if (outputError) {
        rejectRun(outputError)
        return
      }
      resolveRun({ status, signal, stdout: stdout.join(''), stderr: stderr.join(''), interrupted, timedOut })
    })
  })
}

export function openRegularFileNoFollow(path, label, maxBytes = Number.POSITIVE_INFINITY) {
  if (!constants.O_NOFOLLOW || !constants.O_NONBLOCK) {
    throw new Error(`${label} cannot be opened safely on this platform`)
  }
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const stat = fstatSync(fd)
    if (!stat.isFile()) throw new Error(`${label} is not a regular file: ${path}`)
    if (stat.size > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes: ${path}`)
    return { fd, stat }
  } catch (error) {
    closeSync(fd)
    throw error
  }
}

export function hashFileNoFollow(path, maxBytes = Number.POSITIVE_INFINITY) {
  const { fd } = openRegularFileNoFollow(path, 'file hash', maxBytes)
  try {
    const hash = createHash('sha256')
    const buffer = Buffer.allocUnsafe(64 * 1024)
    let bytesRead = 0
    for (;;) {
      const bytes = readSync(fd, buffer, 0, buffer.length, null)
      if (bytes === 0) return hash.digest('hex')
      bytesRead += bytes
      if (bytesRead > maxBytes) throw new Error(`file hash exceeds ${maxBytes} bytes: ${path}`)
      hash.update(buffer.subarray(0, bytes))
    }
  } finally {
    closeSync(fd)
  }
}

export function readFileNoFollowLimited(path, label, maxBytes) {
  const { fd, stat } = openRegularFileNoFollow(path, label, maxBytes)
  try {
    if (stat.size === 0) throw new Error(`${label} is empty: ${path}`)
    const contents = Buffer.allocUnsafe(stat.size)
    let bytesRead = 0
    while (bytesRead < contents.length) {
      const bytes = readSync(fd, contents, bytesRead, contents.length - bytesRead, null)
      if (bytes === 0) throw new Error(`${label} changed while being read: ${path}`)
      bytesRead += bytes
    }
    if (readSync(fd, Buffer.allocUnsafe(1), 0, 1, null) !== 0) {
      throw new Error(`${label} changed while being read: ${path}`)
    }
    return contents
  } finally {
    closeSync(fd)
  }
}

export function copyFileNoFollowLimited(source, destination, maxBytes) {
  const { fd: sourceFd, stat } = openRegularFileNoFollow(source, 'copy source', maxBytes)
  let destinationFd
  let destinationCreated = false
  try {
    mkdirSync(dirname(destination), { recursive: true })
    destinationFd = openSync(
      destination,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
      stat.mode & 0o777,
    )
    destinationCreated = true
    const hash = createHash('sha256')
    const buffer = Buffer.allocUnsafe(64 * 1024)
    let bytesCopied = 0
    for (;;) {
      const bytesRead = readSync(sourceFd, buffer, 0, buffer.length, null)
      if (bytesRead === 0) break
      bytesCopied += bytesRead
      if (bytesCopied > maxBytes) throw new Error(`copy source exceeds ${maxBytes} bytes: ${source}`)
      hash.update(buffer.subarray(0, bytesRead))
      let bytesWritten = 0
      while (bytesWritten < bytesRead) {
        bytesWritten += writeSync(destinationFd, buffer, bytesWritten, bytesRead - bytesWritten)
      }
    }
    if (bytesCopied !== stat.size) throw new Error(`copy source changed while being copied: ${source}`)
    chmodSync(destination, stat.mode & 0o777)
    return { bytes: bytesCopied, sha256: hash.digest('hex') }
  } catch (error) {
    if (destinationFd !== undefined) closeSync(destinationFd)
    destinationFd = undefined
    if (destinationCreated) unlinkSync(destination)
    throw error
  } finally {
    closeSync(sourceFd)
    if (destinationFd !== undefined) closeSync(destinationFd)
  }
}

function joinRelative(prefix, name) {
  return prefix ? `${prefix}/${name}` : name
}

function ensureDirectory(path, mode) {
  const existing = lstatSync(path, { throwIfNoEntry: false })
  if (existing?.isSymbolicLink() || (existing && !existing.isDirectory())) {
    throw new Error(`bounded copy destination is not a directory: ${path}`)
  }
  if (!existing) mkdirSync(path, { mode })
  chmodSync(path, mode)
}

export function copyTreeBounded(options) {
  const { sourceRoot, destinationRoot, maxEntries, maxBytes, maxFileBytes, skip = () => false } = options
  const sourceStat = lstatSync(sourceRoot)
  if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
    throw new Error(`bounded copy source is not a directory: ${sourceRoot}`)
  }
  mkdirSync(destinationRoot, { recursive: true })
  let entries = 0
  let files = 0
  let bytes = 0

  const copyDirectory = (sourceDirectory, destinationDirectory, relativeDirectory) => {
    const directory = opendirSync(sourceDirectory)
    try {
      for (;;) {
        const entry = directory.readSync()
        if (!entry) break
        const relative = joinRelative(relativeDirectory, entry.name)
        if (skip(relative, entry)) continue
        entries += 1
        if (entries > maxEntries) throw new Error(`bounded copy exceeds ${maxEntries} entries`)
        const source = join(sourceDirectory, entry.name)
        const destination = join(destinationDirectory, entry.name)
        const stat = lstatSync(source)
        if (stat.isSymbolicLink()) throw new Error(`bounded copy source contains a symbolic link: ${relative}`)
        if (stat.isDirectory()) {
          ensureDirectory(destination, stat.mode & 0o777)
          copyDirectory(source, destination, relative)
          continue
        }
        if (!stat.isFile()) throw new Error(`bounded copy source contains a non-file: ${relative}`)
        files += 1
        if (files > maxEntries) throw new Error(`bounded copy exceeds ${maxEntries} files`)
        if (stat.size > maxFileBytes) throw new Error(`bounded copy file exceeds ${maxFileBytes} bytes: ${relative}`)
        if (bytes + stat.size > maxBytes) throw new Error(`bounded copy exceeds ${maxBytes} bytes`)
        const copied = copyFileNoFollowLimited(source, destination, maxFileBytes)
        bytes += copied.bytes
      }
    } finally {
      directory.closeSync()
    }
  }

  copyDirectory(sourceRoot, destinationRoot, '')
  return { bytes, entries, files }
}

function listFilesBounded(root, prefix, maxFiles) {
  const files = []
  const directory = opendirSync(root)
  try {
    for (;;) {
      const entry = directory.readSync()
      if (!entry) break
      const relative = joinRelative(prefix, entry.name)
      const absolute = join(root, entry.name)
      const stat = lstatSync(absolute)
      if (stat.isSymbolicLink()) throw new Error(`output contains a symbolic link: ${relative}`)
      if (stat.isDirectory()) {
        files.push(...listFilesBounded(absolute, relative, maxFiles - files.length))
      } else if (stat.isFile()) {
        files.push(relative)
      } else {
        throw new Error(`output contains a non-file: ${relative}`)
      }
      if (files.length > maxFiles) throw new Error(`output contains more than ${maxFiles} files`)
    }
  } finally {
    directory.closeSync()
  }
  return files
}

export function collectArtifactSources(project, paths, declaredOutputs, limits = MODEL_EVIDENCE_LIMITS) {
  const outputPaths = [...paths]
  for (const declared of declaredOutputs) {
    const absolute = assertProjectPath(project, declared, 'declared output')
    const stat = lstatSync(absolute, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isDirectory()) {
      for (const file of listFilesBounded(absolute, '', limits.artifactFiles)) {
        outputPaths.push(join(declared, file))
      }
    } else {
      outputPaths.push(declared)
    }
  }

  const sources = []
  const seen = new Set()
  let bytes = 0
  for (const path of outputPaths) {
    if (seen.has(path)) continue
    seen.add(path)
    if (/[\r\n]/.test(path))
      throw new Error(`the model produced an output path with a line break: ${JSON.stringify(path)}`)
    if (path.startsWith('.agents/skills/')) throw new Error(`the model changed an installed skill: ${path}`)
    const source = assertProjectPath(project, path, 'retained output')
    const stat = lstatSync(source, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isSymbolicLink()) throw new Error(`the model produced a symbolic link: ${path}`)
    if (!stat.isFile()) throw new Error(`the model produced a non-file output: ${path}`)
    if (sources.length + 1 > limits.artifactFiles)
      throw new Error(`the model produced more than ${limits.artifactFiles} artifacts`)
    if (stat.size > limits.artifactFileBytes) {
      throw new Error(`the model produced an artifact above ${limits.artifactFileBytes} bytes: ${path}`)
    }
    bytes += stat.size
    if (bytes > limits.artifactBytes)
      throw new Error(`the model produced more than ${limits.artifactBytes} artifact bytes`)
    sources.push({ path, source, stat })
  }
  return sources
}

export function executableFile(path) {
  try {
    const stat = statSync(realpathSync(path))
    return stat.isFile() && (stat.mode & 0o111) !== 0
  } catch {
    return false
  }
}

export function resolveExecutableFile(path) {
  try {
    const resolved = realpathSync(path)
    const stat = statSync(resolved)
    return stat.isFile() && (stat.mode & 0o111) !== 0 ? resolved : undefined
  } catch {
    return undefined
  }
}

export function resolveMiseMediaRoot(miseInstalls) {
  try {
    const root = realpathSync(join(miseInstalls, 'ffmpeg', 'latest'))
    return executableFile(join(root, 'bin', 'ffmpeg')) && executableFile(join(root, 'bin', 'ffprobe'))
      ? root
      : undefined
  } catch {
    return undefined
  }
}

export function proxyProviderLines(lines, proxyUrl, proxyToken) {
  let replacedBase = false
  const rewritten = []
  for (const line of lines) {
    const key = line.split('=')[0]?.trim()
    if (key === 'base_url') {
      rewritten.push(`base_url = ${JSON.stringify(proxyUrl)}`)
      replacedBase = true
    } else if (key === 'experimental_bearer_token') {
      rewritten.push(`experimental_bearer_token = ${JSON.stringify(proxyToken)}`)
    } else if (key !== 'env_key') {
      rewritten.push(line)
    }
  }
  if (!replacedBase) throw new Error('provider configuration has no base_url for the local auth proxy')
  return rewritten
}

export function tomlStringValue(line) {
  const match = /^\s*[^=]+?\s*=\s*(?:"((?:\\.|[^"\\])*)"|'([^']*)')\s*(?:#.*)?$/.exec(line)
  if (!match) return undefined
  if (match[2] !== undefined) return match[2]
  try {
    return JSON.parse(`"${match[1]}"`)
  } catch {
    return undefined
  }
}

export function singleTomlStringField(section, key, label) {
  const declarations = section.filter((line) => line.split('=')[0]?.trim() === key)
  if (declarations.length > 1) throw new Error(`${label} is declared more than once`)
  if (declarations.length === 0) return undefined
  const value = tomlStringValue(declarations[0])
  if (value === undefined) throw new Error(`${label} is unparseable`)
  return value
}

export function tomlField(section, key) {
  return section.find((line) => line.split('=')[0]?.trim() === key)
}

export async function acquireFileLock(path) {
  const child = spawn('flock', ['--nonblock', path, 'sh', '-c', "printf 'ready\\n'; exec cat >/dev/null"], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => {
    stderr += chunk
  })
  try {
    await Promise.race([
      new Promise((resolveReady, reject) => {
        let stdout = ''
        child.stdout.setEncoding('utf8')
        child.stdout.on('data', (chunk) => {
          stdout += chunk
          const newline = stdout.indexOf('\n')
          if (newline < 0) return
          if (stdout.slice(0, newline).trim() === 'ready') resolveReady()
          else reject(new Error('file lock helper returned an unexpected readiness value'))
        })
        child.once('error', reject)
        child.once('exit', () => reject(new Error(`output lock is held: ${path}${stderr ? `\n${stderr}` : ''}`)))
      }),
      delay(2_000).then(() => {
        throw new Error(`output lock did not become ready: ${path}`)
      }),
    ])
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    await Promise.race([once(child, 'exit'), delay(1_000)])
    throw error
  }
  return {
    async release() {
      if (child.exitCode !== null || child.signalCode !== null) return
      const exited = once(child, 'exit')
      child.stdin.end()
      const stopped = await Promise.race([exited.then(() => true), delay(2_000).then(() => false)])
      if (!stopped && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL')
        await Promise.race([exited, delay(1_000)])
      }
    },
  }
}

export function removeModelTree(path) {
  const stat = lstatSync(path, { throwIfNoEntry: false })
  if (!stat) return
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    unlinkSync(path)
    return
  }
  chmodSync(path, 0o700)
  for (const entry of readdirSync(path)) removeModelTree(join(path, entry))
  rmdirSync(path)
}

export function resolveCapability(name, requested, available) {
  if (requested === false) return false
  if (requested === true && !available) throw new Error(`scenario requires ${name}, but it is unavailable`)
  return available
}

export function capabilityMaskPaths(browserEnabled, mediaEnabled) {
  return [...(browserEnabled ? [] : browserCandidates), ...(mediaEnabled ? [] : mediaCandidates)]
}

export function browserExecutablePaths() {
  return [...browserCandidates]
}

export function mediaExecutablePaths() {
  return [...mediaCandidates]
}

export function modeBits(path) {
  return lstatSync(path).mode & 0o111 ? '0755' : '0644'
}

export function copyTrustedGit(project, destination) {
  cpSync(join(project, '.git'), destination, { recursive: true })
}

export function trustedGitArgs(gitDirectory, project, args) {
  return ['-c', 'core.hooksPath=/dev/null', '--git-dir=' + gitDirectory, '--work-tree=' + project, ...args]
}

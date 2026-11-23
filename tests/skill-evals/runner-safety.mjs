import {
  chmodSync,
  closeSync,
  constants,
  cpSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  realpathSync,
  rmdirSync,
  statSync,
  unlinkSync,
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

export function assertRegularNonEmptyFile(path, label) {
  const stat = lstatSync(path, { throwIfNoEntry: false })
  if (!stat) throw new Error(`${label} does not exist: ${path}`)
  if (stat.isSymbolicLink()) throw new Error(`${label} is a symbolic link: ${path}`)
  if (!stat.isFile()) throw new Error(`${label} is not a regular file: ${path}`)
  if (stat.size === 0) throw new Error(`${label} is empty: ${path}`)
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

export function assertCredentialFreeBaseUrl(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} is not a valid absolute URL`)
  }
  if (url.username || url.password) throw new Error(`${label} contains URL userinfo`)
  for (const key of url.searchParams.keys()) {
    if (/^(?:api[-_]?key|auth|authorization|bearer|key|password|secret|sig|signature|token)$/i.test(key)) {
      throw new Error(`${label} contains a credential-like query parameter: ${key}`)
    }
  }
  return url
}

function assertCredentialFreeJson(value, label) {
  if (Array.isArray(value)) {
    for (const child of value) assertCredentialFreeJson(child, label)
    return
  }
  if (typeof value === 'string' && /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      assertCredentialFreeBaseUrl(value, label)
    } catch (error) {
      if (/credential|userinfo/i.test(String(error))) throw error
    }
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:api[-_]?key|auth|authorization|bearer|bearer[-_]?token|password|secret|token)$/i.test(key)) {
      throw new Error(`${label} contains a credential field: ${key}`)
    }
    assertCredentialFreeJson(child, label)
  }
}

export function readSafeModelCatalog(sourceHome, value) {
  const source = resolve(sourceHome, value)
  assertContained(sourceHome, source, 'model catalog')
  assertNoSymlinkComponents(sourceHome, source, 'model catalog')
  assertRegularNonEmptyFile(source, 'model catalog')
  if (statSync(source).size > 16 * 1024 * 1024) throw new Error('model catalog exceeds 16 MiB')
  const text = readFileSync(source, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('model catalog is not valid JSON')
  }
  assertCredentialFreeJson(parsed, 'model catalog')
  return text
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

export function hashFileNoFollow(path) {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const stat = fstatSync(fd)
    if (!stat.isFile()) throw new Error(`file hash requires a regular file: ${path}`)
    const chunks = []
    const buffer = Buffer.allocUnsafe(64 * 1024)
    let position = 0
    for (;;) {
      const bytes = readSync(fd, buffer, 0, buffer.length, position)
      if (bytes === 0) break
      chunks.push(Buffer.from(buffer.subarray(0, bytes)))
      position += bytes
    }
    return createHash('sha256').update(Buffer.concat(chunks)).digest('hex')
  } finally {
    closeSync(fd)
  }
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

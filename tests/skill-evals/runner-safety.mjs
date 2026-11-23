import {
  chmodSync,
  closeSync,
  constants,
  cpSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

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

export function modeBits(path) {
  return (lstatSync(path).mode & 0o777).toString(8).padStart(4, '0')
}

export function copyTrustedGit(project, destination) {
  cpSync(join(project, '.git'), destination, { recursive: true })
}

export function trustedGitArgs(gitDirectory, project, args) {
  return ['-c', 'core.hooksPath=/dev/null', '--git-dir=' + gitDirectory, '--work-tree=' + project, ...args]
}

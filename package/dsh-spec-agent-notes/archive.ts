/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.3-alpha.2` (`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// The frozen archive: class folders, sealed artifacts, the manifest and the Git baseline that
// makes the manifest append-only. Sealing is archive --prepare then archive --write; verification never writes.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import type { MemberMapping, Options } from './cli/args.ts'
import { ARCHIVE, ARCHIVE_ROOT_ALLOWLIST, CLASSES, FILENAME, GITKEEP, isClassKind, MANIFEST } from './constants.ts'
import { companionSuffixOf, proseLines, validDate } from './format.ts'
import {
  display,
  git,
  gitDirectory,
  isDirectory,
  safeReaddir,
  safeReadFile,
  safeRealpath,
  type NotesPaths,
  type ProjectLayout,
  type Violation,
} from './guards.ts'
import {
  comparePaths,
  contentHash,
  emptyManifest,
  extendManifest,
  parseManifest,
  readBaseline,
  renderManifest,
  type Manifest,
} from './manifest.ts'

export interface ArchiveSummary {
  artifacts: number
  sealed: number
  plan?: ArchiveSealPlan
}

export interface ArchiveResult {
  command: 'archive'
  errors: Violation[]
  summary: ArchiveSummary
}

interface UnitKey {
  kind: string
  key: string
  unitKey: string
}

interface Unit {
  paths: string[]
  kind: string
  key: string
}

interface SealPlan {
  version: 1
  baseCommit: string
  manifestHash: string
  companions: string[]
  members: MemberMapping[]
  preflight: string[]
  artifacts: { path: string; hash: string }[]
}

export interface ArchiveSealPlan extends SealPlan {
  id: string
}

function sealPlanFor(
  baseCommit: string,
  manifest: Manifest,
  added: readonly string[],
  artifacts: Map<string, Buffer>,
  companions: readonly string[],
  members: readonly MemberMapping[],
  preflight: readonly string[],
): SealPlan {
  return {
    version: 1,
    baseCommit,
    manifestHash: contentHash(Buffer.from(renderManifest(manifest.files))),
    companions: [...new Set(companions)].sort(comparePaths),
    members: [...members].sort(
      (left, right) => comparePaths(left.source, right.source) || comparePaths(left.companion, right.companion),
    ),
    preflight: [...preflight],
    artifacts: added.map((path) => {
      const content = artifacts.get(path)
      if (content === undefined) throw new Error(`archive artifact disappeared while planning: ${path}`)
      return { path, hash: contentHash(content) }
    }),
  }
}

function planDigest(plan: SealPlan): string {
  return createHash('sha256').update(JSON.stringify(plan)).digest('hex')
}

function renderPlan(plan: SealPlan): ArchiveSealPlan {
  return { id: planDigest(plan), ...plan }
}

function runPreflight(projectRoot: string, command: string, args: readonly string[]): string[] {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  })
  if (result.error !== undefined) {
    return ['archive: preflight could not start ' + JSON.stringify(command) + ': ' + result.error.message]
  }
  if (result.status !== 0) {
    const status = result.status === null ? 'signal ' + String(result.signal) : 'exit ' + result.status
    const detail = (result.stderr || result.stdout || '').trim()
    return ['archive: preflight failed (' + status + ')' + (detail === '' ? '' : ': ' + detail)]
  }
  return []
}

function regularArchiveMemberPath(
  layout: ProjectLayout,
  archiveRoot: string,
  archiveReal: string | undefined,
  path: string,
): string | undefined {
  if (archiveReal === undefined) return 'archive root is unreadable'
  let current = archiveRoot
  const segments = path.split('/')
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment)
    let stat
    try {
      stat = lstatSync(current)
    } catch {
      return 'does not exist'
    }
    if (stat.isSymbolicLink()) return 'is a symbolic link'
    const final = index === segments.length - 1
    if (!final && !stat.isDirectory()) return 'has a non-directory ancestor'
    if (final && !stat.isFile()) return 'is not a regular file'
  }
  const real = safeRealpath(current)
  if (real === undefined) return 'is unreadable'
  if (real !== archiveReal && !real.startsWith(archiveReal + sep)) return 'resolves outside the archive root'
  if (!layout.isInsideProject(real)) return 'resolves outside the project checkout'
  if (layout.isInsideGitDirectory(real)) return "resolves inside the project's Git directory"
  return undefined
}

function explicitArchiveMembers(
  layout: ProjectLayout,
  archiveRoot: string,
  archiveReal: string | undefined,
  members: readonly MemberMapping[],
): { errors: Violation[]; canonical: MemberMapping[]; byCompanion: Map<string, string> } {
  const errors: Violation[] = []
  const byCompanion = new Map<string, string>()
  const sources = new Set<string>()
  const canonical = new Map<string, MemberMapping>()
  for (const member of members) {
    const sourceParts = member.source.split('/')
    if (sourceParts.length !== 2 || !isClassKind(sourceParts[0]) || !FILENAME.test(sourceParts[1])) {
      errors.push(`members: ${member.source} — source must be a direct {class}/yyyy-mm-dd-topic.md note`)
      continue
    }
    const companionParts = member.companion.split('/')
    if (companionParts.length < 2 || companionParts[0] !== sourceParts[0]) {
      errors.push(`members: ${member.source}=${member.companion} — companion must stay under the source class`)
      continue
    }
    const previous = byCompanion.get(member.companion)
    if (previous !== undefined && previous !== member.source) {
      errors.push(`members: ${member.companion} — companion is assigned to both ${previous} and ${member.source}`)
      continue
    }
    byCompanion.set(member.companion, member.source)
    sources.add(member.source)
    canonical.set(member.source + '\u0000' + member.companion, {
      source: member.source,
      companion: member.companion,
    })
    const sourceProblem = regularArchiveMemberPath(layout, archiveRoot, archiveReal, member.source)
    if (sourceProblem !== undefined) errors.push(`members: ${member.source} — source ${sourceProblem}`)
    const companionProblem = regularArchiveMemberPath(layout, archiveRoot, archiveReal, member.companion)
    if (companionProblem !== undefined) {
      errors.push(`members: ${member.companion} — companion ${companionProblem}`)
    }
  }
  for (const source of sources) {
    if (byCompanion.has(source)) {
      errors.push(`members: ${source} — a source note cannot also be a declared companion`)
    }
  }
  return {
    errors,
    canonical: [...canonical.values()].sort(
      (left, right) => comparePaths(left.source, right.source) || comparePaths(left.companion, right.companion),
    ),
    byCompanion,
  }
}

function collectClassMembers(
  archiveRoot: string,
  kind: string,
  prefix: string,
  errors: Violation[],
  artifacts: Map<string, Buffer>,
): void {
  const directory = prefix === '' ? join(archiveRoot, kind) : join(archiveRoot, kind, prefix)
  const label = ARCHIVE + '/' + kind + (prefix === '' ? '' : '/' + prefix)
  for (const entry of safeReaddir(directory, errors, 'archive: ' + label)) {
    const rel = kind + '/' + (prefix === '' ? '' : prefix + '/') + entry.name
    if (prefix === '' && entry.name === GITKEEP) continue
    if (entry.isDirectory()) {
      collectClassMembers(archiveRoot, kind, prefix === '' ? entry.name : prefix + '/' + entry.name, errors, artifacts)
      continue
    }
    if (!entry.isFile()) {
      errors.push(
        'archive: ' +
          rel +
          ' — class folders contain only regular files and directories; symbolic links and special entries are forbidden',
      )
      continue
    }
    const content = safeReadFile(join(archiveRoot, rel), errors, 'archive: ' + rel)
    if (content !== undefined) artifacts.set(rel, content)
  }
}

/**
 * The unit a frozen artifact belongs to: its class folder, its source-note stem and the
 * `{kind}/{stem}` key. A path that is neither Markdown nor a declared companion has no unit.
 */
function artifactStateErrors(archiveRoot: string, before: Map<string, Buffer>): Violation[] {
  const errors: Violation[] = []
  const after = new Map<string, Buffer>()
  for (const kind of CLASSES) {
    collectClassMembers(archiveRoot, kind, '', errors, after)
  }
  const expectedPaths = [...before.keys()].sort(comparePaths)
  const actualPaths = [...after.keys()].sort(comparePaths)
  if (expectedPaths.join('\n') !== actualPaths.join('\n')) {
    errors.push('archive: preflight changed the archive artifact set; prepare the seal again')
    return errors
  }
  for (const path of expectedPaths) {
    if (contentHash(before.get(path) ?? Buffer.alloc(0)) !== contentHash(after.get(path) ?? Buffer.alloc(0))) {
      errors.push('archive: preflight changed ' + path + '; prepare the seal again')
    }
  }
  return errors
}

function currentManifestHash(manifestPath: string): string | undefined {
  if (!existsSync(manifestPath)) return contentHash(Buffer.from(renderManifest(emptyManifest().files)))
  try {
    return contentHash(Buffer.from(renderManifest(parseManifest(readFileSync(manifestPath, 'utf8')).files)))
  } catch {
    return undefined
  }
}

function unitKeyFor(
  path: string,
  companions: readonly string[],
  byCompanion: ReadonlyMap<string, string>,
): UnitKey | undefined {
  const explicitSource = byCompanion.get(path)
  if (explicitSource !== undefined) {
    const [kind, name] = explicitSource.split('/')
    return { kind, key: name.slice(0, -3), unitKey: `${kind}/${name.slice(0, -3)}` }
  }
  const parts = path.split('/')
  if (parts.length !== 2) return undefined
  const [kind, name] = parts
  const companionSuffix = companionSuffixOf(name, companions)
  let key: string
  if (companionSuffix !== undefined) key = name.slice(0, -companionSuffix.length)
  else if (name.endsWith('.md')) key = name.slice(0, -3)
  else return undefined
  return { kind, key, unitKey: `${kind}/${key}` }
}

function unitErrors(
  artifacts: Map<string, Buffer>,
  companions: readonly string[],
  byCompanion: ReadonlyMap<string, string>,
  baselineFiles: Record<string, string>,
): Violation[] {
  const errors: Violation[] = []
  const units = new Map<string, Unit>()
  for (const path of artifacts.keys()) {
    const parsed = unitKeyFor(path, companions, byCompanion)
    if (parsed === undefined) {
      if (!Object.prototype.hasOwnProperty.call(baselineFiles, path)) {
        errors.push(
          'archive: ' +
            path +
            ' — not a Markdown note or a declared companion suffix (declared: ' +
            (companions.join(', ') || 'none') +
            ')',
        )
      }
      continue
    }
    const { kind, key, unitKey } = parsed
    if (companions.some((suffix) => (key + '.md').endsWith(suffix))) {
      errors.push(
        'archive: ' + unitKey + ' — the unit source ' + key + '.md is itself a declared companion; companions are flat',
      )
      continue
    }
    const unit = units.get(unitKey) ?? { paths: [], kind, key }
    unit.paths.push(path)
    units.set(unitKey, unit)
  }
  const baselineUnits = new Set<string>()
  for (const path of Object.keys(baselineFiles)) {
    const parsed = unitKeyFor(path, companions, byCompanion)
    if (parsed !== undefined) baselineUnits.add(parsed.unitKey)
  }
  for (const [unitKey, unit] of [...units].sort(([left], [right]) => comparePaths(left, right))) {
    const sourcePath = unit.kind + '/' + unit.key + '.md'
    const sealedUnit = baselineUnits.has(unitKey)
    if (sealedUnit) {
      for (const path of unit.paths) {
        if (!Object.prototype.hasOwnProperty.call(baselineFiles, path)) {
          errors.push('archive: ' + unitKey + ' — sealed unit cannot gain artifact ' + path)
        }
      }
      continue
    }
    const match = FILENAME.exec(unit.key + '.md')
    if (match === null) errors.push('archive: ' + unitKey + ' — unit name must be yyyy-mm-dd-topic')
    if (!artifacts.has(sourcePath))
      errors.push('archive: ' + unitKey + ' — incomplete unit; missing source note ' + sourcePath)
    const archiveDates: string[] = []
    for (const path of unit.paths) {
      if (!path.endsWith('.md')) continue
      const prose = proseLines(artifacts.get(path)!.toString('utf8').split('\n'))
      const statusLines = prose.filter((line) => line.startsWith('Status:'))
      if (statusLines.length !== 1) {
        errors.push('archive: ' + path + ' — requires exactly one Status: line (got ' + statusLines.length + ')')
      }
      const statusIndex = prose.findIndex((line) => line.startsWith('Status:'))
      if ((statusLines[0] ?? '') !== 'Status: implemented') {
        errors.push('archive: ' + path + ' — requires Status: implemented')
      }
      const archived =
        statusIndex >= 0 ? /^Archived: (\d{4}-\d{2}-\d{2})$/.exec(prose[statusIndex + 1] ?? '')?.[1] : undefined
      if (archived === undefined || !validDate(archived)) {
        errors.push(
          'archive: ' + path + ' — requires Archived: YYYY-MM-DD with a valid date immediately below the status',
        )
        continue
      }
      archiveDates.push(archived)
      if (match !== null && archived < match[1] + '-' + match[2] + '-' + match[3]) {
        errors.push('archive: ' + path + ' — archive date ' + archived + ' predates the note date')
      }
    }
    const distinctDates = [...new Set(archiveDates)]
    if (distinctDates.length > 1) {
      errors.push(
        'archive: ' + unitKey + ' — Markdown sides carry different archive dates (' + distinctDates.join(', ') + ')',
      )
    }
  }
  return errors
}

function unsealedCompanionUnits(
  artifacts: ReadonlyMap<string, Buffer>,
  companions: readonly string[],
  byCompanion: ReadonlyMap<string, string>,
  baselineFiles: Record<string, string>,
): string[] {
  const units = new Map<string, boolean>()
  const baselineUnits = new Set<string>()
  for (const path of Object.keys(baselineFiles)) {
    const parsed = unitKeyFor(path, companions, byCompanion)
    if (parsed !== undefined) baselineUnits.add(parsed.unitKey)
  }
  for (const path of artifacts.keys()) {
    const parsed = unitKeyFor(path, companions, byCompanion)
    if (parsed === undefined) continue
    const source = parsed.kind + '/' + parsed.key + '.md'
    units.set(parsed.unitKey, (units.get(parsed.unitKey) ?? false) || path !== source)
  }
  return [...units]
    .filter(([unitKey, hasCompanion]) => hasCompanion && !baselineUnits.has(unitKey))
    .map(([unitKey]) => unitKey)
    .sort(comparePaths)
}

export function archiveCommand(layout: ProjectLayout, paths: NotesPaths, options: Options): ArchiveResult {
  const projectRoot = layout.projectRoot
  const root = paths.root
  const archiveRoot = paths.archiveRoot
  const manifestPath = paths.manifestPath
  const errors: Violation[] = []
  const artifacts = new Map<string, Buffer>()
  const rootReal = safeRealpath(root)
  if (rootReal === undefined) {
    errors.push('archive: notes root not found: ' + display(projectRoot, root) + '; run "notes.mjs init" first')
  } else {
    if (!layout.isInsideProject(rootReal))
      errors.push(
        'archive: the notes root resolves outside the project root (' +
          rootReal +
          '); the notes tree must live in the project checkout',
      )
    if (layout.isInsideGitDirectory(rootReal))
      errors.push(
        'archive: the notes root is inside the project Git directory (' +
          display(projectRoot, rootReal) +
          '); it must live in the project worktree',
      )
  }
  const archiveReal = safeRealpath(archiveRoot)
  if (archiveReal !== undefined) {
    if (!layout.isInsideProject(archiveReal))
      errors.push(
        'archive: the archive root resolves outside the project root (' +
          archiveReal +
          '); the archive must live in the project checkout',
      )
    if (layout.isInsideGitDirectory(archiveReal))
      errors.push(
        'archive: the archive root is inside the project Git directory (' +
          display(projectRoot, archiveReal) +
          '); it must live in the project worktree',
      )
    const archiveGitDirectory = gitDirectory(archiveRoot)
    if (
      layout.gitDirectory === undefined ||
      archiveGitDirectory === undefined ||
      archiveGitDirectory !== layout.gitDirectory
    ) {
      errors.push(
        'archive: the archive root (' +
          display(projectRoot, archiveRoot) +
          ') is not in the project Git checkout (' +
          (archiveGitDirectory ?? 'not a Git worktree') +
          '); run from the project checkout',
      )
    }
  }
  const explicitMembers = explicitArchiveMembers(layout, archiveRoot, archiveReal, options.members)
  errors.push(...explicitMembers.errors)
  if (!isDirectory(archiveRoot)) {
    errors.push(
      'archive: archive root not found: ' + display(projectRoot, archiveRoot) + '; run "notes.mjs init" first',
    )
  } else {
    const kinds = new Set<string>()
    for (const entry of safeReaddir(archiveRoot, errors, 'archive: ' + ARCHIVE)) {
      if (entry.isFile()) {
        if (!ARCHIVE_ROOT_ALLOWLIST.has(entry.name))
          errors.push('archive: ' + ARCHIVE + '/' + entry.name + ' — unexpected root file')
        continue
      }
      if (!entry.isDirectory()) {
        errors.push('archive: ' + ARCHIVE + '/' + entry.name + ' — only regular files and class folders are allowed')
        continue
      }
      if (!isClassKind(entry.name)) {
        errors.push(
          'archive: ' + ARCHIVE + '/' + entry.name + '/ — unknown class folder (allowed: ' + CLASSES.join(', ') + ')',
        )
        continue
      }
      kinds.add(entry.name)
      collectClassMembers(archiveRoot, entry.name, '', errors, artifacts)
    }
    for (const kind of CLASSES) {
      if (!kinds.has(kind)) errors.push('archive: ' + ARCHIVE + '/' + kind + '/ — required class directory is missing')
    }
  }
  if (artifacts.size === 0) {
    errors.push('archive: no archived artifacts found; an empty archive is not a passing corpus')
  }
  const manifestReal = safeRealpath(manifestPath)
  if (manifestReal !== undefined && !layout.isInsideProject(manifestReal)) {
    errors.push(
      `archive: the manifest resolves outside the project root (${manifestReal}); the archive baseline must stay in the project`,
    )
  }
  let manifest: Manifest = emptyManifest()
  if (existsSync(manifestPath)) {
    try {
      manifest = parseManifest(readFileSync(manifestPath, 'utf8'))
    } catch (error) {
      errors.push(`manifest: ${error instanceof Error ? error.message : String(error)}`)
      manifest = emptyManifest()
    }
  } else if (!options.write && !options.prepare) {
    errors.push('manifest: archived/manifest.json is required; run `archive --prepare` to inspect a seal candidate')
  }

  const manifestLocationReal = manifestReal ?? (archiveReal !== undefined ? join(archiveReal, MANIFEST) : undefined)
  let manifestRepoPath: string | undefined
  if (manifestLocationReal !== undefined) {
    const rel = relative(layout.projectReal, manifestLocationReal).split(sep).join('/')
    if (isAbsolute(rel) || rel.split('/')[0] === '..') {
      errors.push(
        'archive: the manifest resolves outside the project root (' +
          (manifestLocationReal ?? manifestPath) +
          '); archive verification needs a manifest inside the project',
      )
    } else {
      manifestRepoPath = rel
    }
  }
  if (!options.write && !options.prepare && Object.keys(manifest.files).length > 0 && manifestRepoPath !== undefined) {
    try {
      git(projectRoot, ['ls-files', '--error-unmatch', '--', manifestRepoPath])
    } catch {
      errors.push(
        'manifest: ' +
          manifestRepoPath +
          ' is not tracked by Git; stage or commit the archive before verifying, or run "archive --write" to seal',
      )
    }
  }
  let added: string[] = []
  let plan: SealPlan | undefined
  if (manifestRepoPath !== undefined) {
    const baseRef = options.baseRef ?? 'HEAD'
    let baseline: Manifest = emptyManifest()
    let baseCommit: string | undefined
    try {
      baseCommit = git(projectRoot, ['rev-parse', `${baseRef}^{commit}`]).trim()
      baseline = readBaseline(projectRoot, baseRef, manifestRepoPath)
      for (const [path, expected] of Object.entries(baseline.files)) {
        const actual = manifest.files[path]
        if (actual === undefined) errors.push('manifest: ' + path + ' — sealed manifest entry is missing')
        else if (actual !== expected) errors.push('manifest: ' + path + ' — sealed manifest hash changed')
      }
    } catch (error) {
      errors.push(
        'manifest: cannot read baseline ' +
          JSON.stringify(baseRef) +
          ': ' +
          (error instanceof Error ? error.message : String(error)) +
          '; archive verification needs a Git repository and that commit',
      )
    }
    const sealing = options.write || options.prepare
    if (sealing) {
      errors.push(...unitErrors(artifacts, options.companions, explicitMembers.byCompanion, baseline.files))
    }
    const extension = extendManifest(manifest, artifacts)
    errors.push(...extension.errors)
    added = extension.added
    if (!sealing) {
      for (const path of added)
        errors.push(
          'archive: ' +
            path +
            ' — archived artifact is not sealed in manifest.json; inspect it with "archive --prepare"',
        )
    }
    if (sealing && baseCommit !== undefined && errors.length === 0) {
      const companionUnits = unsealedCompanionUnits(
        artifacts,
        options.companions,
        explicitMembers.byCompanion,
        baseline.files,
      )
      if (companionUnits.length > 0 && options.preflightCommand === undefined) {
        errors.push(
          'archive: companion-bearing candidate ' +
            companionUnits.join(', ') +
            ' requires an owner readiness command; rerun with --preflight-command <path> and any --preflight-arg values',
        )
      }
    }
    if (sealing && baseCommit !== undefined && errors.length === 0) {
      const planPreflight =
        options.preflightCommand === undefined ? [] : [options.preflightCommand, ...options.preflightArgs]
      plan = sealPlanFor(
        baseCommit,
        manifest,
        added,
        artifacts,
        options.companions,
        explicitMembers.canonical,
        planPreflight,
      )
    }
    if (options.write && added.length > 0 && options.expectPlan === undefined) {
      errors.push('archive: new artifacts require --expect-plan; run "archive --prepare" and inspect its plan first')
    } else if (options.write && options.expectPlan !== undefined && plan !== undefined) {
      const actual = planDigest(plan)
      if (options.expectPlan !== actual) {
        errors.push(
          'archive: seal plan changed; expected ' +
            options.expectPlan +
            ' but the current state produces ' +
            actual +
            '; run "archive --prepare" again',
        )
      }
    }
    if (options.write && plan !== undefined && plan.preflight.length > 0 && errors.length === 0) {
      errors.push(...runPreflight(projectRoot, plan.preflight[0] as string, plan.preflight.slice(1)))
      if (errors.length === 0) {
        errors.push(...artifactStateErrors(archiveRoot, artifacts))
        if (currentManifestHash(manifestPath) !== plan.manifestHash) {
          errors.push('archive: preflight changed the manifest; prepare the seal again')
        }
      }
    }
    if (options.write && errors.length === 0) {
      const rendered = renderManifest(extension.files)
      if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== rendered) {
        writeFileSync(manifestPath, rendered)
      }
    }
  }
  const sealed = options.write && errors.length === 0 ? added.length : 0
  return {
    command: 'archive',
    errors,
    summary: {
      artifacts: artifacts.size,
      sealed,
      ...(plan === undefined ? {} : { plan: renderPlan(plan) }),
    },
  }
}

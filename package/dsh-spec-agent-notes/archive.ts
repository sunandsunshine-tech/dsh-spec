/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// The frozen archive: class folders, sealed artifacts, the manifest and the Git baseline that
// makes the manifest append-only. Sealing is archive --write; verification never writes.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import type { Options } from './cli/args.ts'
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

/**
 * The unit a frozen artifact belongs to: its class folder, its source-note stem and the
 * `{kind}/{stem}` key. A path that is neither Markdown nor a declared companion has no unit.
 */
function unitKeyFor(path: string, companions: readonly string[]): UnitKey | undefined {
  const [kind, name] = path.split('/')
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
  baselineFiles: Record<string, string>,
  sealNewUnits: boolean,
): Violation[] {
  const errors: Violation[] = []
  const units = new Map<string, Unit>()
  for (const path of artifacts.keys()) {
    const parsed = unitKeyFor(path, companions)
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
    const parsed = unitKeyFor(path, companions)
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
    if (sealNewUnits) {
      for (const suffix of companions) {
        const companionPath = unit.kind + '/' + unit.key + suffix
        if (!artifacts.has(companionPath))
          errors.push('archive: ' + unitKey + ' — incomplete unit; missing ' + companionPath)
      }
    }
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
      for (const fileEntry of safeReaddir(
        join(archiveRoot, entry.name),
        errors,
        'archive: ' + ARCHIVE + '/' + entry.name,
      )) {
        if (fileEntry.name === GITKEEP) continue
        const rel = entry.name + '/' + fileEntry.name
        if (!fileEntry.isFile()) {
          errors.push('archive: ' + rel + ' — class folders contain regular files only')
          continue
        }
        const content = safeReadFile(join(archiveRoot, entry.name, fileEntry.name), errors, 'archive: ' + rel)
        if (content !== undefined) artifacts.set(rel, content)
      }
    }
    for (const kind of CLASSES) {
      if (!kinds.has(kind)) errors.push('archive: ' + ARCHIVE + '/' + kind + '/ — required class directory is missing')
    }
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
  } else if (!options.write) {
    errors.push('manifest: archived/manifest.json is required; seal new units with `archive --write`')
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
  if (!options.write && Object.keys(manifest.files).length > 0 && manifestRepoPath !== undefined) {
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
  if (manifestRepoPath !== undefined) {
    const baseRef = options.baseRef ?? 'HEAD'
    let baseline: Manifest = emptyManifest()
    try {
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
    if (options.write) errors.push(...unitErrors(artifacts, options.companions, baseline.files, options.write))
    const extension = extendManifest(manifest, artifacts)
    errors.push(...extension.errors)
    added = extension.added
    if (!options.write) {
      for (const path of added)
        errors.push(
          'archive: ' + path + ' — archived artifact is not sealed in manifest.json; seal it with "archive --write"',
        )
    }
    if (options.write && errors.length === 0) {
      const rendered = renderManifest(extension.files)
      if (!existsSync(manifestPath) || readFileSync(manifestPath, 'utf8') !== rendered) {
        writeFileSync(manifestPath, rendered)
      }
    }
  }
  const sealed = options.write && errors.length === 0 ? added.length : 0
  return { command: 'archive', errors, summary: { artifacts: artifacts.size, sealed } }
}

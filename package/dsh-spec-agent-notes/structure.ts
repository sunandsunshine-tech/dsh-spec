/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-alpha.2` (`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// The active tree walk: lifecycle and class folders, filenames, note headers and declared
// companions, reported in the gate's fixed order.

import { readdirSync, statSync, type Dirent } from 'node:fs'
import { join } from 'node:path'
import { ARCHIVE, CLASSES, FILENAME, isClassKind, isLifecycle, LIFECYCLES, ROOT_ALLOWLIST } from './constants.ts'
import { companionSuffixOf, formatErrors } from './format.ts'
import { display, isDirectory, safeReaddir, safeRealpath, type ProjectLayout, type Violation } from './guards.ts'

export interface CheckResult {
  command: 'check'
  errors: Violation[]
  notes: number
  companionFiles: number
}

function entryKind(path: string): 'dir' | 'file' | 'other' {
  try {
    const stat = statSync(path)
    return stat.isDirectory() ? 'dir' : stat.isFile() ? 'file' : 'other'
  } catch {
    return 'other'
  }
}

function markdownFiles(
  dir: string,
  onUnreadable: (path: string) => void = () => {},
  seen: Set<string> = new Set(),
): string[] {
  const real = safeRealpath(dir)
  if (real !== undefined) {
    if (seen.has(real)) return []
    seen.add(real)
  }
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    onUnreadable(dir)
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    const kind = entryKind(path)
    if (kind === 'file') {
      if (entry.name.endsWith('.md')) found.push(path)
      continue
    }
    if (kind === 'dir') {
      found.push(...markdownFiles(path, onUnreadable, seen))
      continue
    }
    if (entry.name.endsWith('.md')) onUnreadable(path)
  }
  return found
}

export function walkActiveTree(
  layout: ProjectLayout,
  root: string,
  companions: readonly string[],
  formatAdopted: string | undefined,
): CheckResult {
  const projectRoot = layout.projectRoot
  const errors: Violation[] = []
  let notes = 0
  let companionFiles = 0
  const rootReal = safeRealpath(root)
  if (rootReal !== undefined) {
    if (!layout.isInsideProject(rootReal)) {
      errors.push(
        'check: the notes root resolves outside the project root (' +
          rootReal +
          '); the notes tree must live in the project checkout',
      )
      return { command: 'check', errors, notes, companionFiles }
    }
    if (layout.isInsideGitDirectory(rootReal)) {
      errors.push(
        'check: the notes root is inside the project Git directory (' +
          display(projectRoot, rootReal) +
          '); it must live in the project worktree',
      )
      return { command: 'check', errors, notes, companionFiles }
    }
  }
  const entryViolation = (target: string): string | undefined => {
    const real = safeRealpath(target)
    if (real === undefined) return undefined
    if (!layout.isInsideProject(real)) return 'resolves outside the project checkout'
    if (layout.isInsideGitDirectory(real)) return "resolves inside the project's Git directory"
    return undefined
  }
  if (!isDirectory(root)) {
    errors.push(`structure: notes root not found: ${display(projectRoot, root)}; run init or pass --root`)
    return { command: 'check', errors, notes, companionFiles }
  }
  for (const entry of safeReaddir(root, errors, `structure: ${display(projectRoot, root)}`)) {
    if (entry.name === 'INDEX.md') {
      errors.push(
        'structure: INDEX.md — centralized note indexes are forbidden; browse the lifecycle and class folders instead',
      )
      continue
    }
    if (entryKind(join(root, entry.name)) !== 'dir' || entry.name === ARCHIVE) continue
    const lifecycleName = entry.name
    if (!isLifecycle(lifecycleName)) {
      errors.push(
        `structure: ${lifecycleName}/ — unknown lifecycle folder (allowed: ${LIFECYCLES.join(', ')}, plus ${ARCHIVE}/)`,
      )
      continue
    }
    const lifecycleRoot = join(root, lifecycleName)
    const lifecycleProblem = entryViolation(lifecycleRoot)
    if (lifecycleProblem !== undefined) {
      errors.push(`structure: ${display(projectRoot, lifecycleRoot)} — ${lifecycleProblem}`)
      continue
    }
    for (const classEntry of safeReaddir(lifecycleRoot, errors, `structure: ${display(projectRoot, lifecycleRoot)}`)) {
      const classKind = entryKind(join(lifecycleRoot, classEntry.name))
      if (classKind === 'file') {
        const rootCompanion = companionSuffixOf(classEntry.name, companions)
        if (rootCompanion !== undefined) {
          const stem = classEntry.name.slice(0, -rootCompanion.length)
          companionFiles += 1
          if (entryKind(join(lifecycleRoot, `${stem}.md`)) !== 'file') {
            errors.push(
              `companions: ${display(projectRoot, join(lifecycleRoot, classEntry.name))} — no source note ${stem}.md`,
            )
          }
          continue
        }
        if (!classEntry.name.endsWith('.md') || ROOT_ALLOWLIST.has(classEntry.name)) continue
        errors.push(
          `structure: ${display(projectRoot, join(lifecycleRoot, classEntry.name))} — expected {lifecycle}/{class}/file.md (got depth 2)`,
        )
        continue
      }
      if (classKind !== 'dir') {
        if (classEntry.name.endsWith('.md') || companions.some((suffix) => classEntry.name.endsWith(suffix))) {
          errors.push(
            `structure: ${display(projectRoot, join(lifecycleRoot, classEntry.name))} — unreadable entry (dangling symlink or special file)`,
          )
        }
        continue
      }
      const classRoot = join(lifecycleRoot, classEntry.name)
      const classProblem = entryViolation(classRoot)
      if (classProblem !== undefined) {
        errors.push(`structure: ${display(projectRoot, classRoot)} — ${classProblem}`)
        continue
      }
      if (!isClassKind(classEntry.name)) {
        for (const file of markdownFiles(classRoot, (broken) =>
          errors.push(
            `structure: ${display(projectRoot, broken)} — unreadable Markdown entry (dangling symlink or special file)`,
          ),
        )) {
          errors.push(
            `structure: ${display(projectRoot, file)} — unknown class folder "${classEntry.name}" (allowed: ${CLASSES.join(', ')})`,
          )
        }
        continue
      }
      for (const noteEntry of safeReaddir(classRoot, errors, `structure: ${display(projectRoot, classRoot)}`)) {
        const noteKind = entryKind(join(classRoot, noteEntry.name))
        if (noteKind !== 'file') {
          if (noteKind === 'dir') {
            for (const file of markdownFiles(join(classRoot, noteEntry.name), (broken) =>
              errors.push(
                `structure: ${display(projectRoot, broken)} — unreadable Markdown entry (dangling symlink or special file)`,
              ),
            )) {
              if (companions.some((suffix) => file.endsWith(suffix))) continue
              errors.push(
                `structure: ${display(projectRoot, file)} — expected {lifecycle}/{class}/file.md (nested deeper)`,
              )
            }
          } else if (noteEntry.name.endsWith('.md') || companions.some((suffix) => noteEntry.name.endsWith(suffix))) {
            errors.push(
              `structure: ${display(projectRoot, join(classRoot, noteEntry.name))} — unreadable entry (dangling symlink or special file)`,
            )
          }
          continue
        }
        const noteProblem = entryViolation(join(classRoot, noteEntry.name))
        if (noteProblem !== undefined) {
          errors.push(`structure: ${display(projectRoot, join(classRoot, noteEntry.name))} — ${noteProblem}`)
          continue
        }
        const name = noteEntry.name
        const companionSuffix = companionSuffixOf(name, companions)
        if (companionSuffix !== undefined) {
          companionFiles += 1
          const stem = name.slice(0, -companionSuffix.length)
          if (entryKind(join(classRoot, `${stem}.md`)) !== 'file') {
            errors.push(`companions: ${display(projectRoot, join(classRoot, name))} — no source note ${stem}.md`)
          }
          continue
        }
        if (!name.endsWith('.md')) continue
        notes += 1
        const match = FILENAME.exec(name)
        if (match === null) {
          errors.push(
            `structure: ${display(projectRoot, join(classRoot, name))} — filename must be yyyy-mm-dd-topic.md`,
          )
          continue
        }
        const noteDate = `${match[1]}-${match[2]}-${match[3]}`
        errors.push(...formatErrors(projectRoot, join(classRoot, name), lifecycleName, noteDate, formatAdopted))
      }
    }
  }
  return { command: 'check', errors, notes, companionFiles }
}

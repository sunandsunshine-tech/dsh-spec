/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// init: create the notes tree skeleton once — lifecycle and class folders, archived class
// folders and .gitkeep placeholders — without ever creating a path outside the project.

import { existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ARCHIVE, CLASSES, GITKEEP, LIFECYCLES } from './constants.ts'
import {
  display,
  errorCode,
  gitDirectory,
  isDirectory,
  isInside,
  resolveProjectPath,
  safeRealpath,
  type ProjectLayout,
  type Violation,
} from './guards.ts'

export interface InitResult {
  command: 'init'
  errors: Violation[]
  actions: string[]
  root: string
}

export function initCommand(layout: ProjectLayout, requestedRoot: string): InitResult {
  const projectRoot = layout.projectRoot
  const errors: Violation[] = []
  const actions: string[] = []

  const resolveDeepest = (target: string, label: string): string | undefined => {
    const resolution = resolveProjectPath(layout, target)
    if (resolution.ok) return resolution.path
    if (resolution.problem === 'unreadable') {
      errors.push(label + ': cannot resolve the path (' + target + '); it has an unreadable component')
    } else if (resolution.problem === 'not-a-directory') {
      errors.push(label + ': a parent path is not a directory (' + display(projectRoot, resolution.path) + ')')
    } else if (resolution.problem === 'outside-project') {
      errors.push(
        label + ': resolves outside the project root (' + resolution.path + '); it must live in the project checkout',
      )
    } else {
      errors.push(
        label +
          ": resolves inside the project's Git directory (" +
          resolution.path +
          '); it must live in the project worktree',
      )
    }
    return undefined
  }

  try {
    if (!existsSync(requestedRoot) && lstatSync(requestedRoot).isSymbolicLink()) {
      errors.push('init: the notes root is a dangling symlink (' + requestedRoot + ')')
    } else if (existsSync(requestedRoot) && !isDirectory(requestedRoot)) {
      errors.push('init: the notes root exists and is not a directory (' + requestedRoot + ')')
    }
  } catch {
    // A missing root path is created below; another lstat error is reported by resolveDeepest.
  }
  if (errors.length > 0) return { command: 'init', errors, actions, root: requestedRoot }
  const failed = new Set<string>()
  const root = resolveDeepest(requestedRoot, 'init: the notes root')
  const targets: string[] = []
  const validated: string[] = []
  if (root !== undefined) {
    let existingArchive = join(root, ARCHIVE)
    while (!existsSync(existingArchive) && dirname(existingArchive) !== existingArchive) {
      existingArchive = dirname(existingArchive)
    }
    const archiveGit = gitDirectory(existingArchive)
    if (layout.gitDirectory !== undefined && archiveGit !== undefined && archiveGit !== layout.gitDirectory) {
      errors.push(
        'init: the notes/archive root is inside a different Git checkout (' +
          display(projectRoot, existingArchive) +
          '); the archive baseline must belong to the project checkout',
      )
    }
    if (errors.length > 0) return { command: 'init', errors, actions, root: requestedRoot }
    validated.push(root)
    for (const lifecycle of LIFECYCLES) {
      validated.push(join(root, lifecycle))
      for (const kind of CLASSES) targets.push(join(root, lifecycle, kind))
    }
    validated.push(join(root, ARCHIVE))
    for (const kind of CLASSES) targets.push(join(root, ARCHIVE, kind))
    validated.push(...targets)
    for (const target of validated) {
      if ([...failed].some((parent) => isInside(parent, target) && parent !== target)) continue
      try {
        if (!existsSync(target) && lstatSync(target).isSymbolicLink()) {
          errors.push('init: ' + display(projectRoot, target) + ' is a dangling symlink')
          continue
        }
      } catch {
        // Missing targets are created below.
      }
      const canonical = resolveDeepest(target, 'init: ' + display(projectRoot, target))
      if (canonical === undefined) {
        failed.add(target)
        continue
      }
      if (existsSync(canonical) && !isDirectory(canonical)) {
        errors.push('init: ' + display(projectRoot, canonical) + ' exists and is not a directory')
      }
    }
  }
  if (errors.length > 0) return { command: 'init', errors, actions, root: root ?? requestedRoot }

  for (const target of targets) {
    const canonical = safeRealpath(target) ?? target
    if (!isDirectory(canonical)) {
      try {
        mkdirSync(canonical, { recursive: true })
        actions.push('create ' + display(projectRoot, canonical) + '/')
      } catch (error) {
        errors.push(
          'init: cannot create ' + display(projectRoot, canonical) + ' (' + errorCode(error, 'write error') + ')',
        )
        continue
      }
    }
    let entries: string[]
    try {
      entries = readdirSync(canonical)
    } catch {
      errors.push('init: ' + display(projectRoot, canonical) + ' is unreadable')
      continue
    }
    if (entries.length > 0) continue
    const placeholder = join(canonical, GITKEEP)
    try {
      writeFileSync(placeholder, '')
      actions.push('create ' + display(projectRoot, placeholder))
    } catch (error) {
      errors.push(
        'init: cannot create ' + display(projectRoot, placeholder) + ' (' + errorCode(error, 'write error') + ')',
      )
    }
  }
  return { command: 'init', errors, actions, root: root ?? requestedRoot }
}

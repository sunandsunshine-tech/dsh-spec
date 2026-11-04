#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-alpha.2` (`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// Bundled checks for the dsh-spec-agent-notes skill: init, the active Agent Note tree and the frozen archive.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+; the project must be a Git checkout
// input          a command, the notes root, declared companion suffixes and, for the archive, a Git baseline
// output         one line per violation and a summary, or a JSON summary with --json
// exit           0 every check passed · 1 rule violations · 2 usage error

import { archiveCommand, type ArchiveResult } from './archive.ts'
import { parseArgs, UsageError, USAGE, type Options } from './cli/args.ts'
import {
  detectProjectRoot,
  display,
  isBareRepository,
  resolveNotesPaths,
  resolveProjectLayout,
  type NotesPaths,
  type ProjectLayout,
  type Violation,
} from './guards.ts'
import { initCommand, type InitResult } from './init.ts'
import { walkActiveTree, type CheckResult } from './structure.ts'

type CommandResult = InitResult | CheckResult | ArchiveResult

interface Summary {
  command: string | undefined
  root: string | null
  ok: boolean
  violations: Violation[]
  created?: number
  notes?: number
  companions?: number
  artifacts?: number
  sealed?: number
}

function runCommand(options: Options, layout: ProjectLayout, paths: NotesPaths): CommandResult {
  if (options.command === 'init') return initCommand(layout, paths.root)
  if (options.command === 'check') return walkActiveTree(layout, paths.root, options.companions, options.formatAdopted)
  return archiveCommand(layout, paths, options)
}

function main(): void {
  let options: Options
  try {
    options = parseArgs(process.argv)
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`notes.mjs: ${error.message}`)
      console.error('run "notes.mjs --help" for usage')
      process.exitCode = 2
      return
    }
    throw error
  }
  if (options.help) {
    console.log(USAGE)
    return
  }
  const label = options.command === 'archive' && options.write ? 'archive --write' : options.command
  const projectRoot = detectProjectRoot()
  if (projectRoot === undefined) {
    const bare = isBareRepository()
    const violations: Violation[] = [
      bare
        ? 'project: this is a bare Git repository with no worktree; run from a checkout and commit before using this skill'
        : 'project: not a Git repository; install Git and initialize/commit the project before using this skill',
    ]
    if (options.json) console.log(JSON.stringify({ command: label, root: null, ok: false, violations }, null, 2))
    else {
      console.log('FAIL ' + label + ' — 1 violation(s)')
      for (const violation of violations) console.log('  - ' + violation)
    }
    process.exitCode = 1
    return
  }
  const layout = resolveProjectLayout(projectRoot)
  const paths = resolveNotesPaths(projectRoot, options.root)
  const result = runCommand(options, layout, paths)
  const ok = result.errors.length === 0
  const effectiveRoot = result.command === 'init' ? result.root : paths.root
  const summary: Summary = {
    command: label,
    root: display(projectRoot, effectiveRoot),
    ok,
    violations: result.errors,
    ...(result.command === 'init'
      ? { created: result.actions.length }
      : result.command === 'check'
        ? { notes: result.notes, companions: result.companionFiles }
        : { artifacts: result.summary.artifacts, sealed: result.summary.sealed }),
  }
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else if (ok) {
    if (result.command === 'init') {
      console.log(
        result.actions.length === 0
          ? 'ok   init — already initialized at ' + summary.root
          : 'ok   init — ' + result.actions.length + ' item(s) created at ' + summary.root,
      )
    } else if (result.command === 'check') {
      console.log('ok   check — ' + result.notes + ' note(s) and ' + result.companionFiles + ' companion(s) checked')
    } else if (options.write) {
      console.log(
        'ok   archive --write — sealed ' +
          result.summary.sealed +
          ' new artifact(s); ' +
          result.summary.artifacts +
          ' frozen artifact(s) checked',
      )
    } else {
      console.log('ok   archive — ' + result.summary.artifacts + ' frozen artifact(s) checked')
    }
  } else {
    console.log('FAIL ' + label + ' — ' + result.errors.length + ' violation(s)')
    for (const error of result.errors) console.log('  - ' + error)
  }
  process.exitCode = ok ? 0 : 1
}

main()

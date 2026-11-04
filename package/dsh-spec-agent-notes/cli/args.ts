/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-alpha.2` (`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// Command-line parsing for the notes gate: the usage text, the option grammar and the checks
// that keep each command's options to the set that command accepts.

import { COMPANION, DATE } from '../constants.ts'
import { validDate } from '../format.ts'

export type Command = 'init' | 'check' | 'archive'

export interface Options {
  command: Command | undefined
  root: string | undefined
  baseRef: string | undefined
  formatAdopted: string | undefined
  companions: string[]
  write: boolean
  json: boolean
  help: boolean
}

export class UsageError extends Error {}

export function usageError(message: string): never {
  throw new UsageError(message)
}

export const USAGE = `usage: notes.mjs <command> [options]

Initialize, check the active Agent Note tree, or check and seal the frozen archive of a project that uses this skill.

commands:
  init      create the notes tree skeleton once: lifecycle and class folders, archived class folders, .gitkeep placeholders
  check     check the active tree: lifecycle and class folders, filenames, header, skeleton, alternatives, companions
  archive   check the frozen archive: class directories, manifest, sealed content, append-only baseline
  archive --write
            run the same checks plus unit metadata and companion completeness, then seal new artifacts

options:
  --root <dir>         notes root, resolved against the project root (default: .agents/dsh-spec-agent-notes)
  --companion <suffix> a companion suffix kept beside each note (repeatable; e.g. .zh.md, .i18n.yaml)
  --format-adopted <date>
                       the date this contract was adopted; notes dated before it may carry the pre-format
                       alternatives comment instead of the section (check only)
  --base-ref <ref>     trusted pre-change commit for the archive baseline (default: HEAD; archive only)
  --write              append new artifact hashes to the manifest (archive only)
  --json               print a JSON summary instead of lines
  --help, -h           print this help and exit 0

The project root is the Git checkout root of the working directory; Git is required.
The archive root is always <notes root>/archived. Verification requires the manifest to be tracked by Git when it lists artifacts.
The archive baseline is read from Git; sealing and verification fail closed when it cannot be read.

exit: 0 every check passed · 1 rule violations · 2 usage error`

export function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    command: undefined,
    root: undefined,
    baseRef: undefined,
    formatAdopted: undefined,
    companions: [],
    write: false,
    json: false,
    help: false,
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    options.help = true
    return options
  }
  const positionals: string[] = []
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--json') {
      options.json = true
      continue
    }
    if (arg === '--write') {
      options.write = true
      continue
    }
    const take = (name: string): string | undefined => {
      if (arg === name) {
        const value = argv[index + 1]
        if (value === undefined || value.startsWith('-')) usageError(`${name} needs a value`)
        index += 1
        return value
      }
      if (arg.startsWith(`${name}=`)) {
        const value = arg.slice(name.length + 1)
        if (value === '') usageError(`${name} needs a value`)
        return value
      }
      return undefined
    }
    const rootValue = take('--root')
    if (rootValue !== undefined) {
      options.root = rootValue
      continue
    }
    const baseValue = take('--base-ref')
    if (baseValue !== undefined) {
      options.baseRef = baseValue
      continue
    }
    const adoptedValue = take('--format-adopted')
    if (adoptedValue !== undefined) {
      if (!DATE.test(adoptedValue) || !validDate(adoptedValue))
        usageError(`--format-adopted must be a valid yyyy-mm-dd date, got ${JSON.stringify(adoptedValue)}`)
      options.formatAdopted = adoptedValue
      continue
    }
    const companionValue = take('--companion')
    if (companionValue !== undefined) {
      if (!COMPANION.test(companionValue) || companionValue === '.md') {
        usageError(`--companion must be a suffix such as .zh.md, got ${JSON.stringify(companionValue)}`)
      }
      options.companions.push(companionValue)
      continue
    }
    if (arg.startsWith('-')) usageError(`unknown option: ${arg}`)
    positionals.push(arg)
  }
  if (options.help) return options
  if (positionals.length !== 1) usageError(`expected one command, got ${positionals.length}`)
  const command = positionals[0]
  if (command !== 'init' && command !== 'check' && command !== 'archive') usageError(`unknown command: ${command}`)
  options.command = command
  if (options.command === 'check' && (options.write || options.baseRef !== undefined)) {
    usageError('check takes --root, --companion, --format-adopted and --json; --write and --base-ref belong to archive')
  }
  if (options.command === 'archive' && options.formatAdopted !== undefined) {
    usageError('--format-adopted belongs to check')
  }
  if (
    options.command === 'init' &&
    (options.write ||
      options.baseRef !== undefined ||
      options.formatAdopted !== undefined ||
      options.companions.length > 0)
  ) {
    usageError('init takes --root and --json only')
  }
  return options
}

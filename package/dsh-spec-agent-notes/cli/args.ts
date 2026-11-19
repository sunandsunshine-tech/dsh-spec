/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from the DeepSeek Harness note-gate scripts at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
// Command-line parsing for the notes gate: the usage text, the option grammar and the checks
// that keep each command's options to the set that command accepts.

import { COMPANION, DATE } from '../constants.ts'
import { validDate } from '../format.ts'

export type Command = 'init' | 'check' | 'archive'

export interface MemberMapping {
  source: string
  companion: string
}

export interface Options {
  command: Command | undefined
  root: string | undefined
  baseRef: string | undefined
  formatAdopted: string | undefined
  companions: string[]
  members: MemberMapping[]
  prepare: boolean
  write: boolean
  expectPlan: string | undefined
  preflightCommand: string | undefined
  preflightArgs: string[]
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
  archive --prepare
            verify a candidate seal and print a hash-bound plan without writing the manifest
  archive --write
            run the same checks plus unit metadata and the current member set, then seal new artifacts
            (requires --expect-plan from a matching --prepare run when artifacts are added)

options:
  --root <dir>         notes root, resolved against the project root (default: .agents/dsh-spec-agent-notes)
  --companion <suffix> a companion suffix kept beside each note (repeatable; e.g. .zh.md, .i18n.yaml)
  --member <source>=<companion>
                       path-scoped unit membership; repeatable. Paths are relative to the notes root
                       for check and to the archive root for archive.
  --format-adopted <date>
                       the date this contract was adopted; notes dated before it may carry the pre-format
                       alternatives comment instead of the section (check only)
  --base-ref <ref>     trusted pre-change commit for the archive baseline (default: HEAD; archive only)
  --prepare            print the archive seal plan without writing (archive only; excludes --write)
  --write              append new artifact hashes to the manifest (archive only; excludes --prepare)
  --expect-plan <id>   bind --write to the plan printed by --prepare (archive --write only)
  --preflight-command <path>
                       executable to run without a shell before sealing (archive seal only)
  --preflight-arg <arg>
                       one argument for --preflight-command; repeatable and may begin with "-"
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
    members: [],
    prepare: false,
    write: false,
    expectPlan: undefined,
    preflightCommand: undefined,
    preflightArgs: [],
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
    if (arg === '--prepare') {
      options.prepare = true
      continue
    }
    if (arg === '--preflight-arg') {
      const value = argv[index + 1]
      if (value === undefined) usageError('--preflight-arg needs a value')
      options.preflightArgs.push(value)
      index += 1
      continue
    }
    if (arg.startsWith('--preflight-arg=')) {
      const value = arg.slice('--preflight-arg='.length)
      if (value === '') usageError('--preflight-arg needs a value')
      options.preflightArgs.push(value)
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
    const memberValue = take('--member')
    if (memberValue !== undefined) {
      const separator = memberValue.indexOf('=')
      if (separator <= 0 || separator === memberValue.length - 1) {
        usageError('--member expects <source>=<companion>')
      }
      const normalizeMemberPath = (value: string, label: string): string => {
        const normalized = value.split('\\').join('/').replace(/^\.\//, '')
        if (
          normalized === '' ||
          normalized.startsWith('/') ||
          normalized.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
        ) {
          usageError(`--member ${label} must be a contained repository-relative path, got ${JSON.stringify(value)}`)
        }
        return normalized
      }
      const source = normalizeMemberPath(memberValue.slice(0, separator), 'source')
      const companion = normalizeMemberPath(memberValue.slice(separator + 1), 'companion')
      if (source === companion) usageError('--member source and companion must be different paths')
      options.members.push({ source, companion })
      continue
    }
    const expectPlanValue = take('--expect-plan')
    if (expectPlanValue !== undefined) {
      if (!/^[0-9a-f]{64}$/.test(expectPlanValue)) {
        usageError(
          `--expect-plan must be a 64-character lowercase SHA-256 digest, got ${JSON.stringify(expectPlanValue)}`,
        )
      }
      options.expectPlan = expectPlanValue
      continue
    }
    const preflightCommandValue = take('--preflight-command')
    if (preflightCommandValue !== undefined) {
      if (options.preflightCommand !== undefined) usageError('--preflight-command may be given once')
      options.preflightCommand = preflightCommandValue
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
  if (
    options.command === 'check' &&
    (options.prepare ||
      options.write ||
      options.expectPlan !== undefined ||
      options.preflightCommand !== undefined ||
      options.preflightArgs.length > 0 ||
      options.baseRef !== undefined)
  ) {
    usageError('check takes --root, --companion, --format-adopted and --json; seal options belong to archive')
  }
  if (options.command === 'archive' && options.formatAdopted !== undefined) {
    usageError('--format-adopted belongs to check')
  }
  if (options.command === 'archive' && options.prepare && options.write) {
    usageError('archive takes --prepare or --write, not both')
  }
  if (options.expectPlan !== undefined && !options.write) {
    usageError('--expect-plan belongs to archive --write')
  }
  if (
    (options.preflightCommand !== undefined || options.preflightArgs.length > 0) &&
    options.prepare === false &&
    options.write === false
  ) {
    usageError('--preflight-command and --preflight-arg belong to archive --prepare or archive --write')
  }
  if (options.preflightArgs.length > 0 && options.preflightCommand === undefined) {
    usageError('--preflight-arg requires --preflight-command')
  }
  if (
    options.command === 'init' &&
    (options.prepare ||
      options.write ||
      options.expectPlan !== undefined ||
      options.preflightCommand !== undefined ||
      options.preflightArgs.length > 0 ||
      options.baseRef !== undefined ||
      options.formatAdopted !== undefined ||
      options.companions.length > 0 ||
      options.members.length > 0)
  ) {
    usageError('init takes --root and --json only')
  }
  return options
}

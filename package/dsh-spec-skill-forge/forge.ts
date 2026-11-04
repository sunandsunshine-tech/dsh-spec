#!/usr/bin/env node
// Source for scripts/forge.mjs — the work-directory, review-draft and publish lifecycle.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+
// input          a command, a skill name, the forge directory and, for publishing, a landing directory
// output         one line per action on stdout, or a JSON summary with --json
// exit           0 every action succeeded · 1 an action or precondition failed · 2 usage error

import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { parseDocument } from 'yaml'

const DEFAULT_FORGE = '.agents/dsh-spec-skill-forge'
const RESERVED = new Set(['record'])

const USAGE = `usage: forge.mjs <command> [options]

Forge a skill in one work directory, keep its declared review drafts and publish a plain copy.

commands:
  draft   <name> [--from <skill-dir>]  create the work directory, optionally seeded from a skill
  pair    <name> [--companion <suffix>]...
                                      report the declared review drafts (read-only)
  publish <name> --into <skill-dir> [--companion <suffix>]...
                                      copy the work directory to the landing directory and remove the work directory

options:
  --forge <dir>   forge directory (default: ${DEFAULT_FORGE})
  --from <dir>    skill directory copied into a new work directory (draft only)
  --into <dir>    landing directory (publish only)
  --companion <suffix>
                  a declared review-draft suffix (repeatable; for example .zh.md or .i18n.yaml)
  --dry-run       print the actions and change nothing
  --json          print a JSON summary instead of lines
  --help, -h      print this and exit 0

The work directory is ${DEFAULT_FORGE}/<name>; it is the authority. A review draft is a regular file beside its .md source whose name ends with a declared suffix. A suffix follows the notes companion shape and cannot be .md. The adopter declares suffixes with repeated --companion; with none there are no review drafts. A source may carry no draft, one draft or several, and overlapping declarations resolve to the longest suffix. With no declaration, pair lists possible review drafts: a regular file whose shortest dotted suffix resolves to an existing .md source. A file is a review draft only when its suffix is declared; undeclared candidates are reported and publish copies them as ordinary content.

pair reports each draft/source pair and fails on a draft without a source. It writes nothing and does not decide whether a pair is current; the project's pairing gate owns companion consistency.

publish removes the declared drafts before copying; remove any review-draft-only content from the work-draft sources before publishing. Pass the same --companion set as pair; a file whose suffix is not declared is ordinary work-directory content. An existing landing directory is replaced; the acceptance and the VCS are the authorization and rollback. The gate is a separate read-only check; publish does not run it. Publishing requires SKILL.md; the work directory's SKILL.md name and the landing directory name must match the skill name. record is reserved for the record directory.

exit: 0 every action succeeded · 1 an action or precondition failed · 2 usage error

With --json, the summary is printed after the run; usage and precondition failures print an error to stderr.`

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const COMPANION = /^\.[A-Za-z0-9._-]*[A-Za-z0-9]$/

class ForgeError extends Error {}

interface Options {
  command: 'draft' | 'pair' | 'publish'
  name: string
  forge: string
  from?: string
  into?: string
  companions: string[]
  dryRun: boolean
  json: boolean
}

interface Action {
  readonly label: string
  readonly detail: string
  readonly run: () => void
  readonly readOnly?: boolean
}

interface Result {
  readonly action: string
  readonly ok: boolean
  readonly detail: string
  readonly would?: boolean
}

interface DeclaredCompanion {
  readonly draft: string
  readonly source: string
  readonly suffix: string
}

/** Longest suffix first, so overlapping declarations never depend on argument order. */
function orderedCompanions(companions: readonly string[]): string[] {
  return [...companions].sort((left, right) => right.length - left.length || left.localeCompare(right))
}

function companionSuffixOf(name: string, companions: readonly string[]): string | undefined {
  return orderedCompanions(companions).find((suffix) => name.endsWith(suffix))
}

/** Every regular file under the work directory whose name the predicate accepts. */
function walkFiles(root: string, accept: (name: string) => boolean): string[] {
  const files: string[] = []
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), name)
      else if (entry.isFile() && accept(entry.name)) files.push(name)
    }
  }
  if (!isDirectory(root)) return files
  walk(root, '')
  return files.sort()
}

/** Every declared review draft, with the source its name points at. */
function declaredCompanions(root: string, companions: readonly string[]): DeclaredCompanion[] {
  const drafts: DeclaredCompanion[] = []
  for (const draft of walkFiles(root, (name) => companionSuffixOf(name, companions) !== undefined)) {
    const suffix = companionSuffixOf(basename(draft), companions)
    if (suffix === undefined) continue
    drafts.push({ draft, source: `${draft.slice(0, -suffix.length)}.md`, suffix })
  }
  return drafts.sort((left, right) => left.draft.localeCompare(right.draft))
}

/** Declared drafts whose source is not a regular file. */
function orphanCompanions(root: string, companions: readonly string[]): string[] {
  return declaredCompanions(root, companions)
    .filter((pair) => entryKind(join(root, pair.source)) !== 'file')
    .map((pair) => pair.draft)
}

interface CandidateCompanion {
  readonly draft: string
  readonly source: string
}

/**
 * Possible review drafts discovered without declarations: a regular file whose
 * shortest dotted suffix resolves to an existing .md source beside it.
 */
function candidateCompanions(root: string): CandidateCompanion[] {
  const files = walkFiles(root, () => true)
  const fileSet = new Set(files)
  const candidates: CandidateCompanion[] = []
  for (const draft of files) {
    const name = basename(draft)
    const firstDot = name.indexOf('.')
    if (firstDot <= 0) continue
    for (let index = name.length - 1; index >= firstDot; index -= 1) {
      if (name[index] !== '.') continue
      if (name.slice(index) === '.md') continue
      const source = `${draft.slice(0, draft.length - name.length)}${name.slice(0, index)}.md`
      if (source === draft || !fileSet.has(source)) continue
      candidates.push({ draft, source })
      break
    }
  }
  return candidates.sort((left, right) => left.draft.localeCompare(right.draft))
}

const usageError = (message: string): never => {
  console.error(`Error: ${message}`)
  console.error(USAGE)
  process.exit(2)
}

const relativeToCwd = (path: string): string => relative(process.cwd(), path) || '.'

type EntryKind = 'missing' | 'file' | 'directory' | 'symlink' | 'other'

/** The kind of the path itself: a symlink is a symlink, not its target. */
function entryKind(path: string): EntryKind {
  try {
    const stats = lstatSync(path)
    if (stats.isSymbolicLink()) return 'symlink'
    if (stats.isDirectory()) return 'directory'
    if (stats.isFile()) return 'file'
    return 'other'
  } catch {
    return 'missing'
  }
}

function isDirectory(path: string): boolean {
  return entryKind(path) === 'directory'
}

function removeTree(path: string): void {
  rmSync(path, { recursive: true, force: true })
}

/** The frontmatter values of a SKILL.md, or undefined when it has no parseable mapping. */
function frontmatterValues(root: string): Record<string, unknown> | undefined {
  let text: string
  try {
    text = readFileSync(join(root, 'SKILL.md'), 'utf8')
  } catch {
    return undefined
  }
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  if (lines[0] !== '---') return undefined
  const close = lines.indexOf('---', 1)
  if (close < 0) return undefined
  const document = parseDocument(lines.slice(1, close).join('\n'), { uniqueKeys: true })
  if (document.errors.length > 0) return undefined
  const data: unknown = document.toJS()
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined
  return data as Record<string, unknown>
}

function frontmatterString(root: string, key: string): string | undefined {
  const value = frontmatterValues(root)?.[key]
  return typeof value === 'string' ? value : undefined
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !path.startsWith(sep))
}

/** The name a skill directory declares in its SKILL.md frontmatter, if any. */
function readSkillName(root: string): string | undefined {
  return frontmatterString(root, 'name')?.trim()
}

function parse(argv: string[]): Options {
  if (argv.length === 0) usageError('missing command')
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }
  const command = argv[0]
  if (command !== 'draft' && command !== 'pair' && command !== 'publish') usageError(`unknown command: ${command}`)

  let forge = resolve(process.cwd(), DEFAULT_FORGE)
  let from: string | undefined
  let into: string | undefined
  let companions: string[] = []
  let dryRun = false
  let json = false
  const positionals: string[] = []

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--json') {
      json = true
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
    const forgeValue = take('--forge')
    if (forgeValue !== undefined) {
      forge = resolve(process.cwd(), forgeValue)
      continue
    }
    const fromValue = take('--from')
    if (fromValue !== undefined) {
      from = resolve(process.cwd(), fromValue)
      continue
    }
    const intoValue = take('--into')
    if (intoValue !== undefined) {
      into = resolve(process.cwd(), intoValue)
      continue
    }
    const companionValue = take('--companion')
    if (companionValue !== undefined) {
      if (!COMPANION.test(companionValue) || companionValue === '.md') {
        usageError(`--companion must be a suffix such as .zh.md, got ${JSON.stringify(companionValue)}`)
      }
      if (!companions.includes(companionValue)) companions.push(companionValue)
      continue
    }
    if (arg.startsWith('-')) usageError(`unknown option: ${arg}`)
    positionals.push(arg)
  }

  if (positionals.length !== 1)
    usageError(positionals.length === 0 ? 'missing skill name' : `expected one skill name, got ${positionals.length}`)
  const name = positionals[0]
  if (!NAME.test(name)) usageError(`invalid skill name: ${name}`)
  if (RESERVED.has(name)) usageError(`reserved skill name: ${name}`)
  if (command === 'draft' && (into !== undefined || companions.length > 0))
    usageError('draft takes --from, not --into or --companion')
  if (command === 'pair' && (from !== undefined || into !== undefined))
    usageError('pair takes --companion, not --from or --into')
  if (command === 'publish' && from !== undefined) usageError('publish takes --into, not --from')
  if (command === 'publish' && into === undefined) usageError('publish needs --into <skill-dir>')
  return { command, name, forge, from, into, companions, dryRun, json }
}

function planDraft(options: Options): Action[] {
  const work = join(options.forge, options.name)
  const workKind = entryKind(work)
  if (workKind !== 'missing') {
    if (workKind !== 'directory')
      throw new ForgeError(`the work path exists but is not a directory: ${relativeToCwd(work)}`)
    if (options.from !== undefined)
      throw new ForgeError(
        `the work directory already exists at ${relativeToCwd(work)}; remove it before seeding from ${relativeToCwd(options.from)}`,
      )
    return [{ label: 'draft', detail: `already exists at ${relativeToCwd(work)}`, run: () => {} }]
  }
  if (options.from === undefined)
    return [{ label: 'create', detail: relativeToCwd(work), run: () => mkdirSync(work, { recursive: true }) }]
  const from = options.from
  if (entryKind(from) !== 'directory') throw new ForgeError(`${relativeToCwd(from)} is not a directory`)
  if (entryKind(join(from, 'SKILL.md')) !== 'file') throw new ForgeError(`${relativeToCwd(from)} has no SKILL.md`)
  return [
    {
      label: 'create',
      detail: `${relativeToCwd(work)} from ${relativeToCwd(from)}`,
      run: () => {
        mkdirSync(dirname(work), { recursive: true })
        cpSync(from, work, { recursive: true })
      },
    },
  ]
}

function planPair(options: Options): Action[] {
  const work = join(options.forge, options.name)
  if (entryKind(work) !== 'directory')
    throw new ForgeError(`work directory not found: ${relativeToCwd(work)}; run draft first`)
  const candidates = candidateCompanions(work)
  if (options.companions.length === 0) {
    if (candidates.length === 0)
      return [{ label: 'pair', detail: 'no review drafts or possible companions', run: () => {} }]
    return candidates.map((candidate) => ({
      label: 'candidate',
      detail: `${candidate.draft} → ${candidate.source} (undeclared)`,
      run: () => {},
    }))
  }
  const drafts = declaredCompanions(work, options.companions)
  const orphans = orphanCompanions(work, options.companions)
  if (orphans.length) throw new ForgeError(`declared review drafts without a source: ${orphans.join(', ')}`)
  const declared = new Set(drafts.map((pair) => pair.draft))
  const undeclared = candidates.filter((candidate) => !declared.has(candidate.draft))
  if (drafts.length === 0 && undeclared.length === 0)
    return [
      {
        label: 'pair',
        detail: `declared suffixes matched no review drafts: ${options.companions.join(', ')}`,
        run: () => {},
      },
    ]
  const actions: Action[] = drafts.map((pair) => ({
    label: 'pair',
    detail: `${pair.draft} → ${pair.source}`,
    run: () => {},
  }))
  for (const candidate of undeclared) {
    actions.push({
      label: 'candidate',
      detail: `${candidate.draft} → ${candidate.source} (undeclared)`,
      run: () => {},
    })
  }
  return actions
}

function planPublish(options: Options): Action[] {
  const work = join(options.forge, options.name)
  const target = resolve(options.into as string)
  if (entryKind(work) !== 'directory')
    throw new ForgeError(`work directory not found: ${relativeToCwd(work)}; run draft first`)
  if (entryKind(join(work, 'SKILL.md')) !== 'file')
    throw new ForgeError(`the work directory has no SKILL.md: ${relativeToCwd(work)}`)
  const draftName = readSkillName(work)
  if (draftName !== options.name)
    throw new ForgeError(`the work directory declares ${draftName ?? 'no name'}, expected ${options.name}`)
  if (basename(target) !== options.name)
    throw new ForgeError(`the landing directory is not ${options.name}: its name is ${basename(target)}`)
  if (
    isInside(options.forge, target) ||
    isInside(target, options.forge) ||
    isInside(work, target) ||
    isInside(target, work)
  )
    throw new ForgeError(
      `the landing directory must be outside the forge and work directories: ${relativeToCwd(target)}`,
    )
  const declared = declaredCompanions(work, options.companions)
  const orphans = orphanCompanions(work, options.companions)
  if (orphans.length) throw new ForgeError(`declared review drafts without a source: ${orphans.join(', ')}`)
  const actions: Action[] = [
    {
      label: 'prepare',
      detail: relativeToCwd(dirname(target)),
      run: () => mkdirSync(dirname(target), { recursive: true }),
    },
  ]
  actions.push({
    label: 'pairs',
    detail: 'declared review drafts in the work directory',
    run: () => {
      for (const pair of declared) rmSync(join(work, pair.draft), { force: true })
    },
  })
  actions.push(
    {
      label: 'copy',
      detail: `${relativeToCwd(work)} → ${relativeToCwd(target)}`,
      run: () => {
        removeTree(target)
        cpSync(work, target, { recursive: true })
      },
    },
    {
      label: 'remove',
      detail: `${relativeToCwd(work)} (work directory)`,
      run: () => removeTree(work),
    },
  )
  return actions
}

function execute(actions: Action[], dryRun: boolean): Result[] {
  const results: Result[] = []
  for (const action of actions) {
    if (dryRun) {
      results.push({ action: action.label, ok: true, would: true, detail: action.detail })
      continue
    }
    try {
      action.run()
      results.push({ action: action.label, ok: true, detail: action.detail })
    } catch (error) {
      results.push({
        action: action.label,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      })
      return results
    }
  }
  return results
}

function report(results: Result[], options: Options): never {
  if (options.json) {
    console.log(JSON.stringify({ command: options.command, dryRun: options.dryRun, results }, null, 2))
  } else {
    for (const result of results)
      console.log(`${result.would ? 'would' : result.ok ? 'ok  ' : 'FAIL'} ${result.action} — ${result.detail}`)
    const failed = results.filter((result) => !result.ok).length
    console.log(`${results.length} action(s), ${failed} failed${options.dryRun ? ' (dry run)' : ''}`)
  }
  process.exit(results.every((result) => result.ok) ? 0 : 1)
}

function main(): never {
  const options = parse(process.argv.slice(2))
  try {
    const actions =
      options.command === 'draft'
        ? planDraft(options)
        : options.command === 'pair'
          ? planPair(options)
          : planPublish(options)
    return report(execute(actions, options.dryRun), options)
  } catch (error) {
    if (error instanceof ForgeError) {
      console.error(`Error: ${error.message}`)
      process.exit(1)
    }
    throw error
  }
}

main()

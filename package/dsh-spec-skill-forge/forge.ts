#!/usr/bin/env node
// Source for scripts/forge.mjs — the work-directory, translation-pair and publish lifecycle.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+
// input          a command, a skill name, the forge directory and, for publishing, a landing directory
// output         one line per action on stdout, or a JSON summary with --json
// exit           0 every action succeeded · 1 an action or precondition failed · 2 usage error

import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { parseDocument } from 'yaml'

const DEFAULT_FORGE = '.agents/dsh-spec-skill-forge'
const HASH_LENGTH = 12
const RESERVED = new Set(['record'])

const USAGE = `usage: forge.mjs <command> [options]

Forge a skill in one work directory, keep its translation pairs and publish a plain copy.

commands:
  draft   <name> [--from <skill-dir>]  create the work directory, optionally seeded from a skill
  review  <name> [--check]             record translation pairs, or list the pairs to translate again
  publish <name> --into <skill-dir>    copy the work directory to the landing directory and remove the draft

options:
  --forge <dir>   forge directory (default: ${DEFAULT_FORGE})
  --from <dir>    skill directory copied into a new work directory (draft only)
  --into <dir>    landing directory (publish only)
  --check         list out-of-date or missing translation pairs instead of writing records (review only)
  --dry-run       print the actions and change nothing
  --json          print a JSON summary instead of lines
  --help, -h      print this and exit 0

The work directory is ${DEFAULT_FORGE}/<name>; it is the authority. A translation pair is a
translation beside its source plus a record: <source-basename>.<lang>.md and
<source-basename>.i18n.yaml; SKILL.md pairs with SKILL.<lang>.md and SKILL.i18n.yaml. Only .md
files are paired; scripts and assets are not translated. review records the source hash in each
pair's record after the translation is written; review --check compares the recorded hash with the
source and lists the pairs to translate again, plus pairs whose translation or record is missing.
The pairs live in the work directory beside their sources.

publish removes the translation pairs from the work directory, copies the work directory to the
landing directory, and then removes the work directory. An existing landing directory is replaced; the acceptance and the
VCS are the authorization and rollback. The gate and review --check are separate read-only checks;
publish does not run them. Publishing requires SKILL.md; the work directory's SKILL.md name and
the landing directory name must match the skill name. record is reserved for the record directory.

exit: 0 every action succeeded · 1 an action or precondition failed · 2 usage error

With --json, the summary is printed after the run; usage and precondition failures print an error
to stderr.`

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

class ForgeError extends Error {}

interface Options {
  command: 'draft' | 'review' | 'publish'
  name: string
  forge: string
  from?: string
  into?: string
  check: boolean
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

interface PairRecord {
  readonly sourceSha?: string
}

interface PairIssues {
  readonly hasPairs: boolean
  readonly missingTranslations: string[]
  readonly missingRecords: string[]
  readonly stale: string[]
  readonly orphans: string[]
  readonly multiple: string[]
}

const TRANSLATION = /^(.*)\.([A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*)\.md$/

function isPairFile(name: string): boolean {
  return name.endsWith('.i18n.yaml') || TRANSLATION.test(name)
}

function translationOf(path: string): { source: string; language: string } | undefined {
  const match = TRANSLATION.exec(path)
  if (match?.[1] === undefined || match[2] === undefined) return undefined
  return { source: `${match[1]}.md`, language: match[2] }
}

/** Every authored Markdown file, excluding translation pairs. */
function sourceFiles(root: string): string[] {
  const files: string[] = []
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), name)
      else if (entry.isFile() && entry.name.endsWith('.md') && !TRANSLATION.test(entry.name)) files.push(name)
    }
  }
  if (!isDirectory(root)) return files
  walk(root, '')
  return files.sort()
}

/** Every translated file and every pair record in the work directory. */
function pairFiles(root: string): string[] {
  const files: string[] = []
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), name)
      else if (entry.isFile() && isPairFile(entry.name)) files.push(name)
    }
  }
  if (!isDirectory(root)) return files
  walk(root, '')
  return files.sort()
}

function recordPath(source: string): string {
  return source.replace(/\.md$/, '.i18n.yaml')
}

function recordSource(path: string): string {
  return path.replace(/\.i18n\.yaml$/, '.md')
}

function readRecord(path: string): PairRecord {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return {}
  }
  for (const line of text.split(/\r?\n/)) {
    const match = /^source_sha:\s*(\S+)\s*$/.exec(line)
    if (match?.[1] !== undefined) return { sourceSha: match[1] }
  }
  return {}
}

function writeRecord(path: string, sourceSha: string): void {
  writeFileSync(path, `source_sha: ${sourceSha}\n`)
}

/** Every translation pair, keyed by its source path. */
function translationPairs(root: string): { source: string; language: string; translation: string }[] {
  const pairs: { source: string; language: string; translation: string }[] = []
  for (const path of pairFiles(root)) {
    const info = translationOf(path)
    if (info !== undefined) pairs.push({ ...info, translation: path })
  }
  return pairs
}

/** The translation pairs that are missing, out of date, or orphaned. */
function pairIssues(root: string): PairIssues {
  const sources = sourceFiles(root)
  const translations = translationPairs(root)
  const records = pairFiles(root).filter((path) => path.endsWith('.i18n.yaml'))
  const hasPairs = translations.length > 0 || records.length > 0
  const missingTranslations: string[] = []
  const missingRecords: string[] = []
  const stale: string[] = []
  const orphans: string[] = []
  const multiple: string[] = []
  if (!hasPairs) return { hasPairs, missingTranslations, missingRecords, stale, orphans, multiple }
  const bySource = new Map<string, { language: string; translation: string }[]>()
  for (const pair of translations) {
    const list = bySource.get(pair.source) ?? []
    list.push({ language: pair.language, translation: pair.translation })
    bySource.set(pair.source, list)
  }
  for (const source of sources) {
    const pairs = (bySource.get(source) ?? []).sort((left, right) => left.translation.localeCompare(right.translation))
    if (pairs.length === 0) {
      missingTranslations.push(source)
      continue
    }
    if (pairs.length > 1) multiple.push(source)
    const pair = pairs[0] as { language: string; translation: string }
    const record = recordPath(source)
    if (!existsSync(join(root, record))) {
      missingRecords.push(source)
      continue
    }
    const value = readRecord(join(root, record))
    if (value.sourceSha !== hashFile(join(root, source))) stale.push(source)
  }
  for (const pair of translations) {
    if (!sources.includes(pair.source)) orphans.push(pair.translation)
  }
  for (const record of records) {
    if (!sources.includes(recordSource(record))) orphans.push(record)
  }
  return { hasPairs, missingTranslations, missingRecords, stale, orphans, multiple }
}

function pairIssueText(issues: PairIssues): string {
  const lines: string[] = []
  if (issues.missingTranslations.length)
    lines.push(`missing translations for: ${issues.missingTranslations.join(', ')}`)
  if (issues.missingRecords.length) lines.push(`missing records for: ${issues.missingRecords.join(', ')}`)
  if (issues.stale.length) lines.push(`out of date: ${issues.stale.join(', ')}`)
  if (issues.orphans.length) lines.push(`without a source: ${issues.orphans.join(', ')}`)
  if (issues.multiple.length) lines.push(`more than one translation for: ${issues.multiple.join(', ')}`)
  return lines.join('; ')
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

/** The short sha256 prefix a pair record stores for one source file. */
function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, HASH_LENGTH)
}

/** Every file under a directory with its content hash, or an empty map when it is not a directory. */
function hashTree(root: string): Map<string, string> {
  const files = new Map<string, string>()
  if (entryKind(root) !== 'directory') return files
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isSymbolicLink())
        throw new ForgeError(`a symlink is not accepted: ${relativeToCwd(join(dir, entry.name))}`)
      else if (entry.isDirectory()) walk(join(dir, entry.name), name)
      else if (entry.isFile()) files.set(name, hashFile(join(dir, entry.name)))
      else throw new ForgeError(`a non-regular entry is not accepted: ${relativeToCwd(join(dir, entry.name))}`)
    }
  }
  walk(root, '')
  return files
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !path.startsWith(sep))
}

/** The name a skill directory declares in its SKILL.md frontmatter, if any. */
function readSkillName(root: string): string | undefined {
  return frontmatterString(root, 'name')?.trim()
}

/** The description a skill directory declares in its SKILL.md frontmatter, if any. */
function readSkillDescription(root: string): string | undefined {
  return frontmatterString(root, 'description')?.trim()
}

/** Replace one directory with the staged one, keeping the previous directory until the swap ends. */
function swapDir(stage: string, target: string, backup: string): void {
  const targetKind = entryKind(target)
  if (targetKind === 'symlink') throw new ForgeError(`the landing path is a symlink: ${relativeToCwd(target)}`)
  if (targetKind !== 'missing' && targetKind !== 'directory')
    throw new ForgeError(`the landing path is not a directory: ${relativeToCwd(target)}`)
  removeTree(backup)
  if (targetKind === 'directory') renameSync(target, backup)
  try {
    renameSync(stage, target)
  } catch (error) {
    if (entryKind(backup) === 'directory') renameSync(backup, target)
    throw error
  }
}
function parse(argv: string[]): Options {
  if (argv.length === 0) usageError('missing command')
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }
  const command = argv[0]
  if (command !== 'draft' && command !== 'review' && command !== 'publish') usageError(`unknown command: ${command}`)

  let forge = resolve(process.cwd(), DEFAULT_FORGE)
  let from: string | undefined
  let into: string | undefined
  let check = false
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
    if (arg === '--check') {
      check = true
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
    if (arg.startsWith('-')) usageError(`unknown option: ${arg}`)
    positionals.push(arg)
  }

  if (positionals.length !== 1)
    usageError(positionals.length === 0 ? 'missing skill name' : `expected one skill name, got ${positionals.length}`)
  const name = positionals[0]
  if (!NAME.test(name)) usageError(`invalid skill name: ${name}`)
  if (RESERVED.has(name)) usageError(`reserved skill name: ${name}`)
  if (command === 'draft' && (into !== undefined || check)) usageError('draft takes --from, not --into or --check')
  if (command === 'review' && (from !== undefined || into !== undefined))
    usageError('review takes --check, not --from or --into')
  if (command === 'publish' && (from !== undefined || check)) usageError('publish takes --into, not --from or --check')
  if (command === 'publish' && into === undefined) usageError('publish needs --into <skill-dir>')
  return { command, name, forge, from, into, check, dryRun, json }
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

function planReview(options: Options): Action[] {
  const work = join(options.forge, options.name)
  if (entryKind(work) !== 'directory')
    throw new ForgeError(`work directory not found: ${relativeToCwd(work)}; run draft first`)
  const issues = pairIssues(work)

  if (options.check) {
    if (!issues.hasPairs) return [{ label: 'check', detail: 'no translation pairs', run: () => {} }]
    if (
      issues.missingTranslations.length ||
      issues.missingRecords.length ||
      issues.stale.length ||
      issues.orphans.length ||
      issues.multiple.length
    )
      throw new ForgeError(`translation pairs are out of date: ${pairIssueText(issues)}`)
    return [{ label: 'check', detail: 'translation pairs are up to date', run: () => {} }]
  }

  if (!issues.hasPairs) return [{ label: 'review', detail: 'no translation pairs', run: () => {} }]
  if (issues.missingTranslations.length)
    throw new ForgeError(`missing translations for: ${issues.missingTranslations.join(', ')}`)
  if (issues.orphans.length) throw new ForgeError(`translations without a source: ${issues.orphans.join(', ')}`)
  if (issues.multiple.length)
    throw new ForgeError(`more than one translation for: ${issues.multiple.join(', ')}; keep one language`)

  const translations = new Map(translationPairs(work).map((pair) => [pair.source, pair]))
  const actions: Action[] = []
  for (const source of sourceFiles(work)) {
    const pair = translations.get(source)
    if (pair === undefined) throw new ForgeError(`missing translation for: ${source}`)
    const record = recordPath(source)
    const sourceSha = hashFile(join(work, source))
    actions.push({
      label: 'record',
      detail: `${record} (${pair.language}, source_sha ${sourceSha})`,
      run: () => writeRecord(join(work, record), sourceSha),
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
  return [
    {
      label: 'prepare',
      detail: relativeToCwd(dirname(target)),
      run: () => mkdirSync(dirname(target), { recursive: true }),
    },
    {
      label: 'pairs',
      detail: 'translation pairs in the work directory',
      run: () => {
        for (const pair of pairFiles(work)) rmSync(join(work, pair), { force: true })
      },
    },
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
  ]
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
        : options.command === 'review'
          ? planReview(options)
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

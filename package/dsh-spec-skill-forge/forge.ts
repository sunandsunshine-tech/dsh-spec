#!/usr/bin/env node
// Source for scripts/forge.mjs — the work-draft, review-draft and landing lifecycle.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+
// input          a command, a skill name, the forge directory and, for landing, a landing directory
// output         one line per action on stdout, or a JSON summary with --json
// exit           0 every action succeeded · 1 an action or precondition failed · 2 usage error

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const DEFAULT_FORGE = '.agents/dsh-spec-skill-forge'
const HASH_LENGTH = 12
const STAMP_KEY = 'forge-review'
const STAMP_VALUE = /^source=(\S+) source_sha=([0-9a-f]+) stale=(true|false)$/
const SHARED_DIRS = ['scripts', 'script', 'assets'] as const
const PROJECTION_SKIP = new Set<string>(SHARED_DIRS)
const PLACEHOLDER =
  '<!-- Translate the work draft source; keep concepts and names aligned, introduce no new concept, do not transcribe word for word. -->'

const USAGE = `usage: forge.mjs <command> [options]

Create, review and land the skill drafts the forging skill keeps in its forge directory.

commands:
  draft  <name> [--from <skill-dir>]   create the work draft, optionally seeded from a skill directory
  review <name> [--copy|--accept|--remove]  project the work draft, accept the projection, or remove it
  land   <name> --into <skill-dir> [--allow-stale]  copy the work draft to the landing directory, then remove both drafts

options:
  --forge <dir>   forge directory (default: ${DEFAULT_FORGE})
  --from <dir>    skill directory copied into a new work draft (draft only)
  --into <dir>    landing directory (land only)
  --copy          write the review projection as a straight copy of the work draft (review only)
  --accept        clear stale and refresh the source hashes (review only)
  --remove        remove the review draft (review only)
  --allow-stale   land a projection that is stale or whose source hash differs (land only)
  --dry-run       print the actions and change nothing
  --json          print a JSON summary instead of lines
  --help, -h      print this and exit 0

The work draft is the authority. The review draft is its projection: every .md carries the
provenance in its frontmatter metadata map under the forge-review key —
source=<path> source_sha=<hash> stale=<true|false> — so the review file stays a parseable
Markdown document; scripts/ and assets/ are copied byte-for-byte with no stamp. review
scaffolds missing files, marks changed sources stale, prints the files to translate and the
files waiting for accept; review --accept clears stale after translation; review --copy writes
a straight same-language copy. land refuses a missing, stale or mismatched projection unless
--allow-stale is given.

The landing directory becomes an exact copy of the work draft. Landing requires SKILL.md in the
work draft; an existing landing directory must be empty or hold this skill's SKILL.md under the
skill's name. Landing removes only draft/<name>/ and review/<name>/; the shared draft/ and
review/ directories stay.

exit: 0 every action succeeded · 1 an action or precondition failed · 2 usage error`

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

class ForgeError extends Error {}

interface Options {
  command: 'draft' | 'review' | 'land'
  name: string
  forge: string
  from?: string
  into?: string
  copy: boolean
  accept: boolean
  remove: boolean
  allowStale: boolean
  dryRun: boolean
  json: boolean
}

interface Action {
  readonly label: string
  readonly detail: string
  readonly run: () => void
}

interface Result {
  readonly action: string
  readonly ok: boolean
  readonly detail: string
}

const usageError = (message: string): never => {
  console.error(`Error: ${message}`)
  console.error(USAGE)
  process.exit(2)
}

const relativeToCwd = (path: string): string => relative(process.cwd(), path) || '.'

const isDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const removeTree = (path: string): void => {
  rmSync(path, { recursive: true, force: true })
}

/** The `name` a skill directory declares in its SKILL.md frontmatter, if any. */
function readSkillName(root: string): string | undefined {
  let text: string
  try {
    text = readFileSync(join(root, 'SKILL.md'), 'utf8')
  } catch {
    return undefined
  }
  const lines = text.split(/\r?\n/)
  if (lines[0] !== '---') return undefined
  for (const line of lines.slice(1)) {
    if (line === '---') break
    const match = /^name:\s*(.+)$/.exec(line)
    if (!match) continue
    const value = match[1]
      .replace(/\s+#.*$/, '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
    if (value.length > 0) return value
  }
  return undefined
}

/** Hash every file under `root`, keyed by its relative path. */
function hashTree(root: string): Map<string, string> {
  const files = new Map<string, string>()
  if (!isDirectory(root)) return files
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path, name)
      else if (entry.isFile()) files.set(name, createHash('sha256').update(readFileSync(path)).digest('hex'))
      else if (entry.isSymbolicLink()) files.set(name, `link:${readlinkSync(path)}`)
    }
  }
  walk(root, '')
  return files
}

/** Whether one path is the same as, or inside, another. */
function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !path.startsWith(sep))
}

function treesEqual(left: string, right: string): boolean {
  const expected = hashTree(left)
  const actual = hashTree(right)
  if (expected.size !== actual.size) return false
  for (const [path, hash] of expected) {
    if (actual.get(path) !== hash) return false
  }
  return true
}

/** The short sha256 prefix a review stamp records for one work draft file. */
function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, HASH_LENGTH)
}

function stampValue(source: string, sourceSha: string, stale: boolean): string {
  return `source=${source} source_sha=${sourceSha} stale=${stale}`
}

interface Stamp {
  readonly source: string
  readonly sourceSha: string
  readonly stale: boolean
}

/** Split a Markdown document into its YAML frontmatter block and the body after it. */
function splitFrontmatter(text: string): { block?: string; body: string } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  if (lines[0] !== '---') return { body: text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') }
  const close = lines.indexOf('---', 1)
  if (close < 0) return { body: text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') }
  return { block: lines.slice(1, close).join('\n'), body: lines.slice(close + 1).join('\n') }
}

/** Read a review file's forge-review metadata entry, or undefined when it carries none. */
function readStamp(path: string): Stamp | undefined {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
  const { block } = splitFrontmatter(text)
  if (block === undefined) return undefined
  const line = block.split('\n').find((entry) => /^\s+forge-review:/.test(entry))
  if (line === undefined) return undefined
  const raw = line.replace(/^\s+forge-review:\s*/, '').trim()
  const value = raw.replace(/^['"]|['"]$/g, '')
  const match = STAMP_VALUE.exec(value)
  if (!match) return undefined
  return { source: match[1], sourceSha: match[2], stale: match[3] === 'true' }
}

/**
 * Write the forge-review entry into the frontmatter metadata block. The entry replaces an
 * existing one or is inserted under `metadata:`; the frontmatter is created when absent.
 */
function writeStamp(path: string, source: string, sourceSha: string, stale: boolean): void {
  const { block, body } = splitFrontmatter(readFileSync(path, 'utf8'))
  const lines = block === undefined ? [] : block.split('\n')
  const entry = `  ${STAMP_KEY}: ${JSON.stringify(stampValue(source, sourceSha, stale))}`
  if (lines.some((line) => /^metadata:\s*[{[]/.test(line)))
    throw new ForgeError(`review frontmatter metadata must be block style for the forge-review stamp: ${path}`)
  const metadataAt = lines.findIndex((line) => /^metadata:\s*$/.test(line))
  if (metadataAt >= 0) {
    let end = metadataAt + 1
    while (end < lines.length && (lines[end].trim() === '' || /^\s+\S/.test(lines[end]))) end += 1
    const existing = lines.findIndex(
      (line, index) => index > metadataAt && index < end && /^\s+forge-review:/.test(line),
    )
    if (existing >= 0) lines[existing] = entry
    else lines.splice(metadataAt + 1, 0, entry)
  } else {
    lines.push('metadata:', entry)
  }
  writeFileSync(path, `---\n${lines.join('\n')}\n---\n${body}`)
}

/** The work draft's authored markdown, the files the review projection covers. */
function projectionFiles(root: string): string[] {
  const files: string[] = []
  if (!isDirectory(root)) return files
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (prefix === '' && PROJECTION_SKIP.has(entry.name)) continue
        walk(join(dir, entry.name), name)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(name)
      }
    }
  }
  walk(root, '')
  return files.sort()
}

/** Every review file whose stamp names a source, plus the source's current hash. */
function assertProjection(draft: string, review: string, allowStale: boolean): void {
  const sources = projectionFiles(draft)
  const reviewed = projectionFiles(review)
  for (const source of sources) {
    const target = join(review, source)
    if (!existsSync(target)) throw new ForgeError(`review projection is missing ${source}; run review`)
    const stamp = readStamp(target)
    if (stamp === undefined) throw new ForgeError(`review file has no forge-review stamp: ${source}`)
    if (stamp.source !== source) throw new ForgeError(`review stamp names ${stamp.source}, expected ${source}`)
    if (allowStale) continue
    if (stamp.stale) throw new ForgeError(`review projection is stale: ${source}`)
    const current = hashFile(join(draft, source))
    if (stamp.sourceSha !== current) throw new ForgeError(`review source hash differs: ${source}`)
  }
  for (const source of reviewed) {
    if (!sources.includes(source)) throw new ForgeError(`review file has no source in the work draft: ${source}`)
  }
}

function assertTreesEqual(expected: string, actual: string, label: string): void {
  const left = hashTree(expected)
  const right = hashTree(actual)
  const missing = [...left.keys()].filter((path) => !right.has(path))
  const extra = [...right.keys()].filter((path) => !left.has(path))
  const changed = [...left.keys()].filter((path) => right.has(path) && left.get(path) !== right.get(path))
  if (missing.length === 0 && extra.length === 0 && changed.length === 0) return
  const detail = [
    ...missing.map((path) => `missing ${path}`),
    ...extra.map((path) => `extra ${path}`),
    ...changed.map((path) => `changed ${path}`),
  ]
  throw new ForgeError(`${label} does not match: ${detail.slice(0, 3).join(', ')}`)
}

/** Replace one directory with the staged one, keeping the previous directory until the swap ends. */
function swapDir(stage: string, target: string, backup: string): void {
  removeTree(backup)
  if (existsSync(target)) renameSync(target, backup)
  try {
    renameSync(stage, target)
  } catch (error) {
    if (existsSync(backup)) renameSync(backup, target)
    throw error
  }
  removeTree(backup)
}

function parse(argv: string[]): Options {
  if (argv.length === 0) usageError('missing command')
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE)
    process.exit(0)
  }
  const command = argv[0]
  if (command !== 'draft' && command !== 'review' && command !== 'land') usageError(`unknown command: ${command}`)

  let forge = resolve(process.cwd(), DEFAULT_FORGE)
  let from: string | undefined
  let into: string | undefined
  let copy = false
  let accept = false
  let remove = false
  let allowStale = false
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
    if (arg === '--copy') {
      copy = true
      continue
    }
    if (arg === '--accept') {
      accept = true
      continue
    }
    if (arg === '--remove') {
      remove = true
      continue
    }
    if (arg === '--allow-stale') {
      allowStale = true
      continue
    }
    const take = (name: string): string | undefined => {
      if (arg === name) {
        const value = argv[index + 1]
        if (value === undefined || value.startsWith('-')) usageError(`${name} needs a value`)
        index += 1
        return value
      }
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1)
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
  if (command === 'draft' && (into !== undefined || copy || accept || remove || allowStale))
    usageError('draft takes --from, not a review or landing option')
  if (command === 'review') {
    if (from !== undefined || into !== undefined || allowStale)
      usageError('review takes --copy, --accept or --remove, not --from, --into or --allow-stale')
    if ([copy, accept, remove].filter(Boolean).length > 1)
      usageError('review takes at most one of --copy, --accept and --remove')
  }
  if (command === 'land' && (from !== undefined || copy || accept || remove))
    usageError('land takes --into and --allow-stale, not --from, --copy, --accept or --remove')
  if (command === 'land' && into === undefined) usageError('land needs --into <skill-dir>')
  return { command, name, forge, from, into, copy, accept, remove, allowStale, dryRun, json }
}

function planDraft(options: Options): Action[] {
  const draft = join(options.forge, 'draft', options.name)
  if (existsSync(draft)) {
    if (options.from !== undefined) {
      throw new ForgeError(
        `the work draft already exists at ${relativeToCwd(draft)}; remove it before seeding from ${relativeToCwd(options.from)}`,
      )
    }
    return [{ label: 'draft', detail: `already exists at ${relativeToCwd(draft)}`, run: () => {} }]
  }
  if (options.from === undefined) {
    return [{ label: 'create', detail: relativeToCwd(draft), run: () => mkdirSync(draft, { recursive: true }) }]
  }
  const from = options.from
  if (!isDirectory(from)) throw new ForgeError(`${relativeToCwd(from)} is not a directory`)
  const files = hashTree(from).size
  return [
    {
      label: 'create',
      detail: `${relativeToCwd(draft)} from ${relativeToCwd(from)} (${files} file(s))`,
      run: () => {
        removeTree(draft)
        mkdirSync(dirname(draft), { recursive: true })
        cpSync(from, draft, { recursive: true })
      },
    },
    {
      label: 'verify',
      detail: `matches ${relativeToCwd(from)}`,
      run: () => assertTreesEqual(from, draft, 'work draft'),
    },
  ]
}

function planReview(options: Options): Action[] {
  const draft = join(options.forge, 'draft', options.name)
  const review = join(options.forge, 'review', options.name)
  if (!isDirectory(draft)) throw new ForgeError(`work draft not found: ${relativeToCwd(draft)}`)

  if (options.remove) {
    if (!existsSync(review))
      return [{ label: 'review', detail: `no review draft at ${relativeToCwd(review)}`, run: () => {} }]
    return [
      { label: 'remove', detail: relativeToCwd(review), run: () => removeTree(review) },
      {
        label: 'verify',
        detail: 'the review draft is gone',
        run: () => {
          if (existsSync(review)) throw new ForgeError(`review draft still exists: ${relativeToCwd(review)}`)
        },
      },
    ]
  }

  const sources = projectionFiles(draft)

  if (options.accept) {
    if (!existsSync(review)) throw new ForgeError(`review draft not found: ${relativeToCwd(review)}; run review first`)
    const accepted: string[] = []
    for (const source of sources) {
      const target = join(review, source)
      if (!existsSync(target)) throw new ForgeError(`review projection is missing ${source}; run review`)
      const stamp = readStamp(target)
      if (stamp === undefined) throw new ForgeError(`review file has no forge-review stamp: ${source}`)
      if (stamp.source !== source) throw new ForgeError(`review stamp names ${stamp.source}, expected ${source}`)
      accepted.push(source)
    }
    for (const source of projectionFiles(review)) {
      if (!sources.includes(source)) throw new ForgeError(`review file has no source in the work draft: ${source}`)
    }
    return [
      {
        label: 'accept',
        detail: accepted.length ? accepted.join(', ') : 'nothing to accept',
        run: () => {
          for (const source of accepted) writeStamp(join(review, source), source, hashFile(join(draft, source)), false)
        },
      },
      {
        label: 'verify',
        detail: 'the review projection matches the work draft',
        run: () => assertProjection(draft, review, false),
      },
    ]
  }

  const actions: Action[] = []
  if (!existsSync(review)) {
    actions.push({ label: 'create', detail: relativeToCwd(review), run: () => mkdirSync(review, { recursive: true }) })
  }

  for (const directory of SHARED_DIRS) {
    const from = join(draft, directory)
    const to = join(review, directory)
    if (isDirectory(from)) {
      const files = hashTree(from).size
      actions.push({
        label: 'copy',
        detail: `${relativeToCwd(from)} (${files} file(s)) → ${relativeToCwd(to)}`,
        run: () => {
          removeTree(to)
          mkdirSync(dirname(to), { recursive: true })
          cpSync(from, to, { recursive: true })
          assertTreesEqual(from, to, `review ${directory}`)
        },
      })
    } else {
      actions.push({
        label: 'remove',
        detail: `${relativeToCwd(to)} (the work draft has no ${directory})`,
        run: () => removeTree(to),
      })
    }
  }

  const translate: string[] = []
  const accept: string[] = []
  for (const source of sources) {
    const from = join(draft, source)
    const to = join(review, source)
    const sourceSha = hashFile(from)
    if (options.copy) {
      actions.push({
        label: 'copy',
        detail: `${relativeToCwd(from)} → ${relativeToCwd(to)} (stamp)`,
        run: () => {
          mkdirSync(dirname(to), { recursive: true })
          writeFileSync(to, readFileSync(from, 'utf8'))
          writeStamp(to, source, sourceSha, false)
        },
      })
      continue
    }
    if (!existsSync(to)) {
      actions.push({
        label: 'create',
        detail: `${relativeToCwd(to)} (stamp)`,
        run: () => {
          mkdirSync(dirname(to), { recursive: true })
          writeFileSync(to, `${PLACEHOLDER}\n`)
          writeStamp(to, source, sourceSha, true)
        },
      })
      translate.push(source)
      continue
    }
    const stamp = readStamp(to)
    if (stamp === undefined) throw new ForgeError(`review file has no forge-review stamp: ${source}`)
    if (stamp.source !== source) throw new ForgeError(`review stamp names ${stamp.source}, expected ${source}`)
    if (stamp.sourceSha !== sourceSha) {
      actions.push({
        label: 'stale',
        detail: `${source} (source changed)`,
        run: () => writeStamp(to, source, sourceSha, true),
      })
      translate.push(source)
      continue
    }
    if (stamp.stale) accept.push(source)
  }

  for (const source of projectionFiles(review)) {
    if (!sources.includes(source)) {
      actions.push({
        label: 'remove',
        detail: `${relativeToCwd(join(review, source))} (no source in the work draft)`,
        run: () => removeTree(join(review, source)),
      })
    }
  }

  actions.push({ label: 'translate', detail: translate.length ? translate.join(', ') : 'none', run: () => {} })
  if (accept.length) actions.push({ label: 'accept', detail: accept.join(', '), run: () => {} })
  actions.push({
    label: 'verify',
    detail: 'the review projection is consistent with the work draft',
    run: () => assertProjection(draft, review, true),
  })
  return actions
}

function planLand(options: Options): Action[] {
  const draft = join(options.forge, 'draft', options.name)
  const review = join(options.forge, 'review', options.name)
  const target = options.into as string
  if (!isDirectory(draft)) throw new ForgeError(`work draft not found: ${relativeToCwd(draft)}`)
  if (!existsSync(join(draft, 'SKILL.md')))
    throw new ForgeError(`the work draft has no SKILL.md: ${relativeToCwd(draft)}`)
  if (isInside(options.forge, target) || isInside(target, options.forge)) {
    throw new ForgeError('the landing directory must stay outside the forge directory')
  }
  if (existsSync(target)) {
    if (!isDirectory(target)) throw new ForgeError(`the landing path is not a directory: ${relativeToCwd(target)}`)
    if (readdirSync(target).length > 0) {
      const existingName = readSkillName(target)
      if (existingName === undefined) {
        throw new ForgeError(`the landing directory is not a skill: ${relativeToCwd(target)}`)
      }
      if (basename(target) !== options.name || existingName !== options.name) {
        throw new ForgeError(
          `the landing directory holds ${existingName} at ${basename(target)}, not ${options.name}: ${relativeToCwd(target)}`,
        )
      }
    }
  }
  if (existsSync(review)) {
    assertProjection(draft, review, options.allowStale)
    for (const directory of SHARED_DIRS) {
      if (!treesEqual(join(draft, directory), join(review, directory)))
        throw new ForgeError(`review draft ${directory}/ is out of date; run review ${options.name}`)
    }
  }

  const staging = join(options.forge, 'staging', options.name)
  const backup = join(options.forge, 'staging', `${options.name}.previous`)
  const actions: Action[] = [
    {
      label: 'stage',
      detail: `${relativeToCwd(draft)} → ${relativeToCwd(staging)}`,
      run: () => {
        removeTree(staging)
        mkdirSync(dirname(staging), { recursive: true })
        cpSync(draft, staging, { recursive: true })
        assertTreesEqual(draft, staging, 'staged draft')
      },
    },
    {
      label: 'swap',
      detail: `${relativeToCwd(staging)} → ${relativeToCwd(target)}`,
      run: () => {
        mkdirSync(dirname(target), { recursive: true })
        swapDir(staging, target, backup)
      },
    },
    {
      label: 'verify',
      detail: `${relativeToCwd(target)} matches the work draft`,
      run: () => assertTreesEqual(draft, target, 'landed skill'),
    },
    { label: 'remove', detail: relativeToCwd(draft), run: () => removeTree(draft) },
  ]
  if (existsSync(review))
    actions.push({ label: 'remove', detail: relativeToCwd(review), run: () => removeTree(review) })
  actions.push({
    label: 'clean',
    detail: relativeToCwd(dirname(staging)),
    run: () => {
      try {
        rmdirSync(dirname(staging))
      } catch {
        // The staging directory still holds something else.
      }
    },
  })
  return actions
}

function execute(actions: Action[], dryRun: boolean): Result[] {
  const results: Result[] = []
  for (const action of actions) {
    if (dryRun) {
      results.push({ action: action.label, ok: true, detail: action.detail })
      continue
    }
    try {
      action.run()
      results.push({ action: action.label, ok: true, detail: action.detail })
    } catch (error) {
      results.push({ action: action.label, ok: false, detail: error instanceof Error ? error.message : String(error) })
      break
    }
  }
  return results
}

function report(options: Options, results: Result[]): never {
  const failed = results.filter((result) => !result.ok).length
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          command: options.command,
          name: options.name,
          forge: relativeToCwd(options.forge),
          dryRun: options.dryRun,
          results,
        },
        null,
        2,
      ),
    )
  } else {
    for (const result of results) {
      const mark = result.ok ? (options.dryRun ? 'would' : 'ok  ') : 'FAIL'
      console.log(`${mark} ${result.action} — ${result.detail}`)
    }
    console.log(`${results.length} action(s), ${failed} failed${options.dryRun ? ' (dry run)' : ''}`)
  }
  process.exit(failed === 0 ? 0 : 1)
}

try {
  const options = parse(process.argv.slice(2))
  const actions =
    options.command === 'draft'
      ? planDraft(options)
      : options.command === 'review'
        ? planReview(options)
        : planLand(options)
  report(options, execute(actions, options.dryRun))
} catch (error) {
  if (error instanceof ForgeError) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
  throw error
}

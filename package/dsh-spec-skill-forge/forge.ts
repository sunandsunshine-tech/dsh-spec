#!/usr/bin/env node
// Source for script/forge.mjs — the work-draft, review-draft and landing lifecycle.
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
} from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const DEFAULT_FORGE = '.agents/dsh-spec-skill-forge'

const USAGE = `usage: forge.mjs <command> [options]

Create, review and land the skill drafts the forging skill keeps in its forge directory.

commands:
  draft  <name> [--from <skill-dir>]   create the work draft, optionally seeded from a skill directory
  review <name> [--remove]             mirror the work draft's script/ into the review draft, or remove it
  land   <name> --into <skill-dir>     copy the work draft to the landing directory, then remove both drafts

options:
  --forge <dir>   forge directory (default: ${DEFAULT_FORGE})
  --from <dir>    skill directory copied into a new work draft (draft only)
  --into <dir>    landing directory (land only)
  --remove        remove the review draft (review only)
  --dry-run       print the actions and change nothing
  --json          print a JSON summary instead of lines
  --help, -h      print this and exit 0

The landing directory becomes an exact copy of the work draft. Landing requires SKILL.md in the
work draft; an existing landing directory must be empty or hold this skill's SKILL.md under the
skill's name. When a review draft exists, its script/ must match the work draft's. Landing removes
only draft/<name>/ and review/<name>/; the shared draft/ and review/ directories stay.

exit: 0 every action succeeded · 1 an action or precondition failed · 2 usage error`

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

class ForgeError extends Error {}

interface Options {
  command: 'draft' | 'review' | 'land'
  name: string
  forge: string
  from?: string
  into?: string
  remove: boolean
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
  const file = join(root, 'SKILL.md')
  if (!existsSync(file)) return undefined
  const lines = readFileSync(file, 'utf8').split('\n')
  if (lines[0] !== '---') return undefined
  for (const line of lines.slice(1)) {
    if (line === '---') break
    const match = /^name:\s*(.+)$/.exec(line)
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, '')
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
  let remove = false
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
    if (arg === '--remove') {
      remove = true
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
  if (command === 'draft' && (into !== undefined || remove)) usageError('draft takes --from, not --into or --remove')
  if (command === 'review' && (from !== undefined || into !== undefined))
    usageError('review takes --remove, not --from or --into')
  if (command === 'land' && (from !== undefined || remove)) usageError('land takes --into, not --from or --remove')
  if (command === 'land' && into === undefined) usageError('land needs --into <skill-dir>')
  return { command, name, forge, from, into, remove, dryRun, json }
}

function planDraft(options: Options): Action[] {
  const draft = join(options.forge, 'draft', options.name)
  if (existsSync(draft)) {
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

  const workScript = join(draft, 'script')
  const reviewScript = join(review, 'script')
  const actions: Action[] = []
  if (!existsSync(review)) {
    actions.push({ label: 'create', detail: relativeToCwd(review), run: () => mkdirSync(review, { recursive: true }) })
  }
  if (isDirectory(workScript)) {
    const files = hashTree(workScript).size
    actions.push({
      label: 'copy',
      detail: `${relativeToCwd(workScript)} (${files} file(s)) → ${relativeToCwd(reviewScript)}`,
      run: () => {
        removeTree(reviewScript)
        mkdirSync(dirname(reviewScript), { recursive: true })
        cpSync(workScript, reviewScript, { recursive: true })
      },
    })
    actions.push({
      label: 'verify',
      detail: 'the review script matches the work draft',
      run: () => assertTreesEqual(workScript, reviewScript, 'review script'),
    })
  } else {
    actions.push({
      label: 'remove',
      detail: `${relativeToCwd(reviewScript)} (the work draft has no script)`,
      run: () => removeTree(reviewScript),
    })
    actions.push({
      label: 'verify',
      detail: 'neither draft has a script',
      run: () => {
        if (existsSync(reviewScript)) throw new ForgeError('review draft script still exists')
      },
    })
  }
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
  if (existsSync(review) && !treesEqual(join(draft, 'script'), join(review, 'script'))) {
    throw new ForgeError(`review draft script is out of date; run review ${options.name}`)
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

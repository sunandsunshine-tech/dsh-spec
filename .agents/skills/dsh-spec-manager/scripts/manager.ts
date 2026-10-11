/**
 * Manage an adopted project's copy of the skill set.
 *
 * The manifest in `references/` decides what a project receives. Discovery is
 * repository-wide, so `gh skill install --all` on this collection would also
 * install skills vendored inside it that the package does not own; installing by
 * name from the manifest is what makes the result deterministic. Every
 * subcommand prints what it did or would do, and stops at the first failure: a
 * manager that half-applied a change leaves a project in a state no gate knows
 * how to read.
 *
 * Nothing here writes a record of what an install left behind. `gh skill install`
 * injects `metadata.github-ref` and `metadata.github-tree-sha` into every installed
 * `SKILL.md`, so `status` reads the installed revision out of the installed file
 * itself, and nothing beside it can disagree with the file the dispatcher runs.
 * The gates themselves travel inside this skill, which is the collection's one code
 * home, so there is no second copy of the engine either.
 *
 * An install is two halves: the skills under `.agents/skills/`, and the mechanism text a project
 * holds in its own tree — the notes contract, the delivery-plan contract, the documentation orders,
 * the search exclusion, and the marked standing-orders sections. `sync` rewrites the second half from
 * the installed templates and is also exposed on its own, because a project may want to see the diff
 * without a network install; `init` is the half that creates those files.
 */

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { normsStatusFor } from './norms-apply.ts'
import { normsPathOf } from './norms.ts'
import { fileURLToPath } from 'node:url'
import { manifestPathOf } from './manifest.ts'

/** Where this script lives. */
const scriptDir = dirname(fileURLToPath(import.meta.url))
/** The manifest: the skills the collection installs and the gates it publishes. */
const manifestPath = manifestPathOf(scriptDir)
/** The dispatcher, which sits in the code home beside every gate and resolves a name against the record. */
const dispatcherPath = join(scriptDir, 'dsh-spec.ts')
const initializerPath = join(scriptDir, 'init-agents-md.ts')
/** The grammar a skill name must match before it becomes a path. */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * The delivery-plan surface: the optional skill that turns it on, and the paths and markers it owns.
 *
 * The manager owns these facts because it owns the installed set — `status` reports the surface as
 * incomplete while that skill is installed and the tree or the hook is missing — and the initializer
 * derives its create and sync halves from the same constants rather than restating them.
 */
export const PLAN_SURFACE_SKILL = 'dsh-agent-team-workflow'
/** The tree the delivery-plan contract lives in, relative to the project root. */
export const PLANS_DIR = join('.agents', 'dsh-spec', 'plans')
/** The markers around the delivery-plan hook in an instruction file. */
export const PLANS_SECTION_START = '<!-- dsh-spec:plans -->'
export const PLANS_SECTION_END = '<!-- /dsh-spec:plans -->'

/** The manifest this script reads and never writes. */
export interface Manifest {
  repo: string
  /** Every skill the collection ships; a project installs the ones `optional` does not name. */
  skills: string[]
  /** The skills a project may leave out — a subset of `skills`, derived from nothing else. */
  optional: string[]
}

/** Stop with one actionable line; nothing half-applied. */
function fail(message: string): never {
  console.error(`dsh-spec-manager: ${message}`)
  process.exit(1)
}

/** Refuse the invocation itself, with exit 2; the caller can fix it by naming what is missing. */
function refuse(message: string): never {
  console.error(`dsh-spec-manager: ${message}`)
  process.exit(2)
}

/** Value of `--flag value`, when present. */
function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  return value === undefined || value.startsWith('--') ? undefined : value
}

/** Whether `--flag` appears anywhere in the arguments. */
function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

/** Every value a repeatable flag was given, in order. */
function flagValues(name: string): string[] {
  const values: string[] = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue
    const value = process.argv[index + 1]
    if (value === undefined || value.startsWith('--')) continue
    values.push(value)
  }
  return values
}

/** The subcommand, the first argument that is not a flag or a flag's value. */
function subcommand(): string {
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--root' || arg === '--dir' || arg === '--revision' || arg === '--skill' || arg === '--with') {
      index += 1
      continue
    }
    if (!arg.startsWith('--')) return arg
  }
  return ''
}

/** The project root: `--root`, else the nearest ancestor holding a `.git`, else the working directory. */
function projectRoot(): string {
  const configured = flagValue('--root')
  if (configured !== undefined) return resolve(configured)
  let current = resolve(process.cwd())
  for (;;) {
    if (existsSync(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(process.cwd())
    current = parent
  }
}

/** The directory installed skills live in. */
function skillsDirectory(root: string): string {
  return resolve(root, flagValue('--dir') ?? join('.agents', 'skills'))
}

/** What one reading of the manifest produced: the record, or why it is not one. */
export type ManifestReading =
  | { ok: true, manifest: Manifest }
  | { ok: false, error: string }

/**
 * Read and validate the manifest, as a value rather than an exit.
 *
 * The manager's verbs stop on a malformed record, and the decision to stop is the caller's: keeping
 * the reading separate is what lets each way a manifest can fail be observed as the message that
 * names it. `optional` is validated as a subset of `skills` rather than trusted — a name that is not
 * shipped cannot be left out, and a typo would make a required skill look optional — and the field
 * is additive, so a manifest written before it existed names nothing optional and installs
 * everything.
 *
 * @param path - the manifest to read; this copy's by default.
 * @returns the repo, every skill name, and the optional subset.
 */
export function readManifestRecord(path: string = manifestPath): ManifestReading {
  if (!existsSync(path)) {
    return { ok: false, error: `no manifest at ${path} — the skill is incomplete, so it cannot say what to install` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return { ok: false, error: `${path} is not readable JSON: ${(error as Error).message}` }
  }
  const candidate = parsed as { repo?: unknown, skills?: unknown, optional?: unknown }
  const repo = candidate.repo
  if (typeof repo !== 'string' || repo === '') return { ok: false, error: `${path} names no \`repo\`` }
  if (!Array.isArray(candidate.skills) || candidate.skills.length === 0) {
    return { ok: false, error: `${path} names no skills — an empty manifest would install nothing and report success` }
  }
  const skills: string[] = []
  for (const entry of candidate.skills) {
    if (typeof entry !== 'string' || entry === '') return { ok: false, error: `${path} has a skill entry with no name` }
    if (!NAME.test(entry)) {
      return { ok: false, error: `${path} names the skill \`${entry}\`, which is not a skill name — a name becomes a path under the skills directory, so only ${NAME} is accepted` }
    }
    skills.push(entry)
  }
  const optional: string[] = []
  if (candidate.optional !== undefined) {
    if (!Array.isArray(candidate.optional)) {
      return { ok: false, error: `${path} carries an \`optional\` that is not a list — it names the skills a project may leave out, so it is an array of skill names` }
    }
    for (const entry of candidate.optional) {
      if (typeof entry !== 'string' || entry === '') return { ok: false, error: `${path} has an \`optional\` entry with no name` }
      if (!NAME.test(entry)) {
        return { ok: false, error: `${path} names the optional skill \`${entry}\`, which is not a skill name — a name becomes a path under the skills directory, so only ${NAME} is accepted` }
      }
      if (optional.includes(entry)) return { ok: false, error: `${path} names the optional skill \`${entry}\` twice` }
      if (!skills.includes(entry)) {
        return { ok: false, error: `${path} names \`${entry}\` optional but \`skills\` does not — \`optional\` is a subset of the skills the collection ships, and nothing else can be left out` }
      }
      optional.push(entry)
    }
  }
  return { ok: true, manifest: { repo, skills, optional } }
}

/**
 * The skills a project installs unless it leaves one out: `skills` minus `optional`.
 *
 * Derived rather than recorded a second time, so the two lists cannot disagree: a skill is required
 * exactly when the manifest does not name it optional, and an older manifest that names none
 * optional requires all of them.
 *
 * @param manifest - the manifest as read.
 * @returns the required skill names, in manifest order.
 */
export function requiredSkills(manifest: Manifest): string[] {
  return manifest.skills.filter((skill) => !manifest.optional.includes(skill))
}

/**
 * Read and validate a manifest; a missing or empty one is a failure.
 *
 * The default is this copy's own manifest, which is the one a verb installs from. An upgrade that
 * replaces the manager passes the replacement's path instead: from then on the replacement is the
 * copy in the project, so it is the one whose skill list the install owes.
 *
 * @param path - the manifest to read; this copy's by default.
 * @returns the repo, every skill name, and the optional subset.
 */
function readManifest(path: string = manifestPath): Manifest {
  const reading = readManifestRecord(path)
  if (!reading.ok) fail(reading.error)
  return reading.manifest
}

/**
 * The revision a command acts on: the explicit ref, else the newest published release.
 *
 * Drafts are not published, so the first `draft: false` entry of the release list is the newest
 * revision a consumer can install. With neither source there is no honest default, so the
 * invocation is refused with exit 2 and the message names the flag that supplies one.
 *
 * @param explicit - the value of `--revision`, when the caller gave one.
 * @returns the ref to install from.
 */
async function resolveTargetRef(explicit: string | undefined): Promise<string> {
  if (explicit !== undefined && explicit !== '') return explicit
  const manifest = readManifest()
  const listed = await runCaptured('gh', ['api', `repos/${manifest.repo}/releases`], 'releases')
  if ((listed.status ?? 1) !== 0) {
    fail(`could not list the releases of ${manifest.repo}: \`gh api repos/${manifest.repo}/releases\` exited ${String(listed.status)}${listed.output.trim() === '' ? '' : ` — ${listed.output.trim()}`}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(listed.output)
  } catch (error) {
    fail(`the release list of ${manifest.repo} is not readable JSON: ${(error as Error).message}`)
  }
  const published = Array.isArray(parsed)
    ? parsed.find(entry => (entry as { draft?: unknown }).draft === false)
    : undefined
  const tag = (published as { tag_name?: unknown } | undefined)?.tag_name
  if (typeof tag !== 'string' || tag === '') {
    refuse(`no published release of ${manifest.repo} to install from — pass \`--revision <ref>\` to name the branch, tag or commit yourself`)
  }
  return tag
}

/** Run a command with inherited output; a missing binary is a failure, not a status. */
function run(command: string, args: string[], dryRun: boolean): void {
  const printable = [command, ...args].join(' ')
  if (dryRun) {
    console.log(`  would run: ${printable}`)
    return
  }
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) fail(`${command} could not be run: ${result.error.message}`)
  if ((result.status ?? 1) !== 0) fail(`\`${printable}\` exited ${result.status}`)
}

/** One child process's outcome, captured so parallel runs stay readable. */
interface ChildResult {
  label: string
  status: number | null
  error?: Error
  output: string
}

/** Run one command, capturing both streams, and resolve rather than throwing. */
function runCaptured(command: string, args: string[], label: string): Promise<ChildResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.on('error', (error: Error) => resolve({ label, status: null, error, output }))
    child.on('close', (status: number | null) => resolve({ label, status, output }))
  })
}

/**
 * Run one command per item at the same time, and report each by its label.
 *
 * A refresh is network-bound: one `gh skill install` takes about twelve seconds here, so running one
 * per skill in sequence costs minutes of waiting for work that has no order — each child writes its
 * own skill directory and reads nothing the others write. Their output is kept per child and printed
 * only when that child fails, so a failure is still readable and a success costs one line.
 *
 * @param command - the binary to run.
 * @param items - one label and argument list per child.
 * @param dryRun - print the commands instead of running them.
 * @param limit - the most children alive at once; the work is network-bound, so the pool is bounded.
 */
async function runAll(command: string, items: readonly { label: string, args: string[] }[], dryRun: boolean, limit = 8): Promise<void> {
  if (dryRun) {
    for (const item of items) console.log(`  would run: ${[command, ...item.args].join(' ')}`)
    return
  }
  const results: ChildResult[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next
      next += 1
      const item = items[index]
      if (item === undefined) return
      results[index] = await runCaptured(command, item.args, item.label)
    }
  })
  await Promise.all(workers)
  for (const result of results) {
    if (result.error !== undefined) fail(`${command} could not be run for ${result.label}: ${result.error.message}`)
  }
  const failed = results.filter(result => (result.status ?? 1) !== 0)
  for (const result of results) {
    if ((result.status ?? 1) === 0) console.log(`  ok ${result.label}`)
  }
  if (failed.length === 0) return
  for (const result of failed) {
    console.error(`  FAILED ${result.label} — \`${command}\` exited ${String(result.status)}`)
    const tail = result.output.trim()
    if (tail !== '') console.error(tail.split('\n').map(line => `      ${line}`).join('\n'))
  }
  fail(`${failed.length} of ${results.length} \`${command}\` run(s) failed`)
}

/** The revision's own listing: the short ref, each skill's tree sha, and every file's blob sha. */
interface RevisionIndex {
  /** The ref as a short name, so it can be compared with an injected `refs/heads/…`. */
  ref: string
  /** Skill directory name → the tree sha GitHub records for `skills/<name>`. */
  treeSha: Map<string, string>
  /** Skill directory name → path relative to it → git blob sha. */
  blobs: Map<string, Map<string, string>>
}

/**
 * Read the revision's tree once, for every skill.
 *
 * One listing answers the three questions a refresh asks: whether an installed skill is already this
 * revision's content (the tree sha `gh` recorded), which files it ships (their paths), and whether a
 * file changed since it was installed (their blob shas). Asking per skill cost one API call each and
 * could not answer the first question at all.
 *
 * @param repo - `owner/name` the skills come from.
 * @param revision - the branch, tag or commit to read.
 * @returns the listing, or `undefined` when it cannot be read.
 */
async function readRevisionIndex(repo: string, revision: string): Promise<RevisionIndex | undefined> {
  const commit = await runCaptured('gh', ['api', `repos/${repo}/commits/${revision}`, '--jq', '.commit.tree.sha'], revision)
  const treeSha = commit.output.trim()
  if ((commit.status ?? 1) !== 0 || !/^[0-9a-f]{40}$/.test(treeSha)) return undefined
  const listing = await runCaptured(
    'gh',
    ['api', `repos/${repo}/git/trees/${treeSha}?recursive=1`, '--jq', '.tree[] | "\\(.type) \\(.sha) \\(.path)"'],
    revision,
  )
  if ((listing.status ?? 1) !== 0) return undefined
  const index: RevisionIndex = { ref: shortRef(revision), treeSha: new Map(), blobs: new Map() }
  for (const line of listing.output.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const [type, sha, ...rest] = trimmed.split(' ')
    if (type === undefined || sha === undefined) continue
    const path = rest.join(' ')
    if (type === 'tree' && /^skills\/[^/]+$/.test(path)) {
      index.treeSha.set(path.slice('skills/'.length), sha)
      continue
    }
    if (type !== 'blob' || !path.startsWith('skills/')) continue
    const relative = path.slice('skills/'.length)
    const slash = relative.indexOf('/')
    if (slash < 0) continue
    const skill = relative.slice(0, slash)
    const files = index.blobs.get(skill) ?? new Map<string, string>()
    files.set(relative.slice(slash + 1), sha)
    index.blobs.set(skill, files)
  }
  return index.treeSha.size === 0 ? undefined : index
}

/** The short name of a ref: `refs/heads/main` and `refs/tags/v1.0.0` are spelled `main` and `v1.0.0`. */
function shortRef(ref: string): string {
  return ref.replace(/^refs\/(heads|tags)\//, '')
}

/** The git blob sha of one file's content — the identifier the tree API reports. */
function blobSha(content: Buffer): string {
  return createHash('sha1').update(`blob ${content.byteLength}\0`).update(content).digest('hex')
}

/**
 * The injected ref a skill carries, when it differs from the revision being planned.
 *
 * `SKILL.md` is not compared by content — `gh` re-serializes its frontmatter on every install — so
 * the ref that install would inject is stated on its own line instead: it is the one difference a
 * reader cannot see in a file list.
 */
interface RefDelta {
  from: string
  to: string
}

/** What one skill's plan or application touches, file by file, relative to the skill directory. */
interface SkillDelta {
  /** Shipped files the project does not hold. */
  added: string[]
  /** Held files whose blob sha is not the revision's. */
  modified: string[]
  /** Held files the revision does not ship, which `gh skill install` never deletes. */
  removed: string[]
  /** The injected ref, when the skill was installed from a different revision. */
  ref?: RefDelta
}

/** One skill's plan: nothing to do, the revision does not ship it, or the files a refresh touches. */
type SkillReading =
  | { kind: 'current' }
  | { kind: 'absent' }
  | { kind: 'delta', delta: SkillDelta }

/**
 * What reinstalling one skill would change.
 *
 * The tree sha `gh` injected is the revision's own record for that directory, so it answers the
 * cheap question — is this skill already this revision? — and a matching one ends the walk, because
 * the sha already states what the per-file comparison would recompute. When it does not match, the
 * walk answers what a plan needs: which files are new, which were edited, which the revision no
 * longer ships. `SKILL.md` is the one file whose content is compared as a last resort: `gh`
 * re-serializes its frontmatter on install, so an injected ref that differs says the skill moved
 * rather than that a person edited it, and the plan reports that as a ref line of its own.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param skill - the skill directory name.
 * @param index - the revision listing.
 * @returns nothing to do, the skill's absence from the revision, or the delta.
 */
function classifySkill(directory: string, skill: string, index: RevisionIndex): SkillReading {
  const expectedTree = index.treeSha.get(skill)
  const expected = index.blobs.get(skill)
  if (expectedTree === undefined || expected === undefined) return { kind: 'absent' }
  const root = join(directory, skill)
  const skillFile = join(root, 'SKILL.md')
  // A skill the project does not hold at all is every shipped file, added; there is nothing to walk.
  if (!existsSync(skillFile)) {
    return {
      kind: 'delta',
      delta: { added: [...expected.keys()].sort(), modified: [], removed: [] },
    }
  }
  const injectedTree = /github-tree-sha:\s*([0-9a-f]{40})/.exec(readFileSync(skillFile, 'utf8'))?.[1]
  const current = installedRevision(skillFile)
  const ref = current !== undefined && current !== '' && !current.startsWith('local:') && current !== index.ref
    ? { from: current, to: index.ref }
    : undefined
  // A matching tree sha is the revision's own record that every file is its content, so the plan is
  // that one line. Walking the directory instead would recompute what the sha already states, and a
  // file list is only a difference from the installed revision when the revision itself moved.
  if (injectedTree === expectedTree) {
    return ref === undefined ? { kind: 'current' } : { kind: 'delta', delta: { added: [], modified: [], removed: [], ref } }
  }
  const added: string[] = []
  const modified: string[] = []
  const removed: string[] = []
  const seen = new Set<string>()
  const walk = (location: string, prefix: string): void => {
    for (const entry of readdirSync(location, { withFileTypes: true })) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        walk(join(location, entry.name), relative)
        continue
      }
      const sha = expected.get(relative)
      if (sha === undefined) {
        removed.push(relative)
        continue
      }
      seen.add(relative)
      // `SKILL.md` is compared by content only when its injected ref already matches: `gh` writes
      // that frontmatter in its own order, so a differing blob at a differing ref says the revision
      // moved rather than that a person edited the file, and the ref line below says so on its own.
      const comparedByContent = relative !== 'SKILL.md' || ref === undefined
      if (comparedByContent && blobSha(readFileSync(join(location, entry.name))) !== sha) modified.push(relative)
    }
  }
  walk(root, '')
  for (const relative of expected.keys()) {
    if (!seen.has(relative)) added.push(relative)
  }
  if (added.length === 0 && modified.length === 0 && removed.length === 0 && ref === undefined) return { kind: 'current' }
  return { kind: 'delta', delta: { added: added.sort(), modified: modified.sort(), removed: removed.sort(), ref } }
}

/** The install plan for every skill of the selection. */
interface Plan {
  /** The ref the plan is against, so `already at <ref>` names the revision rather than a placeholder. */
  ref: string
  current: string[]
  fresh: string[]
  deltas: Map<string, SkillDelta>
  /** Skill → the paths the revision ships, which is what the applied prune reduces a directory to. */
  shipped: Map<string, string[]>
}

/**
 * The skills a refresh installs: every required skill, plus the optional ones the project already has.
 *
 * An optional skill is a choice the project made by holding it, so it follows the set like a required
 * one; one that is not installed stays that way on this path, because a refresh asks no questions.
 * The list is derived from the directory and the manifest rather than recorded, so the set and the
 * project's own state cannot disagree.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param manifest - the revision's manifest.
 * @returns the skill names to install, in manifest order.
 */
function selectedSkills(directory: string, manifest: Manifest): string[] {
  return manifest.skills.filter((skill) =>
    !manifest.optional.includes(skill) || existsSync(join(directory, skill, 'SKILL.md')))
}

/** A person's answer to one yes/no question. */
type Asker = (question: string) => Promise<boolean>

/**
 * The asker an interactive install reads its answers from.
 *
 * `terminal: false` is deliberate: readline then writes the prompt and reads a line without putting
 * the terminal into raw mode, which is what lets the same reader be driven by a pipe in a test and by
 * a person at a terminal in the field. Lines are queued rather than read by `question()`, because a
 * question is asked after the revision was read and an answer typed before it must not be lost; a
 * closed input answers every remaining question with the empty line, which is the default. The caller
 * closes it.
 */
function interactiveAsker(): { ask: Asker, close: () => void } {
  const reader = createInterface({ input: process.stdin, output: process.stdout, terminal: false })
  const queued: string[] = []
  const waiting: ((line: string) => void)[] = []
  reader.on('line', (line) => {
    const next = waiting.shift()
    if (next === undefined) queued.push(line)
    else next(line)
  })
  reader.on('close', () => {
    for (const resolve of waiting.splice(0)) resolve('')
  })
  const nextLine = async (): Promise<string> => {
    const line = queued.shift()
    if (line !== undefined) return line
    return await new Promise<string>((resolve) => { waiting.push(resolve) })
  }
  return {
    ask: async (question) => {
      process.stdout.write(question)
      const answer = (await nextLine()).trim().toLowerCase()
      return answer === 'y' || answer === 'yes'
    },
    close: () => reader.close(),
  }
}

/**
 * The first sentence of a skill's `description`, read from the revision being installed.
 *
 * An optional skill is not installed yet, so the only honest source is the file the revision ships:
 * the `SKILL.md` frontmatter owns that sentence, and copying it into the manifest would be a second
 * place for it to drift. Not reading it is not an error — the question then names the skill alone,
 * because a question is worth more than a fetch that failed.
 *
 * @param repo - `owner/name` the skills come from.
 * @param ref - the revision to read.
 * @param name - the skill whose description is wanted.
 * @returns the first sentence, or undefined when the revision could not be read.
 */
async function skillDescription(repo: string, ref: string, name: string): Promise<string | undefined> {
  const fetched = await runCaptured('gh', ['api', `repos/${repo}/contents/skills/${name}/SKILL.md?ref=${ref}`, '--jq', '.content'], `the description of ${name}`)
  if ((fetched.status ?? 1) !== 0 || fetched.output.trim() === '') return undefined
  const text = Buffer.from(fetched.output.trim(), 'base64').toString('utf8')
  const description = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? ''
  if (description === '') return undefined
  return /^(.*?[.!?])(?:\s|$)/.exec(description)?.[1] ?? description
}

/**
 * The optional skills an install adds: the ones `--with` named, or the ones a person answers yes to.
 *
 * Nothing optional is installed without an answer. A shell that is not a terminal — an agent's — has
 * nobody to ask, so it names the flag that would add the skill and installs nothing; a dry run prints
 * the question and the answer it would take instead of reading stdin, because a preview must not
 * consume the answer the apply needs.
 *
 * @param manifest - the revision's manifest.
 * @param options - the names `--with` gave, whether this is a preview, a reader when a person can be
 * asked, and how a skill is described in the question.
 * @returns the optional skills to install, in manifest order.
 */
async function chooseOptional(
  manifest: Manifest,
  options: { with: readonly string[], dryRun: boolean, ask?: () => { ask: Asker, close: () => void }, describe: (name: string) => Promise<string | undefined> },
): Promise<string[]> {
  for (const name of options.with) {
    if (!NAME.test(name)) refuse(`--with ${JSON.stringify(name)} is not a skill name — only ${NAME} is accepted`)
    if (!manifest.skills.includes(name)) refuse(`--with ${name} is not a skill this collection publishes, so there is nothing to add`)
    if (!manifest.optional.includes(name)) refuse(`--with ${name} is not optional — the set installs it already, so the flag adds nothing`)
  }
  const chosen: string[] = []
  // A preview never opens the reader: what a dry run prints is the answer it would take, and a
  // question it consumed would be an answer the apply could not give.
  const reader = options.dryRun ? undefined : options.ask?.()
  try {
    for (const name of manifest.optional) {
      if (options.with.includes(name)) {
        console.log(`  with: ${name} — named by --with, no question asked`)
        chosen.push(name)
        continue
      }
      // A preview of a question a person would be asked prints that question and its default answer.
      if (options.dryRun && options.ask !== undefined) {
        const blurb = await options.describe(name)
        console.log(`  would ask: ${blurb === undefined ? name : `${name} — ${blurb}`} — answer: no (pass --with ${name} to install it)`)
        continue
      }
      // Nobody to ask: an agent's shell, or a preview in one.
      if (reader === undefined) {
        console.log(`  optional not installed: ${name} — pass --with ${name} to add it`)
        continue
      }
      const blurb = await options.describe(name)
      if (await reader.ask(`  ${blurb === undefined ? name : `${name} — ${blurb}`}\n  add it? [y/N] `)) chosen.push(name)
    }
  } finally {
    reader?.close()
  }
  return chosen
}

/**
 * Read the revision index and classify every selected skill against it.
 *
 * One reading answers the whole plan, so it happens once per command however many skills the set
 * holds. `undefined` means the listing could not be read: the plan then installs every selected
 * skill, which is what `gh skill install` would do anyway, and prunes nothing, because a failed API
 * call must not look like a revision that ships nothing.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param skills - the selected skill names.
 * @param repo - `owner/name` the skills come from.
 * @param ref - the branch, tag or commit to read.
 * @param reinstall - plan every skill even when its content already matches.
 * @returns the plan.
 */
async function planRefresh(directory: string, skills: readonly string[], repo: string, ref: string, reinstall: boolean): Promise<Plan | undefined> {
  const index = await readRevisionIndex(repo, ref)
  if (index === undefined) return undefined
  const plan: Plan = { ref, current: [], fresh: [], deltas: new Map(), shipped: new Map() }
  for (const skill of skills) {
    const paths = index.blobs.get(skill)
    if (paths !== undefined) plan.shipped.set(skill, [...paths.keys()])
    if (reinstall) {
      plan.fresh.push(skill)
      continue
    }
    const reading = classifySkill(directory, skill, index)
    if (reading.kind === 'current') plan.current.push(skill)
    else if (reading.kind === 'absent') plan.fresh.push(skill)
    else {
      plan.fresh.push(skill)
      plan.deltas.set(skill, reading.delta)
    }
  }
  return plan
}

/** Print the file-level half of a plan: one line per path a refresh touches, and the ref change. */
function printPlan(plan: Plan): void {
  if (plan.current.length > 0) console.log(`  already at ${plan.ref}: ${plan.current.join(', ')}`)
  for (const [skill, delta] of plan.deltas) {
    for (const path of delta.added) console.log(`  + ${skill}/${path}`)
    for (const path of delta.modified) console.log(`  ~ ${skill}/${path}`)
    for (const path of delta.removed) console.log(`  - ${skill}/${path} (the revision does not ship it)`)
    if (delta.ref !== undefined) {
      console.log(`  ~ ${skill}/SKILL.md — injected metadata github-ref ${delta.ref.from} → ${delta.ref.to} (compared by the injected tree sha, not by content)`)
    }
  }
}

/**
 * Delete what the installed revision no longer ships.
 *
 * `gh skill install --force` overwrites the files a revision contains and never deletes one it has
 * dropped, so a rename or a removal leaves the old file behind. Most leftovers are inert, but one
 * class is fatal — a `verify-*.ts` script the gate record does not name makes the dispatcher refuse
 * to run anything — and a project cannot tell the two classes apart by looking. The revision's own
 * tree is the authority, so the installed directory is reduced to exactly what that tree lists.
 *
 * Nothing is deleted when the listing cannot be read: a failed API call must not look like a
 * revision that ships nothing.
 *
 * @param skill - the skill directory name.
 * @param directory - the project's `.agents/skills/` directory.
 * @param expected - the paths the revision ships, or `undefined` when the listing was unreadable.
 * @param dryRun - print the removals instead of making them.
 */
function pruneToRevision(skill: string, directory: string, expected: string[] | undefined, dryRun: boolean): void {
  if (expected === undefined) {
    console.log(`  ${skill}: no revision listing read — nothing pruned`)
    return
  }
  const shipped = new Set(expected)
  const root = join(directory, skill)
  // An absent directory has nothing to prune, and a page of "removed" lines for a skill that was
  // never installed would read as a change rather than the absence it is.
  if (!existsSync(root)) return
  const doomed: string[] = []
  const directories: string[] = []
  const walk = (current: string, prefix: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        directories.push(join(current, entry.name))
        walk(join(current, entry.name), relative)
      } else if (!shipped.has(relative)) {
        doomed.push(relative)
      }
    }
  }
  walk(root, '')
  for (const relative of doomed) {
    const path = join(root, relative)
    if (dryRun) {
      console.log(`  would remove ${path} — the revision does not ship it`)
      continue
    }
    rmSync(path)
    console.log(`  removed ${path} — the revision does not ship it`)
  }
  if (dryRun) return
  // A directory that held only removed files is debris of the same kind, so it goes too.
  for (const dir of directories.reverse()) {
    if (existsSync(dir) && readdirSync(dir).length === 0) rmSync(dir, { recursive: true })
  }
}

/**
 * Remove every installed directory this collection owns but the revision no longer publishes.
 *
 * `gh skill install` only ever adds, so a skill a later revision drops stays on disk; `status` would
 * report it as this collection's on every run. Ownership is the source repo `gh` injected into the
 * directory, so another collection's install beside this one is never touched — that rule is what
 * makes two collections share `.agents/skills/` safely.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param manifest - the revision's manifest.
 * @param dryRun - print the removals instead of making them.
 */
function retireUnpublished(directory: string, manifest: Manifest, dryRun: boolean): void {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || manifest.skills.includes(entry.name)) continue
    const skillFile = join(directory, entry.name, 'SKILL.md')
    // `installedRepo` answers in the manifest's own shape, so equality is the whole ownership test
    // whichever form the installer wrote.
    if (!existsSync(skillFile) || installedRepo(skillFile) !== manifest.repo) continue
    const path = join(directory, entry.name)
    if (dryRun) {
      console.log(`  would remove ${path} — this revision no longer publishes ${entry.name}`)
      continue
    }
    rmSync(path, { recursive: true, force: true })
    console.log(`  removed ${path} — this revision no longer publishes ${entry.name}`)
  }
}

/**
 * Read the revision, print or apply the skill plan, then sync the files whose text the collection owns.
 *
 * The revision is read once, as a tree listing, and it decides three things: which skills are already
 * that content (they are left alone), which files a skill gained, lost or edited, and which files the
 * revision no longer ships (removed afterwards — `gh skill install --force` overwrites what it
 * installs and never deletes what the revision dropped). A refresh of an unchanged project is then
 * one API call and a local walk, rather than one network install per skill.
 *
 * A dry run reads the same listing and prints the same plan: the header it prints says `would` where
 * an applied run says nothing, and nothing is written. Reading the network is what makes
 * `already at <ref>` in the plan true rather than assumed.
 *
 * @param repo - `owner/name` the skills come from.
 * @param directory - the project's `.agents/skills/` directory.
 * @param skills - the selected skill names.
 * @param ref - the branch, tag or commit to install at.
 * @param dryRun - print the commands instead of running them.
 * @param reinstall - install every skill even when it is already the revision's content.
 * @param create - also run the initializer that creates the project's missing files.
 * @param limit - the most `gh` children alive at once.
 */
async function refresh(root: string, repo: string, directory: string, skills: readonly string[], ref: string, dryRun: boolean, reinstall: boolean, create: boolean, limit: number): Promise<void> {
  const plan = await planRefresh(directory, skills, repo, ref, reinstall)
  const stale = plan?.fresh ?? [...skills]
  if (plan === undefined) {
    console.log(`  could not read the tree for ${ref} — installing every skill and pruning nothing`)
  } else {
    printPlan(plan)
  }
  await runAll('gh', stale.map(skill => ({
    label: skill,
    args: ['skill', 'install', repo, `${skill}@${ref}`, '--dir', directory, '--force'],
  })), dryRun, limit)
  for (const skill of skills) {
    // Without a listing there is nothing to prune to, and an unread API call must not look like a
    // revision that ships nothing.
    if (plan === undefined) {
      pruneToRevision(skill, directory, undefined, dryRun)
      continue
    }
    pruneToRevision(skill, directory, plan.shipped.get(skill), dryRun)
  }
  // The other half of a refresh: the files whose text the collection owns — the notes contract, the
  // delivery-plan contract, the documentation orders, the search exclusion, the marked
  // standing-orders sections — are brought to this revision too, so every project's mechanism text is
  // the same one. A terminology table keeps its rows and `AGENTS.md` keeps everything outside the
  // marked sections.
  // Adoption creates the project files that are missing and never overwrites one it did not
  // create; a refresh only brings the managed text up to this revision, so a file a project
  // deliberately deleted stays deleted.
  //
  // The initializer is its own preview: without `--write` it prints the same plan an apply would
  // carry out — the files it would create, the managed text it would rewrite, with the diff — and
  // writes nothing. So a dry run runs it, rather than printing the command that would have rendered
  // the plan; `--write` is the whole difference between the two, which is what keeps a preview and
  // an apply comparing the same two texts.
  if (create) run(process.execPath, initializerArgs(root, dryRun ? [] : ['--write']), false)
  run(process.execPath, initializerArgs(root, dryRun ? ['--sync'] : ['--sync', '--write']), false)
}

/**
 * Adopt the collection: deploy the set at the manager's own ref, create the missing project files,
 * sync the text.
 *
 * The optional skills are a question this verb asks and a refresh never does: at a terminal the
 * install asks about each one, an agent's shell is told the flag that answers instead, and `--with`
 * answers without a question. `--dry-run` prints both the question and the skill plan it decides.
 */
export async function installProject(root: string, options: { dryRun: boolean, jobs: number, revision?: string }): Promise<void> {
  const manifest = readManifest()
  const explicit = options.revision === '' ? undefined : options.revision
  const ref = explicit ?? managerRef(root) ?? await resolveTargetRef(undefined)
  const optional = await chooseOptional(manifest, {
    with: flagValues('--with'),
    dryRun: options.dryRun,
    // A terminal is what makes a question answerable; `interactiveAsker` is built only when one of
    // those answers is actually read.
    ask: process.stdin.isTTY === true ? interactiveAsker : undefined,
    describe: (name) => skillDescription(manifest.repo, ref, name),
  })
  const skills = [...requiredSkills(manifest), ...optional]
  console.log(`  install ${skills.length} skill(s) from ${manifest.repo} at ${ref} into ${skillsDirectory(root)}`)
  if (options.dryRun) console.log('  dry run — nothing is written; drop --dry-run to apply')
  await refresh(root, manifest.repo, skillsDirectory(root), skills, ref, options.dryRun, false, true, options.jobs)
  // The norms a project applies are its own selection, so adoption reports them and never writes
  // them: `norms install` is the command that does.
  console.log(normsStatusFor(root, normsPathOf(import.meta.dirname)))
}

/**
 * Refresh the deployment and the managed text at the resolved revision, creating nothing the project
 * does not already have.
 *
 * The whole verb is two halves against one ref. The manager is the first half: a manager older than
 * the ref is replaced by that ref's copy of itself, and the new copy is then run once — re-executed —
 * so the second half, installing the set, is decided by the revision being installed rather than by
 * the code that was already on disk. `--only-skill-set` skips the first half, which is what makes
 * this a way to install the set at the manager's own ref. A replacement copy older than that flag
 * cannot be told the target at all, so it is not run: the invoker installs the set instead, from the
 * skill list the replacement ships, because the invoker is the copy that can be told the ref.
 *
 * @param root - the project root.
 * @param options - the dry-run, reinstall, dispatch width, revision and half selection.
 */
export async function upgradeProject(root: string, options: { dryRun: boolean, reinstall: boolean, jobs: number, revision?: string, skillSetOnly?: boolean }): Promise<void> {
  const manifest = readManifest()
  const directory = skillsDirectory(root)
  const current = managerRef(root)
  // A full upgrade targets the two-level resolution: an explicit revision, or the newest published
  // release. `--only-skill-set` installs at the manager's own injected ref instead, because it is the
  // same install `install` performs, minus the self-update half.
  const requested = options.revision === undefined || options.revision === '' ? undefined : options.revision
  const ref = options.skillSetOnly && requested === undefined
    ? (current ?? refuse('this manager carries no injected `github-ref`, so `--only-skill-set` has no ref to install from — pass `--revision <ref>`'))
    : await resolveTargetRef(requested)
  // A refresh asks nothing: the optional skills the project already holds follow the set, and the
  // ones it never took are not installed behind its back.
  const selection = selectedSkills(directory, manifest)
  console.log(`  upgrade ${selection.length} skill(s) from ${manifest.repo} at ${ref} into ${directory}`)
  if (options.dryRun) console.log('  dry run — nothing is written; drop --dry-run to apply')
  if (!options.skillSetOnly && current !== ref) {
    const install: string[] = ['skill', 'install', manifest.repo, `dsh-spec-manager@${ref}`, '--dir', directory, '--force']
    run('gh', install, options.dryRun)
    if (!options.dryRun) {
      // The manager just changed: the copy that decides the rest is the one now on disk, so the
      // second half runs in a new process carrying `--only-skill-set` rather than mixing revisions.
      const dispatcher = join(directory, 'dsh-spec-manager', 'scripts', 'dsh-spec.ts')
      console.log(`  re-exec ${dispatcher} upgrade --only-skill-set --revision ${ref} --root ${root}`)
      const result = spawnSync(process.execPath, [dispatcher, 'upgrade', '--only-skill-set', '--revision', ref, '--root', root], { stdio: 'inherit' })
      if (result.error) fail(`${dispatcher} could not be run: ${result.error.message}`)
      process.exit(result.status ?? 1)
    }
  } else if (!options.skillSetOnly) {
    console.log(`  the manager is already at ${current ?? 'a revision that cannot be read'}`)
  }
  console.log(`  at ${ref}: installing the skill set only`)
  await refresh(root, manifest.repo, directory, selection, ref, options.dryRun, options.reinstall, false, options.jobs)
  // A skill the revision dropped survives `gh skill install` and would be reported by `status`
  // forever, so a refresh removes the ones this collection installed and no longer publishes. It is
  // a removal after the install, so the new revision's own set is already in place.
  retireUnpublished(directory, manifest, options.dryRun)
  // `apt update`, not `apt upgrade`: a refresh reads the applied norms and says what the revision
  // moves, and leaves writing them to `norms update`.
  console.log(normsStatusFor(root, normsPathOf(import.meta.dirname)))
}

/**
 * The frontmatter `gh skill install` injected into an installed `SKILL.md`, or `undefined` when the
 * file carries no `metadata:` block at all.
 *
 * The installer is the only writer of that block, so every field read from it describes the install
 * rather than a claim written beside it. `undefined` means the file was not put there by an install,
 * which callers report as such instead of reading a missing field as agreement.
 *
 * @param path - the installed `SKILL.md`.
 * @returns the frontmatter text, or undefined when there is no injected metadata block.
 */
function injectedMetadata(path: string): string | undefined {
  const lines = readFileSync(path, 'utf8').split('\n')
  if (lines[0] !== '---') return undefined
  const end = lines.indexOf('---', 1)
  if (end === -1) return undefined
  const frontmatter = lines.slice(1, end).join('\n')
  return /^metadata:\s*$/m.test(frontmatter) ? frontmatter : undefined
}

/**
 * The ref the manager itself was installed from, read out of its own installed `SKILL.md`.
 *
 * The manager file is the pin: the ref `gh skill install` injected into it is the revision every
 * other skill of the set is installed at, so no field in the manifest declares one. A source tree
 * whose manager was never installed carries no `github-ref`, which is a state the caller reports
 * rather than reads as agreement.
 *
 * @param project - the project root whose skills directory is read.
 * @returns the short ref, or `undefined` when the manager carries no `metadata.github-ref`.
 */
export function managerRef(project: string): string | undefined {
  const path = join(skillsDirectory(project), 'dsh-spec-manager', 'SKILL.md')
  if (!existsSync(path)) return undefined
  const frontmatter = injectedMetadata(path)
  if (frontmatter === undefined) return undefined
  const ref = /^\s*github-ref:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  return shortRef(ref) || undefined
}

/**
 * The revision `gh skill install` injected into an installed `SKILL.md`, or `undefined` when the
 * file carries no `metadata:` block at all.
 */
function installedRevision(path: string): string | undefined {
  const frontmatter = injectedMetadata(path)
  if (frontmatter === undefined) return undefined
  const ref = /^\s*github-ref:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  const tree = /^\s*github-tree-sha:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  const revision = shortRef(ref) || tree
  if (revision !== '') return revision
  // A local install carries a path instead of a ref: its revision cannot be compared against the
  // manager's ref, and saying so is different from reading a missing field as agreement.
  const local = /^\s*local-path:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  return local === '' ? '' : `local:${local}`
}

/**
 * The `owner/name` a recorded source repository names, or undefined when it names none.
 *
 * `gh skill install` writes the source repository as a URL while the manifest names it in the bare
 * form, so the two have to be brought to one shape before they can be compared. Accepting a trailing
 * slash or `.git` is what makes the field readable whichever way it was written; anything that is
 * still not `owner/name` after that is returned as it stands, so a repository this collection does
 * not own stays a value that compares unequal rather than being mistaken for one.
 *
 * @param recorded - the recorded value, or undefined when the file records none.
 * @returns `owner/name`, or undefined when the value is empty.
 */
function repositoryName(recorded: string | undefined): string | undefined {
  if (recorded === undefined) return undefined
  const trimmed = recorded.trim().replace(/\/+$/, '').replace(/\.git$/i, '')
  const onGitHub = /^https?:\/\/github\.com\/([^/]+\/[^/]+)$/i.exec(trimmed)
  const name = (onGitHub?.[1] ?? trimmed).replace(/\/+$/, '')
  return name === '' ? undefined : name
}

/**
 * The repository an installed `SKILL.md` records, as `owner/name`.
 *
 * The source repo is what makes an installed directory's owner readable without the network: a name
 * the manifest does not list belongs to this collection exactly when the normalised value equals
 * `manifest.repo`, and anything else is another collection's install to leave alone. This is the one
 * place that knows the shapes the installer writes, so every caller compares the result directly.
 *
 * @param path - the installed `SKILL.md`.
 * @returns the recorded `owner/name`, or undefined when the file records none.
 */
function installedRepo(path: string): string | undefined {
  const frontmatter = injectedMetadata(path)
  if (frontmatter === undefined) return undefined
  const repo = /^\s*github-repo:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  return repositoryName(repo === '' ? undefined : repo)
}

/** Report the installed set and each skill's revision, each compared with the manager's own; change nothing. */
export function statusProject(root: string): void {
  status(root, readManifest())
}

function status(root: string, manifest: Manifest): void {
  const directory = skillsDirectory(root)
  const findings: string[] = []
  const installed = existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, 'SKILL.md')))
        .map((entry) => entry.name)
    : []

  // The manager's own ref is the pin every other skill is held against, and it is read from the
  // manager's installed file like every other revision here — nothing is compared with the manifest,
  // which no longer declares one.
  const managerPath = join(directory, 'dsh-spec-manager', 'SKILL.md')
  const manager = managerRef(root)
  if (manager === undefined) {
    findings.push(
      `${managerPath}: no \`metadata.github-ref\` injected by \`gh skill install\`, so the manager's own ref cannot be read and no skill can be compared with it — reinstall dsh-spec-manager`,
    )
  }

  let installedHere = 0
  for (const skill of manifest.skills) {
    const entry = join(directory, skill, 'SKILL.md')
    if (!existsSync(entry)) {
      // An optional skill the project did not take is the state the field describes, not a problem.
      if (manifest.optional.includes(skill)) console.log(`  absent    ${skill}  optional, not installed`)
      else findings.push(`${skill}: not installed (expected ${entry})`)
      continue
    }
    installedHere += 1
    const revision = installedRevision(entry)
    if (revision === undefined) {
      findings.push(
        `${skill}: ${entry} has no metadata block injected by \`gh skill install\`, so it is not an install of the manager's ref — reinstall the skill`,
      )
    } else if (revision === '') {
      findings.push(`${skill}: the injected metadata names no github-ref and no github-tree-sha, so no revision can be read from it`)
    } else if (revision.startsWith('local:')) {
      findings.push(`${skill}: installed from the local path ${revision.slice('local:'.length)}, which carries no revision to compare with the manager's${manager === undefined ? '' : ` ${manager}`}`)
    } else if (manager !== undefined && revision !== manager) {
      findings.push(`${skill}: at ${revision}, the manager is at ${manager}`)
    } else {
      console.log(`  ok        ${skill}  ${revision}`)
    }
  }
  for (const name of installed) {
    if (manifest.skills.includes(name)) continue
    const skillFile = join(directory, name, 'SKILL.md')
    const owner = installedRepo(skillFile)
    // A directory this collection installed that the manifest no longer names is a skill the
    // revision dropped: it is this collection's, and `upgrade` cleans it up. `owner` is the recorded
    // repository in the manifest's own shape, so a URL and a bare name both land here.
    if (owner === manifest.repo) {
      findings.push(`${name}: installed from ${manifest.repo} but this revision no longer publishes it — \`upgrade\` removes it`)
      continue
    }
    // Another collection's install shares the directory by design. Naming it is information, and a
    // project running two collections must not have this collection's status fail over one.
    console.log(`  other     ${name}  ${owner ?? 'no metadata.github-repo'} — not this collection's, left alone`)
  }
  // The delivery-plan surface belongs to the optional workflow skill. A project that holds the skill
  // and not the tree, or not the hook, carries half a workspace, and this is the only place that is
  // noticed before a delivery depends on it.
  if (existsSync(join(directory, PLAN_SURFACE_SKILL, 'SKILL.md'))) {
    const contract = join(root, PLANS_DIR, 'README.md')
    const instruction = existsSync(join(root, 'AGENTS.md')) ? readFileSync(join(root, 'AGENTS.md'), 'utf8') : ''
    const gaps: string[] = []
    if (!existsSync(contract)) gaps.push(`the plan tree is missing (expected ${contract})`)
    if (!instruction.includes(PLANS_SECTION_START)) gaps.push(`the root AGENTS.md carries no ${PLANS_SECTION_START} hook`)
    if (gaps.length > 0) {
      findings.push(`${PLAN_SURFACE_SKILL} is installed but the delivery-plan surface is incomplete: ${gaps.join('; ')} — \`install\` creates it, and a refresh only syncs what is there`)
    }
  }
  if (!existsSync(dispatcherPath)) findings.push(`${dispatcherPath}: the entry point dsh-spec.ts is missing`)

  // A set installed at user scope is not installed *here*: this collection is project-scoped, and
  // saying so is the difference between a reader's mistake and a mysteriously empty project.
  if (installedHere === 0) {
    console.error(`dsh-spec-manager: no skill of this set is installed in ${directory} — the collection is installed per project, so run \`dsh-spec.ts install --root ${root}\` here.`)
  }

  if (findings.length > 0) {
    console.error(`dsh-spec-manager: status found ${findings.length} problem(s):`)
    for (const finding of findings) console.error(`  ${finding}`)
    process.exit(1)
  }
  console.log(`  ok        ${manifest.skills.length} skill(s) at ${manager}, each revision compared with the manager's own injected ref`)
}

/** Remove the installed skills. */
export function uninstallProject(root: string, dryRun: boolean): void {
  uninstall(root, readManifest(), dryRun)
}

/**
 * Remove the skills this collection installed.
 *
 * The whole set by default, or the one `--skill` names. A name this manifest does not carry is
 * refused rather than skipped: another collection's directory must never be touched, and refusing
 * the invocation is what keeps that a property of the code rather than of a comparison.
 */
function uninstall(root: string, manifest: Manifest, dryRun: boolean): void {
  const directory = skillsDirectory(root)
  const selected = flagValue('--skill')
  if (selected !== undefined && !NAME.test(selected)) {
    refuse(`--skill ${JSON.stringify(selected)} is not a skill name — only ${NAME} is accepted`)
  }
  if (selected !== undefined && !manifest.skills.includes(selected)) {
    refuse(`--skill ${selected} is not a skill this collection publishes, so this manager has nothing to remove — another collection's directory is never touched`)
  }
  for (const skill of selected === undefined ? manifest.skills : [selected]) {
    const path = join(directory, skill)
    if (!existsSync(path)) {
      console.log(`  absent: ${path}`)
      continue
    }
    if (dryRun) console.log(`  would remove: ${path}`)
    else {
      rmSync(path, { recursive: true, force: true })
      console.log(`  removed: ${path}`)
    }
  }
  // The root instruction file is the initializer's text, and removing a skill can turn a hook off:
  // the delivery-plan surface belongs to the optional workflow skill, so removing that skill removes
  // the hook that points at its workspace while the tree and the plans stay where they are. Only the
  // initializer knows which blocks belong in the file, so it is the half that runs.
  run(process.execPath, initializerArgs(root, dryRun ? ['--sync'] : ['--sync', '--write']), false)
  // The layer and the manifest live inside the manager skill's own directory, so removing that
  // directory removes them; nothing outside it was ever written. What is left is the project's own,
  // and an uninstall that took it would delete decisions, plans and standing orders the project made.
  console.log('  left in place — delete these yourself if the project is leaving the pattern:')
  for (const path of ['AGENTS.md (its dsh-spec:agent-notes and dsh-spec:plans blocks)', '.agents/dsh-spec/notes/', '.agents/dsh-spec/plans/', 'docs/', '.rgignore']) {
    console.log(`    ${path}`)
  }
}

/**
 * The initializer's arguments, carrying a `.agents/skills` override when the caller gave one.
 *
 * The initializer writes the installed engine directory into the managed text, so an install at a
 * non-default directory has to tell it where the skills actually went.
 */
function initializerArgs(root: string, extra: readonly string[]): string[] {
  const directory = flagValue('--dir')
  return [initializerPath, '--root', root, ...extra, ...(directory === undefined ? [] : ['--dir', directory])]
}

/** The dispatch width for installer calls; the environment may override it. */
function jobWidth(): number {
  const requested = flagValue('--jobs') ?? process.env.DSH_SPEC_JOBS
  if (requested === undefined || requested === '') return 8
  const width = Number.parseInt(requested, 10)
  if (!Number.isFinite(width) || width < 1) fail(`--jobs needs a positive integer, got ${JSON.stringify(requested)}`)
  return width
}

/** This file's own CLI: kept so the deployment can be driven without the entry point beside it. */
function manage(): void {
  const command = subcommand()
  const root = projectRoot()
  const dryRun = hasFlag('--dry-run')
  if (command === 'install') {
    void installProject(root, { dryRun, jobs: jobWidth(), revision: flagValue('--revision') })
  } else if (command === 'upgrade' || command === 'update') {
    void upgradeProject(root, { dryRun, reinstall: hasFlag('--reinstall'), skillSetOnly: hasFlag('--only-skill-set'), jobs: jobWidth(), revision: flagValue('--revision') })
  } else if (command === 'init') {
    if (!existsSync(initializerPath)) fail(`the initializer is missing at ${initializerPath}`)
    run(process.execPath, initializerArgs(root, hasFlag('--write') ? ['--write'] : []), dryRun)
  } else if (command === 'sync') {
    run(process.execPath, initializerArgs(root, hasFlag('--write') ? ['--sync', '--write'] : ['--sync']), dryRun)
  } else if (command === 'status') {
    statusProject(root)
  } else if (command === 'uninstall') {
    uninstallProject(root, dryRun)
  } else {
    fail(`unknown subcommand ${command === '' ? '(none given)' : `\`${command}\``} — expected install, upgrade, sync, uninstall or status`)
  }
}

// Importing this module must not run the CLI: the entry point beside it imports these functions.
const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) manage()

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
 * holds in its own tree — the notes contract, the documentation orders, the search exclusion, and
 * the marked standing-orders section. `sync` rewrites the second half from the installed templates
 * and is also exposed on its own, because a project may want to see the diff without a network
 * install; `init` is the half that creates those files.
 */

import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { manifestPathOf } from './manifest.ts'

/** Where this script lives. */
const scriptDir = dirname(fileURLToPath(import.meta.url))
/** The manifest: the skills the collection installs, the pin they come from, and the gates it publishes. */
const manifestPath = manifestPathOf(scriptDir)
/** The dispatcher, which sits in the code home beside every gate and resolves a name against the record. */
const dispatcherPath = join(scriptDir, 'dsh-spec.ts')
const initializerPath = join(scriptDir, 'init-agents-md.ts')
/** The grammar a skill name must match before it becomes a path. */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The manifest this script reads and never writes. */
interface Manifest {
  repo: string
  revision: string
  skills: string[]
}

/** Stop with one actionable line; nothing half-applied. */
function fail(message: string): never {
  console.error(`dsh-spec-manager: ${message}`)
  process.exit(1)
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

/** The subcommand, the first argument that is not a flag or a flag's value. */
function subcommand(): string {
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--root' || arg === '--rev' || arg === '--repo' || arg === '--dir') {
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

/** Read and validate the manifest; a missing or empty one is a failure. */
function readManifest(): Manifest {
  if (!existsSync(manifestPath)) {
    fail(`no manifest at ${manifestPath} — the skill is incomplete, so it cannot say what to install`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail(`${manifestPath} is not readable JSON: ${(error as Error).message}`)
  }
  const candidate = parsed as Partial<Manifest>
  for (const field of ['repo', 'revision'] as const) {
    const value = candidate[field]
    if (typeof value !== 'string' || value === '') fail(`${manifestPath} names no \`${field}\``)
  }
  if (!Array.isArray(candidate.skills) || candidate.skills.length === 0) {
    fail(`${manifestPath} names no skills — an empty manifest would install nothing and report success`)
  }
  const skills = candidate.skills.map((entry) => {
    if (typeof entry !== 'string' || entry === '') fail(`${manifestPath} has a skill entry with no name`)
    if (!NAME.test(entry)) {
      fail(`${manifestPath} names the skill \`${entry}\`, which is not a skill name — a name becomes a path under the skills directory, so only ${NAME} is accepted`)
    }
    return entry
  })
  return { repo: candidate.repo as string, revision: candidate.revision as string, skills }
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
 * A refresh is network-bound: one `gh skill install` takes about twelve seconds here, and eight of
 * them in sequence is two minutes of waiting for work that has no order — each child writes its own
 * skill directory and reads nothing the others write. Their output is kept per child and printed
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

/** The revision's own listing: each skill's tree sha, and every file's blob sha. */
interface RevisionIndex {
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
 * @param revision - the branch, tag or commit the manifest pins.
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
  const index: RevisionIndex = { treeSha: new Map(), blobs: new Map() }
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

/** The git blob sha of one file's content — the identifier the tree API reports. */
function blobSha(content: Buffer): string {
  return createHash('sha1').update(`blob ${content.byteLength}\0`).update(content).digest('hex')
}

/**
 * Is the installed skill already the revision's content?
 *
 * The tree sha `gh` injected is the revision's own record for that directory, so a mismatch means
 * the revision moved. A matching tree alone would not notice a hand edit, so the file list has to
 * match exactly and every file is compared by blob sha — except `SKILL.md`, whose frontmatter `gh`
 * re-serializes on install and which is therefore covered by the injected tree sha instead.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param skill - the skill directory name.
 * @param index - the revision listing.
 * @returns true when reinstalling this skill would write the same content.
 */
function isCurrent(directory: string, skill: string, index: RevisionIndex): boolean {
  const expectedTree = index.treeSha.get(skill)
  const expected = index.blobs.get(skill)
  if (expectedTree === undefined || expected === undefined) return false
  const root = join(directory, skill)
  const skillFile = join(root, 'SKILL.md')
  if (!existsSync(skillFile)) return false
  if (/github-tree-sha:\s*([0-9a-f]{40})/.exec(readFileSync(skillFile, 'utf8'))?.[1] !== expectedTree) return false
  const seen = new Set<string>()
  const walk = (current: string, prefix: string): boolean => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        if (!walk(join(current, entry.name), relative)) return false
        continue
      }
      const sha = expected.get(relative)
      if (sha === undefined) return false
      seen.add(relative)
      if (relative !== 'SKILL.md' && blobSha(readFileSync(join(current, entry.name))) !== sha) return false
    }
    return true
  }
  return walk(root, '') && seen.size === expected.size
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
 * Fetch what changed, reduce each installed directory to what the revision ships, then sync the
 * files whose text the collection owns.
 *
 * The revision is read once, as a tree listing, and it decides three things: which skills are
 * already that content (they are left alone), which files each skill ships (the prune), and whether
 * a file changed since it was installed (a blob sha each). A refresh of an unchanged project is then
 * one API call and a local walk, rather than eight network installs.
 *
 * @param repo - `owner/name` the skills come from.
 * @param directory - the project's `.agents/skills/` directory.
 * @param manifest - the pinned revision and the skills to install.
 * @param dryRun - print the commands instead of running them.
 * @param reinstall - install every skill even when it is already the revision's content.
 */
async function refresh(root: string, repo: string, directory: string, manifest: Manifest, dryRun: boolean, reinstall: boolean, create: boolean, limit: number): Promise<void> {
  // A dry run is a local plan: reading the revision index costs a network round trip, and a preview
  // that needs the network is not a preview anybody can run offline.
  const index = dryRun ? undefined : await readRevisionIndex(repo, manifest.revision)
  if (!dryRun && index === undefined) {
    console.log(`  could not read the tree for ${manifest.revision} — installing every skill and pruning nothing`)
  }
  const stale: string[] = []
  const current: string[] = []
  for (const skill of manifest.skills) {
    if (!reinstall && index !== undefined && isCurrent(directory, skill, index)) current.push(skill)
    else stale.push(skill)
  }
  if (current.length > 0) {
    console.log(`  already at ${manifest.revision}: ${current.join(', ')}`)
  }
  await runAll('gh', stale.map(skill => ({
    label: skill,
    args: ['skill', 'install', repo, `${skill}@${manifest.revision}`, '--dir', directory, '--force'],
  })), dryRun, limit)
  if (dryRun) {
    for (const skill of manifest.skills) console.log(`  would prune ${skill} to the files ${manifest.revision} ships`)
  } else {
    for (const skill of manifest.skills) {
      const expected = index?.blobs.get(skill)
      pruneToRevision(skill, directory, expected === undefined ? undefined : [...expected.keys()], dryRun)
    }
  }
  // The other half of a refresh: the files whose text the collection owns — the notes contract, the
  // documentation orders, the search exclusion, the marked standing-orders section — are brought to
  // this revision too, so every project's mechanism text is the same one. A terminology table keeps
  // its rows and `AGENTS.md` keeps everything outside the marked section.
  // Adoption creates the project files that are missing and never overwrites one it did not
  // create; a refresh only brings the managed text up to this revision, so a file a project
  // deliberately deleted stays deleted.
  if (create) run(process.execPath, initializerArgs(root, ['--write']), dryRun)
  run(process.execPath, initializerArgs(root, ['--sync', '--write']), dryRun)
}

/** Adopt the collection: deploy the pinned set, create the missing project files, sync the text. */
export async function installProject(root: string, options: { dryRun: boolean, jobs: number }): Promise<void> {
  const manifest = readManifest()
  console.log(`  install ${manifest.skills.length} skill(s) from ${manifest.repo} at ${manifest.revision} into ${skillsDirectory(root)}`)
  if (options.dryRun) console.log('  dry run — nothing is written; drop --dry-run to apply')
  await refresh(root, manifest.repo, skillsDirectory(root), manifest, options.dryRun, false, true, options.jobs)
}

/** Refresh the deployment and the managed text, creating nothing the project does not already have. */
export async function upgradeProject(root: string, options: { dryRun: boolean, reinstall: boolean, jobs: number }): Promise<void> {
  const manifest = readManifest()
  console.log(`  upgrade ${manifest.skills.length} skill(s) from ${manifest.repo} at ${manifest.revision} into ${skillsDirectory(root)}`)
  if (options.dryRun) console.log('  dry run — nothing is written; drop --dry-run to apply')
  await refresh(root, manifest.repo, skillsDirectory(root), manifest, options.dryRun, options.reinstall, false, options.jobs)
}

/**
 * The revision `gh skill install` injected into an installed `SKILL.md`, or `undefined` when the
 * file carries no `metadata:` block at all.
 *
 * The installer is the only writer of that block, so the revision is read from the file that will
 * run rather than from a record beside it. `undefined` means the file was not put there by an
 * install, which is reported as such instead of read as agreement.
 */
function installedRevision(path: string): string | undefined {
  const lines = readFileSync(path, 'utf8').split('\n')
  if (lines[0] !== '---') return undefined
  const end = lines.indexOf('---', 1)
  if (end === -1) return undefined
  const frontmatter = lines.slice(1, end).join('\n')
  if (!/^metadata:\s*$/m.test(frontmatter)) return undefined
  const ref = /^\s*github-ref:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  const tree = /^\s*github-tree-sha:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  const revision = ref.replace(/^refs\/(heads|tags)\//, '') || tree
  if (revision !== '') return revision
  // A local install carries a path instead of a ref: its revision cannot be compared against the
  // pin, and saying so is different from reading a missing field as agreement.
  const local = /^\s*local-path:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim() ?? ''
  return local === '' ? '' : `local:${local}`
}

/** Report the installed set and each skill's revision, read from the installed file; change nothing. */
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

  let installedHere = 0
  for (const skill of manifest.skills) {
    const entry = join(directory, skill, 'SKILL.md')
    if (!existsSync(entry)) {
      findings.push(`${skill}: not installed (expected ${entry})`)
      continue
    }
    installedHere += 1
    const revision = installedRevision(entry)
    if (revision === undefined) {
      findings.push(
        `${skill}: ${entry} has no metadata block injected by \`gh skill install\`, so it is not an install of ${manifest.revision} — reinstall the skill`,
      )
    } else if (revision === '') {
      findings.push(`${skill}: the injected metadata names no github-ref and no github-tree-sha, so no revision can be read from it`)
    } else if (revision.startsWith('local:')) {
      findings.push(`${skill}: installed from the local path ${revision.slice('local:'.length)}, which carries no revision to compare with the manifest's ${manifest.revision}`)
    } else if (revision !== manifest.revision) {
      findings.push(`${skill}: at ${revision}, manifest pins ${manifest.revision}`)
    } else {
      console.log(`  ok        ${skill}  ${revision}`)
    }
  }
  for (const name of installed) {
    if (!manifest.skills.includes(name)) findings.push(`${name}: installed but not named in the manifest`)
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
  console.log(`  ok        ${manifest.skills.length} skill(s) at ${manifest.revision}, each revision read from its installed metadata`)
}

/** Remove the installed skills. */
export function uninstallProject(root: string, dryRun: boolean): void {
  uninstall(root, readManifest(), dryRun)
}

function uninstall(root: string, manifest: Manifest, dryRun: boolean): void {
  const directory = skillsDirectory(root)
  for (const skill of manifest.skills) {
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
  // The layer and the manifest live inside the manager skill's own directory, so removing that
  // directory removes them; nothing outside it was ever written. What is left is the project's own,
  // and an uninstall that took it would delete decisions and standing orders the project made.
  console.log('  left in place — delete these yourself if the project is leaving the pattern:')
  for (const path of ['AGENTS.md (its dsh-spec:agent-notes block)', '.agents/dsh-spec/notes/', 'docs/', '.rgignore']) {
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
    void installProject(root, { dryRun, jobs: jobWidth() })
  } else if (command === 'upgrade' || command === 'update') {
    void upgradeProject(root, { dryRun, reinstall: hasFlag('--reinstall'), jobs: jobWidth() })
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

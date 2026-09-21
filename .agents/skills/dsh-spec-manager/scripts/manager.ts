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

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { manifestPathOf } from './manifest.ts'

/** Where this script lives. */
const scriptDir = dirname(fileURLToPath(import.meta.url))
/** The manifest: the skills the collection installs, the pin they come from, and the gates it publishes. */
const manifestPath = manifestPathOf(scriptDir)
/** The dispatcher, which sits in the code home beside every gate and resolves a name against the record. */
const dispatcherPath = join(scriptDir, 'run.ts')
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

/**
 * The files one installed skill's revision ships, read from the tree its own metadata names.
 *
 * `gh skill install` injects `github-tree-sha` into the installed `SKILL.md`, and the tree API lists
 * that directory's blobs as paths relative to it — exactly the shape needed to compare an installed
 * directory against what the revision contains.
 *
 * @param repo - `owner/name` the skill came from.
 * @param skill - the skill directory name.
 * @param directory - the project's `.agents/skills/` directory.
 * @returns the revision's relative file paths, or `undefined` when they cannot be read.
 */
function revisionFiles(repo: string, skill: string, directory: string): string[] | undefined {
  const skillFile = join(directory, skill, 'SKILL.md')
  if (!existsSync(skillFile)) return undefined
  const treeSha = /github-tree-sha:\s*([0-9a-f]{40})/.exec(readFileSync(skillFile, 'utf8'))?.[1]
  if (treeSha === undefined) return undefined
  const listing = spawnSync(
    'gh',
    ['api', `repos/${repo}/git/trees/${treeSha}?recursive=1`, '--jq', '.tree[] | select(.type == "blob") | .path'],
    { encoding: 'utf8' },
  )
  if ((listing.status ?? 1) !== 0) return undefined
  const paths = listing.stdout.split('\n').map(line => line.trim()).filter(line => line !== '')
  return paths.length === 0 ? undefined : paths
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
 * @param repo - `owner/name` the skills came from.
 * @param skill - the skill directory name.
 * @param directory - the project's `.agents/skills/` directory.
 * @param dryRun - print the removals instead of making them.
 */
function pruneToRevision(repo: string, skill: string, directory: string, dryRun: boolean): void {
  const expected = revisionFiles(repo, skill, directory)
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
function status(root: string, manifest: Manifest): void {
  const directory = skillsDirectory(root)
  const findings: string[] = []
  const installed = existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, 'SKILL.md')))
        .map((entry) => entry.name)
    : []

  for (const skill of manifest.skills) {
    const entry = join(directory, skill, 'SKILL.md')
    if (!existsSync(entry)) {
      findings.push(`${skill}: not installed (expected ${entry})`)
      continue
    }
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
  if (!existsSync(dispatcherPath)) findings.push(`${dispatcherPath}: the dispatcher run.ts is missing`)

  if (findings.length > 0) {
    console.error(`dsh-spec-manager: status found ${findings.length} problem(s):`)
    for (const finding of findings) console.error(`  ${finding}`)
    process.exit(1)
  }
  console.log(`  ok        ${manifest.skills.length} skill(s) at ${manifest.revision}, each revision read from its installed metadata`)
}

/** Remove the installed skills. */
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
  // directory removes them; nothing outside it was ever written.
}

const command = subcommand()
const root = projectRoot()
const dryRun = hasFlag('--dry-run')

if (command === 'init') {
  if (!existsSync(initializerPath)) fail(`the initializer is missing at ${initializerPath}`)
  const args = ['dlx', '--allow-build=esbuild', 'tsx@4.22.4', initializerPath, '--root', root]
  if (hasFlag('--write')) args.push('--write')
  if (hasFlag('--no-notes')) args.push('--no-notes')
  run('pnpm', args, dryRun)
} else if (command === 'install' || command === 'update') {
  const manifest = readManifest()
  const requested = flagValue('--rev')
  if (requested !== undefined && requested !== manifest.revision) {
    fail(`--rev ${requested} contradicts the manifest's pinned revision ${manifest.revision}`)
  }
  const repo = flagValue('--repo') ?? manifest.repo
  const directory = skillsDirectory(root)
  console.log(`  ${command} ${manifest.skills.length} skill(s) from ${repo} at ${manifest.revision} into ${directory}`)
  for (const skill of manifest.skills) {
    run('gh', ['skill', 'install', repo, `${skill}@${manifest.revision}`, '--dir', directory, '--force'], dryRun)
  }
  for (const skill of manifest.skills) pruneToRevision(repo, skill, directory, dryRun)
  // The other half of a refresh: the files whose text the collection owns — the notes contract, the
  // documentation orders, the search exclusion, the marked standing-orders section — are brought to
  // this revision too, so every project's mechanism text is the same one. A terminology table keeps
  // its rows and `AGENTS.md` keeps everything outside the marked section.
  run('pnpm', ['dlx', '--allow-build=esbuild', 'tsx@4.22.4', initializerPath, '--root', root, '--sync', '--write'], dryRun)
} else if (command === 'sync') {
  const args = ['dlx', '--allow-build=esbuild', 'tsx@4.22.4', initializerPath, '--root', root, '--sync']
  if (hasFlag('--write')) args.push('--write')
  run('pnpm', args, dryRun)
} else if (command === 'status') {
  status(root, readManifest())
} else if (command === 'uninstall') {
  uninstall(root, readManifest(), dryRun)
} else {
  fail(`unknown subcommand ${command === '' ? '(none given)' : `\`${command}\``} — expected init, install, update, sync, uninstall or status`)
}

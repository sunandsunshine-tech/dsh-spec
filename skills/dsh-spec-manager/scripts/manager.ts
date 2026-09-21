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
} else if (command === 'status') {
  status(root, readManifest())
} else if (command === 'uninstall') {
  uninstall(root, readManifest(), dryRun)
} else {
  fail(`unknown subcommand ${command === '' ? '(none given)' : `\`${command}\``} — expected init, install, update, uninstall or status`)
}

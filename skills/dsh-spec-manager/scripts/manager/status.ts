/**
 * What an installed directory says about itself, and the report built from it.
 *
 * The metadata block `gh skill install` injects is the only record: the ref every skill is compared
 * against, and the source repository that decides whether a directory the manifest does not name is
 * this collection's (a finding, and `upgrade` removes it) or another collection's (one line, and the
 * exit code stays). Both readings are local and reach no network.
 *
 * Zero external dependencies.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { skillsDirectory } from '../cli-args.ts'
import { readManifest } from '../manifest.ts'
import type { Manifest } from '../manifest.ts'
import { PLAN_SURFACE_SKILL, PLANS_DIR, PLANS_SECTION_START } from '../plan-surface.ts'

/** The dispatcher, which sits in the code home beside every gate and resolves a name against the record. */
const dispatcherPath = resolve(import.meta.dirname, '..', 'dsh-spec.ts')

/** The short name of a ref: `refs/heads/main` and `refs/tags/v1.0.0` are spelled `main` and `v1.0.0`. */
export function shortRef(ref: string): string {
  return ref.replace(/^refs\/(heads|tags)\//, '')
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
export function injectedMetadata(path: string): string | undefined {
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
export function installedRevision(path: string): string | undefined {
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
export function repositoryName(recorded: string | undefined): string | undefined {
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
export function installedRepo(path: string): string | undefined {
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

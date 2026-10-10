/**
 * Refreshing a deployment: the revision it acts on, and the set that follows it.
 *
 * A refresh asks no questions — the optional skills a project already holds follow the revision and
 * the ones it never took stay uninstalled — and a manager that moved reinstalls itself first, then
 * re-executes the new copy for the skill set.
 *
 * Zero external dependencies.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { exitsOf, flagValue, skillsDirectory } from '../cli-args.ts'
import { readManifest } from '../manifest.ts'
import type { Manifest } from '../manifest.ts'
import { refresh, retireUnpublished } from './plan-refresh.ts'
import { normsPathOf } from '../norms.ts'
import { normsStatusFor } from '../norms-apply.ts'
import { run, runCaptured } from './process.ts'
import { managerRef } from './status.ts'

/** The exits this module's failures print under. */
const { fail, refuse } = exitsOf('dsh-spec-manager')

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
export async function resolveTargetRef(explicit: string | undefined): Promise<string> {
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
export function selectedSkills(directory: string, manifest: Manifest): string[] {
  return manifest.skills.filter((skill) =>
    !manifest.optional.includes(skill) || existsSync(join(directory, skill, 'SKILL.md')))
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
  console.log(normsStatusFor(root, normsPathOf(resolve(import.meta.dirname, '..'))))
}

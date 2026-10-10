/**
 * Manage an adopted project's copy of the skill set.
 *
 * This file is the entry point: it reads the command line and hands the verb to its module. The
 * manifest in `references/` decides what a project receives; discovery is repository-wide, so
 * `gh skill install --all` on this collection would also install skills vendored inside it that the
 * package does not own, and installing by name from the manifest is what makes the result
 * deterministic. Every subcommand prints what it did or would do, and stops at the first failure: a
 * manager that half-applied a change leaves a project in a state no gate knows how to read.
 *
 * Nothing here writes a record of what an install left behind. `gh skill install` injects
 * `metadata.github-ref` and `metadata.github-tree-sha` into every installed `SKILL.md`, so `status`
 * reads the installed revision out of the installed file itself, and nothing beside it can disagree
 * with the file the dispatcher runs. The gates travel inside this skill, which is the collection's
 * one code home, so there is no second copy of the engine either.
 *
 * An install is two halves: the skills under `.agents/skills/`, and the mechanism text a project
 * holds in its own tree — the notes contract, the delivery-plan contract, the documentation orders,
 * the search exclusion, and the marked standing-orders sections. `sync` rewrites the second half from
 * the installed templates and is also exposed on its own, because a project may want to see the diff
 * without a network install; `init` is the half that creates those files.
 *
 * Zero external dependencies.
 */

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exitsOf, flagValue, hasFlag, projectRoot, subcommand } from './cli-args.ts'
import { installProject } from './manager/install.ts'
import { initializerArgs, run } from './manager/process.ts'
import { statusProject } from './manager/status.ts'
import { uninstallProject } from './manager/uninstall.ts'
import { upgradeProject } from './manager/upgrade.ts'

/** The exits this entry prints under. */
const { fail } = exitsOf('dsh-spec-manager')

/** Where this script lives. */
const scriptDir = dirname(fileURLToPath(import.meta.url))
const initializerPath = join(scriptDir, 'init-agents-md.ts')

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

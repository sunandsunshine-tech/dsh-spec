/**
 * Removing the skills this collection installed.
 *
 * The whole set by default, or the one `--skill` names; a name the manifest does not carry is
 * refused rather than skipped, which is what keeps another collection's directory out of reach by
 * construction. Removing a skill can turn a hook off, so the initializer's sync half runs afterwards.
 *
 * Zero external dependencies.
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { readManifest } from '../manifest.ts'
import type { Manifest } from '../manifest.ts'
import { SKILL_NAME } from '../manifest.ts'
import { exitsOf, flagValue, skillsDirectory } from '../cli-args.ts'
import { initializerArgs, run } from './process.ts'

/** The refusals this module prints under. */
const { refuse } = exitsOf('dsh-spec-manager')

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
export function uninstall(root: string, manifest: Manifest, dryRun: boolean): void {
  const directory = skillsDirectory(root)
  const selected = flagValue('--skill')
  if (selected !== undefined && !SKILL_NAME.test(selected)) {
    refuse(`--skill ${JSON.stringify(selected)} is not a skill name — only ${SKILL_NAME} is accepted`)
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

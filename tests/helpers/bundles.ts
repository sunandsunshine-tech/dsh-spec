/**
 * The suite's bundle resolution: a skill script runs from the forge work draft while one exists,
 * and from the landed copy otherwise. One helper keeps every case on the same rule.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './fixtures.ts'

/**
 * The repository-relative path of one skill's script bundle.
 * @param skill - the skill directory name, for example `dsh-spec-agent-notes`.
 * @param file - the bundle file name under `scripts/`.
 * @returns the work-draft path while it exists, the landed path otherwise.
 */
export function skillBundle(skill: string, file: string): string {
  const workDraft = '.agents/dsh-spec-skill-forge/' + skill + '/scripts/' + file
  return existsSync(join(REPO_ROOT, workDraft)) ? workDraft : 'skills/' + skill + '/scripts/' + file
}

/**
 * The absolute path of one skill's script bundle.
 * @param skill - the skill directory name.
 * @param file - the bundle file name under `scripts/`.
 * @returns the absolute work-draft path while it exists, the landed path otherwise.
 */
export function skillBundlePath(skill: string, file: string): string {
  return join(REPO_ROOT, skillBundle(skill, file))
}

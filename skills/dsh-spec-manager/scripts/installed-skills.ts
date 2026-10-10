/**
 * The installed skill set: where the deployment sits, and which of its files carry shipped text.
 *
 * The authored tree under `skills/` is the source; a project loads the copy the installer deployed
 * to `.agents/skills/`. A gate that reads what a project actually runs — rather than what the source
 * says — reads the deployment, so this module owns that tree for both the scope record and the gate
 * that walks it. The manager's own directory name is derived from where this file runs instead of
 * being copied from the manifest, because the copy that runs is the copy that was installed.
 *
 * Only the shipped texts are the surface a citation can live in: a Markdown reference, a template,
 * a `SKILL.md`. The engine's own `.ts` files are a deployment of this collection's code rather than
 * shipped prose, and a change to one of them selects no check.
 */

import { readdirSync } from 'node:fs'
import { basename, relative, resolve, sep } from 'node:path'

/** The tree a project deploys the skill set into. */
export const INSTALLED_SKILLS_ROOT = '.agents/skills'

/** POSIX-relative prefix of that tree, for classifying a repository-relative path. */
export const INSTALLED_SKILLS_PREFIX = `${INSTALLED_SKILLS_ROOT}/`

/** The suffixes a shipped citation lives in; a directive script is not read. */
const TEXT_SUFFIXES = ['.md', '.template'] as const

/** The manager's own directory name, taken from the copy that runs. */
export const MANAGER_SKILL = basename(resolve(import.meta.dirname, '..'))

/**
 * Whether a repository-relative path is a shipped text of the installed skill set.
 * @param path - repository-relative POSIX path.
 * @returns true when the gate that reads citations reads this file.
 */
export function isInstalledSkillText(path: string): boolean {
  return path.startsWith(INSTALLED_SKILLS_PREFIX) && TEXT_SUFFIXES.some(suffix => path.endsWith(suffix))
}

/**
 * The catalog the installed manager ships.
 * @param root - absolute project root.
 * @returns the absolute path of the installed `references/norms.json`.
 */
export function installedNormsPath(root: string): string {
  return resolve(root, INSTALLED_SKILLS_ROOT, MANAGER_SKILL, 'references', 'norms.json')
}

/**
 * Every shipped text under the installed skill set, repository-relative and sorted.
 *
 * Sorted rather than in readdir order, so a report is the same on every machine, and a directory
 * that cannot be read contributes nothing rather than failing — an absent tree is the caller's
 * emptiness to refuse, with its own located message.
 *
 * @param root - absolute project root.
 * @returns repository-relative paths, in stable order.
 */
export function walkInstalledSkillTexts(root: string): string[] {
  const base = resolve(root)
  const found = new Set<string>()
  const visit = (absolute: string): void => {
    let entries
    try {
      entries = readdirSync(absolute, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const child = resolve(absolute, entry.name)
      if (entry.isDirectory()) visit(child)
      else if (entry.isFile()) {
        const rel = relative(base, child).split(sep).join('/')
        if (isInstalledSkillText(rel)) found.add(rel)
      }
    }
  }
  visit(resolve(base, INSTALLED_SKILLS_ROOT))
  return [...found].sort()
}

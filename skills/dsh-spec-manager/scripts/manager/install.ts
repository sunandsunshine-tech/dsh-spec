/**
 * Adopting the collection: what is installed, what is asked, and what is created.
 *
 * The required skills are installed at the resolved ref, an optional one only when `--with` names it
 * or a person answers yes at a terminal, and the managed text is created and synced afterwards.
 *
 * Zero external dependencies.
 */

import { createInterface } from 'node:readline/promises'
import { resolve } from 'node:path'
import { exitsOf, flagValues, skillsDirectory } from '../cli-args.ts'
import { readManifest, requiredSkills, SKILL_NAME } from '../manifest.ts'
import type { Manifest } from '../manifest.ts'
import { normsPathOf } from '../norms.ts'
import { normsStatusFor } from '../norms-apply.ts'
import { runCaptured } from './process.ts'
import { refresh } from './plan-refresh.ts'
import { managerRef } from './status.ts'
import { resolveTargetRef } from './upgrade.ts'

/** The refusals this module prints under. */
const { refuse } = exitsOf('dsh-spec-manager')

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
export function interactiveAsker(): { ask: Asker, close: () => void } {
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
export async function skillDescription(repo: string, ref: string, name: string): Promise<string | undefined> {
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
export async function chooseOptional(
  manifest: Manifest,
  options: { with: readonly string[], dryRun: boolean, ask?: () => { ask: Asker, close: () => void }, describe: (name: string) => Promise<string | undefined> },
): Promise<string[]> {
  for (const name of options.with) {
    if (!SKILL_NAME.test(name)) refuse(`--with ${JSON.stringify(name)} is not a skill name — only ${SKILL_NAME} is accepted`)
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
  console.log(normsStatusFor(root, normsPathOf(resolve(import.meta.dirname, '..'))))
}

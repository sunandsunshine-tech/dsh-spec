/**
 * Reading the revision, planning what each selected skill owes, and applying it.
 *
 * One tree listing answers three questions at once — is an installed skill already this revision's
 * content, which files does the revision ship, and which of them changed — and the plan prints the
 * file-level half while the refresh applies it: concurrent installs, then a prune to what the
 * revision ships, then a removal of the directories this collection owns but the revision dropped.
 *
 * Zero external dependencies.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { readManifest } from '../manifest.ts'
import type { Manifest } from '../manifest.ts'
import { installedRepo, installedRevision, shortRef } from './status.ts'
import { initializerArgs, run, runAll, runCaptured } from './process.ts'

/** The revision's own listing: the short ref, each skill's tree sha, and every file's blob sha. */
interface RevisionIndex {
  /** The ref as a short name, so it can be compared with an injected `refs/heads/…`. */
  ref: string
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
 * @param revision - the branch, tag or commit to read.
 * @returns the listing, or `undefined` when it cannot be read.
 */
export async function readRevisionIndex(repo: string, revision: string): Promise<RevisionIndex | undefined> {
  const commit = await runCaptured('gh', ['api', `repos/${repo}/commits/${revision}`, '--jq', '.commit.tree.sha'], revision)
  const treeSha = commit.output.trim()
  if ((commit.status ?? 1) !== 0 || !/^[0-9a-f]{40}$/.test(treeSha)) return undefined
  const listing = await runCaptured(
    'gh',
    ['api', `repos/${repo}/git/trees/${treeSha}?recursive=1`, '--jq', '.tree[] | "\\(.type) \\(.sha) \\(.path)"'],
    revision,
  )
  if ((listing.status ?? 1) !== 0) return undefined
  const index: RevisionIndex = { ref: shortRef(revision), treeSha: new Map(), blobs: new Map() }
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
 * The injected ref a skill carries, when it differs from the revision being planned.
 *
 * `SKILL.md` is not compared by content — `gh` re-serializes its frontmatter on every install — so
 * the ref that install would inject is stated on its own line instead: it is the one difference a
 * reader cannot see in a file list.
 */
interface RefDelta {
  from: string
  to: string
}
/** What one skill's plan or application touches, file by file, relative to the skill directory. */
interface SkillDelta {
  /** Shipped files the project does not hold. */
  added: string[]
  /** Held files whose blob sha is not the revision's. */
  modified: string[]
  /** Held files the revision does not ship, which `gh skill install` never deletes. */
  removed: string[]
  /** The injected ref, when the skill was installed from a different revision. */
  ref?: RefDelta
}
/** One skill's plan: nothing to do, the revision does not ship it, or the files a refresh touches. */
type SkillReading =
  | { kind: 'current' }
  | { kind: 'absent' }
  | { kind: 'delta', delta: SkillDelta }
/**
 * What reinstalling one skill would change.
 *
 * The tree sha `gh` injected is the revision's own record for that directory, so it answers the
 * cheap question — is this skill already this revision? — and a matching one ends the walk, because
 * the sha already states what the per-file comparison would recompute. When it does not match, the
 * walk answers what a plan needs: which files are new, which were edited, which the revision no
 * longer ships. `SKILL.md` is the one file whose content is compared as a last resort: `gh`
 * re-serializes its frontmatter on install, so an injected ref that differs says the skill moved
 * rather than that a person edited it, and the plan reports that as a ref line of its own.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param skill - the skill directory name.
 * @param index - the revision listing.
 * @returns nothing to do, the skill's absence from the revision, or the delta.
 */
function classifySkill(directory: string, skill: string, index: RevisionIndex): SkillReading {
  const expectedTree = index.treeSha.get(skill)
  const expected = index.blobs.get(skill)
  if (expectedTree === undefined || expected === undefined) return { kind: 'absent' }
  const root = join(directory, skill)
  const skillFile = join(root, 'SKILL.md')
  // A skill the project does not hold at all is every shipped file, added; there is nothing to walk.
  if (!existsSync(skillFile)) {
    return {
      kind: 'delta',
      delta: { added: [...expected.keys()].sort(), modified: [], removed: [] },
    }
  }
  const injectedTree = /github-tree-sha:\s*([0-9a-f]{40})/.exec(readFileSync(skillFile, 'utf8'))?.[1]
  const current = installedRevision(skillFile)
  const ref = current !== undefined && current !== '' && !current.startsWith('local:') && current !== index.ref
    ? { from: current, to: index.ref }
    : undefined
  // A matching tree sha is the revision's own record that every file is its content, so the plan is
  // that one line. Walking the directory instead would recompute what the sha already states, and a
  // file list is only a difference from the installed revision when the revision itself moved.
  if (injectedTree === expectedTree) {
    return ref === undefined ? { kind: 'current' } : { kind: 'delta', delta: { added: [], modified: [], removed: [], ref } }
  }
  const added: string[] = []
  const modified: string[] = []
  const removed: string[] = []
  const seen = new Set<string>()
  const walk = (location: string, prefix: string): void => {
    for (const entry of readdirSync(location, { withFileTypes: true })) {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        walk(join(location, entry.name), relative)
        continue
      }
      const sha = expected.get(relative)
      if (sha === undefined) {
        removed.push(relative)
        continue
      }
      seen.add(relative)
      // `SKILL.md` is compared by content only when its injected ref already matches: `gh` writes
      // that frontmatter in its own order, so a differing blob at a differing ref says the revision
      // moved rather than that a person edited the file, and the ref line below says so on its own.
      const comparedByContent = relative !== 'SKILL.md' || ref === undefined
      if (comparedByContent && blobSha(readFileSync(join(location, entry.name))) !== sha) modified.push(relative)
    }
  }
  walk(root, '')
  for (const relative of expected.keys()) {
    if (!seen.has(relative)) added.push(relative)
  }
  if (added.length === 0 && modified.length === 0 && removed.length === 0 && ref === undefined) return { kind: 'current' }
  return { kind: 'delta', delta: { added: added.sort(), modified: modified.sort(), removed: removed.sort(), ref } }
}
/** The install plan for every skill of the selection. */
interface Plan {
  /** The ref the plan is against, so `already at <ref>` names the revision rather than a placeholder. */
  ref: string
  current: string[]
  fresh: string[]
  deltas: Map<string, SkillDelta>
  /** Skill → the paths the revision ships, which is what the applied prune reduces a directory to. */
  shipped: Map<string, string[]>
}
/**
 * Read the revision index and classify every selected skill against it.
 *
 * One reading answers the whole plan, so it happens once per command however many skills the set
 * holds. `undefined` means the listing could not be read: the plan then installs every selected
 * skill, which is what `gh skill install` would do anyway, and prunes nothing, because a failed API
 * call must not look like a revision that ships nothing.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param skills - the selected skill names.
 * @param repo - `owner/name` the skills come from.
 * @param ref - the branch, tag or commit to read.
 * @param reinstall - plan every skill even when its content already matches.
 * @returns the plan.
 */
export async function planRefresh(directory: string, skills: readonly string[], repo: string, ref: string, reinstall: boolean): Promise<Plan | undefined> {
  const index = await readRevisionIndex(repo, ref)
  if (index === undefined) return undefined
  const plan: Plan = { ref, current: [], fresh: [], deltas: new Map(), shipped: new Map() }
  for (const skill of skills) {
    const paths = index.blobs.get(skill)
    if (paths !== undefined) plan.shipped.set(skill, [...paths.keys()])
    if (reinstall) {
      plan.fresh.push(skill)
      continue
    }
    const reading = classifySkill(directory, skill, index)
    if (reading.kind === 'current') plan.current.push(skill)
    else if (reading.kind === 'absent') plan.fresh.push(skill)
    else {
      plan.fresh.push(skill)
      plan.deltas.set(skill, reading.delta)
    }
  }
  return plan
}
/** Print the file-level half of a plan: one line per path a refresh touches, and the ref change. */
function printPlan(plan: Plan): void {
  if (plan.current.length > 0) console.log(`  already at ${plan.ref}: ${plan.current.join(', ')}`)
  for (const [skill, delta] of plan.deltas) {
    for (const path of delta.added) console.log(`  + ${skill}/${path}`)
    for (const path of delta.modified) console.log(`  ~ ${skill}/${path}`)
    for (const path of delta.removed) console.log(`  - ${skill}/${path} (the revision does not ship it)`)
    if (delta.ref !== undefined) {
      console.log(`  ~ ${skill}/SKILL.md — injected metadata github-ref ${delta.ref.from} → ${delta.ref.to} (compared by the injected tree sha, not by content)`)
    }
  }
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
  // An absent directory has nothing to prune, and a page of "removed" lines for a skill that was
  // never installed would read as a change rather than the absence it is.
  if (!existsSync(root)) return
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
 * Remove every installed directory this collection owns but the revision no longer publishes.
 *
 * `gh skill install` only ever adds, so a skill a later revision drops stays on disk; `status` would
 * report it as this collection's on every run. Ownership is the source repo `gh` injected into the
 * directory, so another collection's install beside this one is never touched — that rule is what
 * makes two collections share `.agents/skills/` safely.
 *
 * @param directory - the project's `.agents/skills/` directory.
 * @param manifest - the revision's manifest.
 * @param dryRun - print the removals instead of making them.
 */
export function retireUnpublished(directory: string, manifest: Manifest, dryRun: boolean): void {
  if (!existsSync(directory)) return
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || manifest.skills.includes(entry.name)) continue
    const skillFile = join(directory, entry.name, 'SKILL.md')
    // `installedRepo` answers in the manifest's own shape, so equality is the whole ownership test
    // whichever form the installer wrote.
    if (!existsSync(skillFile) || installedRepo(skillFile) !== manifest.repo) continue
    const path = join(directory, entry.name)
    if (dryRun) {
      console.log(`  would remove ${path} — this revision no longer publishes ${entry.name}`)
      continue
    }
    rmSync(path, { recursive: true, force: true })
    console.log(`  removed ${path} — this revision no longer publishes ${entry.name}`)
  }
}
/**
 * Read the revision, print or apply the skill plan, then sync the files whose text the collection owns.
 *
 * The revision is read once, as a tree listing, and it decides three things: which skills are already
 * that content (they are left alone), which files a skill gained, lost or edited, and which files the
 * revision no longer ships (removed afterwards — `gh skill install --force` overwrites what it
 * installs and never deletes what the revision dropped). A refresh of an unchanged project is then
 * one API call and a local walk, rather than one network install per skill.
 *
 * A dry run reads the same listing and prints the same plan: the header it prints says `would` where
 * an applied run says nothing, and nothing is written. Reading the network is what makes
 * `already at <ref>` in the plan true rather than assumed.
 *
 * @param repo - `owner/name` the skills come from.
 * @param directory - the project's `.agents/skills/` directory.
 * @param skills - the selected skill names.
 * @param ref - the branch, tag or commit to install at.
 * @param dryRun - print the commands instead of running them.
 * @param reinstall - install every skill even when it is already the revision's content.
 * @param create - also run the initializer that creates the project's missing files.
 * @param limit - the most `gh` children alive at once.
 */
export async function refresh(root: string, repo: string, directory: string, skills: readonly string[], ref: string, dryRun: boolean, reinstall: boolean, create: boolean, limit: number): Promise<void> {
  const plan = await planRefresh(directory, skills, repo, ref, reinstall)
  const stale = plan?.fresh ?? [...skills]
  if (plan === undefined) {
    console.log(`  could not read the tree for ${ref} — installing every skill and pruning nothing`)
  } else {
    printPlan(plan)
  }
  await runAll('gh', stale.map(skill => ({
    label: skill,
    args: ['skill', 'install', repo, `${skill}@${ref}`, '--dir', directory, '--force'],
  })), dryRun, limit)
  for (const skill of skills) {
    // Without a listing there is nothing to prune to, and an unread API call must not look like a
    // revision that ships nothing.
    if (plan === undefined) {
      pruneToRevision(skill, directory, undefined, dryRun)
      continue
    }
    pruneToRevision(skill, directory, plan.shipped.get(skill), dryRun)
  }
  // The other half of a refresh: the files whose text the collection owns — the notes contract, the
  // delivery-plan contract, the documentation orders, the search exclusion, the marked
  // standing-orders sections — are brought to this revision too, so every project's mechanism text is
  // the same one. A terminology table keeps its rows and `AGENTS.md` keeps everything outside the
  // marked sections.
  // Adoption creates the project files that are missing and never overwrites one it did not
  // create; a refresh only brings the managed text up to this revision, so a file a project
  // deliberately deleted stays deleted.
  //
  // The initializer is its own preview: without `--write` it prints the same plan an apply would
  // carry out — the files it would create, the managed text it would rewrite, with the diff — and
  // writes nothing. So a dry run runs it, rather than printing the command that would have rendered
  // the plan; `--write` is the whole difference between the two, which is what keeps a preview and
  // an apply comparing the same two texts.
  if (create) run(process.execPath, initializerArgs(root, dryRun ? [] : ['--write']), false)
  run(process.execPath, initializerArgs(root, dryRun ? ['--sync'] : ['--sync', '--write']), false)
}

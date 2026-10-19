/**
 * The norms a project may apply, and how the catalog behind them is read.
 *
 * `references/norms.json` is data rather than prose: every norm has a stable id, the group a project
 * chooses it by, the English title and body that would be written into that project, a Chinese title
 * for the choice surface, the one-line red line its hook renders, and the document that owns the
 * rule (a path relative to the repository this catalog is published from). Rendering a chosen norm
 * into a project belongs to the manager; this module owns reading the catalog and refusing one that
 * cannot be rendered, so a broken catalog fails once, loudly, instead of halfway through a write.
 *
 * Nothing here reads a project's own copy, and nothing here writes: a catalog is a fact about this
 * skill set, and the report a project sees is built from it.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** One group a project chooses by. */
export interface NormGroup {
  id: string
  title: string
  titleZh: string
}

/** One norm: the text a project receives, its one-line red line, and the document that owns it. */
export interface Norm {
  id: string
  group: string
  title: string
  titleZh: string
  /** One line stating the rule as a negative invariant; rendered into the project's AGENTS.md hook. */
  invariant: string
  body: string
  /** The document that owns the rule, relative to the repository the catalog is published from. */
  source: string
}

/** The catalog, in the order it renders. */
export interface NormsCatalog {
  groups: NormGroup[]
  norms: Norm[]
}

/** The language the choice surface is printed in. */
export type NormsLanguage = 'en' | 'zh'

/**
 * The absolute path of the catalog for an engine directory.
 * @param scriptDir - absolute path of the collection's engine directory, `scripts/`.
 * @returns the absolute path of `references/norms.json`.
 */
export function normsPathOf(scriptDir: string): string {
  return resolve(scriptDir, '..', 'references', 'norms.json')
}

/**
 * The repository the catalog was published from.
 *
 * The manifest beside the catalog owns that fact, so it is read from there rather than copied into
 * the catalog: two copies of "which repository this is" would be two things to keep in step.
 *
 * @param catalogPath - the catalog whose repository is wanted.
 * @returns `owner/name`.
 * @throws when the manifest is missing or names no repository.
 */
export function readNormsRepo(catalogPath: string): string {
  const path = resolve(resolve(catalogPath, '..'), 'manifest.json')
  if (!existsSync(path)) throw new Error(`no manifest at ${path} — it owns the repository the norms record links back to`)
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { repo?: unknown }
  if (typeof parsed.repo !== 'string' || parsed.repo === '') throw new Error(`${path} names no \`repo\``)
  return parsed.repo
}

/**
 * The URL of the decision record a norm came from.
 *
 * A record path exists only in the repository that publishes the catalog, so an adopter is given a
 * URL instead. The ref is the one the manager itself was installed from, which is the revision the
 * project holds; without one a caller prints the path alone rather than guessing a revision.
 *
 * @param repo - `owner/name`.
 * @param ref - the branch, tag or commit to read at.
 * @param source - the record's repository-relative path.
 * @returns the URL.
 */
export function recordUrlOf(repo: string, ref: string, source: string): string {
  return `https://github.com/${repo}/blob/${ref}/${source}`
}

/** A group id is a path segment and an id's first half; both halves are names. */
const NAME = /^[a-z][a-z0-9-]*$/
const ID = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/

/** The two lines every body carries, so a reader knows where the reason and the check sit. */
const WHY = '\n  - Why:'
const CHECK = '\n  - Self-check:'

/**
 * Read and validate the catalog.
 *
 * Every way a catalog can fail to be one is refused by name: an id that would not survive being
 * written into a file, an id recorded twice, a group no norm belongs to and a group that no norm
 * names, a missing body, and a body without the two lines that make every norm the same shape.
 *
 * @param path - the catalog to read.
 * @returns the groups and the norms, in catalog order.
 * @throws when the catalog is missing, unreadable, or cannot be rendered.
 */
export function readNorms(path: string): NormsCatalog {
  if (!existsSync(path)) {
    throw new Error(`no norms catalog at ${path} — the skill is incomplete, so it cannot say which norms exist`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${path} is not readable JSON: ${(error as Error).message}`)
  }
  const candidate = parsed as Partial<NormsCatalog>
  if (!Array.isArray(candidate.groups) || candidate.groups.length === 0) {
    throw new Error(`${path} names no groups — a norm with no group cannot be chosen`)
  }
  const groups = candidate.groups.map((entry) => {
    const group = entry as Partial<NormGroup>
    if (typeof group.id !== 'string' || !NAME.test(group.id)) {
      throw new Error(`${path} has a group id \`${String(group.id)}\` that is not a name — it becomes the choice surface's key`)
    }
    if (typeof group.title !== 'string' || group.title === '') throw new Error(`${path}: group \`${group.id}\` has no title`)
    if (typeof group.titleZh !== 'string' || group.titleZh === '') {
      throw new Error(`${path}: group \`${group.id}\` has no Chinese title, so a reader choosing in Chinese would see an empty heading`)
    }
    return { id: group.id, title: group.title, titleZh: group.titleZh }
  })
  const groupIds = new Set(groups.map(group => group.id))
  if (!Array.isArray(candidate.norms) || candidate.norms.length === 0) {
    throw new Error(`${path} names no norms — an empty catalog would offer nothing and report success`)
  }
  const seen = new Set<string>()
  const norms = candidate.norms.map((entry) => {
    const norm = entry as Partial<Norm>
    if (typeof norm.id !== 'string' || !ID.test(norm.id)) {
      throw new Error(`${path} has a norm id \`${String(norm.id)}\` that is not \`<group>.<name>\` — an id is how a project's copy is matched`)
    }
    if (seen.has(norm.id)) throw new Error(`${path} records \`${norm.id}\` twice — two norms under one id cannot be told apart`)
    seen.add(norm.id)
    if (typeof norm.group !== 'string' || !groupIds.has(norm.group)) {
      throw new Error(`${path}: norm \`${norm.id}\` names group \`${String(norm.group)}\`, which the catalog does not declare`)
    }
    for (const field of ['title', 'titleZh', 'invariant', 'body', 'source'] as const) {
      const value = norm[field]
      if (typeof value !== 'string' || value === '') throw new Error(`${path}: norm \`${norm.id}\` has no \`${field}\``)
    }
    const body = norm.body as string
    if (!body.startsWith('- **')) {
      throw new Error(`${path}: norm \`${norm.id}\` does not open with the rule itself — a body starts with \`- **<the rule>.**\``)
    }
    if (!body.includes(WHY) || !body.includes(CHECK)) {
      throw new Error(`${path}: norm \`${norm.id}\` is missing \`- Why:\` or \`- Self-check:\` — every norm carries the reason and how to notice it`)
    }
    return {
      id: norm.id,
      group: norm.group,
      title: norm.title as string,
      titleZh: norm.titleZh as string,
      invariant: norm.invariant as string,
      body,
      source: norm.source as string,
    }
  })
  for (const group of groups) {
    if (!norms.some(norm => norm.group === group.id)) {
      throw new Error(`${path}: group \`${group.id}\` has no norms — an empty group would be offered and write nothing`)
    }
  }
  return { groups, norms }
}

/** The groups a selection names, refusing a group the catalog does not declare. */
function selectedGroups(catalog: NormsCatalog, group: string | undefined): NormGroup[] {
  if (group === undefined) return catalog.groups
  const chosen = catalog.groups.filter(entry => entry.id === group)
  if (chosen.length === 0) {
    throw new Error(`no group \`${group}\` — the catalog has ${catalog.groups.map(entry => entry.id).join(', ')}`)
  }
  return chosen
}

/**
 * The catalog as a reader picks from: one heading per group, one line per norm, in the reader's
 * language, and the count last.
 *
 * @param catalog - the catalog to print.
 * @param options - the language, and the group to narrow to.
 * @returns the report, newline-terminated.
 * @throws when the named group is not one the catalog declares.
 */
export function renderNormsList(catalog: NormsCatalog, options: { language: NormsLanguage, group?: string }): string {
  const groups = selectedGroups(catalog, options.group)
  const zh = options.language === 'zh'
  const lines: string[] = []
  let shown = 0
  for (const group of groups) {
    lines.push(`  ${zh ? group.titleZh : group.title} (${group.id})`)
    for (const norm of catalog.norms.filter(entry => entry.group === group.id)) {
      lines.push(`    ${norm.id.padEnd(26)}${zh ? norm.titleZh : norm.title}`)
      shown += 1
    }
  }
  lines.push(zh ? `  ${shown} 条规范,${groups.length} 个分组` : `  ${shown} norm(s) in ${groups.length} group(s)`)
  return `${lines.join('\n')}\n`
}

/**
 * The catalog as data, so an agent can render the choice itself: both titles, the body it would
 * write, and the record the rationale lives in.
 *
 * @param catalog - the catalog to print.
 * @param options - the group to narrow to.
 * @returns the JSON text, newline-terminated.
 * @throws when the named group is not one the catalog declares.
 */
export function renderNormsJson(catalog: NormsCatalog, options: { group?: string, url?: (norm: Norm) => string }): string {
  const groups = selectedGroups(catalog, options.group)
  const ids = new Set(groups.map(entry => entry.id))
  const norms = catalog.norms
    .filter(norm => ids.has(norm.group))
    // The record is published as a URL because a repository path exists only in the repository that
    // publishes the catalog; the path stays beside it for anyone comparing the two.
    .map(norm => (options.url === undefined ? norm : { ...norm, sourceUrl: options.url(norm) }))
  return `${JSON.stringify({ groups, norms }, null, 2)}\n`
}

/**
 * One norm explained: what it says, where its rationale lives, and whether this project applied it.
 *
 * @param catalog - the catalog to read from.
 * @param ids - the norms to explain; every one of them must be in the catalog.
 * @param options - the language, this project's record, the URL builder, and whether to print JSON.
 * @returns the report, newline-terminated.
 * @throws when an id is not one the catalog ships.
 */
export function renderNormsExplain(
  catalog: NormsCatalog,
  ids: readonly string[],
  options: { language: NormsLanguage, applied: readonly string[], url?: (norm: Norm) => string, json: boolean },
): string {
  if (ids.length === 0) throw new Error('name the norms to explain — run `norms list` for the ids the catalog ships')
  const known = new Map(catalog.norms.map(norm => [norm.id, norm]))
  const unknown = ids.filter(id => !known.has(id))
  if (unknown.length > 0) throw new Error(`no norm ${unknown.map(id => `\`${id}\``).join(', ')} in the catalog — run \`norms list\` for the ids it ships`)
  const chosen = ids.map(id => known.get(id) as Norm)
  if (options.json) {
    return `${JSON.stringify(chosen.map(norm => ({
      ...norm,
      applied: options.applied.includes(norm.id),
      ...(options.url === undefined ? {} : { sourceUrl: options.url(norm) }),
    })), null, 2)}\n`
  }
  const zh = options.language === 'zh'
  const lines: string[] = []
  for (const norm of chosen) {
    const group = catalog.groups.find(entry => entry.id === norm.group)
    lines.push(`  ${norm.id}   ${zh ? norm.titleZh : norm.title}   (${group === undefined ? norm.group : (zh ? group.titleZh : group.title)})`)
    lines.push(`  ${zh ? '本项目' : 'applied'}: ${options.applied.includes(norm.id) ? (zh ? '已应用' : 'yes') : (zh ? '未应用' : 'no')}`)
    lines.push(`  ${zh ? '红线' : 'red line'}: ${norm.invariant}`)
    lines.push(`  ${zh ? '记录' : 'record'}: ${options.url === undefined ? norm.source : options.url(norm)}`)
    lines.push('')
    for (const row of norm.body.split('\n')) lines.push(`  ${row}`)
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

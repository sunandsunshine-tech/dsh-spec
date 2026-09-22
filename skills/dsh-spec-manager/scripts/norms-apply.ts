/**
 * Applying norms to a project: the selection a project holds, the file they are written into, and
 * the comparison that decides what an update may overwrite.
 *
 * A project's copy is a directory holding two files, and it sits with the project's own agent
 * records rather than under `docs/`: the text is instruction an agent reads, not a document a person
 * reads. `README.md` is the entry — one section per group, one marked block per norm, and the file
 * the `AGENTS.md` hook points at — while `applied.yaml` records the ids this project applied and the
 * hash of each norm's text as the skill set last wrote it. A directory rather than one file because
 * the catalogue may outgrow a single page: a later per-group split adds files beside these two and
 * moves neither, where a file that had to become a directory would move a path projects hold. The record is what makes
 * personalization safe, because with a base hash three states are distinguishable and only one of
 * them may be overwritten silently:
 *
 * - the project's text still hashes to the base and the revision changed the norm: overwrite it;
 * - the project's text moved and the revision did not: keep it, and say so once;
 * - both moved: keep the project's text and print both versions, because the decision belongs to the
 *   project, or to the agent that puts the question to it.
 *
 * Only the text inside a `<!-- dsh-norm: id -->` block is ever written, so a project's own sections,
 * headings and rules survive every verb untouched.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readNorms } from './norms.ts'
import type { NormsCatalog, NormsLanguage } from './norms.ts'

/** The file a project reads, and the record beside it. */
export const NORMS_DIR = join('.agents', 'dsh-spec', 'norms')
export const NORMS_FILE = join(NORMS_DIR, 'norms.md')
export const NORMS_RECORD = join(NORMS_DIR, 'applied.yaml')

/** The end marker of one block; the start marker is built from the id. */
const END_MARKER = '<!-- /dsh-norm -->'

/** One applied norm and the hash of the text this project held when it last agreed. */
export interface AppliedNorm {
  id: string
  base: string
  /** The project confirmed its own text as deliberate: an update may never overwrite it. */
  kept?: boolean
}

/** What a project applied, and what the skill set last wrote for each of them. */
export interface NormsRecord {
  groups: string[]
  norms: AppliedNorm[]
}

/** What one norm's comparison found. */
export type NormState = 'add' | 'current' | 'update' | 'personalized' | 'conflict' | 'missing' | 'unshipped' | 'removed'

/** One norm's outcome, with the two texts a decision needs when the project's copy moved. */
export interface NormOutcome {
  id: string
  group: string
  state: NormState
  /** The revision's text, when it is not what the project holds. */
  shipped?: string
  /** The project's text, when it is not what the skill set wrote. */
  mine?: string
}

/** A whole plan: what happens per norm, and the text the file and the record would become. */
export interface NormsPlan {
  outcomes: NormOutcome[]
  file: string
  record: NormsRecord
}

/** Which verb asked for the plan. */
export type NormsVerb = 'install' | 'update' | 'remove'

/** The absolute path of the record for a project root. */
export function recordPathOf(root: string): string {
  return join(root, NORMS_RECORD)
}

/** The absolute path of the file for a project root. */
export function filePathOf(root: string): string {
  return join(root, NORMS_FILE)
}

/** The hash of a norm's text: the body, trimmed, so edge whitespace is not personalization. */
export function normHash(body: string): string {
  return createHash('sha256').update(body.trim(), 'utf8').digest('hex')
}

/**
 * Read a project's record.
 *
 * The format is one line per fact, the way the pairing record is written: a header a person can
 * read, a `groups:` line for the groups the selection covers, and `<id>: <sha256>` per applied norm.
 * A missing record is a project that applies nothing, not an error.
 *
 * @param path - the record to read.
 * @returns the selection, in file order.
 * @throws when a line is not one the format allows.
 */
export function readNormsRecord(path: string): NormsRecord {
  if (!existsSync(path)) return { groups: [], norms: [] }
  const record: NormsRecord = { groups: [], norms: [] }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const text = line.trim()
    if (text === '' || text.startsWith('#')) continue
    if (text.startsWith('groups:')) {
      record.groups = text.slice('groups:'.length).replace(/[[\]]/g, '').split(',').map(entry => entry.trim()).filter(entry => entry !== '')
      continue
    }
    const match = /^([a-z][a-z0-9-]*\.[a-z][a-z0-9-]*):\s*([0-9a-f]{64})(\s+kept)?$/.exec(text)
    if (match === null) {
      throw new Error(`${path}: \`${text}\` is not \`<id>: <sha256>\` — a record that cannot be read cannot decide what may be overwritten`)
    }
    record.norms.push({
      id: match[1] as string,
      base: match[2] as string,
      ...(match[3] === undefined ? {} : { kept: true }),
    })
  }
  return record
}

/** The record as its text, with the header that says what keeps it honest. */
export function renderNormsRecord(record: NormsRecord): string {
  return [
    '# The norms this project applies, and the hash of each as the skill set last wrote it.',
    `# A hash that no longer matches the block in ${NORMS_FILE} means this project personalized that`,
    '# norm: an update keeps it and says so instead of overwriting. `norms update --keep <id...>`',
    '# confirms the project\'s text as deliberate, and `norms update --take <id...>` takes the',
    '# revision\'s text instead.',
    `groups: [${record.groups.join(', ')}]`,
    ...record.norms.map(norm => `${norm.id}: ${norm.base}${norm.kept === true ? ' kept' : ''}`),
    '',
  ].join('\n')
}

/** The text of one norm's block, markers included and newline-terminated. */
function renderBlock(body: string, id: string): string {
  return `<!-- dsh-norm: ${id} -->\n${body.trim()}\n${END_MARKER}\n`
}

/** The marker that opens one group's section. */
function groupMarker(group: string): string {
  return `<!-- dsh-norms: ${group} -->`
}

/** The heading a group renders under, in the language the file is written in. */
function groupHeading(catalog: NormsCatalog, group: string, language: NormsLanguage): string {
  const entry = catalog.groups.find(candidate => candidate.id === group)
  return (language === 'zh' ? entry?.titleZh : entry?.title) ?? group
}

/** The header a created file opens with: what the markers mean and where the selection lives. */
function fileHeader(): string {
  return [
    '# Norms applied in this project',
    '',
    'Each norm below is one marked block. The selection, and the hash of each block as the skill set',
    `last wrote it, live in \`${NORMS_RECORD}\` — that record is what lets a refresh tell an untouched`,
    'block from one this project personalized: an untouched block takes the text of the revision, a',
    'personalized one is kept and reported. Anything outside a marked block belongs to this project,',
    'and a refresh never writes it.',
    '',
  ].join('\n')
}

/**
 * The blocks a file holds, by id.
 *
 * A block is the text between its two markers. An id that appears twice cannot be decided about, so
 * the file is refused rather than half-applied.
 *
 * @param text - the file as the project holds it.
 * @returns id to the block's body text.
 * @throws when one id has two blocks.
 */
export function readNormsBlocks(text: string): Map<string, string> {
  const blocks = new Map<string, string>()
  const pattern = /<!-- dsh-norm: ([a-z][a-z0-9-]*\.[a-z][a-z0-9-]*) -->\n([\s\S]*?)\n?<!-- \/dsh-norm -->/g
  for (const match of text.matchAll(pattern)) {
    const id = match[1] as string
    if (blocks.has(id)) throw new Error(`${NORMS_FILE} records \`${id}\` twice — two blocks under one id cannot be told apart`)
    blocks.set(id, (match[2] as string).trim())
  }
  return blocks
}

/** Where one group's section sits, so a block can be inserted into it. */
function groupSection(text: string, group: string): { end: number } | undefined {
  const marker = groupMarker(group)
  const start = text.indexOf(marker)
  if (start < 0) return undefined
  const next = /<!-- dsh-norms: [a-z][a-z0-9-]* -->/.exec(text.slice(start + marker.length))
  return { end: next === null ? text.length : start + marker.length + (next.index ?? 0) }
}

/** The file with one block's body replaced in place. */
function replaceBlock(text: string, id: string, body: string): string {
  const pattern = new RegExp(`<!-- dsh-norm: ${id.replace('.', '\\.')} -->\\n[\\s\\S]*?\\n?<!-- /dsh-norm -->`)
  return text.replace(pattern, renderBlock(body, id).trimEnd())
}

/** The file with one block removed, and the blank lines it left behind collapsed. */
function removeBlock(text: string, id: string): string {
  const pattern = new RegExp(`\\n?<!-- dsh-norm: ${id.replace('.', '\\.')} -->\\n[\\s\\S]*?\\n?<!-- /dsh-norm -->\\n?`)
  return text.replace(pattern, '\n').replace(/\n{3,}/g, '\n\n')
}

/** The file with one block inserted into its group, creating the section when there is none. */
function insertBlock(text: string, catalog: NormsCatalog, id: string, body: string, language: NormsLanguage): string {
  const group = (catalog.norms.find(norm => norm.id === id)?.group ?? id.split('.')[0]) as string
  const block = renderBlock(body, id).trimEnd()
  const section = groupSection(text, group)
  if (section === undefined) {
    return `${text.replace(/\s+$/, '')}\n\n${groupMarker(group)}\n## ${groupHeading(catalog, group, language)}\n\n${block}\n`
  }
  return `${text.slice(0, section.end).replace(/\s+$/, '')}\n\n${block}\n${text.slice(section.end)}`
}

/** A file for a selection, in catalog order: the create path, and the shape every update keeps. */
function renderFile(catalog: NormsCatalog, blocks: Map<string, string>, language: NormsLanguage): string {
  const shipped = catalog.norms.filter(norm => blocks.has(norm.id))
  const out: string[] = [fileHeader()]
  for (const group of catalog.groups) {
    const inGroup = shipped.filter(norm => norm.group === group.id)
    if (inGroup.length === 0) continue
    out.push(groupMarker(group.id), `## ${groupHeading(catalog, group.id, language)}`, '')
    for (const norm of inGroup) out.push(renderBlock(blocks.get(norm.id) as string, norm.id).trimEnd(), '')
  }
  return out.join('\n')
}

/** The three-way comparison for one applied norm: what it is, and the text the file should hold. */
function classify(catalog: NormsCatalog, applied: AppliedNorm, block: string | undefined): { outcome: NormOutcome, text?: string } {
  const norm = catalog.norms.find(entry => entry.id === applied.id)
  const group = (norm?.group ?? applied.id.split('.')[0]) as string
  if (norm === undefined) return { outcome: { id: applied.id, group, state: 'unshipped', mine: block } }
  if (block === undefined) return { outcome: { id: applied.id, group, state: 'missing' } }
  const mine = normHash(block)
  const shipped = normHash(norm.body)
  if (applied.kept === true) {
    // Confirmed as this project's own: never overwritten, and when the revision moved it too the
    // report prints both versions so the decision can be revisited.
    return shipped === applied.base
      ? { outcome: { id: applied.id, group, state: 'personalized', mine: block }, text: block }
      : { outcome: { id: applied.id, group, state: 'personalized', shipped: norm.body, mine: block }, text: block }
  }
  if (mine === applied.base) {
    return shipped === applied.base
      ? { outcome: { id: applied.id, group, state: 'current' }, text: block }
      : { outcome: { id: applied.id, group, state: 'update', shipped: norm.body }, text: norm.body }
  }
  return shipped === applied.base
    ? { outcome: { id: applied.id, group, state: 'personalized', mine: block }, text: block }
    : { outcome: { id: applied.id, group, state: 'conflict', shipped: norm.body, mine: block }, text: block }
}

/**
 * Plan one verb against a project's record and file.
 *
 * @param catalog - the norms the skill set ships.
 * @param record - what the project applied.
 * @param existing - the file as the project holds it, or `undefined` when there is none.
 * @param request - the verb and the ids it names, already resolved from a group or `--all`.
 * @param language - the language a created file's headings are written in.
 * @returns the per-norm outcomes, and the text the file and record would become.
 * @throws when the request cannot be applied as asked.
 */
export function normsPlan(
  catalog: NormsCatalog,
  record: NormsRecord,
  existing: string | undefined,
  request: { verb: NormsVerb, ids: readonly string[], keep?: readonly string[], take?: readonly string[] },
  language: NormsLanguage,
): NormsPlan {
  const blocks = existing === undefined ? new Map<string, string>() : readNormsBlocks(existing)
  const applied = new Map(record.norms.map(entry => [entry.id, entry]))
  const keep = request.keep ?? []
  const take = request.take ?? []
  const outcomes: NormOutcome[] = []
  /** The ids this plan drops from the selection, so the sweep below cannot hold them back. */
  const dropped = new Set<string>()
  /** Per id: the text the file should hold (`undefined` keeps a record entry with no block), the
   * base hash the record should carry, and whether the project confirmed its own text. */
  const next = new Map<string, { text?: string, base: string, kept?: boolean }>()

  /** Hold an applied norm exactly as it stands: same text, same base, same confirmation. An update
   * that may not overwrite a norm must not forget what the skill set last wrote either, or the next
   * update would compare against the project's own text and overwrite it. */
  const hold = (id: string, entry: AppliedNorm): void => {
    const block = blocks.get(id)
    next.set(id, {
      ...(block === undefined ? {} : { text: block }),
      base: entry.base,
      ...(entry.kept === true ? { kept: true } : {}),
    })
  }

  for (const id of request.ids) {
    const norm = catalog.norms.find(entry => entry.id === id)
    if (norm === undefined) throw new Error(`no norm \`${id}\` in the catalog — run \`norms list\` for the ids it ships`)
    const entry = applied.get(id)
    const block = blocks.get(id)
    if (request.verb === 'remove') {
      if (entry === undefined) throw new Error(`\`${id}\` is not applied in this project — nothing to remove`)
      // Removing a norm the project personalized would take that text with it, so it is refused
      // until the project has decided: `norms update --take <id>` first, then remove.
      if (block !== undefined && normHash(block) !== entry.base) {
        outcomes.push({ id, group: norm.group, state: 'personalized', mine: block })
        hold(id, entry)
        continue
      }
      outcomes.push({ id, group: norm.group, state: 'removed' })
      dropped.add(id)
      continue
    }
    if (entry === undefined) {
      // Applying an id this project never applied. A block already under that id is the project's
      // own writing: the record gains the id so updates can compare, and the text stays theirs.
      if (block === undefined) {
        next.set(id, { text: norm.body, base: normHash(norm.body) })
        outcomes.push({ id, group: norm.group, state: 'add' })
      } else {
        next.set(id, { text: block, base: normHash(norm.body), kept: true })
        outcomes.push({ id, group: norm.group, state: 'personalized', mine: block })
      }
      continue
    }
    if (take.includes(id)) {
      if (block === undefined) {
        outcomes.push({ id, group: norm.group, state: 'missing' })
        continue
      }
      const shipped = normHash(norm.body)
      const mine = normHash(block)
      next.set(id, { text: norm.body, base: shipped })
      outcomes.push(mine === shipped
        ? { id, group: norm.group, state: 'current' }
        : { id, group: norm.group, state: 'update', shipped: norm.body, mine: block })
      continue
    }
    if (keep.includes(id)) {
      if (block === undefined) {
        outcomes.push({ id, group: norm.group, state: 'missing' })
        continue
      }
      const shipped = normHash(norm.body)
      next.set(id, { text: block, base: entry.base, kept: true })
      outcomes.push(shipped === entry.base
        ? { id, group: norm.group, state: 'personalized', mine: block }
        : { id, group: norm.group, state: 'personalized', shipped: norm.body, mine: block })
      continue
    }
    const { outcome, text } = classify(catalog, entry, block)
    outcomes.push(outcome)
    if (outcome.state === 'current' || outcome.state === 'update') {
      next.set(id, { text: text as string, base: outcome.state === 'current' ? entry.base : normHash(text as string) })
    } else if (outcome.state === 'personalized' || outcome.state === 'conflict' || outcome.state === 'unshipped') {
      hold(id, entry)
    } else {
      // `missing`: the block is gone from the file. The record keeps the id, and nothing is
      // re-added — a block this project deleted stays deleted.
      hold(id, entry)
    }
  }
  for (const entry of record.norms) {
    if (next.has(entry.id) || dropped.has(entry.id)) continue
    const norm = catalog.norms.find(candidate => candidate.id === entry.id)
    if (request.verb === 'install' && norm !== undefined) {
      const { outcome, text } = classify(catalog, entry, blocks.get(entry.id))
      outcomes.push(outcome)
      if (outcome.state === 'current' || outcome.state === 'update') {
        next.set(entry.id, { text: text as string, base: outcome.state === 'current' ? entry.base : normHash(text as string) })
      } else hold(entry.id, entry)
      continue
    }
    hold(entry.id, entry)
  }

  // The file: edit only what the plan decided, and leave every other byte of the project's copy —
  // its own sections, headings and blocks are never read as ours and never written.
  let file: string
  if (existing === undefined) {
    const bodies = new Map<string, string>()
    for (const [id, value] of next) if (value.text !== undefined) bodies.set(id, value.text)
    file = renderFile(catalog, bodies, language)
  } else {
    file = existing
    for (const outcome of outcomes) {
      const entry = next.get(outcome.id)
      if (outcome.state === 'removed') file = removeBlock(file, outcome.id)
      else if (outcome.state === 'add' && entry?.text !== undefined) file = insertBlock(file, catalog, outcome.id, entry.text, language)
      else if (outcome.state === 'update' && entry?.text !== undefined) file = replaceBlock(file, outcome.id, entry.text)
    }
  }
  // The record lists what the project applies: catalog order first, then the norms the catalog no
  // longer ships, each with the hash of the text the skill set last wrote and its confirmation.
  const inCatalog = catalog.norms.filter(norm => next.has(norm.id)).map(norm => norm.id)
  const unshipped = record.norms.map(entry => entry.id).filter(id => next.has(id) && !inCatalog.includes(id))
  const order = [...inCatalog, ...unshipped]
  const groups = catalog.groups.map(group => group.id).filter(group => order.some(id => id.startsWith(`${group}.`)))
  return {
    outcomes,
    file,
    record: {
      groups,
      norms: order.map((id) => {
        const value = next.get(id) as { base: string, kept?: boolean }
        return { id, base: value.base, ...(value.kept === true ? { kept: true } : {}) }
      }),
    },
  }
}

/** The plan as the report a person reads. */
export function renderNormsPlan(plan: NormsPlan, language: NormsLanguage): string {
  const labels: Record<NormState, [string, string]> = {
    add: ['add', '新增'],
    current: ['ok', '已是'],
    update: ['update', '更新'],
    personalized: ['personalized — kept', '已个性化 — 保留'],
    conflict: ['conflict — kept, decide', '冲突 — 保留,待定'],
    missing: ['not in the file — not re-added', '文件里没有 — 不补回'],
    unshipped: ['no longer shipped — kept', '集合已不再发布 — 保留'],
    removed: ['remove', '移除'],
  }
  const lines: string[] = []
  for (const outcome of plan.outcomes) {
    const label = labels[outcome.state][language === 'zh' ? 1 : 0]
    lines.push(`  ${label.padEnd(language === 'zh' ? 18 : 28)}${outcome.id}`)
    if (outcome.shipped !== undefined && outcome.mine !== undefined) {
      lines.push(language === 'zh' ? '    集合这一版:' : '    the revision says:')
      for (const row of outcome.shipped.split('\n')) lines.push(`      ${row}`)
      lines.push(language === 'zh' ? '    项目这一份:' : '    this project holds:')
      for (const row of outcome.mine.split('\n')) lines.push(`      ${row}`)
    }
  }
  const counts = new Map<NormState, number>()
  for (const outcome of plan.outcomes) counts.set(outcome.state, (counts.get(outcome.state) ?? 0) + 1)
  const summary = [...counts.entries()].map(([state, count]) => `${count} ${labels[state][language === 'zh' ? 1 : 0]}`).join(language === 'zh' ? ',' : ', ')
  lines.push(language === 'zh' ? `  ${plan.outcomes.length} 条规范:${summary}` : `  ${plan.outcomes.length} norm(s): ${summary}`)
  lines.push(language === 'zh'
    ? `  记录 ${NORMS_RECORD} 现在记 ${plan.record.norms.length} 条`
    : `  the record ${NORMS_RECORD} now holds ${plan.record.norms.length}`)
  return `${lines.join('\n')}\n`
}

/** The markers around the `AGENTS.md` hook that points a session at the file. */
export const NORMS_HOOK_START = '<!-- dsh-spec:norms -->'
export const NORMS_HOOK_END = '<!-- /dsh-spec:norms -->'

/**
 * The `AGENTS.md` section a project carries only while it applies norms.
 *
 * A hook is not a rule: it says that the rules exist, where they are, and how far they reach, so
 * a session that starts long after the install still reads them. It is rendered from the same place
 * a rule is, so there is one statement of it rather than two.
 *
 * @returns the section text, markers included, newline-terminated.
 */
export function normsHookSection(): string {
  return `${NORMS_HOOK_START}
## Norms this project applies

\`${NORMS_FILE}\` holds the norms this project applies: one section per group, one rule per marked block. They govern every task here, not only changes to files — read the ones covering the work in hand before starting it.

${NORMS_HOOK_END}
`
}

/**
 * Add, refresh or remove the hook in an `AGENTS.md`, and touch nothing else.
 *
 * The hook exists exactly while the project applies norms, which is what makes it a report of a
 * selection rather than another standing order: a project that applies none carries no line pointing
 * at a file it does not have. Everything outside the two markers is the project's own text and is
 * returned byte for byte.
 *
 * @param existing - the `AGENTS.md` as the project holds it.
 * @param applied - whether the project applies any norm.
 * @returns the file's new text.
 */
export function applyNormsHook(existing: string, applied: boolean): string {
  const rendered = applied ? normsHookSection().trimEnd() : ''
  const start = existing.indexOf(NORMS_HOOK_START)
  const end = existing.indexOf(NORMS_HOOK_END)
  if (start < 0 || end < 0) {
    return rendered === '' ? existing : `${existing.replace(/\s+$/, '')}\n\n${rendered}\n`
  }
  const before = existing.slice(0, start).replace(/\s+$/, '')
  const after = existing.slice(end + NORMS_HOOK_END.length).replace(/^\n+/, '').replace(/\s+$/, '')
  const head = before === '' ? '' : `${before}\n`
  if (rendered === '') return after === '' ? `${head}`.replace(/\n*$/, '\n') : `${head}\n${after}\n`
  const tail = after === '' ? '' : `\n\n${after}`
  return `${head}\n${rendered}${tail}\n`
}

/**
 * What a manager verb says about a project's applied norms, without touching them.

 *
 * `install` and `upgrade` own the mechanism text; the norms a project applies are the project's own
 * selection, so a refresh reports them the way `apt update` reports upgradable packages: it reads
 * the catalog, the record and the file, says how many applied norms the revision moves, and names
 * the one command that applies them. Nothing here writes, and a record that cannot be read is
 * reported rather than raised — a project's norms must not be able to fail an upgrade.
 *
 * @param root - the project root.
 * @param catalogPath - the catalog of the revision being installed.
 * @returns one line for the refresh to print.
 */
export function normsStatusFor(root: string, catalogPath: string): string {
  try {
    const catalog = readNorms(catalogPath)
    const record = readNormsRecord(recordPathOf(root))
    if (record.norms.length === 0) {
      return `  no norms are applied in this project — \`norms list\` shows the ${catalog.norms.length} this skill set offers, and \`norms install\` applies the ones you choose`
    }
    const file = existsSync(filePathOf(root)) ? readFileSync(filePathOf(root), 'utf8') : undefined
    const plan = normsPlan(catalog, record, file, { verb: 'update', ids: record.norms.map(entry => entry.id) }, 'en')
    const counts = new Map<NormState, number>()
    for (const outcome of plan.outcomes) counts.set(outcome.state, (counts.get(outcome.state) ?? 0) + 1)
    const moved = [...counts.entries()].filter(([state]) => state !== 'current')
    if (moved.length === 0) return `  ${record.norms.length} norm(s) applied, all at this revision`
    const summary = moved.map(([state, count]) => `${count} ${state}`).join(', ')
    return `  ${record.norms.length} norm(s) applied: ${summary} — \`norms update\` applies or decides them; this command does not write them`
  } catch (error) {
    return `  the norms this project applies could not be read: ${(error as Error).message}`
  }
}

/** Write a plan: the file and the record, creating their directory when it is missing. */
export function applyNormsPlan(root: string, plan: NormsPlan): void {
  for (const [path, text] of [[filePathOf(root), plan.file], [recordPathOf(root), renderNormsRecord(plan.record)]] as const) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
}

/** Resolve the ids a verb names: an explicit list, a group, or every norm the catalog ships. */
export function resolveNormsIds(catalog: NormsCatalog, options: { ids: readonly string[], group?: string, all: boolean, applied?: readonly string[] }): string[] {
  if (options.all) return options.applied === undefined ? catalog.norms.map(norm => norm.id) : [...options.applied]
  if (options.group !== undefined) {
    const group = catalog.groups.find(entry => entry.id === options.group)
    if (group === undefined) throw new Error(`no group \`${options.group}\` — the catalog has ${catalog.groups.map(entry => entry.id).join(', ')}`)
    const ids = catalog.norms.filter(norm => norm.group === group.id).map(norm => norm.id)
    return options.applied === undefined ? ids : ids.filter(id => options.applied?.includes(id))
  }
  if (options.ids.length === 0) throw new Error('name the norms this applies to, a group, or --all')
  const known = new Set(catalog.norms.map(norm => norm.id))
  const unknown = options.ids.filter(id => !known.has(id))
  if (unknown.length > 0) {
    throw new Error(`no norm ${unknown.map(id => `\`${id}\``).join(', ')} in the catalog — run \`norms list\` for the ids it ships`)
  }
  return [...options.ids]
}

/**
 * Aggregate, section-keyed consistency records. One foo.i18n.yaml per source holds, for every
 * heading section, the source content hash and one target signature per target. A target signature
 * binds the source hash: H(sourceHash || targetContentHash). Any source change therefore invalidates
 * every target confirmation without storing a source version per target.
 */

import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import type { Nodes, RootContent } from 'mdast'
import { parseMarkdown } from './markdown.ts'
import { bindTarget } from './signature.ts'
import {
  normalizeTranslationMarkdownLinkEdits,
  type TranslationLinkContext,
  type TranslationLinkDestinationEdit,
  type TranslationLinkNormalization,
} from './pairing-links.ts'
import type { Language, PairPaths } from './targets.ts'

/** One section's computed hashes for the pair being checked; target is a source-bound signature. */
export interface TranslationSectionHashes {
  /** Hash of the source-language blocks. */
  source: string
  /** Target signature: H(source hash || target content hash). */
  target: string
}

/** One aggregate record: section -> code -> hash, source code first, target signatures after. */
export interface TranslationPairingRecord {
  /** Source language code, the first code in every section. */
  sourceCode: string
  /** Section entries, in document order. */
  entries: ReadonlyMap<string, ReadonlyMap<string, string>>
}

/** Link-resolution inputs shared by both sides of one pair. */
export interface TranslationPairingRecordContext {
  /** Project root and corpus predicate, without a side. */
  base: Omit<TranslationLinkContext, 'sourcePath' | 'side'>
  /** The pair's target language. */
  target: Language
}

const KEY_LINE = /^(\/[^\s:#]*):$/
const HASH_LINE = /^ {2}([a-z]{2,3}(?:-[A-Za-z0-9]{1,8})*): ([0-9a-f]{16})$/

/** One top-level Markdown node, located in the text that sections() slices. */
export interface TopLevelBlock {
  node: RootContent
  start: number | undefined
  end: number | undefined
  line: number
}

function headingText(node: Nodes): string {
  if ('value' in node && (node.type === 'text' || node.type === 'inlineCode')) return node.value
  return 'children' in node ? node.children.map(headingText).join('') : ''
}

function topLevelBlocks(tree: Nodes): TopLevelBlock[] {
  if (tree.type !== 'root') throw new Error('Markdown parser returned a non-root tree')
  return tree.children.map((node) => ({
    node,
    start: node.position?.start.offset,
    end: node.position?.end.offset,
    line: node.position?.start.line ?? 0,
  }))
}

/** Characters that read only as destination text in every raw or angle-bracket destination slot. */
const PARSE_NEUTRAL_DESTINATION = /^[A-Za-z0-9._/:#%-]+$/

/** Whether one edit replaces a complete, title-free destination on its opener's line. */
function isParseNeutralEdit(markdown: string, edit: TranslationLinkDestinationEdit): boolean {
  const authored = markdown.slice(edit.start, edit.end)
  const nodeStart = edit.node.position?.start.offset
  const nodeEnd = edit.node.position?.end.offset
  if (nodeStart === undefined || nodeEnd === undefined || edit.node.url !== authored) return false
  if (!PARSE_NEUTRAL_DESTINATION.test(authored) || !PARSE_NEUTRAL_DESTINATION.test(edit.value)) return false
  const before = markdown.slice(nodeStart, edit.start)
  const after = markdown.slice(edit.end, nodeEnd)
  const angle = before.endsWith('<')
  return edit.node.type === 'link'
    ? /\]\([ \t]*<?$/.test(before) && (angle ? /^>[ \t]*\)$/ : /^[ \t]*\)$/).test(after)
    : /\]:[ \t]*<?$/.test(before) && (angle ? /^>[ \t]*$/ : /^[ \t]*$/).test(after)
}

/**
 * Locate the authored tree's top-level nodes in normalized text without reparsing it.
 * @param markdown - exact authored text that tree parses.
 * @param tree - parse of markdown.
 * @param edits - normalization edits of markdown in ascending source order.
 * @returns the moved blocks, or undefined when an edit is not provably parse-neutral.
 */
export function normalizedTopLevelBlocks(
  markdown: string,
  tree: Nodes,
  edits: readonly TranslationLinkDestinationEdit[],
): TopLevelBlock[] | undefined {
  if (!edits.every((edit) => isParseNeutralEdit(markdown, edit))) return undefined
  let next = 0
  let shift = 0
  const moved: TopLevelBlock[] = []
  for (const block of topLevelBlocks(tree)) {
    if (block.start === undefined || block.end === undefined) return undefined
    const start = block.start + shift
    for (let edit = edits[next]; edit !== undefined && edit.start < block.end; edit = edits[next]) {
      if (edit.start < block.start || edit.end > block.end) return undefined
      shift += edit.value.length - (edit.end - edit.start)
      next += 1
    }
    moved.push({ ...block, start, end: block.end + shift })
  }
  return next === edits.length ? moved : undefined
}

/**
 * Split normalized Markdown into the preamble plus one section per heading. Fenced code blocks,
 * which the pairing check requires to be identical on both sides, are left out of the blocks.
 */
function sections(markdown: string, blocks: readonly TopLevelBlock[]): Section[] {
  const frontmatter = /^---\n[\s\S]*?\n---(?:\n|$)/.exec(markdown)?.[0].length ?? 0
  const result: Section[] = [{ blocks: frontmatter > 0 ? [markdown.slice(0, frontmatter)] : [] }]
  for (const { node, start, end } of blocks) {
    if ((start ?? 0) < frontmatter) continue
    if (node.type === 'heading') result.push({ heading: node, blocks: [] })
    if (node.type === 'code') continue
    result.at(-1)?.blocks.push(markdown.slice(start, end))
  }
  return result
}

function sideSections(markdown: string, normalized: TranslationLinkNormalization, tree: Nodes | undefined): Section[] {
  if (tree !== undefined && normalized.content === markdown) return sections(markdown, topLevelBlocks(tree))
  const moved = tree === undefined ? undefined : normalizedTopLevelBlocks(markdown, tree, normalized.edits)
  return sections(normalized.content, moved ?? topLevelBlocks(parseMarkdown(normalized.content)))
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  )
}

function sectionHash(blocks: string[]): string {
  return createHash('sha256').update(blocks.join('\n')).digest('hex').slice(0, 16)
}

function sectionsFor(markdown: string, blocks: readonly TopLevelBlock[]): Section[] {
  return sections(markdown, blocks)
}

function sideSectionsFor(
  markdown: string,
  normalized: TranslationLinkNormalization,
  tree: Nodes | undefined,
): Section[] {
  return sideSections(markdown, normalized, tree)
}

/**
 * Compute the source hash and bound target signature for one pair.
 * @param paths - the pair.
 * @param source - masked source text.
 * @param counterpart - masked counterpart text.
 * @param context - project root, corpus predicate and target.
 * @param trees - optional parses of the exact inputs.
 * @returns one entry per recorded section, in document order.
 * @throws Error when the two sides have different heading counts.
 */
export function computeTranslationPairingRecord(
  paths: PairPaths,
  source: string,
  counterpart: string,
  context: TranslationPairingRecordContext,
  trees?: { readonly source: Nodes; readonly counterpart: Nodes },
): ReadonlyMap<string, TranslationSectionHashes> {
  const sourceContext: TranslationLinkContext = {
    ...context.base,
    sourcePath: paths.source,
    side: { role: 'source', target: paths.target },
  }
  const counterpartContext: TranslationLinkContext = {
    ...context.base,
    sourcePath: paths.counterpart,
    side: { role: 'counterpart', target: paths.target },
  }
  const normalizedSource = normalizeTranslationMarkdownLinkEdits(source, sourceContext, trees?.source)
  const normalizedCounterpart = normalizeTranslationMarkdownLinkEdits(
    counterpart,
    counterpartContext,
    trees?.counterpart,
  )
  const sourceSections = sideSectionsFor(source, normalizedSource, trees?.source)
  const counterpartSections = sideSectionsFor(counterpart, normalizedCounterpart, trees?.counterpart)
  if (sourceSections.length !== counterpartSections.length) {
    throw new Error(
      paths.source +
        ' has ' +
        String(sourceSections.length - 1) +
        ' heading(s) but ' +
        paths.counterpart +
        ' has ' +
        String(counterpartSections.length - 1),
    )
  }
  const record = new Map<string, TranslationSectionHashes>()
  const ancestors: { depth: number; slug: string }[] = []
  const keys = new Set<string>()
  for (const [index, sourceSection] of sourceSections.entries()) {
    const counterpartSection = counterpartSections[index]
    if (counterpartSection === undefined) throw new Error('section alignment lost its counterpart')
    let path = '/'
    if (sourceSection.heading !== undefined) {
      const depth = sourceSection.heading.depth
      while ((ancestors.at(-1)?.depth ?? 0) >= depth) ancestors.pop()
      ancestors.push({ depth, slug: slug(headingText(sourceSection.heading)) })
      path = '/' + ancestors.map((ancestor) => ancestor.slug).join('/')
    }
    let key = path
    for (let repeat = 2; keys.has(key); repeat++) key = path + '~' + String(repeat)
    keys.add(key)
    if (sourceSection.blocks.length === 0 && counterpartSection.blocks.length === 0) continue
    const sourceHash = sectionHash(sourceSection.blocks)
    record.set(key, {
      source: sourceHash,
      target: bindTarget(sourceHash, sectionHash(counterpartSection.blocks)),
    })
  }
  return record
}

/**
 * Parse a flat aggregate record.
 * @param content - complete record text.
 * @returns the record, or undefined when malformed or when sections disagree on the source code.
 */
export function parseTranslationPairingRecord(content: string): TranslationPairingRecord | undefined {
  const lines = content.split('\n').filter((line) => line !== '' && !line.startsWith('#'))
  const entries = new Map<string, Map<string, string>>()
  let sourceCode: string | undefined
  let index = 0
  while (index < lines.length) {
    const key = KEY_LINE.exec(lines[index] ?? '')?.[1]
    index += 1
    if (key === undefined || entries.has(key)) return undefined
    const values = new Map<string, string>()
    let codeSeen: string | undefined
    while (index < lines.length && !KEY_LINE.test(lines[index] ?? '')) {
      const match = HASH_LINE.exec(lines[index] ?? '')
      index += 1
      if (match?.[1] === undefined || match[2] === undefined || values.has(match[1])) return undefined
      if (codeSeen === undefined) {
        codeSeen = match[1]
        if (sourceCode === undefined) sourceCode = codeSeen
        else if (sourceCode !== codeSeen) return undefined
      } else if (match[1] === codeSeen) return undefined
      values.set(match[1], match[2])
    }
    if (codeSeen === undefined || values.size < 2) return undefined
    entries.set(key, values)
  }
  if (sourceCode === undefined || entries.size === 0) return undefined
  return { sourceCode, entries }
}

/** The record body (no comment or blank lines) for canonical comparison. */
export function recordBody(content: string): string {
  return content
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    .join('\n')
}

/**
 * Render the canonical flat aggregate record.
 * @param source - source path, for the comment and basename.
 * @param record - confirmed entries.
 * @returns canonical YAML text with one trailing newline.
 */
export function renderTranslationPairingRecord(source: string, record: TranslationPairingRecord): string {
  const header = [
    '# Pairing consistency record for ' + basename(source) + ' (references/pairing-contract.md): per heading',
    '# source hash plus one target signature per target outside fenced code blocks and generated regions; a target signature binds the source hash, so a source change invalidates every target until re-recorded.',
    '# After editing either side, bring the other along and re-record with:',
    '#   node <skill-dir>/scripts/translate-pair.mjs write ' + source + ' --target <lang>',
  ]
  const body: string[] = []
  for (const [key, values] of record.entries) {
    body.push(key + ':')
    const sourceHash = values.get(record.sourceCode)
    if (sourceHash === undefined) continue
    body.push('  ' + record.sourceCode + ': ' + sourceHash)
    const targets = [...values.keys()].filter((code) => code !== record.sourceCode).sort((a, b) => a.localeCompare(b))
    for (const code of targets) body.push('  ' + code + ': ' + values.get(code))
  }
  return [...header, ...body, ''].join('\n')
}

/**
 * Merge computed hashes for one target into the flat aggregate record.
 * @param recorded - parsed record, or undefined when none exists.
 * @param sourceCode - source language code.
 * @param targetCode - target language code.
 * @param computed - entries computed from the current pair.
 * @returns the updated aggregate record.
 * @throws Error when an existing record names a different source language.
 */
export function updateTranslationPairingRecord(
  recorded: TranslationPairingRecord | undefined,
  sourceCode: string,
  targetCode: string,
  computed: ReadonlyMap<string, TranslationSectionHashes>,
): TranslationPairingRecord {
  if (recorded !== undefined && recorded.sourceCode !== sourceCode) {
    throw new Error(
      'record source language is ' + JSON.stringify(recorded.sourceCode) + ', not ' + JSON.stringify(sourceCode),
    )
  }
  const entries = new Map<string, Map<string, string>>()
  for (const [key, hashes] of computed) {
    const values = new Map(recorded?.entries.get(key) ?? [])
    values.set(sourceCode, hashes.source)
    values.set(targetCode, hashes.target)
    entries.set(key, values)
  }
  return { sourceCode, entries }
}

/**
 * Drop one target's entries from a record.
 * @param record - parsed record.
 * @param targetCode - target to remove.
 * @returns the record without that target, or undefined when no target remains.
 */
export function dropTranslationTarget(
  record: TranslationPairingRecord,
  targetCode: string,
): TranslationPairingRecord | undefined {
  const entries = new Map<string, Map<string, string>>()
  for (const [key, values] of record.entries) {
    const next = new Map(values)
    next.delete(targetCode)
    if (next.size > 1) entries.set(key, next)
  }
  return entries.size === 0 ? undefined : { sourceCode: record.sourceCode, entries }
}

/**
 * Describe how the selected target's recorded hashes differ from the current pair.
 * @param recorded - parsed aggregate record.
 * @param current - computed hashes for the selected pair.
 * @param sourceCode - source language code.
 * @param targetCode - target language code.
 * @returns one message per changed, added or removed section.
 */
export function translationPairingRecordDiff(
  recorded: TranslationPairingRecord,
  current: ReadonlyMap<string, TranslationSectionHashes>,
  sourceCode: string,
  targetCode: string,
): string[] {
  const out: string[] = []
  for (const [key, hashes] of current) {
    const confirmed = recorded.entries.get(key)
    if (confirmed === undefined) {
      out.push('section ' + key + ' has unconfirmed translated content')
      continue
    }
    const confirmedSource = confirmed.get(sourceCode)
    const confirmedTarget = confirmed.get(targetCode)
    if (confirmedTarget === undefined) {
      out.push('section ' + key + ' has no recorded ' + targetCode + ' signature')
      continue
    }
    if (confirmedSource === undefined) {
      out.push('section ' + key + ' has no recorded ' + sourceCode + ' hash')
      continue
    }
    const sides: string[] = []
    if (confirmedSource !== hashes.source) sides.push(sourceCode)
    if (confirmedTarget !== hashes.target) sides.push(targetCode + ' signature')
    if (sides.length > 0) out.push('section ' + key + ' changed since confirmation (' + sides.join(', ') + ')')
  }
  for (const [key, values] of recorded.entries) {
    if (current.has(key)) continue
    if (values.has(targetCode)) out.push('section ' + key + ' is recorded but no longer has translated content')
  }
  return out
}

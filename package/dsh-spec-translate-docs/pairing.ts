/**
 * SPDX-License-Identifier: MIT
 *
 * Extracted from the DeepSeek Harness bilingual-document mechanism at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
/**
 * Structural signatures, generated-region comparison and the existing-pair check.
 *
 * The gate only checks pairs that already exist. Creation and update follow the project's
 * standing instructions or the user's instruction; this module never requires a source to be paired.
 */

import type { Nodes } from 'mdast'
import type { PairCorpus } from './corpus.ts'
import { parseMarkdown } from './markdown.ts'
import {
  normalizeTranslationMarkdownLinkEdits,
  semanticTranslationLinkNodeTarget,
  translationLinkLocaleViolations,
  type TranslationLinkContext,
} from './pairing-links.ts'
import {
  computeTranslationPairingRecord,
  parseTranslationPairingRecord,
  recordBody,
  renderTranslationPairingRecord,
  translationPairingRecordDiff,
} from './pairing-record.ts'
import { generatedRegions, maskGeneratedRegions, regionMismatch, type GeneratedRegion } from './regions.ts'
import { locateSwitchers } from './switchers.ts'
import type { PairPaths } from './targets.ts'

/** One boundary of the structural signature, in document order. */
export interface TranslationStructureSignature {
  headings: number[]
  code: string[]
  tables: string[]
  lists: string[]
  links: string[]
}

/**
 * Collect the ordered structural signature, skipping the switcher paragraph's links.
 * @param tree - parsed Markdown.
 * @param linkContext - root, source path, side and corpus predicate.
 * @param markdown - exact Markdown the tree parses.
 * @param skippedLinkOffsets - source offsets of the switcher links.
 * @returns the signature.
 */
export function translationStructureSignature(
  tree: Nodes,
  linkContext: TranslationLinkContext,
  markdown: string,
  skippedLinkOffsets: ReadonlySet<number>,
): TranslationStructureSignature {
  const signature: TranslationStructureSignature = { headings: [], code: [], tables: [], lists: [], links: [] }
  const visit = (node: Nodes): void => {
    if (node.type === 'heading') signature.headings.push(node.depth)
    if (node.type === 'code') signature.code.push(node.value)
    if (node.type === 'table') {
      signature.tables.push(node.children.length + 'x' + (node.children[0]?.children.length ?? 0))
    }
    if (node.type === 'list') {
      const item = node.children[0]
      const kind = node.ordered === true ? 'ordered:' + String(node.start ?? 1) : 'bullet'
      signature.lists.push(
        kind + ':' + String(node.children.length) + ':' + (item?.spread === true ? 'spread' : 'tight'),
      )
    }
    if (node.type === 'link') {
      const start = node.position?.start.offset
      const target = semanticTranslationLinkNodeTarget(node, markdown, linkContext)
      if (start === undefined || target === undefined || skippedLinkOffsets.has(start)) return
      signature.links.push(target)
    }
    if ('children' in node) for (const child of node.children) visit(child)
  }
  for (const child of tree.children) visit(child)
  return signature
}

/**
 * Compare two structure signatures.
 * @param source - source-side signature.
 * @param counterpart - counterpart-side signature.
 * @returns one message per divergence.
 */
export function translationStructureDiff(
  source: TranslationStructureSignature,
  counterpart: TranslationStructureSignature,
): string[] {
  const out: string[] = []
  const compare = (kind: string, left: readonly (string | number)[], right: readonly (string | number)[]): void => {
    if (left.length !== right.length || left.some((value, index) => value !== right[index])) {
      out.push(kind + ' differs: source ' + JSON.stringify(left) + ', counterpart ' + JSON.stringify(right))
    }
  }
  compare('heading structure', source.headings, counterpart.headings)
  compare('code blocks', source.code, counterpart.code)
  compare('tables', source.tables, counterpart.tables)
  compare('lists', source.lists, counterpart.lists)
  compare('links', source.links, counterpart.links)
  return out
}

/** One pair's state and violations. */
export interface PairCheck {
  paths: PairPaths
  state: 'ok' | 'out-of-sync' | 'missing'
  errors: string[]
}

interface RegionSet {
  regions: GeneratedRegion[]
  error?: string
}

function regionsOf(text: string): RegionSet {
  try {
    return { regions: generatedRegions(text) }
  } catch (error) {
    return { regions: [], error: error instanceof Error ? error.message : String(error) }
  }
}

/** The masked text's tree, or the error that prevented masking or parsing it. */
function maskedTreeOf(text: string): { tree: Nodes } | { error: string } {
  try {
    return { tree: parseMarkdown(maskGeneratedRegions(text)) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** Count the authored headings above each region in the masked tree. */
function regionAnchors(regions: readonly GeneratedRegion[], tree: Nodes): { slug: string; anchor: number }[] {
  const headings = tree.children.filter((node) => node.type === 'heading').map((node) => node.position?.start.line ?? 0)
  return regions.map((region) => ({
    slug: region.slug,
    anchor: headings.filter((line) => line < region.begin + 1).length,
  }))
}

/**
 * Compare the authored-section anchor of every generated region across one pair.
 * @param sourceRegions - regions of the source, in document order.
 * @param sourceTree - the source's masked tree.
 * @param counterpartRegions - regions of the counterpart, in document order.
 * @param counterpartTree - the counterpart's masked tree.
 * @returns the first drifting region's slug, or undefined when every anchor agrees.
 */
function regionAnchorDrift(
  sourceRegions: readonly GeneratedRegion[],
  sourceTree: Nodes,
  counterpartRegions: readonly GeneratedRegion[],
  counterpartTree: Nodes,
): { slug: string } | undefined {
  const sourceAnchors = regionAnchors(sourceRegions, sourceTree)
  const counterpartAnchors = regionAnchors(counterpartRegions, counterpartTree)
  for (const [index, anchor] of sourceAnchors.entries()) {
    const other = counterpartAnchors[index]
    if (other === undefined || other.slug !== anchor.slug || other.anchor !== anchor.anchor) {
      return { slug: anchor.slug }
    }
  }
  return undefined
}

function regionMismatchMessage(mismatch: { slug: string; reason: string }, label: string): string {
  return (
    label + ': generated region ' + JSON.stringify(mismatch.slug) + ' ' + mismatch.reason + '; regenerate both sides'
  )
}

function regionAnchorMessage(paths: PairPaths, slug: string): string {
  return (
    paths.source +
    ' <-> ' +
    paths.counterpart +
    ': generated region ' +
    JSON.stringify(slug) +
    ' sits under a different authored section; regenerate both sides'
  )
}

/**
 * Report a current generated-region disagreement between the two sides of one pair.
 * @param corpus - the corpus.
 * @param paths - the pair.
 * @returns a precondition message, or undefined when the regions agree.
 */
export function regionDrift(corpus: PairCorpus, paths: PairPaths): string | undefined {
  const source = corpus.readFile(paths.source)
  const counterpart = corpus.readFile(paths.counterpart)
  if (source === undefined || counterpart === undefined) return undefined
  const sourceRegions = regionsOf(source)
  const counterpartRegions = regionsOf(counterpart)
  if (sourceRegions.error !== undefined) return paths.source + ': ' + sourceRegions.error
  if (counterpartRegions.error !== undefined) return paths.counterpart + ': ' + counterpartRegions.error
  const mismatch = regionMismatch(
    sourceRegions.regions,
    counterpartRegions.regions,
    (text) => normalizeTranslationMarkdownLinkEdits(text, corpus.linkContext(paths, 'source')).content,
  )
  if (mismatch !== undefined) return regionMismatchMessage(mismatch, paths.source + ' [' + paths.target.code + ']')
  const sourceMasked = maskedTreeOf(source)
  if ('error' in sourceMasked) return paths.source + ': ' + sourceMasked.error
  const counterpartMasked = maskedTreeOf(counterpart)
  if ('error' in counterpartMasked) return paths.counterpart + ': ' + counterpartMasked.error
  const drift = regionAnchorDrift(
    sourceRegions.regions,
    sourceMasked.tree,
    counterpartRegions.regions,
    counterpartMasked.tree,
  )
  return drift === undefined ? undefined : regionAnchorMessage(paths, drift.slug)
}

/**
 * Check one existing pair: completeness, regions, record, switchers, structure and link locale.
 * @param corpus - the corpus.
 * @param paths - the pair.
 * @returns the pair's state and every violation.
 */
export function checkPair(corpus: PairCorpus, paths: PairPaths): PairCheck {
  const errors: string[] = []
  const state = (next: 'ok' | 'out-of-sync' | 'missing'): PairCheck => ({ paths, state: next, errors })
  const label = paths.source + ' [' + paths.target.code + ']'
  const source = corpus.readFile(paths.source)
  const counterpart = corpus.readFile(paths.counterpart)
  const record = corpus.readFile(paths.record)
  const missing = [
    source === undefined ? paths.source : undefined,
    counterpart === undefined ? paths.counterpart : undefined,
    record === undefined ? paths.record : undefined,
  ].filter((value): value is string => value !== undefined)
  if (missing.length > 0) {
    errors.push(label + ': incomplete pair - missing ' + missing.join(', '))
    return state('missing')
  }
  const sourceText = source as string
  const counterpartText = counterpart as string
  const recordText = record as string
  const parsed = parseTranslationPairingRecord(recordText)
  if (parsed === undefined) {
    errors.push(paths.record + ': malformed consistency record')
    return state('out-of-sync')
  }
  const sourceRegions = regionsOf(sourceText)
  const counterpartRegions = regionsOf(counterpartText)
  if (sourceRegions.error !== undefined) errors.push(paths.source + ': ' + sourceRegions.error)
  if (counterpartRegions.error !== undefined) errors.push(paths.counterpart + ': ' + counterpartRegions.error)
  const sourceContext = corpus.linkContext(paths, 'source')
  const counterpartContext = corpus.linkContext(paths, 'counterpart')
  let sourceMasked = sourceText
  let counterpartMasked = counterpartText
  try {
    sourceMasked = maskGeneratedRegions(sourceText)
    counterpartMasked = maskGeneratedRegions(counterpartText)
  } catch (error) {
    errors.push(
      paths.source + ' <-> ' + paths.counterpart + ': ' + (error instanceof Error ? error.message : String(error)),
    )
  }
  const sourceTree = parseMarkdown(sourceMasked)
  const counterpartTree = parseMarkdown(counterpartMasked)
  if (sourceRegions.error === undefined && counterpartRegions.error === undefined) {
    const mismatch = regionMismatch(
      sourceRegions.regions,
      counterpartRegions.regions,
      (text) => normalizeTranslationMarkdownLinkEdits(text, sourceContext).content,
    )
    if (mismatch !== undefined) {
      errors.push(regionMismatchMessage(mismatch, paths.source + ' <-> ' + paths.counterpart))
    } else {
      const drift = regionAnchorDrift(sourceRegions.regions, sourceTree, counterpartRegions.regions, counterpartTree)
      if (drift !== undefined) errors.push(regionAnchorMessage(paths, drift.slug))
    }
  }
  const switchers = locateSwitchers(
    corpus,
    paths,
    sourceMasked,
    sourceTree,
    counterpartMasked,
    counterpartTree,
    parsed.sourceCode,
    undefined,
  )
  errors.push(...switchers.errors)
  let current: ReturnType<typeof computeTranslationPairingRecord>
  try {
    current = computeTranslationPairingRecord(
      paths,
      sourceMasked,
      counterpartMasked,
      corpus.recordContext(paths.target),
    )
  } catch (error) {
    errors.push(label + ' <-> ' + paths.counterpart + ': ' + (error instanceof Error ? error.message : String(error)))
    return state('out-of-sync')
  }
  for (const message of translationPairingRecordDiff(parsed, current, parsed.sourceCode, paths.target.code)) {
    errors.push(
      paths.record + ': out of sync - ' + message + ' (bring the other side along, then re-record with the write verb)',
    )
  }
  const ordered = new Map()
  for (const key of current.keys()) {
    const targets = parsed.entries.get(key)
    if (targets !== undefined) ordered.set(key, targets)
  }
  const expected = renderTranslationPairingRecord(paths.source, { sourceCode: parsed.sourceCode, entries: ordered })
  if (recordBody(recordText) !== recordBody(expected)) {
    errors.push(paths.record + ': not in canonical form (re-record with the write verb)')
  }
  for (const violation of [
    ...translationLinkLocaleViolations(sourceMasked, sourceContext, sourceTree, switchers.sourceOffsets),
    ...translationLinkLocaleViolations(
      counterpartMasked,
      counterpartContext,
      counterpartTree,
      switchers.counterpartOffsets,
    ),
  ]) {
    errors.push(
      violation.sourcePath +
        ':' +
        String(violation.line) +
        ': link target ' +
        JSON.stringify(violation.url) +
        ' uses the wrong locale; expected ' +
        JSON.stringify(violation.expectedUrl),
    )
  }
  for (const divergence of translationStructureDiff(
    translationStructureSignature(sourceTree, sourceContext, sourceMasked, switchers.sourceOffsets),
    translationStructureSignature(counterpartTree, counterpartContext, counterpartMasked, switchers.counterpartOffsets),
  )) {
    errors.push(label + ' <-> ' + paths.counterpart + ': ' + divergence)
  }
  return errors.length > 0 ? state('out-of-sync') : state('ok')
}

/**
 * Pair discovery, structural signatures, switch-line location, region comparison, selection
 * filtering and the existing-pair check for v2.
 *
 * The gate only checks pairs that already exist. Creation and update are declaration- or
 * instruction-driven; this module never requires a source to be paired.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, matchesGlob, resolve } from 'node:path'
import type { Nodes } from 'mdast'
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
import {
  counterpartSuffix,
  languageFromCounterpartFilename,
  pairPaths,
  type Language,
  type PairPaths,
} from './targets.ts'

const PRUNE_SEGMENTS = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  'target',
  'coverage',
  '__pycache__',
  '.venv',
  '.cache',
  '.pnpm-store',
  '.git',
])
const PRUNE_TREES = ['.agents/skills', '.agents/dsh-spec-translate-docs']

/** Inputs that decide discovery and the declared target set. */
export interface CorpusOptions {
  /** Project root, absolute. */
  root: string
  /** Declared targets. */
  targets: Language[]
  /** Generator-owned source globs. */
  generated?: readonly string[]
  /** Content plane for existence checks; defaults to the working tree. */
  repositoryFileExists?: (repoPath: string) => boolean
  /** Content reader used to read aggregate records; defaults to the file system. */
  repositoryReadFile?: (repoPath: string) => string | undefined
  /** Selection globs repeated by briefing commands. */
  select?: readonly string[]
  /** Skip globs repeated by briefing commands. */
  skip?: readonly string[]
  /** Terminology path overrides repeated by briefing commands. */
  terminology?: { code: string; path: string }[]
}

/** The pair corpus. */
export interface PairCorpus {
  root: string
  declared: Language[]
  recognized: Language[]
  fileExists: (path: string) => boolean
  readFile: (path: string) => string | undefined
  isPaired: (path: string) => boolean
  isGeneratedSource(path: string): boolean
  generated: string[]
  select: string[]
  skip: string[]
  terminology: { code: string; path: string }[]
}

function globMatch(path: string, pattern: string): boolean {
  return matchesGlob(path, pattern)
}

function prunedDirectory(relative: string): boolean {
  const segments = relative.split('/')
  if (segments.some((segment) => PRUNE_SEGMENTS.has(segment))) return true
  return PRUNE_TREES.some((tree) => relative === tree || relative.endsWith('/' + tree))
}

function walkRepository(root: string): string[] {
  const out: string[] = []
  const descend = (relative: string): void => {
    const absolute = relative === '' ? root : resolve(root, relative)
    let entries
    try {
      entries = readdirSync(absolute, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const next = relative === '' ? entry.name : relative + '/' + entry.name
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        if (prunedDirectory(next)) continue
        descend(next)
        continue
      }
      if (!entry.isFile()) continue
      if (entry.name.endsWith('.md') || entry.name.endsWith('.i18n.yaml')) out.push(next)
    }
  }
  descend('')
  return out
}

function statFileSync(root: string, repoPath: string): boolean {
  try {
    return statSync(resolve(root, repoPath)).isFile()
  } catch {
    return false
  }
}

/**
 * Build the corpus from the declared targets and the records that exist.
 * @param options - root, declared targets, generated globs and content plane.
 * @returns the corpus.
 */
export function buildCorpus(options: CorpusOptions): PairCorpus {
  const fileExists = (repoPath: string): boolean =>
    options.repositoryFileExists !== undefined
      ? options.repositoryFileExists(repoPath)
      : statFileSync(options.root, repoPath)
  const readFile = (repoPath: string): string | undefined =>
    options.repositoryReadFile !== undefined
      ? options.repositoryReadFile(repoPath)
      : (() => {
          try {
            return readFileSync(resolve(options.root, repoPath), 'utf8')
          } catch {
            return undefined
          }
        })()
  const found = new Map(options.targets.map((target) => [target.code, target]))
  for (const file of walkRepository(options.root)) {
    const counterpart = languageFromCounterpartFilename(file)
    if (counterpart !== undefined && !found.has(counterpart.code)) found.set(counterpart.code, counterpart)
    if (!file.endsWith('.i18n.yaml')) continue
    const text = readFile(file)
    if (text === undefined) continue
    const record = parseTranslationPairingRecord(text)
    if (record === undefined) continue
    for (const values of record.entries.values()) {
      for (const code of values.keys()) {
        if (code === record.sourceCode || found.has(code)) continue
        found.set(code, { code, name: code })
      }
    }
  }
  const recognized = [...found.values()].sort((left, right) => left.code.localeCompare(right.code))
  const hasPairArtifacts = (sourcePath: string): boolean =>
    recognized.some((target) => {
      const paths = pairPaths(sourcePath, target)
      return fileExists(paths.counterpart) || fileExists(paths.record)
    })
  const generated = [...(options.generated ?? [])]
  return {
    root: options.root,
    declared: [...options.targets],
    recognized,
    fileExists,
    readFile,
    isPaired: (path: string): boolean => {
      const named = languageFromCounterpartFilename(path)
      if (named !== undefined) return hasPairArtifacts(path.slice(0, -counterpartSuffix(named).length) + '.md')
      if (!path.endsWith('.md')) return false
      return hasPairArtifacts(path)
    },
    isGeneratedSource: (path: string) => generated.some((pattern) => globMatch(path, pattern)),
    generated,
    select: [...(options.select ?? [])],
    skip: [...(options.skip ?? [])],
    terminology: [...(options.terminology ?? [])],
  }
}

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

/** Inputs for one pair check. */
export interface PairCheckOptions {
  root: string
  corpus: PairCorpus
  paths: PairPaths
  readFile: (path: string) => string | undefined
}

function plainText(node: Nodes): string {
  if ('value' in node && (node.type === 'text' || node.type === 'inlineCode')) return node.value
  return 'children' in node ? node.children.map(plainText).join('') : ''
}

interface ParagraphPart {
  kind: 'text' | 'link'
  text: string
  url?: string
}

function paragraphParts(paragraph: Extract<Nodes, { type: 'paragraph' }>): ParagraphPart[] | undefined {
  const parts: ParagraphPart[] = []
  for (const child of paragraph.children) {
    if (child.type === 'text') parts.push({ kind: 'text', text: child.value })
    else if (child.type === 'link') parts.push({ kind: 'link', text: plainText(child), url: child.url })
    else return undefined
  }
  return parts
}

function acceptedDestination(url: string, expected: string): boolean {
  if (url === basename(expected)) return true
  if (/^https?:\/\//.test(url)) {
    try {
      return new URL(url).pathname.endsWith('/' + expected)
    } catch {
      return false
    }
  }
  return false
}

function switcherParagraphs(tree: Nodes, markdown: string): Extract<Nodes, { type: 'paragraph' }>[] {
  const frontmatter = /^---\n[\s\S]*?\n---(?:\n|$)/.exec(markdown)
  const offset = frontmatter?.[0].length ?? 0
  if (tree.type !== 'root') return []
  const start = tree.children.findIndex(
    (node) => node.type === 'heading' && node.depth === 1 && (node.position?.start.offset ?? 0) >= offset,
  )
  if (start < 0) return []
  const paragraphs: Extract<Nodes, { type: 'paragraph' }>[] = []
  for (const node of tree.children.slice(start + 1)) {
    if (node.type === 'heading') break
    if (node.type === 'paragraph') paragraphs.push(node)
  }
  return paragraphs
}

interface ParagraphShape {
  skeleton: string
  links: ParagraphPart[]
}

const LINK_PLACEHOLDER = '\u0000'

function paragraphShape(paragraph: Extract<Nodes, { type: 'paragraph' }>): ParagraphShape | undefined {
  const parts = paragraphParts(paragraph)
  if (parts === undefined) return undefined
  let skeleton = ''
  const links: ParagraphPart[] = []
  for (const part of parts) {
    if (part.kind === 'link') {
      skeleton += LINK_PLACEHOLDER
      links.push(part)
    } else {
      skeleton += part.text
    }
  }
  return { skeleton, links }
}

function linkOffsets(paragraph: Extract<Nodes, { type: 'paragraph' }>): Set<number> {
  const offsets = new Set<number>()
  for (const child of paragraph.children) {
    if (child.type === 'link' && child.position?.start.offset !== undefined) offsets.add(child.position.start.offset)
  }
  return offsets
}

interface CounterpartSwitcher {
  sourceLabel: string
  targetLabel: string
  paragraph: Extract<Nodes, { type: 'paragraph' }>
}

function counterpartSwitcher(tree: Nodes, markdown: string, sourcePath: string): CounterpartSwitcher | undefined {
  for (const paragraph of switcherParagraphs(tree, markdown)) {
    const shape = paragraphShape(paragraph)
    if (shape === undefined || shape.links.length !== 1) continue
    const link = shape.links[0] as ParagraphPart
    if (!acceptedDestination(link.url ?? '', sourcePath)) continue
    if (!shape.skeleton.startsWith(LINK_PLACEHOLDER + ' | ')) continue
    const trailing = shape.skeleton.slice((LINK_PLACEHOLDER + ' | ').length).trim()
    if (trailing === '') continue
    return { sourceLabel: link.text, targetLabel: trailing, paragraph }
  }
  return undefined
}

/**
 * Derive the pair's source and target display names from the counterpart switcher.
 * @param paths - the pair.
 * @param corpus - the corpus.
 * @param readFile - repository reader.
 * @param sourceCode - the source language code recorded for the pair.
 * @returns source and target languages; names fall back to declared names or codes.
 */
export function pairLanguages(
  paths: PairPaths,
  corpus: PairCorpus,
  readFile: (path: string) => string | undefined,
  sourceCode: string,
): { source: Language; target: Language } {
  const text = readFile(paths.counterpart)
  const tree = text === undefined ? undefined : parseMarkdown(text)
  const info = text !== undefined && tree !== undefined ? counterpartSwitcher(tree, text, paths.source) : undefined
  const declaredTarget = corpus.declared.find((target) => target.code === paths.target.code)
  return {
    source: { code: sourceCode, name: info?.sourceLabel ?? sourceCode },
    target: { code: paths.target.code, name: declaredTarget?.name ?? info?.targetLabel ?? paths.target.code },
  }
}

interface MatchedSwitcher {
  sourceOffsets: Set<number>
  counterpartOffsets: Set<number>
  errors: string[]
  sourceLabel: string
  targetLabel: string
}

function locateSwitchers(
  options: PairCheckOptions,
  sourceText: string,
  counterpartText: string,
  sourceCode: string,
  sourceName: string | undefined,
): MatchedSwitcher {
  const { corpus, paths, readFile } = options
  const errors: string[] = []
  const sourceTree = parseMarkdown(sourceText)
  const counterpartTree = parseMarkdown(counterpartText)
  const sourceParagraphs = switcherParagraphs(sourceTree, sourceText)
  const counterpartParagraphs = switcherParagraphs(counterpartTree, counterpartText)
  const generatedSource = corpus.isGeneratedSource(paths.source)
  const selected = counterpartSwitcher(counterpartTree, counterpartText, paths.source)
  const declaredTarget = corpus.declared.find((target) => target.code === paths.target.code)
  const targetLabel = declaredTarget?.name ?? selected?.targetLabel ?? paths.target.code
  const sourceLabel = selected?.sourceLabel ?? sourceName ?? sourceCode
  let matchedCounterpart: Extract<Nodes, { type: 'paragraph' }> | undefined
  const counterpartSkeleton = LINK_PLACEHOLDER + ' | ' + targetLabel
  for (const paragraph of counterpartParagraphs) {
    const shape = paragraphShape(paragraph)
    if (shape === undefined || shape.skeleton !== counterpartSkeleton || shape.links.length !== 1) continue
    const first = shape.links[0] as ParagraphPart
    if (first.text !== sourceLabel || !acceptedDestination(first.url ?? '', paths.source)) continue
    if (matchedCounterpart !== undefined) {
      errors.push(
        paths.counterpart +
          ': more than one canonical language switcher paragraph (lines ' +
          String(matchedCounterpart.position?.start.line ?? 0) +
          ' and ' +
          String(paragraph.position?.start.line ?? 0) +
          ')',
      )
      break
    }
    matchedCounterpart = paragraph
  }
  if (generatedSource) {
    if (matchedCounterpart === undefined) {
      errors.push(
        paths.counterpart +
          ': missing or non-canonical language switcher; expected ' +
          JSON.stringify('[' + sourceLabel + '](' + basename(paths.source) + ') | ' + targetLabel),
      )
    }
    return {
      sourceOffsets: new Set(),
      counterpartOffsets: matchedCounterpart === undefined ? new Set() : linkOffsets(matchedCounterpart),
      errors,
      sourceLabel,
      targetLabel,
    }
  }
  const counterparts: string[] = []
  const labels: string[] = []
  const sourceLabels = new Set<string>()
  for (const target of corpus.recognized) {
    const pair = pairPaths(paths.source, target)
    if (!corpus.fileExists(pair.counterpart)) continue
    const text = readFile(pair.counterpart)
    const tree = text === undefined ? undefined : parseMarkdown(text)
    const info = text !== undefined && tree !== undefined ? counterpartSwitcher(tree, text, paths.source) : undefined
    if (info !== undefined) sourceLabels.add(info.sourceLabel)
    const name =
      target.code === paths.target.code
        ? targetLabel
        : (corpus.declared.find((declared) => declared.code === target.code)?.name ?? info?.targetLabel ?? target.code)
    counterparts.push(pair.counterpart)
    labels.push(name)
  }
  if (sourceLabels.size > 1) {
    errors.push(
      paths.source + ': counterpart switchers disagree on the source label: ' + JSON.stringify([...sourceLabels]),
    )
  }
  const expectedSource = [
    sourceLabel,
    ...labels.map((label, index) => '[' + label + '](' + basename(counterparts[index] as string) + ')'),
  ].join(' | ')
  const expectedSkeleton = [sourceLabel, ...labels.map(() => LINK_PLACEHOLDER)].join(' | ')
  let matchedSource: Extract<Nodes, { type: 'paragraph' }> | undefined
  for (const paragraph of sourceParagraphs) {
    const shape = paragraphShape(paragraph)
    if (shape === undefined || shape.skeleton !== expectedSkeleton || shape.links.length !== labels.length) continue
    let valid = true
    for (const [index, link] of shape.links.entries()) {
      if (link.text !== labels[index] || !acceptedDestination(link.url ?? '', counterparts[index] as string))
        valid = false
    }
    if (!valid) continue
    if (matchedSource !== undefined) {
      errors.push(
        paths.source +
          ': more than one canonical language switcher paragraph (lines ' +
          String(matchedSource.position?.start.line ?? 0) +
          ' and ' +
          String(paragraph.position?.start.line ?? 0) +
          ')',
      )
      break
    }
    matchedSource = paragraph
  }
  if (matchedSource === undefined) {
    errors.push(
      paths.source + ': missing or non-canonical language switcher; expected ' + JSON.stringify(expectedSource),
    )
  }
  if (matchedCounterpart === undefined) {
    errors.push(
      paths.counterpart +
        ': missing or non-canonical language switcher; expected ' +
        JSON.stringify('[' + sourceLabel + '](' + basename(paths.source) + ') | ' + targetLabel),
    )
  }
  return {
    sourceOffsets: matchedSource === undefined ? new Set() : linkOffsets(matchedSource),
    counterpartOffsets: matchedCounterpart === undefined ? new Set() : linkOffsets(matchedCounterpart),
    errors,
    sourceLabel,
    targetLabel,
  }
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

/**
 * Report a current generated-region disagreement between the two sides of one pair.
 * @param corpus - the corpus.
 * @param root - project root.
 * @param paths - the pair.
 * @param readFile - repository file reader.
 * @returns a precondition message, or undefined when the regions agree.
 */
export function regionDrift(
  corpus: PairCorpus,
  root: string,
  paths: PairPaths,
  readFile: (path: string) => string | undefined,
): string | undefined {
  const source = readFile(paths.source)
  const counterpart = readFile(paths.counterpart)
  if (source === undefined || counterpart === undefined) return undefined
  const sourceRegions = regionsOf(source)
  const counterpartRegions = regionsOf(counterpart)
  if (sourceRegions.error !== undefined) return paths.source + ': ' + sourceRegions.error
  if (counterpartRegions.error !== undefined) return paths.counterpart + ': ' + counterpartRegions.error
  const sourceContext: TranslationLinkContext = {
    repoRoot: root,
    sourcePath: paths.source,
    side: { role: 'source', target: paths.target },
    isPairSource: (path) => corpus.isPaired(path),
    repositoryFileExists: (path) => readFile(path) !== undefined,
  }
  const mismatch = regionMismatch(
    sourceRegions.regions,
    counterpartRegions.regions,
    (text) => normalizeTranslationMarkdownLinkEdits(text, sourceContext).content,
  )
  if (mismatch !== undefined) {
    return (
      paths.source +
      ' [' +
      paths.target.code +
      ']: generated region ' +
      JSON.stringify(mismatch.slug) +
      ' ' +
      mismatch.reason +
      '; regenerate both sides'
    )
  }
  const sourceAnchors = regionAnchors(source)
  const counterpartAnchors = regionAnchors(counterpart)
  if (sourceAnchors.error !== undefined) return paths.source + ': ' + sourceAnchors.error
  if (counterpartAnchors.error !== undefined) return paths.counterpart + ': ' + counterpartAnchors.error
  for (const [index, anchor] of sourceAnchors.anchors.entries()) {
    const other = counterpartAnchors.anchors[index]
    if (other === undefined || other.slug !== anchor.slug || other.anchor !== anchor.anchor) {
      return (
        paths.source +
        ' <-> ' +
        paths.counterpart +
        ': generated region ' +
        JSON.stringify(anchor.slug) +
        ' sits under a different authored section; regenerate both sides'
      )
    }
  }
  return undefined
}

interface RegionAnchors {
  anchors: { slug: string; anchor: number }[]
  error?: string
}

function regionAnchors(text: string): RegionAnchors {
  try {
    const regions = generatedRegions(text)
    const masked = maskGeneratedRegions(text)
    const tree = parseMarkdown(masked)
    const headings = tree.children
      .filter((node) => node.type === 'heading')
      .map((node) => node.position?.start.line ?? 0)
    return {
      anchors: regions.map((region) => ({
        slug: region.slug,
        anchor: headings.filter((line) => line < region.begin + 1).length,
      })),
    }
  } catch (error) {
    return { anchors: [], error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Check one existing pair: completeness, regions, record, switchers, structure and link locale.
 * @param options - corpus, pair and reader.
 * @returns the pair's state and every violation.
 */
export function checkPair(options: PairCheckOptions): PairCheck {
  const { paths, corpus, readFile } = options
  const errors: string[] = []
  const state = (next: 'ok' | 'out-of-sync' | 'missing'): PairCheck => ({ paths, state: next, errors })
  const label = paths.source + ' [' + paths.target.code + ']'
  const source = readFile(paths.source)
  const counterpart = readFile(paths.counterpart)
  const record = readFile(paths.record)
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
  const sourceContext: TranslationLinkContext = {
    repoRoot: options.root,
    sourcePath: paths.source,
    side: { role: 'source', target: paths.target },
    isPairSource: (path) => corpus.isPaired(path),
    repositoryFileExists: (path) => readFile(path) !== undefined,
  }
  const counterpartContext: TranslationLinkContext = {
    repoRoot: options.root,
    sourcePath: paths.counterpart,
    side: { role: 'counterpart', target: paths.target },
    isPairSource: (path) => corpus.isPaired(path),
    repositoryFileExists: (path) => readFile(path) !== undefined,
  }
  if (sourceRegions.error === undefined && counterpartRegions.error === undefined) {
    const mismatch = regionMismatch(
      sourceRegions.regions,
      counterpartRegions.regions,
      (text) => normalizeTranslationMarkdownLinkEdits(text, sourceContext).content,
    )
    if (mismatch !== undefined) {
      errors.push(
        paths.source +
          ' <-> ' +
          paths.counterpart +
          ': generated region ' +
          JSON.stringify(mismatch.slug) +
          ' ' +
          mismatch.reason +
          '; regenerate both sides',
      )
    }
    const anchors = regionDrift(corpus, options.root, paths, readFile)
    if (anchors !== undefined && /different authored section/.test(anchors)) errors.push(anchors)
  }
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
  const switchers = locateSwitchers(options, sourceMasked, counterpartMasked, parsed.sourceCode, undefined)
  errors.push(...switchers.errors)
  let current: ReturnType<typeof computeTranslationPairingRecord>
  try {
    current = computeTranslationPairingRecord(paths, sourceMasked, counterpartMasked, {
      base: {
        repoRoot: options.root,
        isPairSource: (path) => corpus.isPaired(path),
        repositoryFileExists: (path) => readFile(path) !== undefined,
      },
      target: paths.target,
    })
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

/** One considered pair: its paths and which artifacts exist. */
export interface DiscoveredPair {
  paths: PairPaths
  present: { source: boolean; counterpart: boolean; record: boolean }
}

/**
 * Discover existing pair artifacts: counterpart files and aggregate record entries.
 * @param options - root and corpus.
 * @returns discovered pairs, sorted by source then target.
 */
export function discoverPairs(options: { root: string; corpus: PairCorpus }): DiscoveredPair[] {
  const { corpus } = options
  const seen = new Map<string, DiscoveredPair>()
  const add = (paths: PairPaths): void => {
    const key = paths.source + ' zero ' + paths.target.code
    if (seen.has(key)) return
    seen.set(key, {
      paths,
      present: {
        source: corpus.fileExists(paths.source),
        counterpart: corpus.fileExists(paths.counterpart),
        record: corpus.fileExists(paths.record),
      },
    })
  }
  for (const file of walkRepository(options.root)) {
    const named = languageFromCounterpartFilename(file)
    if (named !== undefined) {
      add(pairPaths(file.slice(0, -counterpartSuffix(named).length) + '.md', named))
      continue
    }
    if (!file.endsWith('.i18n.yaml')) continue
    const text = corpus.readFile(file)
    if (text === undefined) continue
    const parsed = parseTranslationPairingRecord(text)
    if (parsed === undefined) continue
    const source = file.replace(/\.i18n\.yaml$/, '.md')
    const codes = new Set<string>()
    for (const values of parsed.entries.values()) for (const code of values.keys()) codes.add(code)
    for (const code of codes) {
      if (code === parsed.sourceCode) continue
      const target = corpus.recognized.find((candidate) => candidate.code === code) ?? { code, name: code }
      add(pairPaths(source, target))
    }
  }
  return [...seen.values()].sort(
    (left, right) =>
      left.paths.source.localeCompare(right.paths.source) ||
      left.paths.target.code.localeCompare(right.paths.target.code),
  )
}

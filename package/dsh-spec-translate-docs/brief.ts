/**
 * SPDX-License-Identifier: MIT
 *
 * Extracted from the DeepSeek Harness bilingual-document mechanism at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
/**
 * Minimal-update briefing, mechanical fence splice and first-occurrence guidance. Adapted from
 * the upstream briefing planner: the direction names, target language and rules digest are the
 * shipped contract's, the Markdown unit and section mapping keeps the upstream mechanics, and
 * the pipeline-specific Chinese/English digests become one language-neutral digest that delegates
 * target formatting to the project's own rules.
 */

import type { Nodes } from 'mdast'
import { parseMarkdown } from './markdown.ts'
import { DEFAULT_SOURCE_LANGUAGE, type Language } from './targets.ts'

/** One block-level span of a Markdown document, in document order. */
export interface MarkdownSpan {
  /** Position in the span list; briefing ids derive from it. */
  index: number
  /** Structural kind compared for alignment, language-neutral. */
  kind: string
  /** Reader-facing label: heading text for sections, node type for units. */
  label: string
  /** 1-based first source line. */
  startLine: number
  /** 1-based last source line. */
  endLine: number
  /** The span's text, trailing newline normalized to exactly one. */
  text: string
}

function linesOf(markdown: string): string[] {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

function sliceLines(lines: string[], startLine: number, endLine: number): string {
  return lines.slice(startLine - 1, endLine).join('\n') + '\n'
}

/**
 * List a document's translation units: the outermost block nodes a minimal update can replace
 * independently.
 * @param markdown - document text.
 * @returns units in document order.
 */
export function markdownUnits(markdown: string): MarkdownSpan[] {
  const positions: { kind: string; label: string; startLine: number; endLine: number }[] = []
  const visit = (node: Nodes, path: string): void => {
    let kind: string | undefined
    switch (node.type) {
      case 'heading':
        kind = path + ':heading:' + String(node.depth)
        break
      case 'paragraph':
      case 'code':
      case 'tableRow':
      case 'listItem':
      case 'blockquote':
      case 'html':
      case 'thematicBreak':
      case 'definition':
        kind = path + ':' + node.type
        break
      default:
        break
    }
    if (kind !== undefined && node.position !== undefined) {
      positions.push({ kind, label: node.type, startLine: node.position.start.line, endLine: node.position.end.line })
      return
    }
    if ('children' in node)
      for (const [index, child] of node.children.entries()) visit(child, path + '.' + String(index))
  }
  visit(parseMarkdown(markdown), 'root')
  positions.sort((left, right) => left.startLine - right.startLine)
  const lines = linesOf(markdown)
  return positions.map((position, index) => ({
    index,
    ...position,
    text: sliceLines(lines, position.startLine, position.endLine),
  }))
}

/**
 * List a document's heading-delimited sections, including a leading preamble span when content
 * precedes the first heading.
 * @param markdown - document text.
 * @returns sections in document order.
 */
export function sectionSpans(markdown: string): MarkdownSpan[] {
  const headings: { depth: number; line: number; label: string }[] = []
  const visit = (node: Nodes): void => {
    if (node.type === 'heading' && node.position !== undefined) {
      let label = ''
      const collect = (child: Nodes): void => {
        if ('value' in child && typeof child.value === 'string') label += child.value
        if ('children' in child) for (const grandchild of child.children) collect(grandchild)
      }
      for (const child of node.children) collect(child)
      headings.push({ depth: node.depth, line: node.position.start.line, label })
    }
    if ('children' in node) for (const child of node.children) visit(child)
  }
  visit(parseMarkdown(markdown))
  headings.sort((left, right) => left.line - right.line)
  const lines = linesOf(markdown)
  const spans: MarkdownSpan[] = []
  const firstHeadingLine = headings[0]?.line ?? lines.length + 1
  if (firstHeadingLine > 1) {
    spans.push({
      index: 0,
      kind: 'preamble',
      label: '(preamble before the first heading)',
      startLine: 1,
      endLine: firstHeadingLine - 1,
      text: sliceLines(lines, 1, firstHeadingLine - 1),
    })
  }
  for (const [order, heading] of headings.entries()) {
    const endLine = (headings[order + 1]?.line ?? lines.length + 1) - 1
    spans.push({
      index: spans.length,
      kind: 'section:' + String(heading.depth),
      label: heading.label === '' ? '(untitled section)' : heading.label,
      startLine: heading.line,
      endLine,
      text: sliceLines(lines, heading.line, endLine),
    })
  }
  return spans
}

/**
 * Whether two span lists map one to one: same non-zero length and the same kind at every position.
 * @param left - one document's spans.
 * @param right - the other document's spans.
 * @returns true when index-wise mapping is sound.
 */
export function spansAligned(left: MarkdownSpan[], right: MarkdownSpan[]): boolean {
  return (
    left.length > 0 && left.length === right.length && left.every((span, index) => span.kind === right[index]?.kind)
  )
}

/**
 * Indices whose text differs between two aligned span lists.
 * @param before - spans of the earlier state.
 * @param after - spans of the later state, aligned with before.
 * @returns ascending changed indices.
 */
export function changedSpanIndices(before: MarkdownSpan[], after: MarkdownSpan[]): number[] {
  return before.filter((span, index) => span.text !== after[index]?.text).map((span) => span.index)
}

function codeSpansOf(markdown: string): MarkdownSpan[] {
  return markdownUnits(markdown)
    .filter((span) => span.kind.endsWith(':code'))
    .map((span, index) => ({ ...span, index }))
}

function replaceSpanTexts(markdown: string, spans: MarkdownSpan[], replacements: Map<number, string>): string {
  const lines = linesOf(markdown)
  for (const [index, replacement] of [...replacements.entries()].sort((left, right) => right[0] - left[0])) {
    const span = spans[index]
    if (span === undefined) throw new Error('translation brief: unknown replacement span ' + String(index))
    lines.splice(span.startLine - 1, span.endLine - span.startLine + 1, ...linesOf(replacement))
  }
  return lines.join('\n') + '\n'
}

function maskCodeSpans(markdown: string, spans: MarkdownSpan[]): string {
  return replaceSpanTexts(
    markdown,
    spans,
    new Map(spans.map((span) => [span.index, 'TRANSLATE_CODE_' + String(span.index) + '\n'])),
  )
}

/**
 * Compute the counterpart update for a change confined to fenced code blocks.
 * @param confirmedSource - the changed side's last-confirmed text.
 * @param currentSource - the changed side's current text.
 * @param counterpart - the other side's current text.
 * @returns the updated counterpart, or undefined when the change is not code-only.
 */
export function computeMechanicalUpdate(
  confirmedSource: string,
  currentSource: string,
  counterpart: string,
): string | undefined {
  const confirmed = codeSpansOf(confirmedSource)
  const current = codeSpansOf(currentSource)
  const target = codeSpansOf(counterpart)
  if (confirmed.length === 0 || confirmed.length !== current.length || confirmed.length !== target.length)
    return undefined
  if (maskCodeSpans(confirmedSource, confirmed) !== maskCodeSpans(currentSource, current)) return undefined
  if (confirmed.some((span, index) => span.text !== target[index]?.text)) return undefined
  const changed = current.filter((span, index) => span.text !== confirmed[index]?.text)
  if (changed.length === 0) return undefined
  return replaceSpanTexts(counterpart, target, new Map(changed.map((span) => [span.index, span.text])))
}

/** One parsed terminology-table data row. */
export interface TerminologyRow {
  /** The source-language term (column 1). */
  source: string
  /** The target rendering (column 2). */
  target: string
  /** The first-occurrence form (column 3), possibly empty. */
  first: string
  /** The verbatim table row. */
  line: string
}

/** Strip Markdown emphasis and code markers from a terminology cell. */
function plainTerm(cell: string): string {
  return cell.replaceAll('`', '').replaceAll('**', '').trim()
}

/**
 * Parse the data rows of a terminology table by column position.
 * @param terminology - full terminology-file contents.
 * @param sourceLanguage - the source language, whose name marks the header row.
 * @returns rows in table order.
 */
function parseTerminologyRows(
  terminology: string,
  sourceLanguage: Language = DEFAULT_SOURCE_LANGUAGE,
): TerminologyRow[] {
  const rows: TerminologyRow[] = []
  for (const line of terminology.split('\n')) {
    if (!line.startsWith('|')) continue
    if (/^\|[\s:|-]+\|$/.test(line)) continue
    const cells = line.split('|').map((cell) => cell.trim())
    const source = plainTerm(cells[1] ?? '')
    if (source === '' || source === sourceLanguage.name) continue
    rows.push({ source, target: plainTerm(cells[2] ?? ''), first: plainTerm(cells[3] ?? ''), line })
  }
  return rows
}

/**
 * Character offsets of a term's occurrences. ASCII word-like terms match on word boundaries and
 * optionally accept English plural inflections; other terms match as case-insensitive substrings.
 * @param text - text to search.
 * @param term - the term to find.
 * @param inflections - whether to accept English plural forms.
 * @returns ascending match offsets.
 */
export function termOffsets(text: string, term: string, inflections = false): number[] {
  if (term === '') return []
  const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wordLike = /^[A-Za-z0-9][A-Za-z0-9 ._-]*[A-Za-z0-9]$/.test(term)
  const inflected =
    inflections && wordLike
      ? /[^aeiou]y$/i.test(term)
        ? escape(term.slice(0, -1)) + '(?:y|ies)'
        : escape(term) + '(?:s|es)?'
      : escape(term)
  const expression = new RegExp(wordLike ? '(?<![A-Za-z0-9_])' + inflected + '(?![A-Za-z0-9_])' : inflected, 'gi')
  return [...text.matchAll(expression)].map((match) => match.index)
}

/** The update directions a pair supports. */
export type BriefDirection = 'source-to-target' | 'target-to-source'

/** Whether a row's source-language term occurs in the given text. */
function rowOccurs(row: TerminologyRow, direction: BriefDirection, text: string): boolean {
  const terms = direction === 'source-to-target' ? [row.source] : [row.target, row.first].filter((term) => term !== '')
  return terms.some((term) => termOffsets(text, term, direction === 'source-to-target').length > 0)
}

/**
 * Select the terminology rows whose source-language term occurs in the changed text.
 * @param terminology - full terminology-file contents.
 * @param direction - update direction; decides which columns to match.
 * @param changedText - concatenated old and new text of the changed spans.
 * @param sourceLanguage - the source language, whose name marks the header row.
 * @returns matched rows in table order.
 */
export function relevantTerminologyRows(
  terminology: string,
  direction: BriefDirection,
  changedText: string,
  sourceLanguage: Language = DEFAULT_SOURCE_LANGUAGE,
): TerminologyRow[] {
  return parseTerminologyRows(terminology, sourceLanguage).filter((row) => rowOccurs(row, direction, changedText))
}

function lineAtOffset(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length
}

function spanIndexAtOffset(text: string, spans: MarkdownSpan[], offset: number | undefined): number | undefined {
  if (offset === undefined) return undefined
  const line = lineAtOffset(text, offset)
  return spans.find((span) => line >= span.startLine && line <= span.endLine)?.index
}

/** First-occurrence guidance computed for a source-to-target update. */
export interface FirstOccurrenceContext {
  /** Human-readable notes for the briefing. */
  notes: string[]
  /** Unchanged span indices that must join the briefing because a first occurrence moved. */
  extraSpanIndices: number[]
}

/**
 * Track document-wide first occurrences of the relevant source terms.
 * @param confirmedSource - last-confirmed source text.
 * @param currentSource - current source text.
 * @param confirmedSpans - spans of the last-confirmed source.
 * @param currentSpans - spans of the current source, aligned with confirmedSpans.
 * @param rows - the relevant terminology rows.
 * @param changed - span indices already in the briefing.
 * @returns notes and extra span indices to include.
 */
export function firstOccurrenceContext(
  confirmedSource: string,
  currentSource: string,
  confirmedSpans: MarkdownSpan[],
  currentSpans: MarkdownSpan[],
  rows: TerminologyRow[],
  changed: Set<number>,
): FirstOccurrenceContext {
  const notes: string[] = []
  const extra = new Set<number>()
  for (const row of rows) {
    if (row.first === '') continue
    const oldIndex = spanIndexAtOffset(
      confirmedSource,
      confirmedSpans,
      termOffsets(confirmedSource, row.source, true)[0],
    )
    const newIndex = spanIndexAtOffset(currentSource, currentSpans, termOffsets(currentSource, row.source, true)[0])
    if (oldIndex === newIndex) continue
    for (const index of [oldIndex, newIndex]) {
      if (index !== undefined && !changed.has(index)) extra.add(index)
    }
    notes.push(
      row.source +
        ': the document-wide first occurrence moved from ' +
        (oldIndex === undefined ? 'absent' : '#' + String(oldIndex)) +
        ' to ' +
        (newIndex === undefined ? 'absent' : '#' + String(newIndex)) +
        '; the "' +
        row.first +
        '" form moves with it (later occurrences use the bare form).',
    )
  }
  return { notes, extraSpanIndices: [...extra].sort((left, right) => left - right) }
}

/** Smallest fence of mark characters that safely wraps body. */
function fenceFor(body: string, mark: '`' | '~'): string {
  let longest = 2
  for (const line of body.split('\n')) {
    const run = new RegExp('^\\s*(' + (mark === '`' ? '`' : '~') + '{3,})').exec(line)
    if (run?.[1] !== undefined && run[1].length > longest) longest = run[1].length
  }
  return mark.repeat(longest + 1)
}

/** One changed (or first-occurrence) span with its three-way context. */
export interface BriefBundle {
  /** Span index shared by the aligned documents. */
  index: number
  /** Human label: heading text or node type. */
  label: string
  /** Why the bundle is present when its source text did not change. */
  reason?: 'first-occurrence' | undefined
  confirmedSourceText: string
  currentSourceText: string
  counterpartText: string
  /** 1-based line the counterpart span starts on. */
  counterpartStartLine: number
}

/** The granularities a briefing can map the change at, narrowest first. */
export type BriefScope =
  | { kind: 'mechanical' }
  | { kind: 'units'; bundles: BriefBundle[]; firstOccurrenceNotes: string[] }
  | { kind: 'sections'; bundles: BriefBundle[]; firstOccurrenceNotes: string[] }
  | { kind: 'document'; reason: string }

/** Inputs for rendering one pair's briefing. */
export interface TranslationBriefInput {
  /** Repository-relative path of the side that changed. */
  sourcePath: string
  /** Repository-relative path of the counterpart to update. */
  counterpartPath: string
  /** Which way the update runs. */
  direction: BriefDirection
  /** Source language of the pair. */
  sourceLanguage: Language
  /** Target language of the pair. */
  targetLanguage: Language
  /** Unified diff of the changed side, last-confirmed to current. */
  diff: string
  /** Mapped scope. */
  scope: BriefScope
  /** Terminology rows matching the change. */
  terminology: TerminologyRow[]
  /** The command that records the pair. */
  recordCommand: string
  /** The command that checks the pair. */
  checkCommand: string
  /** The command that applies a mechanical update. */
  applyCommand: string
}

const RULES_DIGEST = [
  '- Edit ONLY what the change requires; preserve the reviewed phrasing of everything unchanged.',
  '- Nothing added, nothing dropped: the counterpart must state exactly what the changed side states.',
  "- Write natural technical prose in the target language, not a word-by-word gloss; terse stays terse. Follow the project's declared style file or the default references/style-examples.md, and its terminology table.",
  '- Code fences byte-identical to the other side, comments included; inline code spans verbatim.',
  '- Repository-relative document links keep the same semantic target and the exact query/fragment; a link to a paired document uses the counterpart locale on the counterpart side and the source locale on the source side. The language switcher is the cross-locale exception.',
  '- Structure mirrors the counterpart: heading depths and order, list kinds and item counts, table rows and columns.',
  '- Terminology: every listed term renders as its row says. A first-occurrence form attaches to the document-wide first occurrence only when the table declares one. Never invent a rendering inline.',
  '- One physical line per paragraph; exactly one trailing newline.',
]

function renderBundles(
  out: string[],
  input: TranslationBriefInput,
  bundles: BriefBundle[],
  firstOccurrenceNotes: string[],
): void {
  const sourceName = input.sourceLanguage.name
  const counterpartName = input.targetLanguage.name
  for (const bundle of bundles) {
    out.push('')
    out.push(
      '### #' +
        String(bundle.index) +
        ' ' +
        bundle.label +
        (bundle.reason === 'first-occurrence' ? ' - unchanged; included for a first-occurrence move' : '') +
        ' - counterpart at ' +
        input.counterpartPath +
        ':' +
        String(bundle.counterpartStartLine),
    )
    const fence = fenceFor(
      [bundle.confirmedSourceText, bundle.currentSourceText, bundle.counterpartText].join('\n'),
      '~',
    )
    if (bundle.confirmedSourceText !== bundle.currentSourceText) {
      out.push('')
      out.push('Last-confirmed ' + sourceName + ':')
      out.push('')
      out.push(fence + 'markdown')
      out.push(bundle.confirmedSourceText.trimEnd())
      out.push(fence)
    }
    out.push('')
    out.push('Current ' + sourceName + ':')
    out.push('')
    out.push(fence + 'markdown')
    out.push(bundle.currentSourceText.trimEnd())
    out.push(fence)
    out.push('')
    out.push('Current ' + counterpartName + ' (bring this along):')
    out.push('')
    out.push(fence + 'markdown')
    out.push(bundle.counterpartText.trimEnd())
    out.push(fence)
  }
  if (firstOccurrenceNotes.length > 0) {
    out.push('')
    out.push('## First-occurrence notes')
    out.push('')
    for (const note of firstOccurrenceNotes) out.push('- ' + note)
  }
}

/**
 * Render the complete briefing for one out-of-sync pair.
 * @param input - diff, mapped scope, terminology and pair identity.
 * @returns Markdown briefing text.
 */
export function renderTranslationBrief(input: TranslationBriefInput): string {
  const sourceName = input.sourceLanguage.name
  const counterpartName = input.targetLanguage.name
  const out: string[] = []
  out.push('# Translation update briefing: ' + input.sourcePath)
  out.push('')
  out.push(
    'The ' +
      sourceName +
      ' side changed; bring \`' +
      input.counterpartPath +
      '\` along with the smallest edit that covers the change.',
  )
  if (input.scope.kind === 'mechanical') {
    out.push('')
    out.push('## Mechanical update - no translation judgment involved')
    out.push('')
    out.push(
      'Every change since the last confirmed state is inside fenced code blocks, which are byte-identical across the pair. Run \`' +
        input.applyCommand +
        '\` to splice the updated fences into the counterpart (the result is structure-validated before writing), then record the pair.',
    )
  }
  out.push('')
  out.push('## ' + sourceName + ' diff (last-confirmed -> current)')
  out.push('')
  const diffFence = fenceFor(input.diff, '`')
  out.push(diffFence + 'diff')
  out.push(input.diff.trimEnd())
  out.push(diffFence)
  switch (input.scope.kind) {
    case 'mechanical':
      break
    case 'units':
      out.push('')
      out.push(
        '## Changed units (last-confirmed ' +
          sourceName +
          ' -> current ' +
          sourceName +
          ', with the current ' +
          counterpartName +
          ')',
      )
      renderBundles(out, input, input.scope.bundles, input.scope.firstOccurrenceNotes)
      break
    case 'sections':
      out.push('')
      out.push('## Changed sections (fine-grained units do not align across the pair; whole heading sections shown)')
      renderBundles(out, input, input.scope.bundles, input.scope.firstOccurrenceNotes)
      break
    case 'document':
      out.push('')
      out.push('## Whole-document update required')
      out.push('')
      out.push(
        input.scope.reason +
          ' Open \`' +
          input.counterpartPath +
          "\` directly, locate the affected regions yourself, and reconcile under the skill's references/translation-rules.md.",
      )
      break
    default:
      input.scope satisfies never
  }
  if (input.terminology.length > 0) {
    out.push('')
    out.push('## Binding terminology rows matching this change')
    out.push('')
    out.push('| ' + sourceName + ' | ' + counterpartName + ' | First occurrence | Forbidden renderings | Note |')
    out.push('|---|---|---|---|---|')
    for (const row of input.terminology) out.push(row.line)
    out.push('')
    out.push(
      'For any term you introduce that is not listed above, consult the full table before inventing a rendering.',
    )
  }
  out.push('')
  out.push('## Rules digest (full rules: references/translation-rules.md)')
  out.push('')
  out.push(...RULES_DIGEST)
  out.push('')
  out.push('## Finish')
  out.push('')
  out.push(
    '1. Apply the smallest counterpart edit that covers the change, then verify the changed spans clause by clause against the source.',
  )
  out.push('2. \`' + input.recordCommand + '\`')
  out.push('3. \`' + input.checkCommand + '\`')
  out.push('')
  return out.join('\n')
}

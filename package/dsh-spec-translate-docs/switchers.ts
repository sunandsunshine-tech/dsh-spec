/**
 * SPDX-License-Identifier: MIT
 *
 * Extracted from the DeepSeek Harness bilingual-document mechanism at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
/**
 * Language-switcher parsing and matching: the canonical paragraph's parts, accepted link
 * destinations, link offsets, the counterpart backlink, and the located source and counterpart
 * switchers. The switcher is the unique paragraph in the H1 section whose labels and links match
 * the canonical line; its position is free.
 */

import { basename } from 'node:path'
import type { Nodes } from 'mdast'
import type { PairCorpus } from './corpus.ts'
import { parseMarkdown } from './markdown.ts'
import { pairPaths, type PairPaths } from './targets.ts'

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

/**
 * Read the counterpart switcher: one backlink to the source, then the target label.
 * @param tree - parsed counterpart.
 * @param markdown - exact Markdown the tree parses.
 * @param sourcePath - the pair's source path.
 * @returns the switcher, or undefined when no paragraph has the canonical shape.
 */
export function counterpartSwitcher(
  tree: Nodes,
  markdown: string,
  sourcePath: string,
): CounterpartSwitcher | undefined {
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

/** The located switchers of one pair and the violations that prevent matching them. */
export interface MatchedSwitcher {
  sourceOffsets: Set<number>
  counterpartOffsets: Set<number>
  errors: string[]
  sourceLabel: string
  targetLabel: string
}

/**
 * Locate both sides' canonical switchers and the source offsets their links occupy.
 * @param corpus - the corpus, for declared names, recognized targets and generated sources.
 * @param paths - the pair.
 * @param sourceText - masked source Markdown.
 * @param sourceTree - parse of the masked source.
 * @param counterpartText - masked counterpart Markdown.
 * @param counterpartTree - parse of the masked counterpart.
 * @param sourceCode - the source language code recorded for the pair.
 * @param sourceName - a source display name supplied by the caller, if any.
 * @returns the matched switcher, its link offsets and every violation.
 */
export function locateSwitchers(
  corpus: PairCorpus,
  paths: PairPaths,
  sourceText: string,
  sourceTree: Nodes,
  counterpartText: string,
  counterpartTree: Nodes,
  sourceCode: string,
  sourceName: string | undefined,
): MatchedSwitcher {
  const errors: string[] = []
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
    let info: CounterpartSwitcher | undefined
    if (target.code === paths.target.code) {
      info = selected
    } else {
      const text = corpus.readFile(pair.counterpart)
      const tree = text === undefined ? undefined : parseMarkdown(text)
      if (text !== undefined && tree !== undefined) info = counterpartSwitcher(tree, text, paths.source)
    }
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

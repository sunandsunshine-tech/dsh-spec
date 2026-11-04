/**
 * Locale-aware resolution, validation and normalization of the relative document links a pair
 * carries. Adapted from the upstream bilingual-document link rules: the pair corpus predicate and
 * the target languages are the shipped contract's, and the semantic target sentinel is this
 * mechanism's own.
 */

import { existsSync, statSync } from 'node:fs'
import { posix, resolve } from 'node:path'
import type { Nodes } from 'mdast'
import {
  isExternalOrAbsoluteMarkdownUrl,
  markdownDestination,
  parseMarkdown,
  splitMarkdownUrlTarget,
  visitMarkdown,
  type MarkdownDestination,
} from './markdown.ts'
import { counterpartSuffix, languageFromCounterpartFilename, type Language } from './targets.ts'

/** The side of a pair a document is, and the pair's target language. */
export interface PairSide {
  /** Whether the document is the source side or the counterpart side. */
  role: 'source' | 'counterpart'
  /** The pair's target language. */
  target: Language
}

/** Repository and source document used to resolve one relative link. */
export interface TranslationLinkContext {
  /** Absolute project root. */
  repoRoot: string
  /** Repository-relative Markdown source path. */
  sourcePath: string
  /** Which side of its pair the document is, and the pair's target. */
  side: PairSide
  /** Whether a base document belongs to the pair corpus. */
  isPairSource: (sourcePath: string) => boolean
  /** Selected content plane; defaults to regular files in the working tree. */
  repositoryFileExists?: (repoPath: string) => boolean
}

/** One relative document link whose target uses the wrong locale sibling. */
export interface TranslationLinkLocaleViolation {
  sourcePath: string
  line: number
  url: string
  expectedUrl: string
}

/** Markdown nodes whose destinations translation links resolve. */
export type LinkNode = Extract<Nodes, { type: 'link' | 'definition' }>

/** One authored destination that link normalization replaced. */
export interface TranslationLinkDestinationEdit {
  /** Inline link or referenced definition whose destination was replaced. */
  node: LinkNode
  /** Absolute source offset where the authored destination text starts. */
  start: number
  /** Absolute source offset where the authored destination text ends. */
  end: number
  /** Semantic target text that replaces markdown.slice(start, end). */
  value: string
}

/** Normalized Markdown text and the destination edits that produced it. */
export interface TranslationLinkNormalization {
  /** Markdown with paired-document destinations replaced by semantic targets. */
  content: string
  /** Applied edits in ascending source order; empty when content equals the input. */
  edits: TranslationLinkDestinationEdit[]
}

/** The semantic-target prefix a paired-document destination normalizes to. */
export const SEMANTIC_LINK_PREFIX = 'dsh-spec-translation-target:'

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

function worktreeFileExists(repoRoot: string, repoPath: string): boolean {
  try {
    const path = resolve(repoRoot, repoPath)
    return existsSync(path) && statSync(path).isFile()
  } catch {
    return false
  }
}

function repositoryFileExists(context: TranslationLinkContext, repoPath: string): boolean {
  return context.repositoryFileExists?.(repoPath) ?? worktreeFileExists(context.repoRoot, repoPath)
}

function repositoryRelativePath(path: string): string | undefined {
  const normalized = posix.normalize(path)
  if (
    normalized === '' ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    posix.isAbsolute(normalized)
  ) {
    return undefined
  }
  return normalized
}

function resolveRepositoryTarget(rawPath: string, context: TranslationLinkContext): string | undefined {
  const decoded = decodePath(rawPath)
  const exact = repositoryRelativePath(posix.join(posix.dirname(context.sourcePath), decoded))
  if (exact === undefined) return undefined
  return repositoryFileExists(context, exact) ? exact : undefined
}

/** The base source document one resolved link target denotes, when it belongs to the pair corpus. */
function pairedBaseOf(targetPath: string, context: TranslationLinkContext): string | undefined {
  const target = languageFromCounterpartFilename(targetPath)
  if (target !== undefined) {
    const suffix = counterpartSuffix(target)
    if (targetPath.endsWith(suffix)) {
      const source = targetPath.slice(0, -suffix.length) + '.md'
      return context.isPairSource(source) ? source : undefined
    }
  }
  if (targetPath.endsWith('.md')) return context.isPairSource(targetPath) ? targetPath : undefined
  return undefined
}

function counterpartPathOf(source: string, target: Language): string {
  return source.replace(/\.md$/, counterpartSuffix(target))
}

function expectedLocale(rawPath: string, base: string, side: PairSide): { expectedPath: string; expectedUrl: string } {
  if (side.role === 'counterpart') {
    const expectedPath = counterpartPathOf(base, side.target)
    const suffix = counterpartSuffix(side.target)
    if (rawPath.endsWith(suffix)) return { expectedPath, expectedUrl: rawPath }
    if (rawPath.endsWith('.md')) return { expectedPath, expectedUrl: rawPath.replace(/\.md$/, suffix) }
    return { expectedPath, expectedUrl: rawPath }
  }
  const expectedPath = base
  const target = languageFromCounterpartFilename(rawPath)
  const suffix = target === undefined ? undefined : counterpartSuffix(target)
  if (suffix !== undefined && rawPath.endsWith(suffix)) {
    return { expectedPath, expectedUrl: rawPath.slice(0, -suffix.length) + '.md' }
  }
  return { expectedPath, expectedUrl: rawPath }
}

interface ResolvedTranslationLink {
  base: string
  targetPath: string
  suffix: string
  expectedPath: string
  expectedUrl: string
}

function resolveTranslationLink(
  url: string,
  context: TranslationLinkContext,
  authoredUrl: string,
): ResolvedTranslationLink | undefined {
  if (isExternalOrAbsoluteMarkdownUrl(url)) return undefined
  const { path } = splitMarkdownUrlTarget(url)
  const authored = splitMarkdownUrlTarget(authoredUrl)
  if (path === '') return undefined
  const targetPath = resolveRepositoryTarget(path, context)
  if (targetPath === undefined) return undefined
  const base = pairedBaseOf(targetPath, context)
  if (base === undefined) return undefined
  const { expectedPath, expectedUrl } = expectedLocale(authored.path, base, context.side)
  return { base, targetPath, suffix: authored.suffix, expectedPath, expectedUrl }
}

function applyReplacements(markdown: string, replacements: { start: number; end: number; value: string }[]): string {
  let output = markdown
  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    output = output.slice(0, replacement.start) + replacement.value + output.slice(replacement.end)
  }
  return output
}

function visitDocumentLinkNodes(
  markdown: string,
  skippedOffsets: ReadonlySet<number>,
  visitor: (node: LinkNode, destination: MarkdownDestination) => void,
  tree: Nodes = parseMarkdown(markdown),
): void {
  const referencedIdentifiers = new Set<string>()
  const visitedDefinitions = new Set<string>()
  visitMarkdown(tree, (node) => {
    if (node.type === 'linkReference') referencedIdentifiers.add(node.identifier)
  })
  const seenOffsets = new Set<number>()
  visitMarkdown(tree, (node) => {
    const offset = node.position?.start.offset
    if (node.type === 'link' && offset !== undefined && skippedOffsets.has(offset)) return
    if (node.type === 'link') {
      if (offset !== undefined) seenOffsets.add(offset)
      let destination: MarkdownDestination
      try {
        destination = markdownDestination(markdown, node)
      } catch {
        destination = { start: node.position?.start.offset ?? 0, end: node.position?.end.offset ?? 0, url: node.url }
      }
      visitor(node, destination)
    } else if (
      node.type === 'definition' &&
      referencedIdentifiers.has(node.identifier) &&
      !visitedDefinitions.has(node.identifier)
    ) {
      visitedDefinitions.add(node.identifier)
      visitor(node, markdownDestination(markdown, node))
    }
  })
}

/**
 * Return one violation per wrong-locale relative document link, skipping the switcher links.
 * @param markdown - exact authored Markdown used for offsets.
 * @param context - project root, source path, side and corpus predicate.
 * @param tree - optional parse of the exact Markdown.
 * @param skippedOffsets - source offsets of the switcher links.
 * @returns wrong-locale links in document order.
 */
export function translationLinkLocaleViolations(
  markdown: string,
  context: TranslationLinkContext,
  tree?: Nodes,
  skippedOffsets: ReadonlySet<number> = new Set(),
): TranslationLinkLocaleViolation[] {
  const parse = tree ?? parseMarkdown(markdown)
  const violations: TranslationLinkLocaleViolation[] = []
  visitDocumentLinkNodes(
    markdown,
    skippedOffsets,
    (node, destination) => {
      if (isExternalOrAbsoluteMarkdownUrl(node.url)) return
      const resolved = resolveTranslationLink(node.url, context, destination.url)
      if (resolved === undefined || resolved.targetPath === resolved.expectedPath) return
      violations.push({
        sourcePath: context.sourcePath,
        line: node.position?.start.line ?? 0,
        url: destination.url,
        expectedUrl: resolved.expectedUrl,
      })
    },
    parse,
  )
  return violations
}

/**
 * Resolve an absolute URL to a paired repository document by its pathname suffix.
 * @param url - authored URL.
 * @param context - link context.
 * @returns the paired base and suffix, or undefined.
 */
function resolveAbsolutePairedUrl(
  url: string,
  context: TranslationLinkContext,
): { base: string; suffix: string } | undefined {
  if (!/^https?:\/\//.test(url)) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.pathname === undefined) return undefined
    const segments = parsed.pathname.split('/').filter(Boolean)
    const { suffix } = splitMarkdownUrlTarget(url)
    for (let start = 0; start < segments.length; start += 1) {
      const candidate = segments.slice(start).join('/')
      if (!repositoryFileExists(context, candidate)) continue
      const base = pairedBaseOf(candidate, context)
      if (base !== undefined) return { base, suffix }
    }
  } catch {
    return undefined
  }
  return undefined
}

/**
 * Normalize paired-document destinations to one semantic target, retaining every other byte.
 * @param markdown - exact authored Markdown used for offsets.
 * @param context - project root, source path, side and corpus predicate.
 * @param tree - optional parse of the exact Markdown.
 * @returns the normalized text plus the edits that produced it.
 */
export function normalizeTranslationMarkdownLinkEdits(
  markdown: string,
  context: TranslationLinkContext,
  tree?: Nodes,
): TranslationLinkNormalization {
  const parse = tree ?? parseMarkdown(markdown)
  const edits: TranslationLinkDestinationEdit[] = []
  visitDocumentLinkNodes(
    markdown,
    new Set(),
    (node, destination) => {
      if (isExternalOrAbsoluteMarkdownUrl(node.url)) {
        const start = node.position?.start.offset
        const end = node.position?.end.offset
        if (start === undefined || end === undefined) return
        if (markdown.slice(start, end).startsWith('<')) return
        const absolute = resolveAbsolutePairedUrl(destination.url, context)
        if (absolute === undefined) return
        edits.push({
          node,
          start: destination.start,
          end: destination.end,
          value: SEMANTIC_LINK_PREFIX + absolute.base + absolute.suffix,
        })
        return
      }
      const resolved = resolveTranslationLink(node.url, context, destination.url)
      if (resolved === undefined) return
      edits.push({
        node,
        start: destination.start,
        end: destination.end,
        value: SEMANTIC_LINK_PREFIX + resolved.base + resolved.suffix,
      })
    },
    parse,
  )
  const content = applyReplacements(markdown, [...edits])
  return { content, edits: edits.sort((left, right) => left.start - right.start) }
}

/**
 * The semantic target of one authored inline link or referenced definition, for the structural
 * signature. Paired documents normalize to the sentinel; everything else keeps authored bytes.
 * @param node - link or definition node.
 * @param markdown - exact authored Markdown used for offsets.
 * @param context - project root, source path, side and corpus predicate.
 * @returns the comparable target string.
 */
export function semanticTranslationLinkNodeTarget(
  node: LinkNode,
  markdown: string,
  context: TranslationLinkContext,
): string {
  if (isExternalOrAbsoluteMarkdownUrl(node.url)) {
    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) {
      throw new Error('translation-links: link ' + JSON.stringify(node.url) + ' has no source offsets')
    }
    const raw = markdown.slice(start, end)
    if (node.type === 'definition' || raw.startsWith('[')) return markdownDestination(markdown, node).url
    if (raw.startsWith('<') && raw.endsWith('>')) return raw.slice(1, -1)
    return raw
  }
  const destination = markdownDestination(markdown, node)
  const resolved = resolveTranslationLink(node.url, context, destination.url)
  return resolved === undefined ? destination.url : SEMANTIC_LINK_PREFIX + resolved.base + resolved.suffix
}

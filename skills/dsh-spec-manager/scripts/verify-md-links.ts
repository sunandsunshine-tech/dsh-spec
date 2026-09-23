/**
 * SPDX-License-Identifier: MIT
 * Ported from dsh scripts/verify-md-links.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 * Verify that relative Markdown links, images, and definitions resolve — the
 * target file must exist AND a `#fragment` onto a Markdown target (including
 * a same-file `#anchor`) must name a real heading slug or explicit `<a id>`.
 * URL and root-absolute targets are excluded; query strings do not affect
 * resolution against the source file. The checker never rewrites, and
 * symlinked instruction files are deduped.
 *
 * Run it from the project root:
 *   node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts md-links check <markdown...> --root .
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { Nodes } from './vendor-mdast-types.js'
import { readGateScope, refuseOutOfScope } from './gate-scope.ts'
import { markdownHeadingLines, parseMarkdown, visitMarkdown } from './markdown.ts'
import { scopeReason } from './md-scope.ts'
import { resolveRepoRoot } from './repo-root.ts'

const root = resolveRepoRoot()

/** A broken relative link: a missing target path or a missing anchor on it. */
interface Violation {
  file: string
  /** 1-based line where the link/image/definition node starts. */
  line: number
  url: string
  /** What failed: the target file or the fragment onto it. */
  reason: 'target' | 'anchor'
}

/**
 * True for targets this gate must NOT check: scheme-qualified URLs (`https:`,
 * `mailto:`, …), protocol-relative (`//host`), and root-absolute (`/path`).
 * Pure in-page anchors (`#frag`) ARE checked, against the source file itself.
 */
function isExternal(url: string): boolean {
  if (url.startsWith('//')) return true
  if (url.startsWith('/')) return true
  // A scheme like `https:` / `mailto:` — a colon before any slash, dot, or hash.
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
}

/**
 * Strip the `#fragment` and `?query` from a link target, then percent-decode
 * the remaining path so an encoded target (`My%20File.md`, `READ%4DE.md`)
 * probes the real filename on disk, the way a Markdown renderer resolves it. A
 * malformed escape (`%zz`) makes `decodeURIComponent` throw; we keep the raw
 * path in that case so the link is reported as broken (a `%zz` target is not a
 * file anyone meant to link) rather than crashing the gate.
 */
function pathPart(url: string): string {
  const raw = url.replace(/[#?].*$/, '')
  try {
    return decodeURIComponent(raw)
  } catch {
    // decodeURIComponent throws only on a malformed percent-escape; the raw
    // string is then a path no renderer resolves, so fall through to the
    // existence check, which reports it broken.
    return raw
  }
}

/** The percent-decoded `#fragment` of a link target, or null when it has none. */
function fragmentPart(url: string): string | null {
  const hash = url.indexOf('#')
  if (hash === -1) return null
  const raw = url.slice(hash + 1).replace(/\?.*$/, '')
  try {
    return decodeURIComponent(raw)
  } catch {
    // Same stance as pathPart: a malformed escape names no anchor anyone
    // meant, so the raw text flows into the lookup and is reported missing.
    return raw
  }
}

/**
 * GitHub's heading-slug algorithm (lowercase; drop everything but letters,
 * numbers, underscores, spaces, hyphens; spaces become hyphens). Underscores
 * survive (`## Showcase: web_fetch` → `#showcase-web_fetch`), unlike
 * `gen-cordis-catalog`'s region-anchor slugs — the generator's headings are
 * always reachable through its explicit `<a id>` anchors, so the two need not
 * share one rule.
 * @param heading - the RENDERED heading text (Markdown syntax already gone).
 * @returns the anchor GitHub assigns the first occurrence of the heading.
 */
export function githubSlug(heading: string): string {
  return heading.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-')
}

/**
 * Every anchor one Markdown document exposes: each heading's GitHub slug —
 * computed from the RENDERED heading text, so links, images, inline code, and
 * emphasis inside a heading slug the way GitHub renders them — plus every
 * explicit `id` on a raw HTML element in real HTML flow, whichever element
 * carries it: an `<a id="…">` and a `<h3 id="…">` are both anchors a reader can
 * reach (a fenced or inline code sample and a commented-out anchor register
 * nothing). Repeated slugs
 * get GitHub's occupied-set `-1`, `-2`, … suffixes: each collision bumps the
 * ORIGINAL slug's counter until a free name is found, so `Repeat`, `Repeat-1`,
 * `Repeat` yields `repeat`, `repeat-1`, `repeat-2`. Matching is exact —
 * element ids are case-sensitive.
 * @param source - the document's full Markdown text.
 * @returns the set of valid fragments for links into this document.
 */
export function documentAnchors(source: string): Set<string> {
  const anchors = new Set<string>()
  const occurrences = new Map<string, number>()
  for (const heading of markdownHeadingLines(source)) {
    const base = githubSlug(heading.text)
    let result = base
    let bump = occurrences.get(base) ?? 0
    while (anchors.has(result)) {
      bump += 1
      result = `${base}-${bump}`
    }
    occurrences.set(base, bump)
    anchors.add(result)
  }
  visitMarkdown(parseMarkdown(source), (node: Nodes): void => {
    if (node.type !== 'html') return
    const html = node.value.replace(/<!--[\s\S]*?-->/g, '')
    for (const match of html.matchAll(/<[a-zA-Z][^>]*\sid="([^"]+)"/g)) anchors.add(match[1] ?? '')
  })
  return anchors
}

/**
 * Lazily collect and cache the anchor set of any existing Markdown file —
 * shared across all scanned sources so a target parses once.
 * @returns the memoized absolute-path → anchor-set lookup.
 */
export function anchorCache(): (absPath: string) => Set<string> {
  const cache = new Map<string, Set<string>>()
  return (absPath) => {
    const hit = cache.get(absPath)
    if (hit) return hit
    const anchors = documentAnchors(readFileSync(absPath, 'utf8'))
    cache.set(absPath, anchors)
    return anchors
  }
}

/**
 * Find every broken relative cross-link in one Markdown file via its AST: a
 * relative target that does not exist, or a fragment onto a Markdown file
 * (same-file `#anchor` links included) that names no heading slug or explicit
 * `<a id>` there. Fragments onto non-Markdown targets (`file.ts#L10`) carry
 * renderer-owned semantics and are not judged.
 * @param absPath - absolute path of the Markdown source to scan.
 * @param anchorsOf - anchor lookup shared across files for cross-link checks.
 * @param scanRoot - repository root violations are reported relative to.
 * @returns one entry per broken link, in document order.
 */
export function findViolations(
  absPath: string,
  anchorsOf: (abs: string) => Set<string>,
  scanRoot: string = root,
): Violation[] {
  const file = relative(scanRoot, absPath)
  const dir = dirname(absPath)
  const source = readFileSync(absPath, 'utf8')
  const tree = parseMarkdown(source)
  const out: Violation[] = []

  const check = (url: string, node: Nodes): void => {
    if (isExternal(url)) return
    const target = pathPart(url)
    const resolved = target === '' ? absPath : resolve(dir, target)
    if (!existsSync(resolved)) {
      out.push({ file, line: node.position?.start.line ?? 0, url, reason: 'target' })
      return
    }
    const fragment = fragmentPart(url)
    if (fragment === null || !resolved.endsWith('.md')) return
    if (!anchorsOf(resolved).has(fragment)) {
      out.push({ file, line: node.position?.start.line ?? 0, url, reason: 'anchor' })
    }
  }

  visitMarkdown(tree, (node: Nodes): void => {
    if ((node.type === 'link' || node.type === 'image' || node.type === 'definition') && 'url' in node) {
      check(node.url, node)
    }
  })
  return out
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  const gate = 'verify-md-links'
  const scope = readGateScope(gate)
  refuseOutOfScope(gate, scope, entry => entry.endsWith('.md') && scopeReason(entry) === '')
  // A path the change reports as deleted has nothing to resolve; what it breaks elsewhere is the
  // documented limit of a file selection, not something this gate can see.
  const files = scope.entries.filter(entry => existsSync(resolve(scope.root, entry)))
  const anchorsOf = anchorCache()
  const all = files.flatMap(entry => findViolations(resolve(scope.root, entry), anchorsOf))
  const checked = files.length

  // Every handed path is a deletion: there is nothing to resolve in a removed file, and what the
  // deletion breaks elsewhere is the documented limit of a file selection.
  if (checked === 0) {
    console.log(`verify-md-links: all ${scope.entries.length} path(s) handed in are deletions — no file to read.`)
    process.exit(0)
  }

  if (all.length === 0) {
    console.log(`verify-md-links: ${checked} file(s) checked, all relative cross-links and fragments resolve.`)
    process.exit(0)
  }

  console.error('verify-md-links: broken relative cross-links found:')
  for (const v of all) {
    console.error(`  ${v.file}:${v.line}  ${v.url}  (${v.reason === 'target' ? 'target does not exist' : 'no such anchor in target'})`)
  }
  process.exit(1)
}

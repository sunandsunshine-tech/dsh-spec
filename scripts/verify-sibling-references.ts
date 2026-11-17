#!/usr/bin/env node
// Check how the shipped skills name one another.
//
// dependencies   markdown-it, parse5 and yaml (root development dependencies)
// runtime        Node.js ^22.19.0 || ^24.11.0 || >=26.0.0
// input          the working directory as the repository root
// output         one FAIL line per offending mention, or the final passing summary
// exit           0 every reference is optional and exact · 1 a finding or empty corpus · 2 usage error
//
// A sibling name is an optional example only. The description and compatibility fields do not
// name siblings. In SKILL.md and references, a sibling name appears only as
// `(when available, use the NAME skill)` or `(when available, consider using the NAME skill)`.

import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import MarkdownIt from 'markdown-it'
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5'
import { parseDocument } from 'yaml'

const USAGE = `usage: verify-sibling-references.ts [--help]

Check that skills under skills/ name sibling skills only as optional availability examples.
Run from the repository root.

A SKILL.md description or compatibility field names no sibling. In SKILL.md and reference
Markdown, a sibling name appears only as:

  (when available, use the NAME skill)
  (when available, consider using the NAME skill)

The parenthetical contains no additional detail. Outside an availability-like parenthesis, paths,
URLs, link targets, HTML attributes, fenced or indented code, HTML code and commands in inline code
are not references.

exit: 0 the corpus passed · 1 a finding or empty corpus · 2 usage error`

const markdown = new MarkdownIt({ html: true })
const NAME_NAMESPACE = 'dsh-spec-[A-Za-z0-9_-]*'
const COMMAND =
  /^(?:\$|>)\s+\S|^(?:node|pnpm|npm|npx|git|gh|bash|sh|zsh|python3?|ruby|deno|bun|make|cargo|go|dotnet|pwsh|powershell)(?:\s|$)|^[a-z0-9][a-z0-9._-]*(?:\s+--?[A-Za-z0-9]|\s+\S*[\\/])/i
const HTML_CODE_TAGS = new Set(['code', 'pre', 'script', 'style'])
const HTML_SPACING_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dl',
  'dd',
  'dt',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
])
const TRIM_EDGE = new Set([...`()[]{}<>.,;:!?'"\`|`])

interface Finding {
  file: string
  line: number
  message: string
}

interface DocumentParts {
  body: string
  bodyOffset: number
  fields?: Record<string, unknown>
  error?: string
}

interface Rendered {
  text: string
  lines: number[]
  links: boolean[]
  code: boolean[]
  excluded: boolean[]
}

interface CandidateScanner {
  regex: RegExp
  skills: Set<string>
  owner: string
}

interface AllowedReference {
  start: number
  end: number
  nameStart: number
  nameEnd: number
}

interface AvailabilityScan {
  references: AllowedReference[]
  malformed: Finding[]
}

interface TextRange {
  start: number
  end: number
}

interface AppendedText {
  start: number
  line: number
}

interface HtmlState {
  tags: string[]
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  if (args.length > 0) {
    console.error('verify-sibling-references.ts: unknown option: ' + args.join(' '))
    console.error('run "verify-sibling-references.ts --help" for usage')
    process.exitCode = 2
    return
  }

  const root = process.cwd()
  const skillsRoot = join(root, 'skills')
  let skills: string[] = []
  try {
    if (statSync(skillsRoot).isDirectory()) {
      skills = readdirSync(skillsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    }
  } catch {
    skills = []
  }
  if (skills.length === 0) {
    console.error('verify-sibling-references.ts: no skills under skills/; nothing to check')
    process.exitCode = 1
    return
  }

  const skillSet = new Set(skills)
  const findings: Finding[] = []
  let sourceCount = 0
  let referenceCount = 0

  for (const owner of skills) {
    const scanner = candidateScanner(skillSet, owner)
    const skillFile = join(skillsRoot, owner, 'SKILL.md')
    if (!isFile(skillFile)) continue
    sourceCount += 1

    const source = readDocument(skillFile, root, findings)
    if (source === undefined) continue
    const parts = splitDocument(source)
    const file = displayPath(root, skillFile)
    if (parts.error === undefined && parts.fields !== undefined) {
      for (const field of ['description', 'compatibility'] as const) {
        const value = parts.fields[field]
        if (typeof value !== 'string') continue
        findings.push(...scanField(value, field, file, fieldLine(source, field), scanner))
      }
    } else if (parts.error !== undefined) {
      findings.push({ file, line: 1, message: parts.error })
    }
    referenceCount += analyzeMarkdown(parts.body, file, parts.bodyOffset, scanner, findings)

    const referencesRoot = join(skillsRoot, owner, 'references')
    const skillRoot = join(skillsRoot, owner)
    for (const reference of markdownFiles(referencesRoot, skillRoot, root, findings)) {
      const referenceSource = readDocument(reference, root, findings)
      if (referenceSource === undefined) continue
      const referenceParts = splitDocument(referenceSource)
      const referenceFile = displayPath(root, reference)
      if (referenceParts.error !== undefined) {
        findings.push({ file: referenceFile, line: 1, message: referenceParts.error })
        continue
      }
      referenceCount += analyzeMarkdown(
        referenceParts.body,
        referenceFile,
        referenceParts.bodyOffset,
        scanner,
        findings,
      )
    }
  }

  if (sourceCount === 0) {
    console.error('verify-sibling-references.ts: no SKILL.md files under skills/; nothing to check')
    process.exitCode = 1
    return
  }
  if (findings.length > 0) {
    for (const finding of findings) {
      console.log(`FAIL ${finding.file}:${finding.line} — ${finding.message}`)
    }
    process.exitCode = 1
    return
  }
  console.log(`ok sibling skill references — ${skills.length} skill(s), ${referenceCount} reference(s)`)
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function displayPath(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
}

function readDocument(path: string, root: string, findings: Finding[]): string | undefined {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    findings.push({
      file: displayPath(root, path),
      line: 1,
      message: `cannot read file: ${error instanceof Error ? error.message : String(error)}`,
    })
    return undefined
  }
}

function markdownFiles(root: string, skillRoot: string, repoRoot: string, findings: Finding[]): string[] {
  const files: string[] = []
  const active = new Set<string>()
  const visited = new Set<string>()

  const visit = (path: string, optionalRoot = false): void => {
    let metadata
    try {
      metadata = lstatSync(path)
    } catch (error) {
      if (optionalRoot && errorCode(error) === 'ENOENT') return
      findings.push({
        file: displayPath(repoRoot, path),
        line: 1,
        message: `cannot inspect path: ${errorMessage(error)}`,
      })
      return
    }

    if (metadata.isSymbolicLink()) {
      try {
        metadata = statSync(path)
      } catch (error) {
        findings.push({
          file: displayPath(repoRoot, path),
          line: 1,
          message: `cannot follow symbolic link: ${errorMessage(error)}`,
        })
        return
      }
      let real: string
      try {
        real = realpathSync(path)
      } catch (error) {
        findings.push({
          file: displayPath(repoRoot, path),
          line: 1,
          message: `cannot resolve symbolic link: ${errorMessage(error)}`,
        })
        return
      }
      if (!isWithin(skillRoot, real)) {
        findings.push({
          file: displayPath(repoRoot, path),
          line: 1,
          message: 'symbolic link escapes the skill',
        })
        return
      }
    }

    if (metadata.isDirectory()) {
      let real: string
      try {
        real = realpathSync(path)
      } catch (error) {
        findings.push({
          file: displayPath(repoRoot, path),
          line: 1,
          message: `cannot resolve directory: ${errorMessage(error)}`,
        })
        return
      }
      if (active.has(real)) {
        findings.push({
          file: displayPath(repoRoot, path),
          line: 1,
          message: 'symbolic link cycle',
        })
        return
      }
      if (visited.has(real)) return
      visited.add(real)
      active.add(real)
      let entries: ReturnType<typeof readdirSync>
      try {
        entries = readdirSync(path, { withFileTypes: true })
      } catch (error) {
        findings.push({
          file: displayPath(repoRoot, path),
          line: 1,
          message: `cannot read directory: ${errorMessage(error)}`,
        })
        active.delete(real)
        return
      }
      for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
        visit(join(path, entry.name))
      }
      active.delete(real)
      return
    }
    if (metadata.isFile() && path.endsWith('.md')) files.push(path)
  }
  visit(root, true)
  return files
}

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException | undefined)?.code
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isWithin(root: string, path: string): boolean {
  const child = relative(root, path)
  return child === '' || (!child.startsWith('..' + sep) && child !== '..' && !isAbsolute(child))
}

function splitDocument(source: string): DocumentParts {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  if (lines[0] !== '---') return { body: text, bodyOffset: 0 }
  const close = lines.indexOf('---', 1)
  if (close < 0) return { body: text, bodyOffset: 0 }
  const bodyOffset = close + 1
  const block = lines.slice(1, close).join('\n')
  const doc = parseDocument(block, { uniqueKeys: true })
  if (doc.errors.length > 0) {
    return {
      body: lines.slice(close + 1).join('\n'),
      bodyOffset,
      error: `frontmatter could not be parsed: ${doc.errors[0]?.message ?? 'unknown YAML error'}`,
    }
  }
  let value: unknown
  try {
    value = doc.toJS()
  } catch (error) {
    return {
      body: lines.slice(close + 1).join('\n'),
      bodyOffset,
      error: `frontmatter could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
  const fields =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  return { body: lines.slice(close + 1).join('\n'), bodyOffset, fields }
}

function fieldLine(source: string, field: string): number {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const index = lines.findIndex((line) => line.startsWith(field + ':'))
  return index < 0 ? 1 : index + 1
}

function candidateScanner(skills: Set<string>, owner: string): CandidateScanner {
  const alternatives = [...skills]
    .sort((left, right) => right.length - left.length || left.localeCompare(right))
    .map(escapeRegExp)
    .concat(NAME_NAMESPACE)
    .join('|')
  return {
    regex: new RegExp(`(?<![A-Za-z0-9_-])(?:${alternatives})(?![A-Za-z0-9_-])`, 'g'),
    skills,
    owner,
  }
}

function scanField(
  value: string,
  field: 'description' | 'compatibility',
  file: string,
  line: number,
  scanner: CandidateScanner,
): Finding[] {
  const excluded = pathExclusionMask(value)
  const findings: Finding[] = []
  for (const match of value.matchAll(scanner.regex)) {
    const name = match[0]
    const start = match.index
    if (name === scanner.owner || excludedRange(excluded, start, start + name.length)) continue
    findings.push({
      file,
      line,
      message: scanner.skills.has(name) ? `${field} names sibling ${name}` : `${field} names unknown skill ${name}`,
    })
  }
  return findings
}

function analyzeMarkdown(
  source: string,
  file: string,
  bodyOffset: number,
  scanner: CandidateScanner,
  findings: Finding[],
): number {
  const rendered = renderMarkdown(source, bodyOffset)
  const pathExcluded = pathExclusionMask(rendered.text)
  for (let index = 0; index < rendered.text.length; index += 1) {
    rendered.excluded[index] = rendered.excluded[index] || pathExcluded[index]
  }

  const ranges = availabilityLikeRanges(rendered.text)
  const availability = maskRanges(ranges, rendered.text.length)
  const availabilityScan = allowedReferences(rendered, ranges, file, scanner)
  findings.push(...availabilityScan.malformed)

  for (const match of rendered.text.matchAll(scanner.regex)) {
    const name = match[0]
    const start = match.index
    const end = start + name.length
    if (name === scanner.owner || excludedRange(availability, start, end)) continue
    if (excludedRange(rendered.excluded, start, end)) continue
    findings.push({
      file,
      line: rendered.lines[start] ?? 1,
      message: scanner.skills.has(name)
        ? `${name} is outside an exact availability reference`
        : `unknown skill reference ${name}`,
    })
  }
  return availabilityScan.references.length
}

function availabilityLikeRanges(text: string): TextRange[] {
  const ranges: TextRange[] = []
  for (const match of text.matchAll(/\(\s*when available,/gu)) {
    const close = text.indexOf(')', match.index)
    ranges.push({ start: match.index, end: close < 0 ? text.length : close + 1 })
  }
  return ranges
}

function maskRanges(ranges: TextRange[], length: number): boolean[] {
  const mask = Array<boolean>(length).fill(false)
  for (const range of ranges) {
    for (let index = range.start; index < range.end; index += 1) mask[index] = true
  }
  return mask
}

function allowedReferences(
  rendered: Rendered,
  ranges: TextRange[],
  file: string,
  scanner: CandidateScanner,
): AvailabilityScan {
  if (ranges.length === 0) return { references: [], malformed: [] }
  const names = [...scanner.skills]
    .sort((left, right) => right.length - left.length || left.localeCompare(right))
    .map(escapeRegExp)
    .join('|')
  const pattern = new RegExp(`^\\(when available, (use|consider using) the (${names}) skill\\)$`)
  const references: AllowedReference[] = []
  const malformed: Finding[] = []
  for (const range of ranges) {
    const text = rendered.text.slice(range.start, range.end)
    const candidates = [...text.matchAll(scanner.regex)].filter((candidate) => candidate[0] !== scanner.owner)
    if (candidates.length === 0) continue
    const match = pattern.exec(text)
    if (match === null) {
      malformed.push(malformedReference(rendered, range, file, scanner))
      continue
    }
    const name = match[2] as string
    const start = range.start
    const end = range.end
    const nameStart = start + `(when available, ${match[1]} the `.length
    const nameEnd = nameStart + name.length
    if (excludedRange(rendered.links, start, end)) {
      malformed.push(malformedReference(rendered, range, file, scanner))
      continue
    }
    let codeName: boolean | undefined
    let valid = true
    for (let index = start; index < end; index += 1) {
      const inName = index >= nameStart && index < nameEnd
      if (inName) {
        if (codeName === undefined) codeName = rendered.code[index]
        else if (codeName !== rendered.code[index]) valid = false
      } else if (rendered.code[index]) {
        valid = false
      }
    }
    if (!valid) {
      malformed.push(malformedReference(rendered, range, file, scanner))
      continue
    }
    if (name !== scanner.owner) references.push({ start, end, nameStart, nameEnd })
  }
  return { references, malformed }
}

function malformedReference(rendered: Rendered, range: TextRange, file: string, scanner: CandidateScanner): Finding {
  const text = rendered.text.slice(range.start, range.end)
  const candidate = [...text.matchAll(scanner.regex)].find((match) => match[0] !== scanner.owner)
  const name = candidate?.[0]
  const line = rendered.lines[range.start + (candidate?.index ?? 0)] ?? rendered.lines[range.start] ?? 1
  return {
    file,
    line,
    message:
      name === undefined
        ? 'availability reference has additional or malformed content'
        : scanner.skills.has(name)
          ? `availability reference for ${name} has additional or malformed content`
          : `unknown skill reference ${name}`,
  }
}

function renderMarkdown(source: string, bodyOffset: number): Rendered {
  const rendered = emptyRendered()
  const tokens = markdown.parse(source, {})
  for (const token of tokens) {
    let line = (token.map?.[0] ?? 0) + bodyOffset + 1
    if (token.type === 'fence' || token.type === 'code_block') continue
    if (token.type === 'html_block') {
      renderHtmlBlock(token.content, line, rendered)
      continue
    }
    if (token.type !== 'inline' || token.children === null) continue

    const html: HtmlState = { tags: [] }
    let linkDepth = 0
    for (const child of token.children) {
      switch (child.type) {
        case 'text':
          if (!inHtmlCode(html)) {
            line = appendText(rendered, child.content, line, linkDepth > 0 || htmlHasLink(html)).line
          } else {
            line += lineBreakCount(child.content)
          }
          break
        case 'softbreak':
        case 'hardbreak':
          if (!inHtmlCode(html)) appendSpace(rendered, line, linkDepth > 0 || htmlHasLink(html))
          line += 1
          break
        case 'code_inline':
          if (!inHtmlCode(html)) {
            const command = COMMAND.test(child.content.trim())
            const appended = appendText(
              rendered,
              child.content,
              line,
              linkDepth > 0 || htmlHasLink(html),
              true,
              command,
            )
            line = appended.line
            if (command) markExcluded(rendered, appended.start, rendered.text.length)
          }
          break
        case 'link_open':
          linkDepth += 1
          break
        case 'link_close':
          linkDepth = Math.max(0, linkDepth - 1)
          break
        case 'image':
          if (!inHtmlCode(html)) line = appendText(rendered, child.content, line, true).line
          break
        case 'html_inline':
          handleInlineHtml(child.content, line, rendered, html)
          line += lineBreakCount(child.content)
          break
        default:
          break
      }
    }
  }
  return rendered
}

function emptyRendered(): Rendered {
  return { text: '', lines: [], links: [], code: [], excluded: [] }
}

function appendText(
  rendered: Rendered,
  source: string,
  initialLine: number,
  link = false,
  code = false,
  excluded = false,
): AppendedText {
  const start = rendered.text.length
  let line = initialLine
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] as string
    if (/\s/u.test(character)) {
      appendSpace(rendered, line, link, code, excluded)
      if (character === '\n') line += 1
      continue
    }
    rendered.text += character
    rendered.lines.push(line)
    rendered.links.push(link)
    rendered.code.push(code)
    rendered.excluded.push(excluded)
  }
  return { start, line }
}

function appendSpace(rendered: Rendered, line: number, link = false, code = false, excluded = false): void {
  if (rendered.text === '' || rendered.text.endsWith(' ')) return
  rendered.text += ' '
  rendered.lines.push(line)
  rendered.links.push(link)
  rendered.code.push(code)
  rendered.excluded.push(excluded)
}

function markExcluded(rendered: Rendered, start: number, end: number): void {
  for (let index = start; index < end; index += 1) rendered.excluded[index] = true
}

function handleInlineHtml(source: string, line: number, rendered: Rendered, state: HtmlState): void {
  if (/^\s*<!--/.test(source)) return
  const match = /^<\s*(\/?)\s*([A-Za-z][A-Za-z0-9:-]*)/.exec(source)
  if (match === null) return
  const closing = match[1] === '/'
  const tag = (match[2] as string).toLowerCase()
  if (tag === 'br') {
    if (!inHtmlCode(state)) appendSpace(rendered, line, htmlHasLink(state))
    return
  }
  if (closing) {
    const index = state.tags.lastIndexOf(tag)
    if (index >= 0) state.tags.splice(index, 1)
    if (HTML_SPACING_TAGS.has(tag)) appendSpace(rendered, line, htmlHasLink(state))
    return
  }
  if (HTML_SPACING_TAGS.has(tag)) appendSpace(rendered, line, htmlHasLink(state))
  if (HTML_CODE_TAGS.has(tag) || tag === 'a') {
    if (!/\/\s*>$/.test(source)) state.tags.push(tag)
  }
}

function lineBreakCount(source: string): number {
  return (source.match(/\n/g) ?? []).length
}

function renderHtmlBlock(source: string, line: number, rendered: Rendered): void {
  let fragment: DefaultTreeAdapterTypes.DocumentFragment
  try {
    fragment = parseFragment(source, { sourceCodeLocationInfo: true })
  } catch {
    return
  }
  const nodeLine = (node: DefaultTreeAdapterTypes.Node): number =>
    line + ((node.sourceCodeLocation?.startLine ?? 1) - 1)
  const walk = (node: DefaultTreeAdapterTypes.Node, link: boolean, code: boolean): void => {
    if (node.nodeName === '#text') {
      if (!code) appendText(rendered, (node as DefaultTreeAdapterTypes.TextNode).value, nodeLine(node), link)
      return
    }
    const element = node as DefaultTreeAdapterTypes.Element
    const tag = element.tagName?.toLowerCase()
    const nestedLink = link || tag === 'a'
    const nestedCode = code || (tag !== undefined && HTML_CODE_TAGS.has(tag))
    if (tag === 'br') {
      if (!nestedCode) appendSpace(rendered, nodeLine(node), nestedLink)
      return
    }
    if (tag !== undefined && HTML_SPACING_TAGS.has(tag)) {
      if (!nestedCode) appendSpace(rendered, nodeLine(node), nestedLink)
    }
    for (const child of element.childNodes ?? []) walk(child, nestedLink, nestedCode)
  }
  for (const child of fragment.childNodes) walk(child, false, false)
}

function inHtmlCode(state: HtmlState): boolean {
  return state.tags.some((tag) => HTML_CODE_TAGS.has(tag))
}

function htmlHasLink(state: HtmlState): boolean {
  return state.tags.includes('a')
}

function pathExclusionMask(text: string): boolean[] {
  const mask = Array<boolean>(text.length).fill(false)
  for (const match of text.matchAll(/\S+/gu)) {
    const raw = match[0]
    const rawStart = match.index
    let start = 0
    let end = raw.length
    while (start < end && TRIM_EDGE.has(raw[start] as string)) start += 1
    while (end > start && TRIM_EDGE.has(raw[end - 1] as string)) end -= 1
    const token = raw.slice(start, end)
    if (!isPathLike(token)) continue
    for (let index = rawStart + start; index < rawStart + end; index += 1) mask[index] = true
  }
  return mask
}

function isPathLike(token: string): boolean {
  return (
    token.includes('/') ||
    token.includes('\\') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(token) ||
    token.startsWith('.agents/') ||
    /^[A-Za-z0-9_.-]+\.[A-Za-z0-9]+$/u.test(token)
  )
}

function excludedRange(mask: boolean[], start: number, end: number): boolean {
  for (let index = start; index < end; index += 1) {
    if (mask[index]) return true
  }
  return false
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

main()

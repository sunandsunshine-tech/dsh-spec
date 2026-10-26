#!/usr/bin/env node
// Source for scripts/verify-skill-spec.mjs — the mechanical half of Agent Skills conformance.
//
// dependencies   yaml (bundled); node: builtins only
// runtime        Node.js 22.19+ or 24+
// input          a skill directory; default is this script's parent's parent
// output         one line per check on stdout, or a JSON summary with --json
// exit           0 every check passed · 1 a check failed · 2 usage error
// specification  https://agentskills.io/specification
//
// The numeric limits are CLI options. Their defaults are the values current at the
// time of writing; a caller passes the current specification's values when they change.
// Trigger quality and script design are judgement, not counting; they stay out of
// this script and live in the Agent Skills guides the skill names.

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import { parseFragment } from 'parse5'
import { parseDocument } from 'yaml'

const USAGE = `usage: verify-skill-spec.mjs [<skill-dir>] [options] [--help]

Check a skill directory against the Agent Skills specification. With no directory,
check the one this script is installed in.

Frontmatter keys are a closed set: name, description, license, compatibility, metadata and
allowed-tools; any other top-level key fails. allowed-tools is a space-separated string without
commas.

  <skill-dir>                 the skill to check; default is this script's parent's parent
  --json                      print a JSON summary ({ root, results }) instead of lines
  --name-max <n>              maximum name length (default 64)
  --description-max <n>       maximum description length (default 1024)
  --compatibility-max <n>     maximum compatibility length (default 500)
  --max-lines <n>             SKILL.md must stay under this line count (default 500, the current specification value)
  --max-tokens <n>            body tokens must stay under this count (default 5000, the current specification value)
  --cjk-tokens-per-char <n>   tokens per CJK character (default 1.1)
  --other-tokens-per-char <n> tokens per non-CJK character (default 0.303)
  --chars-per-token <n>       compatibility alias for --other-tokens-per-char (1/n)
  --help                      print this and exit 0

examples:
  verify-skill-spec.mjs
  verify-skill-spec.mjs skills/my-skill
  verify-skill-spec.mjs skills/my-skill --json
  verify-skill-spec.mjs skills/my-skill --max-lines 500 --max-tokens 5000

exit: 0 every check passed · 1 a check failed · 2 usage error

With --json, the summary is printed after the checks; usage failures print an error to stderr.`

const REQUIRED = ['name', 'description']
const OPTIONAL = ['license', 'compatibility', 'metadata', 'allowed-tools']
const TRANSLATION_FILE = /(^|\/)[^/]+\.[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*\.md$/

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Both directory names are in use: the guides name `scripts/`, this repository's package writes `script/`.
// The left boundary keeps `proofscript/` from matching and checks the captured path only.
const SCRIPT = /(?:^|[^A-Za-z0-9._/-])((?:\.\/)?(?:scripts?)\/[A-Za-z0-9._/-]+\.[A-Za-z0-9]+)/g
const REFERENCE = /(?:^|[^A-Za-z0-9._/-])((?:\.\/)?references\/[A-Za-z0-9._/-]+\.md)/g
const SPEC_NAME_MAX = 64
const SPEC_DESCRIPTION_MAX = 1024
const SPEC_COMPATIBILITY_MAX = 500
const SPEC_MAX_LINES = 500
const SPEC_MAX_TOKENS = 5000
const markdown = new MarkdownIt({ html: true })

const limits = {
  nameMax: SPEC_NAME_MAX,
  descriptionMax: SPEC_DESCRIPTION_MAX,
  compatibilityMax: SPEC_COMPATIBILITY_MAX,
  maxLines: 500,
  maxTokens: 5000,
  cjkTokensPerChar: 1.1,
  otherTokensPerChar: 1 / 3.3,
}

const usageError = (message: string): never => {
  console.error(`Error: ${message}`)
  console.error(USAGE)
  process.exit(2)
}

const results: { check: string; ok: boolean; detail: string }[] = []
const record = (check: string, ok: boolean, detail: string) => {
  results.push({ check, ok, detail })
}

const argv = process.argv.slice(2)
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(USAGE)
  process.exit(0)
}

const numericOptions = new Map<string, { set: (value: number) => void; integer: boolean; positive: boolean }>([
  ['--name-max', { set: (value) => (limits.nameMax = value), integer: true, positive: true }],
  ['--description-max', { set: (value) => (limits.descriptionMax = value), integer: true, positive: true }],
  [
    '--compatibility-max',
    {
      set: (value) => (limits.compatibilityMax = value),
      integer: true,
      positive: true,
    },
  ],
  ['--max-lines', { set: (value) => (limits.maxLines = value), integer: true, positive: true }],
  ['--max-tokens', { set: (value) => (limits.maxTokens = value), integer: true, positive: true }],
  ['--cjk-tokens-per-char', { set: (value) => (limits.cjkTokensPerChar = value), integer: false, positive: true }],
  ['--other-tokens-per-char', { set: (value) => (limits.otherTokensPerChar = value), integer: false, positive: true }],
])

const readNumber = (name: string, raw: string | undefined, integer: boolean): number => {
  const value = Number(raw)
  if (!raw || !Number.isFinite(value) || value <= 0) {
    usageError(`${name} needs a positive number, got ${raw ?? '(missing)'}`)
  }
  if (integer && !Number.isInteger(value)) {
    usageError(`${name} needs an integer, got ${raw}`)
  }
  return value
}

const flags = new Set<string>()
const positionals: string[] = []
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]
  if (arg === '--json') {
    flags.add(arg)
    continue
  }
  if (arg.startsWith('--')) {
    const [name, inline] = arg.includes('=')
      ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
      : [arg, undefined]
    if (name === '--chars-per-token') {
      const raw = inline ?? argv[(i += 1)]
      const value = readNumber(name, raw, false)
      if (value <= 1 || value > 10) usageError(`${name} needs a number greater than 1 and at most 10, got ${raw}`)
      limits.otherTokensPerChar = 1 / value
      continue
    }
    const option = numericOptions.get(name)
    if (!option) usageError(`unknown option: ${name}`)
    const raw = inline ?? argv[(i += 1)]
    option.set(readNumber(name, raw, option.integer))
    continue
  }
  if (arg.startsWith('-')) usageError(`unknown option: ${arg}`)
  positionals.push(arg)
}

if (positionals.length > 1)
  usageError(`expected one skill directory, got ${positionals.length}: ${positionals.join(', ')}`)
const asJson = flags.has('--json')
const root = positionals[0] ? resolve(positionals[0]) : resolve(dirname(fileURLToPath(import.meta.url)), '..')

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Error: ${root} is not a directory`)
  console.error(USAGE)
  process.exit(2)
}

const skillFile = join(root, 'SKILL.md')
if (!existsSync(skillFile)) {
  record('SKILL.md', false, 'missing at the skill root')
} else if (!statSync(skillFile).isFile()) {
  record('SKILL.md', false, 'not a regular file')
} else {
  const raw = readFileSync(skillFile, 'utf8')
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const lineCount = text.endsWith('\n') ? lines.length - 1 : lines.length
  record('SKILL.md', true, `${lineCount} lines`)
  const bodyStart = lines[0] === '---' ? lines.indexOf('---', 1) : -1
  const bodyText = bodyStart >= 0 ? lines.slice(bodyStart + 1).join('\n') : text

  const close = lines[0] === '---' ? lines.indexOf('---', 1) : -1
  if (close < 0) {
    record('frontmatter', false, 'no --- block at the top')
  } else {
    const block = lines.slice(1, close).join('\n')
    const doc = parseDocument(block, { uniqueKeys: true })
    if (doc.errors.length > 0) {
      record('frontmatter', false, `YAML: ${doc.errors[0].message}`)
    } else {
      let data: unknown
      let mapData: unknown
      try {
        data = doc.toJS()
        mapData = doc.toJS({ mapAsMap: true })
      } catch (error) {
        data = undefined
        mapData = undefined
        record('frontmatter', false, `YAML: ${error instanceof Error ? error.message : String(error)}`)
      }
      if (data === undefined) {
        // The error was already recorded above.
      } else if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        record('frontmatter', false, 'YAML must be a mapping')
      } else {
        const fields = data as Record<string, unknown>
        const keys = Object.keys(fields)
        const unknown = keys.filter((key) => !REQUIRED.includes(key) && !OPTIONAL.includes(key))
        record(
          'frontmatter fields',
          unknown.length === 0,
          unknown.length ? `unknown: ${unknown.join(', ')}` : keys.join(', '),
        )

        const name = fields.name
        const nameOk =
          typeof name === 'string' &&
          name.length > 0 &&
          name.length <= limits.nameMax &&
          NAME.test(name) &&
          name === basename(root)
        record(
          'name',
          nameOk,
          typeof name === 'string' ? `${name} (dir: ${basename(root)})` : '(missing or not a string)',
        )

        const descriptionText = typeof fields.description === 'string' ? fields.description : undefined
        const description = descriptionText === undefined ? [] : [...descriptionText]
        record(
          'description',
          descriptionText !== undefined &&
            descriptionText.trim().length > 0 &&
            description.length <= limits.descriptionMax,
          `${description.length} characters`,
        )

        if (keys.includes('compatibility')) {
          const compatibilityText = typeof fields.compatibility === 'string' ? fields.compatibility : undefined
          const compatibility = compatibilityText === undefined ? [] : [...compatibilityText]
          record(
            'compatibility',
            compatibilityText !== undefined &&
              compatibilityText.trim().length > 0 &&
              compatibility.length <= limits.compatibilityMax,
            `${compatibility.length} characters`,
          )
        }
        for (const key of ['license', 'allowed-tools'] as const) {
          if (!keys.includes(key)) continue
          const value = fields[key]
          const ok =
            typeof value === 'string' &&
            value.length > 0 &&
            (key !== 'allowed-tools' || /^\S+(?: +\S+)*$/.test(value)) &&
            (key !== 'allowed-tools' || !value.includes(','))
          record(
            key,
            ok,
            typeof value !== 'string'
              ? 'not a string'
              : ok
                ? `${value.length} characters`
                : `not a space-separated string without commas: ${value.length} characters`,
          )
        }
        if (keys.includes('metadata')) {
          const metadata = mapData instanceof Map ? mapData.get('metadata') : undefined
          const entries = metadata instanceof Map ? [...metadata.entries()] : []
          const badKeys = entries.filter(([key]) => typeof key !== 'string')
          const badValues = entries.filter(([, value]) => typeof value !== 'string')
          record(
            'metadata',
            metadata instanceof Map && badKeys.length === 0 && badValues.length === 0,
            badKeys.length
              ? `a key must be a string: ${badKeys.length} found`
              : badValues.length
                ? `a value must be a string: ${badValues.length} found`
                : `${entries.length} string entries`,
          )
        }
      }
    }
  }

  const normalizePath = (value: string): string => value.replace(/^\.\//, '').replace(/\\/g, '/')
  const scriptMentions = [...new Set([...bodyText.matchAll(SCRIPT)].map((match) => normalizePath(match[1] as string)))]
  const missingScripts = scriptMentions.filter((path) => !existsSync(join(root, path)))
  record(
    'script mentions',
    missingScripts.length === 0,
    missingScripts.length
      ? `missing: ${missingScripts.join(', ')}`
      : scriptMentions.length
        ? scriptMentions.join(', ')
        : 'none mentioned',
  )
  const shippedScripts = scriptFiles(root)
  const namedScripts = new Set(scriptMentions)
  const unmentionedScripts = shippedScripts.filter((path) => !namedScripts.has(path) && !bodyText.includes(path))
  record(
    'script coverage',
    unmentionedScripts.length === 0,
    unmentionedScripts.length
      ? `not named in SKILL.md: ${unmentionedScripts.join(', ')}`
      : shippedScripts.length
        ? `${shippedScripts.length} script(s) named`
        : 'none shipped',
  )

  const referencesDir = join(root, 'references')
  let referencesIsDirectory = false
  if (existsSync(referencesDir)) {
    try {
      referencesIsDirectory = statSync(referencesDir).isDirectory()
    } catch {
      referencesIsDirectory = false
    }
    record(
      'references directory',
      referencesIsDirectory,
      referencesIsDirectory ? relative(root, referencesDir) : 'references is not a directory',
    )
  }

  const files = [skillFile]
  if (referencesIsDirectory) files.push(...markdownFiles(referencesDir).filter((file) => !TRANSLATION_FILE.test(file)))

  const links: string[] = []
  const broken: string[] = []
  const escaped: string[] = []
  const absolute: string[] = []
  const deep: string[] = []
  const realRoot = realpathSync(root)
  for (const file of files) {
    const markdownText = bodyOf(
      readFileSync(file, 'utf8')
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n'),
    )
    for (const rawTarget of linksFromMarkdown(markdownText)) {
      const target = rawTarget.trim()
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('//')) continue
      let targetPath = target.split(/[?#]/, 1)[0] as string
      try {
        targetPath = decodeURIComponent(targetPath)
      } catch {
        // keep the undecoded path
      }
      targetPath = targetPath.replace(/^<|>$/g, '')
      if (targetPath === '') continue
      if (isAbsolute(targetPath)) {
        absolute.push(target)
        continue
      }
      links.push(target)
      const resolved = resolve(dirname(file), targetPath)
      if (!isInside(root, resolved)) escaped.push(target)
      else if (!existsSync(resolved)) broken.push(target)
      else {
        let realTarget: string
        try {
          realTarget = realpathSync(resolved)
        } catch {
          broken.push(target)
          continue
        }
        if (!isInside(realRoot, realTarget)) escaped.push(target)
        else if (pathComponents(relative(root, resolved)).length > 2) deep.push(target)
      }
    }
  }
  record(
    'links stay inside',
    escaped.length === 0 && absolute.length === 0,
    escaped.length
      ? `escaping: ${escaped.join(', ')}`
      : absolute.length
        ? `absolute: ${absolute.join(', ')}`
        : `${links.length} relative link(s)`,
  )
  record('links resolve', broken.length === 0, broken.length ? `missing: ${broken.join(', ')}` : 'all resolve')
  record(
    'link depth',
    deep.length === 0,
    deep.length ? `deeper than one level: ${deep.join(', ')}` : 'nothing deeper than one level',
  )

  const referenceFiles = referencesIsDirectory
    ? markdownFiles(referencesDir).filter((file) => !TRANSLATION_FILE.test(file))
    : []
  const normalizedText = bodyText.replace(/\\/g, '/')
  const unnamed = referenceFiles
    .map((file) => relative(root, file).replace(/\\/g, '/'))
    .filter((path) => !normalizedText.includes(path))
  record(
    'reference mentions',
    unnamed.length === 0,
    referenceFiles.length === 0
      ? 'none shipped'
      : unnamed.length
        ? `not named in SKILL.md: ${unnamed.join(', ')}`
        : `${referenceFiles.length} reference(s) named`,
  )

  const referenced = [
    ...new Set(
      [...bodyText.matchAll(REFERENCE)].map((match) => normalizePath(match[1] as string).split(/[?#]/, 1)[0] as string),
    ),
  ]
  const missingReferences = referenced.filter((path) => !existsSync(join(root, path)))
  const deepReferences = referenced.filter((path) => pathComponents(path).length > 2)
  record(
    'reference targets',
    missingReferences.length === 0 && deepReferences.length === 0,
    missingReferences.length
      ? `missing: ${missingReferences.join(', ')}`
      : deepReferences.length
        ? `deeper than one level: ${deepReferences.join(', ')}`
        : referenced.length
          ? `${referenced.length} path(s) named`
          : 'none named',
  )

  const characters = [...bodyText]
  const cjk =
    /[\u1100-\u11ff\u2e80-\u2fff\u3000-\u303f\u3040-\u30ff\u3100-\u31ff\u3400-\u4dbf\u4e00-\u9fff\ua960-\ua97f\uac00-\ud7af\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]|[\u{20000}-\u{2fa1f}]/u
  let cjkCount = 0
  let others = 0
  for (const char of characters) {
    if (cjk.test(char)) cjkCount += 1
    else others += 1
  }
  const estimate = Math.ceil(cjkCount * limits.cjkTokensPerChar + others * limits.otherTokensPerChar)
  const withinBudget = lineCount < limits.maxLines && estimate < limits.maxTokens
  const budgetDetail = withinBudget
    ? `${lineCount} lines, ~${estimate} tokens at ${limits.cjkTokensPerChar} CJK / ${limits.otherTokensPerChar.toFixed(3)} other tokens/char (limit: under ${limits.maxLines} lines and ${limits.maxTokens} tokens)`
    : `OVER the limit — ${lineCount} lines, ~${estimate} tokens at ${limits.cjkTokensPerChar} CJK / ${limits.otherTokensPerChar.toFixed(3)} other tokens/char (limit: under ${limits.maxLines} lines and ${limits.maxTokens} tokens)`
  record('budget', withinBudget, budgetDetail)
}

if (asJson) {
  console.log(JSON.stringify({ root: relative(process.cwd(), root), results }, null, 2))
} else {
  for (const item of results) console.log(`${item.ok ? 'ok  ' : 'FAIL'} ${item.check} — ${item.detail}`)
  const failed = results.filter((item) => !item.ok).length
  console.log(`${results.length} check(s), ${failed} failed`)
}
process.exit(results.some((item) => !item.ok) ? 1 : 0)

/** The Markdown after the YAML frontmatter, when the frontmatter closes. */
function bodyOf(source: string): string {
  const lines = source.split('\n')
  if (lines[0] !== '---') return source
  const close = lines.indexOf('---', 1)
  return close < 0 ? source : lines.slice(close + 1).join('\n')
}

/** Links and images from one Markdown document, including reference-style and HTML forms. */
function linksFromMarkdown(source: string): string[] {
  const links: string[] = []
  for (const token of markdown.parse(source, {})) {
    if (token.type === 'html_block' && token.content) links.push(...htmlLinks(token.content))
    if (token.type !== 'inline' || !token.children) continue
    for (const child of token.children) {
      if (child.type === 'link_open') {
        const href = child.attrGet('href')
        if (href) links.push(href)
      } else if (child.type === 'image') {
        const src = child.attrGet('src')
        if (src) links.push(src)
      } else if (child.type === 'html_inline' && child.content) {
        links.push(...htmlLinks(child.content))
      }
    }
  }
  return links
}

/** The href and src attributes of a raw HTML fragment, or nothing when it does not parse. */
function htmlLinks(source: string): string[] {
  try {
    const fragment = parseFragment(source)
    const links: string[] = []
    const walk = (node: unknown): void => {
      const candidate = node as { attrs?: { name: string; value: string }[]; childNodes?: unknown[] }
      for (const attribute of candidate.attrs ?? []) {
        if (attribute.name === 'href' || attribute.name === 'src') links.push(attribute.value)
      }
      for (const child of candidate.childNodes ?? []) walk(child)
    }
    walk(fragment)
    return links
  } catch {
    return []
  }
}

/** Every regular file under scripts/ and the legacy script/, relative to the skill root. */
function scriptFiles(root: string): string[] {
  const files: string[] = []
  const walk = (dir: string): void => {
    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) files.push(relative(root, path).replace(/\\/g, '/'))
    }
  }
  for (const name of ['scripts', 'script']) {
    const dir = join(root, name)
    if (existsSync(dir)) walk(dir)
  }
  return files.sort()
}

function markdownFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...markdownFiles(path))
    else if (entry.name.endsWith('.md')) out.push(path)
  }
  return out
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !path.startsWith(sep) && !isAbsolute(path))
}

function pathComponents(path: string): string[] {
  return path === '' ? [] : path.split(/[\\/]/)
}

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

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const USAGE = `usage: verify-skill-spec.mjs [<skill-dir>] [options] [--help]

Check a skill directory against the Agent Skills specification. With no directory,
check the one this script is installed in.

  <skill-dir>                 the skill to check; default is this script's parent's parent
  --json                      print a JSON summary ({ root, results }) instead of lines
  --strict-budget             fail when SKILL.md exceeds the line or token limits
  --name-max <n>              maximum name length (default 64)
  --description-max <n>       maximum description length (default 1024)
  --compatibility-max <n>     maximum compatibility length (default 500)
  --max-lines <n>             maximum SKILL.md lines (default 500)
  --max-tokens <n>            maximum body tokens (default 5000)
  --cjk-tokens-per-char <n>   tokens per CJK character (default 1.1)
  --other-tokens-per-char <n> tokens per non-CJK character (default 0.303)
  --chars-per-token <n>       compatibility alias for --other-tokens-per-char (1/n)
  --help                      print this and exit 0

examples:
  verify-skill-spec.mjs
  verify-skill-spec.mjs skills/my-skill
  verify-skill-spec.mjs skills/my-skill --strict-budget --json
  verify-skill-spec.mjs skills/my-skill --max-lines 500 --max-tokens 5000

exit: 0 every check passed · 1 a check failed · 2 usage error`

const REQUIRED = ['name', 'description']
const OPTIONAL = ['license', 'compatibility', 'metadata', 'allowed-tools']
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Both directory names are in use: the guides name `scripts/`, this repository's package writes `script/`.
// The left boundary keeps `proofscript/` from matching and checks the captured path only.
const SCRIPT = /(?:^|[^A-Za-z0-9._/-])((?:scripts?)\/[A-Za-z0-9._-]+\.(?:ts|mjs|js|py|sh))/g
const LINK = /\]\(([^)\s]+)\)/g
const FENCE = /^ {0,3}(```|~~~)[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm

const limits = {
  nameMax: 64,
  descriptionMax: 1024,
  compatibilityMax: 500,
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
  ['--compatibility-max', { set: (value) => (limits.compatibilityMax = value), integer: true, positive: true }],
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
  if (arg === '--json' || arg === '--strict-budget') {
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
const strictBudget = flags.has('--strict-budget')
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

        const description = typeof fields.description === 'string' ? [...fields.description] : []
        record(
          'description',
          typeof fields.description === 'string' &&
            description.length > 0 &&
            description.length <= limits.descriptionMax,
          `${description.length} characters`,
        )

        if (keys.includes('compatibility')) {
          const compatibility = typeof fields.compatibility === 'string' ? [...fields.compatibility] : []
          record(
            'compatibility',
            typeof fields.compatibility === 'string' &&
              compatibility.length > 0 &&
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
            (key !== 'allowed-tools' || (value.trim() === value && !/[\n\r\t]/.test(value) && !/ {2,}/.test(value)))
          record(key, ok, typeof value === 'string' ? `${value.length} characters` : 'not a string')
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

  const codeSpans = [...text.matchAll(/`([^`\n]+)`/g)].map((match) => match[1])
  const mentions = [...new Set(codeSpans.flatMap((span) => [...span.matchAll(SCRIPT)].map((match) => match[1])))]
  const missingScripts = mentions.filter((path) => !existsSync(join(root, path)))
  record('script mentions', missingScripts.length === 0, mentions.length ? mentions.join(', ') : 'none mentioned')

  const files = [skillFile]
  const referencesDir = join(root, 'references')
  if (existsSync(referencesDir)) files.push(...markdownFiles(referencesDir))

  const links: string[] = []
  const broken: string[] = []
  const escaped: string[] = []
  const deep: string[] = []
  for (const file of files) {
    const markdown = readFileSync(file, 'utf8')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(FENCE, '')
    for (const match of markdown.matchAll(LINK)) {
      const target = match[1]
      if (/^[a-z][a-z0-9+.-]*:|^#/.test(target)) continue
      links.push(target)
      const resolved = resolve(dirname(file), target)
      if (!isInside(root, resolved)) escaped.push(target)
      else if (!existsSync(resolved)) broken.push(target)
      else if (pathComponents(relative(root, resolved)).length > 2) deep.push(target)
    }
  }
  record(
    'links stay inside',
    escaped.length === 0,
    escaped.length ? `escaping: ${escaped.join(', ')}` : `${links.length} relative link(s)`,
  )
  record('links resolve', broken.length === 0, broken.length ? `missing: ${broken.join(', ')}` : 'all resolve')
  record(
    'link depth',
    deep.length === 0,
    deep.length ? `deeper than one level: ${deep.join(', ')}` : 'nothing deeper than one level',
  )

  const referenceFiles = existsSync(referencesDir) ? markdownFiles(referencesDir) : []
  const unnamed = referenceFiles.map((file) => relative(root, file)).filter((path) => !text.includes(path))
  record(
    'reference mentions',
    unnamed.length === 0,
    referenceFiles.length === 0
      ? 'none shipped'
      : unnamed.length
        ? `not named in SKILL.md: ${unnamed.join(', ')}`
        : `${referenceFiles.length} reference(s) named`,
  )

  const bodyStart = lines[0] === '---' ? lines.indexOf('---', 1) : -1
  const bodyText = bodyStart >= 0 ? lines.slice(bodyStart + 1).join('\n') : text
  const characters = [...bodyText]
  const ideograph = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
  const cjkOther = /[\u3000-\u303f\uff00-\uffef]/
  let ideographs = 0
  let cjkOthers = 0
  let others = 0
  for (const char of characters) {
    if (ideograph.test(char)) ideographs += 1
    else if (cjkOther.test(char)) cjkOthers += 1
    else others += 1
  }
  const estimate = Math.ceil((ideographs + cjkOthers) * limits.cjkTokensPerChar + others * limits.otherTokensPerChar)
  const withinBudget = lineCount < limits.maxLines && estimate < limits.maxTokens
  const budgetDetail = withinBudget
    ? `${lineCount} lines, ~${estimate} tokens at ${limits.cjkTokensPerChar} CJK / ${limits.otherTokensPerChar.toFixed(3)} other tokens/char (limit: under ${limits.maxLines} lines and ${limits.maxTokens} tokens)`
    : `OVER the limit — ${lineCount} lines, ~${estimate} tokens at ${limits.cjkTokensPerChar} CJK / ${limits.otherTokensPerChar.toFixed(3)} other tokens/char (limit: under ${limits.maxLines} lines and ${limits.maxTokens} tokens); route content out, then rerun with --strict-budget`
  record('budget', !strictBudget || withinBudget, budgetDetail)
}

if (asJson) {
  console.log(JSON.stringify({ root: relative(process.cwd(), root), results }, null, 2))
} else {
  for (const item of results) console.log(`${item.ok ? 'ok  ' : 'FAIL'} ${item.check} — ${item.detail}`)
  const failed = results.filter((item) => !item.ok).length
  console.log(`${results.length} check(s), ${failed} failed`)
}
process.exit(results.some((item) => !item.ok) ? 1 : 0)

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

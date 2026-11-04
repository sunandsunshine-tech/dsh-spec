#!/usr/bin/env node
// verify-skill-spec.ts — the mechanical half of Agent Skills conformance.
//
// dependencies   none (node: builtins only)
// runtime        Node.js 22.19+ or 24+ (TypeScript type stripping)
// input          a skill directory; default is this script's parent's parent
// output         one line per check on stdout, or a JSON summary with --json
// exit           0 every check passed · 1 a check failed · 2 usage error
// specification  https://agentskills.io/specification
//
// Trigger quality and script design are judgement, not counting; they stay out of
// this script and live in ../references/spec-checks.md.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const USAGE = `usage: verify-skill-spec.ts [<skill-dir>] [--json] [--strict-budget] [--chars-per-token <n>] [--help]

Check a skill directory against the Agent Skills specification. With no directory,
check the one this script is installed in.

  <skill-dir>       the skill to check; default is this script's parent's parent
  --json            print a JSON summary ({ root, results }) instead of lines
  --strict-budget   fail when SKILL.md exceeds the default: under 500 lines, 5,000 tokens
  --chars-per-token <n>
                    estimate n non-CJK characters as one token; default 3.3, the
                    conservative end for models released in 2026. A tokenizer that
                    splits the same text into more tokens needs a lower number. CJK
                    ideographs are charged 1.1 tokens each; CJK punctuation and
                    fullwidth forms one.
  --help            print this and exit 0

examples:
  verify-skill-spec.ts
  verify-skill-spec.ts skills/my-skill
  verify-skill-spec.ts skills/my-skill --strict-budget --json
  verify-skill-spec.ts skills/my-skill --strict-budget --chars-per-token 3.2

exit: 0 every check passed · 1 a check failed · 2 usage error`

const REQUIRED = ['name', 'description']
const OPTIONAL = ['license', 'compatibility', 'metadata', 'allowed-tools']
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SCALAR = /^(?:-?\d+(?:\.\d+)?|true|false|null|~)$/i
const unquote = (value: string): string => value.replace(/^(['"])(.*)\1$/, '$2')
const SCRIPT = /scripts\/[A-Za-z0-9._-]+\.(?:ts|mjs|js|py|sh)/g
const LINK = /\]\(([^)\s]+)\)/g
const MAX_LINES = 500
const MAX_TOKENS = 5000
const DEFAULT_CHARS_PER_TOKEN = 3.3

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
const KNOWN = new Set(['--json', '--strict-budget'])
let charsPerToken = DEFAULT_CHARS_PER_TOKEN
const positionals: string[] = []
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]
  if (arg === '--chars-per-token' || arg.startsWith('--chars-per-token=')) {
    const raw = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[(i += 1)]
    const value = Number(raw)
    if (!raw || !Number.isFinite(value) || value <= 1 || value > 10) {
      usageError(`--chars-per-token needs a number greater than 1 and at most 10, got ${raw ?? '(missing)'}`)
    }
    charsPerToken = value
  } else if (arg.startsWith('-') && !KNOWN.has(arg)) {
    usageError(`unknown option: ${arg}`)
  } else if (!arg.startsWith('-')) {
    positionals.push(arg)
  }
}
if (positionals.length > 1) usageError(`expected one skill directory, got ${positionals.length}: ${positionals.join(', ')}`)
const asJson = argv.includes('--json')
const strictBudget = argv.includes('--strict-budget')
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
  const text = readFileSync(skillFile, 'utf8')
  const lines = text.split('\n')
  const lineCount = text.endsWith('\n') ? lines.length - 1 : lines.length
  record('SKILL.md', true, `${lineCount} lines`)

  const close = lines[0] === '---' ? lines.indexOf('---', 1) : -1
  if (close < 0) {
    record('frontmatter', false, 'no --- block at the top')
  } else {
    const block = lines.slice(1, close)
    const fields = new Map<string, string>()
    const duplicates: string[] = []
    const metadataLines: string[] = []
    let last = ''
    for (const line of block) {
      const top = /^([A-Za-z][A-Za-z0-9-]*):(.*)$/.exec(line)
      if (top) {
        last = top[1]
        if (fields.has(last)) duplicates.push(last)
        fields.set(last, top[2].trim())
      } else if (/^\s+\S/.test(line)) {
        if (last === 'metadata') metadataLines.push(line)
        else if (last) fields.set(last, `${fields.get(last) ?? ''} ${line.trim()}`.trim())
      }
    }
    const keys = [...fields.keys()]
    const unknown = keys.filter((key) => !REQUIRED.includes(key) && !OPTIONAL.includes(key))
    const fieldProblems = [
      unknown.length ? `unknown: ${unknown.join(', ')}` : '',
      duplicates.length ? `duplicate: ${duplicates.join(', ')}` : '',
    ].filter(Boolean)
    record('frontmatter fields', fieldProblems.length === 0, fieldProblems.length ? fieldProblems.join('; ') : keys.join(', '))

    const name = unquote(fields.get('name') ?? '')
    const nameOk = name.length > 0 && name.length <= 64 && NAME.test(name) && name === basename(root)
    record('name', nameOk, name ? `${name} (dir: ${basename(root)})` : '(missing)')

    const description = [...unquote(fields.get('description') ?? '')]
    record('description', description.length > 0 && description.length <= 1024, `${description.length} characters`)

    if (keys.includes('compatibility')) {
      const compatibility = [...unquote(fields.get('compatibility') ?? '')]
      record('compatibility', compatibility.length > 0 && compatibility.length <= 500, `${compatibility.length} characters`)
    }
    if (keys.includes('metadata')) {
      const shaped = metadataLines.every((line) => /^\s+[A-Za-z][A-Za-z0-9_-]*:\s*\S/.test(line))
      const scalar = metadataLines.filter((line) => {
        const value = line.replace(/^\s+[A-Za-z][A-Za-z0-9_-]*:\s*/, '')
        return value === unquote(value) && SCALAR.test(value)
      })
      record(
        'metadata',
        shaped && scalar.length === 0,
        scalar.length ? `a value must be a string: ${scalar.length} found` : `${metadataLines.length} string entries`,
      )
    }
  }

  const codeSpans = [...text.matchAll(/`([^`\n]+)`/g)].map((match) => match[1])
  const mentions = [...new Set(codeSpans.flatMap((span) => [...span.matchAll(SCRIPT)].map((match) => match[0])))]
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
    for (const match of readFileSync(file, 'utf8').matchAll(LINK)) {
      const target = match[1]
      if (/^[a-z][a-z0-9+.-]*:|^#/.test(target)) continue
      links.push(target)
      const resolved = resolve(dirname(file), target)
      if (!resolved.startsWith(`${root}/`)) escaped.push(target)
      else if (!existsSync(resolved)) broken.push(target)
      else if (relative(root, resolved).split('/').length > 2) deep.push(target)
    }
  }
  record('links stay inside', escaped.length === 0, escaped.length ? `escaping: ${escaped.join(', ')}` : `${links.length} relative link(s)`)
  record('links resolve', broken.length === 0, broken.length ? `missing: ${broken.join(', ')}` : 'all resolve')
  record('link depth', deep.length === 0, deep.length ? `deeper than one level: ${deep.join(', ')}` : 'nothing deeper than one level')

  const referenceFiles = existsSync(referencesDir) ? markdownFiles(referencesDir) : []
  const unnamed = referenceFiles.map((file) => relative(root, file)).filter((path) => !text.includes(path))
  record(
    'reference mentions',
    unnamed.length === 0,
    referenceFiles.length === 0 ? 'none shipped' : unnamed.length ? `not named in SKILL.md: ${unnamed.join(', ')}` : `${referenceFiles.length} reference(s) named`,
  )

  const characters = [...text]
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
  const estimate = Math.ceil(ideographs * 1.1 + cjkOthers + others / charsPerToken)
  const withinBudget = lineCount < MAX_LINES && estimate <= MAX_TOKENS
  const budgetDetail = withinBudget
    ? `${lineCount} lines, ~${estimate} tokens at ${charsPerToken} chars/token (limit: under ${MAX_LINES} lines and ${MAX_TOKENS} tokens)`
    : `OVER the default — ${lineCount} lines, ~${estimate} tokens at ${charsPerToken} chars/token (limit: under ${MAX_LINES} lines and ${MAX_TOKENS} tokens); match your tokenizer with --chars-per-token, or route content out, then rerun with --strict-budget`
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

/**
 * Check the skills collection against the skill structure the loader and the catalog enforce: how
 * a skill is discovered, what its frontmatter must carry, how long its description may be, which
 * resource directories it may use, that no resource is mistaken for a skill, and that the
 * invocation-policy fields hold the values the loader accepts.
 *
 * Development tooling for this repository, not a gate an adopting project runs. It lives at the
 * repository root so the collection stays installable as-is.
 *
 * Zero external dependencies. Run it from the repository root:
 *   pnpm dlx --allow-build=esbuild tsx@4.22.4 scripts/verify-skill-structure.ts --root skills/dsh-spec-manager
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

/** Kebab-case skill name, the grammar the registry validates against. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The human introduction beside the entry, with its Chinese counterpart and their record. */
const README_FAMILY = /^(?:README(?:\.zh)?\.md|README\.i18n\.yaml)$/

/** The catalog truncates a longer description, dropping selection signal. */
const MAX_DESCRIPTION = 500

/** Frontmatter keys the loader reads. */
const KNOWN_KEYS = new Set(['name', 'description', 'whenToUse', 'metadata', 'disable-model-invocation', 'user-invocable'])

/** Keys from an older invocation-policy spelling that the loader now rejects. */
const LEGACY_KEYS = new Set(['disableModelInvocation', 'modelInvocable', 'userInvocable'])

/**
 * Invocation-policy keys that must hold a YAML boolean. The loader ignores a malformed value in
 * two different directions — `disable-model-invocation: "true"` leaves the model free to invoke a
 * manual-only skill, and `user-invocable: "false"` leaves it reachable — so a quoted value is
 * silently the opposite of what the author wrote.
 */
const BOOLEAN_KEYS = ['disable-model-invocation', 'user-invocable'] as const

/**
 * Characters that make an unquoted single-line YAML scalar invalid or ambiguous. A third-party
 * loader uses a strict YAML parser: `description: Route to dsh-doc: the standard` fails to parse,
 * and a candidate that fails to parse is skipped, so one colon can hide a whole package.
 */
const UNQUOTED_SCALAR_HAZARDS: readonly [RegExp, string][] = [
  [/: /, 'contains ": ", which starts a nested mapping in an unquoted scalar'],
  [/ #/, 'contains " #", which starts a comment in an unquoted scalar'],
  [/^[[\]{},*&!|>@`"']/, 'starts with a character YAML reserves'],
]

/** Directory names a skill may use for its resources. */
const RESOURCE_DIRECTORIES = ['scripts', 'references', 'templates', 'assets'] as const

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const packageRoot = resolve(flagValue('--root') ?? process.cwd())
const violations: string[] = []

/** Parse a `key: value` frontmatter block, reporting why it is unusable instead of throwing. */
function parseFrontmatter(source: string): { data: Map<string, string>; body: string } | string {
  const lines = source.split('\n')
  if (lines[0] !== '---') return 'does not start with YAML frontmatter (`---` on line 1)'
  const end = lines.indexOf('---', 1)
  if (end < 0) return 'frontmatter is not closed by `---`'
  const data = new Map<string, string>()
  let key: string | undefined
  for (const line of lines.slice(1, end)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (line.startsWith((' ', '\t'))) {
      if (key !== undefined) data.set(key, `${data.get(key) ?? ''} ${line.trim()}`)
      continue
    }
    const colon = line.indexOf(':')
    if (colon < 0) return `frontmatter line is not \`key: value\`: ${JSON.stringify(line.slice(0, 60))}`
    key = line.slice(0, colon).trim()
    data.set(key, line.slice(colon + 1).trim())
  }
  return { data, body: lines.slice(end + 1).join('\n') }
}

for (const entry of readdirSync(packageRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (entry.name.startsWith('.')) continue
  const full = join(packageRoot, entry.name)
  if (entry.isDirectory()) {
    // Resources live in the standard directories; anything else would be a second skill or debris.
    if (!(RESOURCE_DIRECTORIES as readonly string[]).includes(entry.name)) {
      violations.push(`${entry.name}/: not a skill resource directory (${RESOURCE_DIRECTORIES.join(', ')})`)
      continue
    }
    if (readdirSync(full).length === 0) violations.push(`${entry.name}/: empty resource directory`)
    continue
  }
  // Discovery matches `*/SKILL.md`, so every other Markdown name beside the entry is invisible to
  // it — except that a bare `README.md` is the one file a person looks for after installing, and it
  // is written for them rather than for an agent. Everything else at the root is a placement
  // mistake, because nothing would route a reader to it.
  if (entry.name.endsWith('.md') && entry.name !== 'SKILL.md' && !README_FAMILY.test(entry.name)) {
    violations.push(`${entry.name}: unexpected Markdown at the package root; only SKILL.md (the entry) and the README family (the human introduction) belong there`)
  }
}

// Every reference document must be reachable from the entry by following Markdown links. A
// document nothing routes to is a document no reader finds, and reachability is the invariant
// that survives parts referencing their own secondary material.
const linkPattern = /\]\(([^)\s]+)\)/g
const reachable = new Set<string>()
const queue = ['SKILL.md']
while (queue.length > 0) {
  const current = queue.pop()
  if (current === undefined || reachable.has(current)) continue
  reachable.add(current)
  const absolute = join(packageRoot, current)
  if (!existsSync(absolute) || !statSync(absolute).isFile()) continue
  for (const match of readFileSync(absolute, 'utf8').matchAll(linkPattern)) {
    const target = (match[1] ?? '').split('#')[0]
    if (target === '' || target.startsWith('http')) continue
    queue.push(relative(packageRoot, resolve(dirname(absolute), target)).split(sep).join('/'))
  }
}
for (const directory of RESOURCE_DIRECTORIES) {
  const full = join(packageRoot, directory)
  if (!existsSync(full) || !statSync(full).isDirectory()) continue
  for (const item of readdirSync(full)) {
    if (directory !== 'references' || !item.endsWith('.md')) continue
    if (!reachable.has(`references/${item}`)) {
      violations.push(`references/${item}: unreachable from SKILL.md by following links, so nothing routes a reader to it`)
    }
  }
}

// The package entry: a root `SKILL.md` is what a consumer's skills root discovers when this
// directory is installed whole, so it is a real catalog entry and gets the same checks. Its name
// comes from the directory, and a missing frontmatter here silently yields zero skills.
const packageEntry = join(packageRoot, 'SKILL.md')
if (existsSync(packageEntry)) {
  const parsed = parseFrontmatter(readFileSync(packageEntry, 'utf8'))
  if (typeof parsed === 'string') {
    violations.push(`SKILL.md (package entry): ${parsed}`)
  } else {
    const { data, body } = parsed
    const name = data.get('name')
    const description = data.get('description')
    if (name === undefined) violations.push('SKILL.md (package entry): missing required `name`')
    else if (!SKILL_NAME.test(name)) violations.push(`SKILL.md (package entry): name ${JSON.stringify(name)} violates ${String(SKILL_NAME)}`)
    if (description === undefined) violations.push('SKILL.md (package entry): missing required `description`')
    else if (description.length > MAX_DESCRIPTION) {
      violations.push(`SKILL.md (package entry): description is ${description.length} characters, over the ${MAX_DESCRIPTION}-character catalog budget`)
    }
    if (body.trim() === '') violations.push('SKILL.md (package entry): body is empty')
  }
}

if (violations.length === 0) {
  const total = RESOURCE_DIRECTORIES.reduce((sum, d) => {
    const full = join(packageRoot, d)
    return sum + (existsSync(full) ? readdirSync(full).length : 0)
  }, 0)
  console.log(`verify-skill-structure: the package entry conforms and all ${total} resource file(s) are placed and routed.`)
  process.exit(0)
}

console.error('verify-skill-structure: violations found:')
for (const violation of violations) console.error(`  ${violation}`)
process.exit(1)

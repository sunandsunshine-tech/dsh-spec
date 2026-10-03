/**
 * Assert the installed copy under `.agents/skills/` is the authored tree under `skills/`.
 *
 * `skills/` is what this repository authors and reviews; `.agents/skills/` is what an agent
 * loads, and the installer writes it from the authored revision. The two are one text, so a copy
 * that has drifted from its source is a rule an agent reads that the repository never approved.
 * The installer injects a `metadata:` block into each `SKILL.md`, may reorder the other
 * frontmatter keys, and drops the blank line after the closing `---`; those three differences are
 * the only ones allowed, and `2026-09-18-track-the-installed-skill-copy.md` records them.
 *
 * The gate never compares `github-ref`. It names the work branch the install was made from, and
 * that branch is deleted once its pull request merges, so on a merged branch the recorded value
 * points at nothing while the copy is still correct. The content-addressed `github-tree-sha` is
 * the field that ties a copy to a revision, and it is compared against `git rev-parse HEAD:skills/<name>`.
 *
 * Development tooling for this repository, not a gate an adopting project runs: an adopter has no
 * `skills/` source tree to compare against. It lives at the repository root so the collection
 * stays installable as-is.
 *
 * Zero external dependencies. Run it from the repository root:
 *   node scripts/verify-installed-copy.ts [--root <path>]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

/** The keys the installer injects into a copy's `metadata:` block, all of which must be present. */
const INSTALLED_KEYS = ['github-path', 'github-ref', 'github-repo', 'github-tree-sha'] as const

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

/** Where this gate sits: `scripts/`, so its parent is the repository root unless `--root` overrides it. */
const repositoryRoot = resolve(flagValue('--root') ?? resolve(dirname(resolve(process.argv[1] ?? import.meta.dirname)), '..'))

/** The authored skill directories. */
const sourceRoot = join(repositoryRoot, 'skills')

/** The installed deployment of the same skills. */
const installedRoot = join(repositoryRoot, '.agents', 'skills')

const violations: string[] = []

/**
 * Read one frontmatter scalar as YAML would, so quoting style is not a difference.
 *
 * The installer re-serializes frontmatter and unquotes a scalar that needs no quotes, so
 * `description: 'A single-quoted ''sentence'''` authored here comes back as `description: A
 * single-quoted 'sentence'`. Comparing the raw text would report every re-serialized key as a
 * difference; comparing the value it denotes reports a real edit.
 * @param value - the raw text after the colon, trimmed.
 * @returns the scalar's value.
 */
function scalar(value: string): string {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'")
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/\\"/g, '"')
  return value
}

/** Parse a `key: value` frontmatter block, or name why it cannot be read. */
function frontmatter(source: string): { data: Map<string, string>, body: string } | string {
  const lines = source.split('\n')
  if (lines[0] !== '---') return 'does not start with YAML frontmatter (`---` on line 1)'
  const end = lines.indexOf('---', 1)
  if (end < 0) return 'frontmatter is not closed by `---`'
  const data = new Map<string, string>()
  let key: string | undefined
  for (const line of lines.slice(1, end)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (line.startsWith(' ') || line.startsWith('\t')) {
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

/** Every file under one directory, as POSIX paths relative to it. */
function filesUnder(directory: string): string[] {
  const out: string[] = []
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (entry.isFile()) out.push(relative(directory, full).split(sep).join('/'))
    }
  }
  visit(directory)
  return out.sort()
}

/** The skill directories under one root, sorted. */
function skillDirectories(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

/** `git rev-parse HEAD:skills/<name>`, or undefined when git cannot answer. */
function committedTreeSha(name: string): string | undefined {
  try {
    return execFileSync('git', ['-C', repositoryRoot, 'rev-parse', `HEAD:skills/${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return undefined
  }
}

/**
 * Compare one installed `SKILL.md` against its source.
 *
 * The installer owns the `metadata:` block and the key order, so the comparison drops
 * `metadata` from both sides and compares the remaining keys by value, then compares the body
 * with the blank line after the closing `---` normalized away — the one known difference.
 */
function compareSkillFile(name: string, sourceFile: string, installedFile: string): void {
  const source = frontmatter(readFileSync(sourceFile, 'utf8'))
  if (typeof source === 'string') {
    violations.push(`${name}/SKILL.md (authored): ${source}`)
    return
  }
  const installedText = readFileSync(installedFile, 'utf8')
  const installed = frontmatter(installedText)
  if (typeof installed === 'string') {
    violations.push(`${name}/SKILL.md (installed): ${installed}`)
    return
  }
  const installedLines = installedText.split('\n')
  const block = installedLines.slice(1, installedLines.indexOf('---', 1)).join('\n')
  for (const key of INSTALLED_KEYS) {
    if (!new RegExp(`^[ \\t]+${key}:`, 'm').test(block)) {
      violations.push(`${name}/SKILL.md (installed): the injected metadata block does not carry \`${key}\``)
    }
  }
  const sourceKeys = new Map(source.data)
  const installedKeys = new Map(installed.data)
  sourceKeys.delete('metadata')
  installedKeys.delete('metadata')
  for (const [key, value] of sourceKeys) {
    const copied = installedKeys.get(key)
    if (copied === undefined) violations.push(`${name}/SKILL.md: installed copy is missing frontmatter key \`${key}\``)
    else if (scalar(copied) !== scalar(value)) violations.push(`${name}/SKILL.md: frontmatter \`${key}\` differs — authored ${JSON.stringify(value)}, installed ${JSON.stringify(copied)}`)
  }
  for (const key of installedKeys.keys()) {
    if (!sourceKeys.has(key)) violations.push(`${name}/SKILL.md: installed copy adds frontmatter key \`${key}\``)
  }
  if (source.body.replace(/^\n+/, '') !== installed.body.replace(/^\n+/, '')) {
    violations.push(`${name}/SKILL.md: the body differs from the authored text (the installer may drop only the blank line after the closing \`---\`)`)
  }
}

if (!existsSync(sourceRoot)) {
  console.error(`verify-installed-copy: no ${sourceRoot} — there is nothing to compare, so this gate refuses rather than passing on an empty corpus`)
  process.exit(1)
}
if (!existsSync(installedRoot)) {
  console.error(`verify-installed-copy: no ${installedRoot} — the installed copy is missing, so there is nothing to compare it against`)
  process.exit(1)
}

const sourceSkills = skillDirectories(sourceRoot)
const installedSkills = skillDirectories(installedRoot)
if (sourceSkills.length === 0) {
  console.error(`verify-installed-copy: ${sourceRoot} holds no skill directory — an empty corpus is not a pass`)
  process.exit(1)
}
if (installedSkills.length === 0) {
  console.error(`verify-installed-copy: ${installedRoot} holds no skill directory — an empty copy set is not a pass`)
  process.exit(1)
}

for (const name of sourceSkills) {
  if (!installedSkills.includes(name)) {
    violations.push(`${name}: authored under skills/ but not installed under .agents/skills/`)
    continue
  }
  const source = join(sourceRoot, name)
  const installed = join(installedRoot, name)
  const sourceFiles = filesUnder(source)
  const installedFiles = filesUnder(installed)
  for (const file of sourceFiles) {
    if (!installedFiles.includes(file)) {
      violations.push(`${name}/${file}: authored but missing from the installed copy`)
      continue
    }
    if (file === 'SKILL.md') compareSkillFile(name, join(source, file), join(installed, file))
    else if (!readFileSync(join(source, file)).equals(readFileSync(join(installed, file)))) {
      violations.push(`${name}/${file}: the installed copy differs byte-for-byte from the authored file`)
    }
  }
  for (const file of installedFiles) {
    if (!sourceFiles.includes(file)) violations.push(`${name}/${file}: installed but not authored under skills/`)
  }
  const committed = committedTreeSha(name)
  if (committed === undefined) {
    violations.push(`${name}: git cannot resolve HEAD:skills/${name}, so the copy's tree sha cannot be checked`)
  } else {
    const recorded = installedTextTreeSha(join(installed, 'SKILL.md'))
    if (recorded === undefined) violations.push(`${name}/SKILL.md: the installed copy carries no github-tree-sha`)
    else if (recorded !== committed) violations.push(`${name}/SKILL.md: github-tree-sha ${recorded} is not the authored tree ${committed}`)
  }
}
for (const name of installedSkills) {
  if (!sourceSkills.includes(name)) violations.push(`${name}: installed under .agents/skills/ but not authored under skills/`)
}

/** The `github-tree-sha` a copy's injected block records, or undefined. */
function installedTextTreeSha(file: string): string | undefined {
  if (!existsSync(file)) return undefined
  const lines = readFileSync(file, 'utf8').split('\n').slice(0, 20)
  for (const line of lines) {
    const match = /^\s+github-tree-sha:\s*(\S+)\s*$/.exec(line)
    if (match !== null) return match[1]
  }
  return undefined
}

if (violations.length > 0) {
  console.error('verify-installed-copy: the installed copy disagrees with the authored skills:')
  for (const violation of violations) console.error(`  ${violation}`)
  process.exit(1)
}

console.log(`verify-installed-copy: ${sourceSkills.length} skill(s) equal their installed copies under .agents/skills.`)

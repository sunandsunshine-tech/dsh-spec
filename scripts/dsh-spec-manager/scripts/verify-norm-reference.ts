/**
 * Every norm id a shipped text cites is one the installed catalog ships.
 *
 * The package's texts name a norm by its catalog id — `pr.lifecycle` — so a typo, or an id the
 * catalog dropped, would ship silently: prose is not compiled, and nothing else in the set reads a
 * catalog id inside a sentence. This gate crosses the two facts the installed copy already holds:
 * the catalog at `.agents/skills/<manager>/references/norms.json`, and every shipped `.md` or
 * `.template` file beside it.
 *
 * The cited shape is a backticked token with a dot in it, and only a token whose first half is one
 * of the catalog's group ids is a citation: `ctx.shell` and `metadata.github-ref` are a shell
 * context and a metadata key, while `pr.lifecycle` names a group the catalog declares. A second
 * half that is a known file extension is a filename and not a norm name, so `package.json` is not
 * read as a norm called `json` in a group called `package`.
 *
 * The gate is a tree assertion: a citation can sit in any shipped text, so it walks the whole
 * installed set under `--all` rather than reading a list of changed paths. It reads and writes
 * nothing else, and it refuses an empty corpus like every other gate here instead of reporting
 * that nothing was found wrong.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readGateScope } from './gate-scope.ts'
import { INSTALLED_SKILLS_ROOT, installedNormsPath, walkInstalledSkillTexts } from './installed-skills.ts'
import { readNorms } from './norms.ts'

const gate = 'verify-norm-reference'

/** A backticked token shaped like `<group>.<name>`, each half a catalog name. */
const CITATION = /`([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)`/g

/** Second halves that are file extensions rather than norm names. */
const EXTENSIONS = new Set([
  'ts', 'js', 'mjs', 'cjs', 'md', 'json', 'yaml', 'yml', 'sh', 'toml', 'txt', 'html', 'css', 'svg',
])

/** One citation the catalog cannot resolve. */
interface Violation {
  file: string
  /** 1-based line the token starts on. */
  line: number
  id: string
}

// A tree assertion: `--all`, and only that.
const scope = readGateScope(gate)

const catalogPath = installedNormsPath(scope.root)
let groupIds: Set<string>
let normIds: Set<string>
try {
  const catalog = readNorms(catalogPath)
  groupIds = new Set(catalog.groups.map(group => group.id))
  normIds = new Set(catalog.norms.map(norm => norm.id))
} catch (error) {
  console.error(`${gate}: ${(error as Error).message}`)
  process.exit(1)
}

const files = walkInstalledSkillTexts(scope.root)
if (files.length === 0) {
  console.error(`${gate}: no shipped text under ${INSTALLED_SKILLS_ROOT} — nothing to read, so nothing is asserted.`)
  process.exit(1)
}

const violations: Violation[] = []
let citations = 0

for (const entry of files) {
  const source = readFileSync(resolve(scope.root, entry), 'utf8')
  for (const [index, line] of source.split('\n').entries()) {
    for (const match of line.matchAll(CITATION)) {
      const group = match[1] ?? ''
      const name = match[2] ?? ''
      // A token whose first half is no group is another namespace's name; a second half that is a
      // file extension is a filename. Neither is a citation this catalog can answer for.
      if (!groupIds.has(group) || EXTENSIONS.has(name)) continue
      const id = `${group}.${name}`
      citations += 1
      if (!normIds.has(id)) violations.push({ file: entry, line: index + 1, id })
    }
  }
}

if (violations.length > 0) {
  console.error(`${gate}: ${violations.length} cited id(s) the catalog does not ship:`)
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line} \`${violation.id}\` — no norm with this id is in ${catalogPath}`)
  }
  process.exit(1)
}

console.log(`${gate}: ${files.length} shipped text(s) read; ${citations} catalog citation(s) resolve.`)

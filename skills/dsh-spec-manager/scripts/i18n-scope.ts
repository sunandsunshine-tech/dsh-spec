/**
 * Decide whether a document declares itself part of a bilingual pair.
 *
 * The declaration is the file itself: a `.md` with a `.zh.md` sibling or an `.i18n.yaml` record
 * beside it is one side of a pair, and its sidecar must match. The corpus is therefore what the
 * tree shows — nothing registers a document, so nothing can fall out of step with the documents
 * that actually exist.
 *
 * Two things stay outside the rule, and neither is a project's decision: dependency and build
 * output trees, whose Markdown belongs to somebody else, and a nested repository, whose prose is
 * not this project's. The frozen note archive is outside it too, because an archived note is a
 * snapshot rather than live source.
 *
 * Zero external dependencies.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { archivedNotesPrefixes } from './notes-root.ts'
import { resolveRepoRoot } from './repo-root.ts'

/**
 * Directories that never hold this project's source prose, in any project.
 *
 * This is the whole exclusion list: dependency and build output trees, a nested repository
 * whose content another owner maintains, and the collection's own deployment copy, which
 * reproduces the authored files rather than stating anything of its own. Everything else a
 * project wants unpaired it leaves without a `.zh.md`; nothing here can silently drop a pair
 * somebody wrote.
 *
 * `.agents/skills/` is excluded on a decision, not by analogy with the build trees, and the
 * decision is this: those files are the installed deployment of `skills/`, produced by
 * `gh skill install` and overwritten by the next install or update, so hand-editing one is
 * forbidden — a translation written there would be a translation of a deployment, which is
 * neither a source anybody authored nor a copy anybody can review. The pair belongs beside
 * the file in `skills/`, and the deployment takes it from there.
 */
export const DEFAULT_I18N_EXCLUDES: readonly string[] = [
  'node_modules/',
  'vendor/',
  'dist/',
  'build/',
  'out/',
  'target/',
  'coverage/',
  '__pycache__/',
  '.venv/',
  '.cache/',
  '.pnpm-store/',
  '.agents/skills/',
  'submodules/',
]

/**
 * The terminology table the translation briefing matches changed spans against.
 *
 * One literal, one owner. The table is bilingual by construction — one table, both languages — so
 * it is a document a briefing reads rather than a pair the gate checks.
 */
export const TERMINOLOGY_TABLE = 'docs/terminology.md'

/**
 * Whether one repository-relative path sits under a prefix or matches a `**&#47;` glob entry.
 * @param file - repository-relative POSIX path.
 * @param entry - a directory prefix ending in `/`, an exact path, or a glob with `*`.
 * @returns true when the entry covers the file.
 */
export function matchesScopeEntry(file: string, entry: string): boolean {
  // A leading `./` survives some glob implementations, and a directory entry means "this directory
  // anywhere", not only at the repository root: `vendor/` must also cover `submodules/dsh/vendor/`,
  // or a project excluding a vendored tree keeps discovering prose inside it.
  const path = file.startsWith('./') ? file.slice(2) : file
  if (entry.endsWith('/')) return path.startsWith(entry) || path.includes(`/${entry}`)
  if (!entry.includes('*')) return path === entry
  const escape = (part: string): string => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  // `**/` spans any number of directories; a single `*` stays inside one segment. Collapsing both to
  // the same expression made `**/README.md` match only a two-segment path, so a README one level
  // deeper silently fell outside every scope that used it.
  const pattern = new RegExp(`^${entry
    .split('**/')
    .map(part => part.split('*').map(escape).join('[^/]*'))
    .join('(?:.*/)?')}$`)
  return pattern.test(path) || pattern.test(path.slice(path.lastIndexOf('/') + 1))
}

/**
 * Reduce one pair member to the document the declaration is about.
 *
 * A pair is three files: the English side, its `.zh.md` counterpart, and the `.i18n.yaml` record.
 * Deciding membership from the member itself would ask whether a translation is paired, so every
 * member is reduced to the `.md` path whose sibling declares the pair.
 *
 * @param file - repository-relative POSIX path.
 * @returns the `.md` path the declaration belongs to.
 */
export function pairAnchorOf(file: string): string {
  if (file.endsWith('.zh.md')) return `${file.slice(0, -'.zh.md'.length)}.md`
  if (file.endsWith('.i18n.yaml')) return `${file.slice(0, -'.i18n.yaml'.length)}.md`
  return file
}

/** Why one path is or is not in the pairing corpus. */
export interface ScopeVerdict {
  /** Whether the gate would pair the path. */
  inScope: boolean
  /** The rule that decided, as a short label a report can group many files under. */
  rule: 'archived' | 'foreign-tree' | 'declared-pair' | 'unpaired'
  /** The rule phrased for a reader, naming the paths this file's verdict turned on. */
  reason: string
}

/**
 * The counterpart that makes one path a declared pair.
 * @param anchor - repository-relative English Markdown path.
 * @returns the repository-relative `.zh.md` path beside it.
 */
export function translationCounterpartOf(anchor: string): string {
  return `${anchor.slice(0, -'.md'.length)}.zh.md`
}

/**
 * The consistency record that makes one path a declared pair.
 * @param anchor - repository-relative English Markdown path.
 * @returns the repository-relative `.i18n.yaml` path beside it.
 */
export function translationRecordOf(anchor: string): string {
  return `${anchor.slice(0, -'.md'.length)}.i18n.yaml`
}

/**
 * Decide one path's membership and name the rule that decided it.
 *
 * Every branch names the fact that decided — a tree nobody here owns, the frozen archive, or a pair
 * member existing — so an unexpected inclusion or exclusion is traceable to the file tree rather
 * than to a gate's source. Either remnant declares the pair: a half-deleted pair is caught from
 * whichever half survived, never silently dropped.
 *
 * @param file - repository-relative POSIX path.
 * @returns the verdict and its reason.
 */
export function explainScope(file: string): ScopeVerdict {
  const anchor = pairAnchorOf(file)
  const archived = archivedNotesPrefixes().find(prefix => file.startsWith(prefix))
  if (archived !== undefined) {
    return { inScope: false, rule: 'archived', reason: `under \`${archived}\` — archived notes are frozen and never paired` }
  }
  const excluded = DEFAULT_I18N_EXCLUDES.find(entry => matchesScopeEntry(anchor, entry))
  if (excluded !== undefined) {
    return { inScope: false, rule: 'foreign-tree', reason: `under \`${excluded}\` — a dependency, build or nested-repository tree whose Markdown belongs to another owner` }
  }
  const root = resolveRepoRoot()
  const declared = [translationCounterpartOf(anchor), translationRecordOf(anchor)]
    .find(candidate => existsSync(resolve(root, candidate)))
  if (declared !== undefined) {
    return { inScope: true, rule: 'declared-pair', reason: `\`${declared}\` exists, and a \`.zh.md\` counterpart or an \`.i18n.yaml\` record beside a document is how that document declares itself paired` }
  }
  return {
    inScope: false,
    rule: 'unpaired',
    reason: `neither \`${translationCounterpartOf(anchor)}\` nor \`${translationRecordOf(anchor)}\` exists — a document with no pair member beside it is not paired`,
  }
}

/** One line per rule, for a report that groups the files a rule skipped instead of listing them. */
export const SCOPE_RULE_SUMMARY: Record<Exclude<ScopeVerdict['rule'], 'declared-pair'>, string> = {
  'archived': 'under the frozen archive — archived notes are never paired',
  'foreign-tree': 'under a dependency, build or nested-repository tree whose Markdown belongs to another owner',
  'unpaired': 'no `.zh.md` counterpart and no `.i18n.yaml` record beside them — a document with neither declares no pair',
}

/**
 * Whether one repository-relative path belongs to the pairing corpus.
 * @param file - repository-relative POSIX path.
 * @returns true when the path must be paired.
 */
export function isTranslationScopeFile(file: string): boolean {
  return explainScope(file).inScope
}

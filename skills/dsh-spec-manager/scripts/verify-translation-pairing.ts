/**
 * Ported from dsh scripts/verify-translation-pairing.ts @ ddefc45fbc7f8e46dd73185e68295696d1297887 (submodules/dsh). Relation: adapted.
 * Enforce complete English/Chinese pairs, matching structure, and recorded git
 * blob hashes for every document that declares a pair. A pair is declared by
 * the file itself: a `.md` with a `.zh.md` counterpart or an `.i18n.yaml`
 * record beside it is one side of a pair, and a document with neither is
 * simply not paired. `--list` reports state; `--write <pairs...>` records the
 * named confirmed pairs (`--write --all` records every complete pair);
 * `--cached <pairs...>` checks exact index bytes for hooks. A check or write
 * named with pair paths touches only those pairs, so update iteration does not
 * pay for a corpus scan. Translation quality remains a review responsibility.
 * See `references/i18n-contract.md` for the owning contract.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, globSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import {
  gitBlobHash,
  gitIndexPaths,
  readGitIndexBlob,
  storeGitBlob,
} from './translation-pairing-git.ts'
import {
  parseTranslationPairingRecord,
  renderTranslationPairingRecord,
  translationPairPaths,
} from './translation-pairing-record.ts'
import {
  languageSwitcherTargets,
  parseTranslationMarkdown,
  parseTranslationPairingCliArgs,
  partitionGeneratedRegions,
  gateEntryPoint,
  isTranslationScopeFile,
  TRANSLATION_SCOPE_GLOB_EXCLUDES,
  translationPairSourcePredicate,
  translationStructureDiff,
  translationStructureSignature,
} from './translation-pairing.ts'
import { explainScope, SCOPE_RULE_SUMMARY, translationCounterpartOf, translationRecordOf } from './i18n-scope.ts'
import {
  hasLanguageSwitcher,
  normalizeTranslationMarkdownLinks,
  translationLinkLocaleViolations,
} from './translation-links.ts'
import { notesRootPrefixes } from './notes-root.ts'
import { resolveRepoRoot } from './repo-root.ts'

const root = resolveRepoRoot()
/** Command-line arguments with `--root <path>` removed; resolveRepoRoot consumed that option. */
const cliArgs = process.argv.slice(2)
  .filter((argument, index, all) => argument !== '--root' && all[index - 1] !== '--root')
let request: ReturnType<typeof parseTranslationPairingCliArgs>
try {
  request = parseTranslationPairingCliArgs(cliArgs)
} catch (error) {
  console.error(`verify-translation-pairing: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}
const listMode = request.mode === 'list'
const writeMode = request.mode === 'write'
const indexMode = request.input === 'index'
const indexFiles = indexMode ? gitIndexPaths(root) : undefined

const contentCache = new Map<string, Buffer | undefined>()

/** Read one repository path from the selected worktree or index plane. */
function readRepositoryFile(file: string): Buffer | undefined {
  if (contentCache.has(file)) return contentCache.get(file)
  const content = indexMode
    ? indexFiles?.has(file) ? readGitIndexBlob(root, file)?.content : undefined
    : existsSync(join(root, file)) && statSync(join(root, file)).isFile()
      ? readFileSync(join(root, file))
      : undefined
  contentCache.set(file, content)
  return content
}

/** Whether one path exists in the selected content plane. */
function repositoryFileExists(file: string): boolean {
  return indexMode ? indexFiles?.has(file) === true : readRepositoryFile(file) !== undefined
}

/**
 * Discover source Markdown and pairing sidecars before applying the corpus predicate. The notes
 * patterns come from the configured notes roots, and the `.agents/` patterns exist because the
 * default glob does not descend into a dot-directory.
 */
const SCOPE_PATTERNS = [
  '**/*.md',
  '**/*.i18n.yaml',
  '.agents/**/*.md',
  '.agents/**/*.i18n.yaml',
  ...notesRootPrefixes().flatMap(prefix => [`${prefix}**/*.md`, `${prefix}**/*.i18n.yaml`]),
]

/**
 * Pairing is declared by the file, not by configuration: a document beside a `.zh.md` counterpart
 * or an `.i18n.yaml` record is one side of a pair, and `isTranslationScopeFile` reads exactly that.
 */
const isTranslationPairSource = translationPairSourcePredicate()

/** Markdown and sidecars the glob walked but the scope rejected; each is reported with its rule. */
const skipped: string[] = []

// `--explain <path>` answers "why is this file not translated" without reading this gate.
const explainIndex = process.argv.indexOf('--explain')
if (explainIndex !== -1) {
  const target = (process.argv[explainIndex + 1] ?? '').split(sep).join('/')
  if (target === '') {
    console.error('verify-translation-pairing: --explain needs a repository-relative path.')
    process.exit(1)
  }
  const verdict = explainScope(target)
  const { source, zh, meta } = translationPairPaths(target)
  const present = [source, zh, meta].filter(repositoryFileExists)
  console.log(`verify-translation-pairing: ${target}`)
  console.log(`  ${verdict.inScope ? 'paired' : 'not paired'} — ${verdict.reason}`)
  console.log(`  present: ${present.length > 0 ? present.join(', ') : `none of the three sides exist (${source}, ${zh}, ${meta})`}`)
  process.exit(0)
}

// Enumerate the scope once: the whole corpus, or exactly the named pairs'
// three files (a named pair whose files are absent is caught by the same
// completeness rules that cover discovered remnants).
const files = new Set<string>()
if (request.scope === 'pairs') {
  for (const anchor of request.anchors) {
    const { source, zh, meta } = translationPairPaths(anchor)
    for (const file of [source, zh, meta]) {
      if (repositoryFileExists(file)) files.add(file)
    }
    // A named worktree anchor with no files still enters the source list so
    // an interactive check reports it. An index check accepts a complete
    // three-file deletion and still rejects every partial deletion below.
    if (!indexMode && !repositoryFileExists(anchor)) files.add(anchor)
  }
} else {
  for (const pattern of SCOPE_PATTERNS) {
    for (const match of globSync(pattern, { cwd: root, exclude: TRANSLATION_SCOPE_GLOB_EXCLUDES })) {
      const normalized = match.split(sep).join('/')
      if (isTranslationScopeFile(normalized)) files.add(normalized)
      else skipped.push(normalized)
    }
  }
}

// Every file that declares no pair is reported by the rule that skipped it, grouped so a reader
// sees two lines rather than one per document. `--explain <path>` gives the named answer for one
// file, including the counterpart it looked for.
const skippedByRule = new Map<string, number>()
for (const file of skipped) {
  const { rule } = explainScope(file)
  if (rule === 'declared-pair') continue
  skippedByRule.set(rule, (skippedByRule.get(rule) ?? 0) + 1)
}
const translations = [...files].filter(f => f.endsWith('.zh.md')).sort()
const metas = [...files].filter(f => f.endsWith('.i18n.yaml')).sort()
const sources = [...files].filter(f => f.endsWith('.md') && !f.endsWith('.zh.md')).sort()

if (request.scope === 'pairs') {
  const rejected = request.anchors.filter(anchor => !isTranslationScopeFile(anchor))
  const absent = request.anchors.filter((anchor) => {
    const { source, zh, meta } = translationPairPaths(anchor)
    return ![source, zh, meta].some(repositoryFileExists)
  })
  if (rejected.length > 0 || (!indexMode && absent.length > 0)) {
    for (const anchor of rejected) {
      console.error(`verify-translation-pairing: ${anchor} declares no pair — neither ${translationCounterpartOf(anchor)} nor ${translationRecordOf(anchor)} exists beside it`)
    }
    for (const anchor of absent) {
      console.error(`verify-translation-pairing: ${anchor} names no pair on disk (none of its three files exist)`)
    }
    process.exit(2)
  }
}

// --write: (re)record both hashes for the requested complete pairs, creating
// missing records. A named pair that cannot be recorded (missing counterpart)
// fails loud; corpus scope (--all) records every complete pair.
if (writeMode) {
  // Recording stores both sides as Git blobs, so it needs a repository: without one the failure is
  // a git error inside the store rather than a statement about the tree, which reads as a crash.
  const insideRepository = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: root, encoding: 'utf8' }).status === 0
  if (!insideRepository) {
    console.error(`verify-translation-pairing: ${root} is not inside a git repository; --write stores each side as a Git blob so a recorded pair can be recovered. Run it from the project's working tree.`)
    process.exit(1)
  }
  let written = 0
  for (const source of sources) {
    const paths = translationPairPaths(source)
    const { zh, meta } = paths
    if (!repositoryFileExists(source) || !repositoryFileExists(zh)) {
      if (request.scope === 'pairs') {
        console.error(`verify-translation-pairing: cannot record ${source}: missing ${repositoryFileExists(source) ? zh : source}`)
        process.exit(2)
      }
      continue
    }
    const sourceContent = readRepositoryFile(source)
    const zhContent = readRepositoryFile(zh)
    if (sourceContent === undefined || zhContent === undefined) throw new Error(`${source}: complete pair became unreadable`)
    // A consistency record is also a recovery pointer for the briefing
    // generator. Persist both snapshots even when the sidecar text is already
    // current, because the bytes may exist only in this working tree.
    const record = renderTranslationPairingRecord(paths, {
      sourceHash: storeGitBlob(root, sourceContent),
      zhHash: storeGitBlob(root, zhContent),
    }, gateEntryPoint('verify-translation-pairing.ts'))
    if (existsSync(join(root, meta)) && readFileSync(join(root, meta), 'utf8') === record) continue
    writeFileSync(join(root, meta), record)
    console.log(`verify-translation-pairing: recorded ${meta}`)
    written++
  }
  console.log(`verify-translation-pairing: ${written} record(s) written; run the check to validate the pairs.`)
  process.exit(0)
}

const errors: string[] = []
const state = new Map<string, 'ok' | 'out-of-sync' | 'missing'>()

// Every pair that exists at all is complete and consistent. Anchor on the
// union of .zh.md files and .i18n.yaml records so a half-deleted pair is
// caught from either remnant. A document with neither remnant declares no pair
// and is not enumerated here at all, which is what "self-declaring" means.
const pairAnchors = new Set<string>()
for (const zh of translations) pairAnchors.add(zh.replace(/\.zh\.md$/, '.md'))
for (const meta of metas) pairAnchors.add(meta.replace(/\.i18n\.yaml$/, '.md'))

for (const source of [...pairAnchors].sort()) {
  const paths = translationPairPaths(source)
  const { zh, meta } = paths
  const have = {
    source: repositoryFileExists(source),
    zh: repositoryFileExists(zh),
    meta: repositoryFileExists(meta),
  }

  const missing = Object.entries(have).filter(([, ok]) => !ok).map(([k]) => (k === 'source' ? source : k === 'zh' ? zh : meta))
  if (missing.length > 0) {
    errors.push(`${source}: incomplete pair — missing ${missing.join(', ')} (pairs merge whole: both languages plus the .i18n.yaml record)`)
    continue
  }

  const sourceContent = readRepositoryFile(source)
  const zhContent = readRepositoryFile(zh)
  const metaContent = readRepositoryFile(meta)
  if (sourceContent === undefined || zhContent === undefined || metaContent === undefined) {
    throw new Error(`${source}: complete pair became unreadable`)
  }
  const record = parseTranslationPairingRecord(metaContent.toString('utf8'), paths)
  if (record === undefined) {
    errors.push(`${meta}: malformed consistency record (expected exactly \`${basename(source)}: <40-hex>\` and \`${basename(zh)}: <40-hex>\`)`)
    continue
  }

  let consistent = true
  for (const [file, content] of [[source, sourceContent], [zh, zhContent]] as const) {
    const current = gitBlobHash(content)
    const recorded = file === source ? record.sourceHash : record.zhHash
    if (recorded !== current) {
      errors.push(`${file}: out of sync — content no longer matches the pair's last confirmed-consistent state in ${meta} (bring the other side along, then re-record with --write)`)
      consistent = false
    }
  }
  if (!consistent) {
    state.set(source, 'out-of-sync')
    continue
  }

  const sourceText = sourceContent.toString('utf8')
  const zhText = zhContent.toString('utf8')
  const sourceSwitcherTargets = languageSwitcherTargets(source)
  const zhSwitcherTargets = languageSwitcherTargets(zh)
  for (const violation of [
    ...translationLinkLocaleViolations(sourceText, {
      repoRoot: root,
      sourcePath: source,
      isTranslationPairSource,
      repositoryFileExists,
    }, zhSwitcherTargets),
    ...translationLinkLocaleViolations(zhText, {
      repoRoot: root,
      sourcePath: zh,
      isTranslationPairSource,
      repositoryFileExists,
    }, sourceSwitcherTargets),
  ]) {
    errors.push(`${violation.sourcePath}:${violation.line}: link target ${JSON.stringify(violation.url)} uses the wrong locale; expected ${JSON.stringify(violation.expectedUrl)}`)
    state.set(source, 'out-of-sync')
  }

  // Generated regions must remain byte-identical after paired document paths
  // are normalized to one semantic target. The structural signature below
  // compares their contents again as part of the whole document; this named
  // check rejects any prose, ordering, code, marker, or non-locale URL drift.
  let sourceRegions: { regions: string[]; stripped: string }
  let zhRegions: { regions: string[]; stripped: string }
  try {
    sourceRegions = partitionGeneratedRegions(sourceText)
    zhRegions = partitionGeneratedRegions(zhText)
  } catch (error) {
    errors.push(`${source} ↔ ${zh}: ${error instanceof Error ? error.message : String(error)}`)
    state.set(source, 'out-of-sync')
    continue
  }
  const normalizedSourceRegions = sourceRegions.regions.map(region => normalizeTranslationMarkdownLinks(region, {
    repoRoot: root,
    sourcePath: source,
    isTranslationPairSource,
    repositoryFileExists,
  }))
  const normalizedZhRegions = zhRegions.regions.map(region => normalizeTranslationMarkdownLinks(region, {
    repoRoot: root,
    sourcePath: zh,
    isTranslationPairSource,
    repositoryFileExists,
  }))
  if (normalizedSourceRegions.length !== normalizedZhRegions.length
    || normalizedSourceRegions.some((region, index) => region !== normalizedZhRegions[index])) {
    errors.push(`${source} ↔ ${zh}: generated regions differ beyond paired-document locale paths — regenerate both sides`)
    state.set(source, 'out-of-sync')
  }

  const sourceTree = parseTranslationMarkdown(sourceText)
  const zhTree = parseTranslationMarkdown(zhText)
  if (!hasLanguageSwitcher(zhTree, zhText, sourceSwitcherTargets)) {
    errors.push(`${zh}: missing language switcher — no link to ${basename(source)}`)
  }
  if (!hasLanguageSwitcher(sourceTree, sourceText, zhSwitcherTargets)) {
    errors.push(`${source}: missing language switcher — no link back to ${basename(zh)}`)
  }
  for (const divergence of translationStructureDiff(
    translationStructureSignature(sourceTree, zhSwitcherTargets, {
      repoRoot: root,
      sourcePath: source,
      isTranslationPairSource,
      repositoryFileExists,
      markdown: sourceText,
    }),
    translationStructureSignature(zhTree, sourceSwitcherTargets, {
      repoRoot: root,
      sourcePath: zh,
      isTranslationPairSource,
      repositoryFileExists,
      markdown: zhText,
    }),
  )) {
    errors.push(`${source} ↔ ${zh}: ${divergence}`)
  }
  if (!state.has(source)) state.set(source, 'ok')
}

// Complete the state map for --list: a pair whose members are not all present is reported missing.
for (const source of pairAnchors) {
  if (!state.has(source)) state.set(source, 'missing')
}

/**
 * Report the files that declare no pair, grouped by the rule that showed it. A reader who expects a
 * document to be paired and does not find it here learns what to add beside it instead of reading
 * the gate.
 */
function reportSkipped(): void {
  if (skippedByRule.size === 0) return
  const total = [...skippedByRule.values()].reduce((sum, count) => sum + count, 0)
  console.log(`verify-translation-pairing: ${total} file(s) declare no pair:`)
  for (const [rule, count] of [...skippedByRule].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${SCOPE_RULE_SUMMARY[rule as keyof typeof SCOPE_RULE_SUMMARY]}`)
  }
}

if (listMode) {
  const order = { 'out-of-sync': 0, missing: 1, ok: 2 } as const
  const rows = [...state.entries()].sort((a, b) => order[a[1]] - order[b[1]] || a[0].localeCompare(b[0]))
  for (const [file, status] of rows) {
    console.log(`${status.padEnd(11)} ${file}${status === 'missing' ? '  (required)' : ''}`)
  }
  const counts = { 'ok': 0, 'out-of-sync': 0, 'missing': 0 }
  for (const status of state.values()) counts[status]++
  console.log(`verify-translation-pairing: ${counts.ok} ok, ${counts['out-of-sync']} out-of-sync, ${counts.missing} missing (of ${state.size} in scope)`)
  reportSkipped()
  process.exit(0)
}

if (errors.length === 0) {
  console.log(request.scope === 'pairs'
    ? `verify-translation-pairing: ${pairAnchors.size} named ${indexMode ? 'staged ' : ''}pair(s) consistent; run the corpus-wide check before a push.`
    : `verify-translation-pairing: ${pairAnchors.size} pair(s) checked across all in-scope documentation, all consistent.`)
  if (request.scope === 'corpus') reportSkipped()
  process.exit(0)
}

console.error('verify-translation-pairing: bilingual pairing rules violated:')
for (const message of errors) console.error(`  ${message}`)
process.exit(1)

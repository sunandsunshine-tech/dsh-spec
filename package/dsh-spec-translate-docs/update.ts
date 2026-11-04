/**
 * Update-path orchestration: recover the last-confirmed pair from Git, choose the narrowest safely
 * mapped briefing granularity, render the briefing, and apply the mechanical splice when the
 * change is confined to fenced code. Adapted from the upstream briefing CLI.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Nodes } from 'mdast'
import {
  changedSpanIndices,
  computeMechanicalUpdate,
  firstOccurrenceContext,
  markdownUnits,
  relevantTerminologyRows,
  renderTranslationBrief,
  sectionSpans,
  spansAligned,
  type BriefBundle,
  type BriefDirection,
  type BriefScope,
  type MarkdownSpan,
} from './brief.ts'
import { parseMarkdown } from './markdown.ts'
import { generatedRegions, maskGeneratedRegions } from './regions.ts'
import type { PairCorpus } from './pairing.ts'
import { translationStructureDiff, translationStructureSignature } from './pairing.ts'
import {
  computeTranslationPairingRecord,
  parseTranslationPairingRecord,
  translationPairingRecordDiff,
  type TranslationPairingRecord,
  type TranslationPairingRecordContext,
} from './pairing-record.ts'
import { DEFAULT_SOURCE_LANGUAGE, type Language, type PairPaths } from './targets.ts'

/** The canonical command label printed in briefings; the skill directory is known to the agent. */
export const COMMAND = 'node <skill-dir>/scripts/translate-pair.mjs'

/** Quote one shell argument so a copied command runs in the same shell. */
function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'"
}

/** The declaration flags a generated command repeats, so it runs as printed. */
function commandFlags(corpus: PairCorpus): string {
  const flags = [
    ...corpus.select.map((glob) => ' --select ' + shellQuote(glob)),
    ...corpus.skip.map((glob) => ' --skip ' + shellQuote(glob)),
    ...corpus.generated.map((glob) => ' --generated ' + shellQuote(glob)),
    ...(corpus.terminology ?? []).map(({ code, path }) => ' --terminology ' + shellQuote(code + '=' + path)),
  ]
  if (corpus.root !== process.cwd()) flags.push(' --root ' + shellQuote(corpus.root))
  return flags.join('')
}

/** Run one Git subprocess against the project root, or undefined when Git cannot answer. */
function tryGit(root: string, args: string[]): string | undefined {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
  if (result.error !== undefined || result.status !== 0) return undefined
  return result.stdout ?? ''
}

/** Run one Git subprocess that must succeed. */
function git(root: string, args: string[], allowedExitCodes: number[] = [0]): string {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 })
  if (result.error) throw result.error
  if (!allowedExitCodes.includes(result.status ?? -1)) {
    throw new Error('git ' + args.join(' ') + ' failed: ' + (result.stderr ?? ''))
  }
  return result.stdout ?? ''
}

/** The record inputs shared by one pair's two sides. */
export function recordContext(corpus: PairCorpus, target: Language): TranslationPairingRecordContext {
  return { base: { repoRoot: corpus.root, isPairSource: (sourcePath) => corpus.isPaired(sourcePath) }, target }
}

/**
 * Whether the record's selected target matches the pair's current contents.
 * @param record - parsed aggregate record.
 * @param corpus - the pair corpus.
 * @param paths - the pair.
 * @param source - source text.
 * @param counterpart - counterpart text.
 * @returns true when the selected target and source hashes agree.
 */
export function recordMatches(
  record: TranslationPairingRecord,
  corpus: PairCorpus,
  paths: PairPaths,
  source: string,
  counterpart: string,
): boolean {
  try {
    const current = computeTranslationPairingRecord(
      paths,
      masked(source),
      masked(counterpart),
      recordContext(corpus, paths.target),
    )
    return translationPairingRecordDiff(record, current, record.sourceCode, paths.target.code).length === 0
  } catch {
    return false
  }
}

/** Mask generated regions, throwing a readable error when the markers are malformed. */
function masked(text: string): string {
  return maskGeneratedRegions(text)
}

/** Replace the last-confirmed region blocks with the current ones, keeping the last prose. */
function alignRegions(current: string, last: string): string {
  const currentRegions = generatedRegions(current)
  const lastRegions = generatedRegions(last)
  if (currentRegions.length !== lastRegions.length) return last
  const lines = last.split('\n')
  for (let index = lastRegions.length - 1; index >= 0; index -= 1) {
    const region = lastRegions[index] as (typeof lastRegions)[number]
    const replacement = (currentRegions[index] as (typeof currentRegions)[number]).text.split('\n')
    lines.splice(region.begin, region.end - region.begin + 1, ...replacement)
  }
  return lines.join('\n')
}

/** Both sides at the newest commit whose contents produce the confirmed record. */
function lastConfirmed(
  root: string,
  corpus: PairCorpus,
  paths: PairPaths,
  recordText: string,
): { source: string; counterpart: string } | undefined {
  const record = parseTranslationPairingRecord(recordText)
  if (record === undefined) return undefined
  const log = tryGit(root, ['log', '--format=%H', '--', paths.source, paths.counterpart])
  if (log === undefined) return undefined
  for (const commit of log.split('\n').filter(Boolean)) {
    const source = tryGit(root, ['show', commit + ':' + paths.source])
    const counterpart = tryGit(root, ['show', commit + ':' + paths.counterpart])
    if (source === undefined || counterpart === undefined || source === '' || counterpart === '') continue
    if (!recordMatches(record, corpus, paths, source, counterpart)) continue
    return { source, counterpart }
  }
  return undefined
}

/** Unified diff between two texts, headers stripped, via git diff --no-index. */
function diffTexts(root: string, before: string, after: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'translate-brief-'))
  try {
    writeFileSync(join(directory, 'last-confirmed.md'), before)
    writeFileSync(join(directory, 'current.md'), after)
    const raw = git(
      root,
      ['diff', '--no-index', '--unified=2', join(directory, 'last-confirmed.md'), join(directory, 'current.md')],
      [0, 1],
    )
    return raw
      .split('\n')
      .filter(
        (line) =>
          !line.startsWith('diff --git') &&
          !line.startsWith('index ') &&
          !line.startsWith('--- ') &&
          !line.startsWith('+++ '),
      )
      .join('\n')
      .trim()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/** One pair's recorded and current state. */
export interface PairRuntimeState {
  /** Source side changed since the record. */
  sourceDrifted: boolean
  /** Counterpart side changed since the record. */
  counterpartDrifted: boolean
  /** The source side's last-confirmed text. */
  sourceLast: string
  /** The counterpart side's last-confirmed text. */
  counterpartLast: string
}

/**
 * Load one pair's recorded and current state, or explain why it cannot be briefed.
 * @param root - project root.
 * @param corpus - the corpus.
 * @param paths - the pair.
 * @param record - the record file text.
 * @param sourceCurrent - current source text.
 * @param counterpartCurrent - current counterpart text.
 * @returns the drifted state, or a precondition message.
 */
export function loadPairState(
  root: string,
  corpus: PairCorpus,
  paths: PairPaths,
  record: string,
  sourceCurrent: string,
  counterpartCurrent: string,
): PairRuntimeState | string {
  const confirmed = lastConfirmed(root, corpus, paths, record)
  if (confirmed !== undefined) {
    return {
      sourceDrifted: masked(sourceCurrent) !== masked(confirmed.source),
      counterpartDrifted: masked(counterpartCurrent) !== masked(confirmed.counterpart),
      sourceLast: confirmed.source,
      counterpartLast: confirmed.counterpart,
    }
  }
  const parsed = parseTranslationPairingRecord(record)
  if (parsed !== undefined && recordMatches(parsed, corpus, paths, sourceCurrent, counterpartCurrent)) {
    return {
      sourceDrifted: false,
      counterpartDrifted: false,
      sourceLast: sourceCurrent,
      counterpartLast: counterpartCurrent,
    }
  }
  return (
    paths.record +
    ': no recoverable last-confirmed commit for this pair; commit the confirmed pair before briefing its later edits'
  )
}

interface PlannedBrief {
  scope: BriefScope
  changedText: string
  mechanicalResult?: string | undefined
  /** The declaration's scope and exclusion flags, passed to every generated command. */
  contextFlags: string
}

/** Choose the narrowest safely mapped granularity for one drifted side. */
function planScope(
  sourceLastMasked: string,
  sourceLastAligned: string,
  sourceCurrent: string,
  counterpartCurrent: string,
  direction: BriefDirection,
  bothDrifted: boolean,
  terminology: string,
  sourceLanguage: Language,
): PlannedBrief {
  const sourceCurrentMasked = masked(sourceCurrent)
  const counterpartMasked = masked(counterpartCurrent)
  const wholeChangedText = sourceLastMasked + '\n' + sourceCurrentMasked
  if (bothDrifted) {
    return {
      scope: {
        kind: 'document',
        reason:
          'BOTH sides changed since the pair was last confirmed consistent, so no side is a trustworthy mapping anchor; decide which side owns each divergence.',
      },
      changedText: wholeChangedText,
    }
  }
  const mechanical = computeMechanicalUpdate(sourceLastAligned, sourceCurrent, counterpartCurrent)
  if (mechanical !== undefined)
    return { scope: { kind: 'mechanical' }, changedText: wholeChangedText, mechanicalResult: mechanical }
  for (const [kind, spansOf] of [
    ['units', markdownUnits],
    ['sections', sectionSpans],
  ] as const) {
    const confirmed = spansOf(sourceLastMasked)
    const current = spansOf(sourceCurrentMasked)
    const counterpart = spansOf(counterpartMasked)
    if (!spansAligned(confirmed, current) || !spansAligned(confirmed, counterpart)) continue
    const changed = changedSpanIndices(confirmed, current)
    if (changed.length === 0) continue
    const changedText = changed
      .map((index) => (confirmed[index]?.text ?? '') + '\n' + (current[index]?.text ?? ''))
      .join('\n')
    const rows = relevantTerminologyRows(terminology, direction, changedText, sourceLanguage)
    const occurrence =
      direction === 'source-to-target'
        ? firstOccurrenceContext(sourceLastMasked, sourceCurrentMasked, confirmed, current, rows, new Set(changed))
        : { notes: [], extraSpanIndices: [] }
    return {
      scope: {
        kind,
        bundles: spansFor(changed, occurrence.extraSpanIndices, confirmed, current, counterpart),
        firstOccurrenceNotes: occurrence.notes,
      },
      changedText,
    }
  }
  return {
    scope: {
      kind: 'document',
      reason:
        'Neither fine-grained units nor heading sections align one to one across the last-confirmed source, current source and current counterpart.',
    },
    changedText: wholeChangedText,
  }
}

function spansFor(
  indices: number[],
  extraIndices: number[],
  confirmed: MarkdownSpan[],
  current: MarkdownSpan[],
  counterpart: MarkdownSpan[],
): BriefBundle[] {
  const extras = new Set(extraIndices)
  return [...new Set([...indices, ...extraIndices])]
    .sort((left, right) => left - right)
    .map((index) => {
      const confirmedSpan = confirmed[index]
      const currentSpan = current[index]
      const counterpartSpan = counterpart[index]
      if (confirmedSpan === undefined || currentSpan === undefined || counterpartSpan === undefined) {
        throw new Error('brief: span ' + String(index) + ' is unmapped despite alignment')
      }
      return {
        index,
        label: currentSpan.label,
        reason:
          extras.has(index) && confirmedSpan.text === currentSpan.text ? ('first-occurrence' as const) : undefined,
        confirmedSourceText: confirmedSpan.text,
        currentSourceText: currentSpan.text,
        counterpartText: counterpartSpan.text,
        counterpartStartLine: counterpartSpan.startLine,
      }
    })
}

/** One planned briefing direction for one pair. */
export interface BriefPlan {
  paths: PairPaths
  direction: BriefDirection
  /** The pair's source language display name. */
  sourceLanguage: Language
  /** The changed side's path. */
  sourcePath: string
  /** The side to bring along. */
  counterpartPath: string
  /** The changed side's current text. */
  sourceCurrent: string
  /** The other side's current text. */
  counterpartCurrent: string
  diff: string
  scope: BriefScope
  changedText: string
  mechanicalResult?: string | undefined
}

/**
 * Plan the briefing(s) for one drifted pair without writing anything.
 * @param options - corpus, pair, state and terminology text.
 * @returns one plan per drifted direction.
 */
export function planBriefing(options: {
  corpus: PairCorpus
  paths: PairPaths
  state: PairRuntimeState
  sourceCurrent: string
  counterpartCurrent: string
  terminology: string
  sourceLanguage: Language
}): BriefPlan[] {
  const { corpus, paths, state } = options
  const plans: BriefPlan[] = []
  const directions: BriefDirection[] = []
  if (state.sourceDrifted) directions.push('source-to-target')
  if (state.counterpartDrifted) directions.push('target-to-source')
  for (const direction of directions) {
    const sourceIsSource = direction === 'source-to-target'
    const sourcePath = sourceIsSource ? paths.source : paths.counterpart
    const counterpartPath = sourceIsSource ? paths.counterpart : paths.source
    const sourceLast = sourceIsSource ? state.sourceLast : state.counterpartLast
    const sourceCurrent = sourceIsSource ? options.sourceCurrent : options.counterpartCurrent
    const counterpartCurrent = sourceIsSource ? options.counterpartCurrent : options.sourceCurrent
    const planned = planScope(
      masked(sourceLast),
      alignRegions(sourceCurrent, sourceLast),
      sourceCurrent,
      counterpartCurrent,
      direction,
      state.sourceDrifted && state.counterpartDrifted,
      options.terminology,
      options.sourceLanguage,
    )
    plans.push({
      paths,
      direction,
      sourceLanguage: options.sourceLanguage,
      sourcePath,
      counterpartPath,
      sourceCurrent,
      counterpartCurrent,
      diff: diffTexts(corpus.root, masked(sourceLast), masked(sourceCurrent)),
      scope: planned.scope,
      changedText: planned.changedText,
      mechanicalResult: planned.mechanicalResult,
      contextFlags: commandFlags(corpus),
    })
  }
  return plans
}

/**
 * Render one planned briefing.
 * @param plan - planned direction.
 * @param terminology - the target's terminology table.
 * @returns Markdown briefing text.
 */
export function renderBrief(plan: BriefPlan, terminology: string): string {
  const { paths } = plan
  const sourceIsSource = plan.direction === 'source-to-target'
  return renderTranslationBrief({
    sourcePath: plan.sourcePath,
    counterpartPath: plan.counterpartPath,
    direction: plan.direction,
    sourceLanguage: sourceIsSource ? plan.sourceLanguage : paths.target,
    targetLanguage: sourceIsSource ? paths.target : plan.sourceLanguage,
    diff: plan.diff,
    scope: plan.scope,
    terminology: relevantTerminologyRows(terminology, plan.direction, plan.changedText, plan.sourceLanguage),
    recordCommand:
      COMMAND +
      ' write ' +
      shellQuote(paths.source) +
      ' --target ' +
      shellQuote(paths.target.code + '=' + paths.target.name) +
      plan.contextFlags,
    checkCommand:
      COMMAND +
      ' check ' +
      shellQuote(paths.source) +
      ' --target ' +
      shellQuote(paths.target.code + '=' + paths.target.name) +
      plan.contextFlags,
    applyCommand:
      COMMAND +
      ' brief ' +
      shellQuote(paths.source) +
      ' --target ' +
      shellQuote(paths.target.code + '=' + paths.target.name) +
      plan.contextFlags +
      ' --apply',
  })
}

/** The structural violations of one planned mechanical update; empty when it is safe to write. */
export function mechanicalUpdateErrors(corpus: PairCorpus, plan: BriefPlan): string[] {
  if (plan.scope.kind !== 'mechanical' || plan.mechanicalResult === undefined) {
    throw new Error('brief: ' + plan.paths.source + ' [' + plan.paths.target.code + '] is not a code-fence-only change')
  }
  const changedRole = plan.direction === 'source-to-target' ? ('source' as const) : ('counterpart' as const)
  const contexts = {
    source: {
      repoRoot: corpus.root,
      sourcePath: plan.paths.source,
      side: { role: 'source' as const, target: plan.paths.target },
      isPairSource: (path: string) => corpus.isPaired(path),
    },
    counterpart: {
      repoRoot: corpus.root,
      sourcePath: plan.paths.counterpart,
      side: { role: 'counterpart' as const, target: plan.paths.target },
      isPairSource: (path: string) => corpus.isPaired(path),
    },
  }
  const changedText = masked(plan.sourceCurrent)
  const resultText = masked(plan.mechanicalResult)
  const changedTree: Nodes = parseMarkdown(changedText)
  const resultTree: Nodes = parseMarkdown(resultText)
  const changedSignature =
    changedRole === 'source'
      ? translationStructureSignature(changedTree, contexts.source, changedText, new Set())
      : translationStructureSignature(changedTree, contexts.counterpart, changedText, new Set())
  const resultSignature =
    changedRole === 'source'
      ? translationStructureSignature(resultTree, contexts.counterpart, resultText, new Set())
      : translationStructureSignature(resultTree, contexts.source, resultText, new Set())
  return translationStructureDiff(changedSignature, resultSignature)
}

/** Write one validated mechanical update. */
export function writeBrief(corpus: PairCorpus, plan: BriefPlan): void {
  if (plan.mechanicalResult === undefined) {
    throw new Error('brief: ' + plan.paths.source + ' [' + plan.paths.target.code + '] has no computed update to write')
  }
  writeFileSync(join(corpus.root, plan.counterpartPath), plan.mechanicalResult)
}

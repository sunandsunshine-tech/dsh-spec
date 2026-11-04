#!/usr/bin/env node
/**
 * The v2 pairing CLI: list/check/write existing pairs, brief minimal updates, initialise
 * terminology, and render or splice a generated region. Creation and update are declaration- or
 * instruction-driven; the gate never requires a source to be paired.
 *
 * Exit codes: 0 clean or written, 1 violations or nothing to record, 2 usage or a precondition.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, matchesGlob } from 'node:path'
import { buildCorpus, checkPair, discoverPairs, pairLanguages, regionDrift, type PairCorpus } from './pairing.ts'
import {
  computeTranslationPairingRecord,
  dropTranslationTarget,
  parseTranslationPairingRecord,
  renderTranslationPairingRecord,
  updateTranslationPairingRecord,
} from './pairing-record.ts'
import { maskGeneratedRegions, renderGeneratedRegion, spliceGeneratedRegion } from './regions.ts'
import {
  loadPairState,
  mechanicalUpdateErrors,
  planBriefing,
  recordContext,
  renderBrief,
  writeBrief,
} from './update.ts'
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET,
  counterpartSuffix,
  languageFromCounterpartFilename,
  normalizePairArgument,
  pairPaths,
  parseSourceLanguage,
  parseTarget,
  recordPath,
  selectPairs,
  type Language,
  type PairPaths,
} from './targets.ts'

const USAGE = [
  'Usage: translate-pair.mjs <verb> [options] [pairs...]',
  '',
  'Verbs:',
  '  list    report the pairs that exist',
  '  check   verify named pairs, or every existing pair',
  '  write   record named pairs, or --all existing pairs',
  '  brief   print the minimal-update briefing for drifted pairs',
  '  init    write a target terminology template when it is missing',
  '  region  render or splice a generated region for a generator',
  '',
  'Options:',
  '  --target <lang>[=<display>]   target language, repeatable (default: zh=中文)',
  '  --source-lang <code>[=<display>]  source language for a first record',
  '  --select <glob>               select existing pairs by source path, repeatable',
  '  --skip <glob>                 skip source paths, repeatable',
  '  --generated <glob>            generator-owned source glob, repeatable (corpus verbs)',
  '  --terminology <lang>=<path>   terminology file override, repeatable',
  '  --root <dir>                  project root (default: working directory)',
  '  --apply                       brief only: apply a code-fence-only update',
  '  --all                         write only: record every existing pair',
  '',
  'Region options:',
  '  region render --slug <slug> --body <file|->',
  '  region splice <file> --slug <slug> --body <file|->',
].join('\n')

class UsageError extends Error {}

interface TerminologyOverride {
  code: string
  path: string
}

interface Options {
  root: string
  targets: Language[]
  restrict?: Language[]
  sourceLanguage?: Language
  pairs: string[]
  select: string[]
  skip: string[]
  generated: string[]
  terminology: TerminologyOverride[]
  apply: boolean
  all: boolean
  regionAction?: string
  regionFile?: string
  regionSlug?: string
  regionBody?: string
}

function assertGlob(flag: string, pattern: string): void {
  let brackets = 0
  let braces = 0
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]
    if (character === '\\') {
      index += 1
      continue
    }
    if (character === '[') brackets += 1
    else if (character === ']') {
      brackets -= 1
      if (brackets < 0) throw new UsageError(flag + ' has an unmatched ] in ' + JSON.stringify(pattern))
    } else if (character === '{') braces += 1
    else if (character === '}') {
      braces -= 1
      if (braces < 0) throw new UsageError(flag + ' has an unmatched } in ' + JSON.stringify(pattern))
    }
  }
  if (pattern === '') throw new UsageError(flag + ' needs a non-empty glob')
  if (brackets !== 0) throw new UsageError(flag + ' has an unmatched [ in ' + JSON.stringify(pattern))
  if (braces !== 0) throw new UsageError(flag + ' has an unmatched { in ' + JSON.stringify(pattern))
}

function parseOptions(argv: string[]): { verb: string; options: Options } {
  const options: Options = {
    root: process.cwd(),
    targets: [],
    sourceLanguage: undefined,
    pairs: [],
    select: [],
    skip: [],
    generated: [],
    terminology: [],
    apply: false,
    all: false,
    regionAction: undefined,
    regionFile: undefined,
    regionSlug: undefined,
    regionBody: undefined,
  }
  const verb = argv[0]
  if (verb === undefined || verb.startsWith('-')) throw new UsageError(USAGE)
  let index = 1
  if (verb === 'region') {
    options.regionAction = argv[index]
    if (options.regionAction !== 'render' && options.regionAction !== 'splice')
      throw new UsageError('region expects render or splice')
    index += 1
    if (options.regionAction === 'splice') {
      options.regionFile = argv[index]
      if (options.regionFile === undefined || options.regionFile.startsWith('-'))
        throw new UsageError('region splice needs a file argument')
      index += 1
    }
  }
  for (; index < argv.length; index += 1) {
    const flag = argv[index] as string
    const value = (): string => {
      index += 1
      const next = argv[index]
      if (next === undefined) throw new UsageError(flag + ' needs a value')
      return next
    }
    switch (flag) {
      case '--target':
        try {
          options.targets.push(parseTarget(value()))
        } catch (error) {
          throw new UsageError(error instanceof Error ? error.message : String(error))
        }
        break
      case '--source-lang':
        try {
          options.sourceLanguage = parseSourceLanguage(value())
        } catch (error) {
          throw new UsageError(error instanceof Error ? error.message : String(error))
        }
        break
      case '--select': {
        const pattern = value()
        assertGlob(flag, pattern)
        options.select.push(pattern)
        break
      }
      case '--skip': {
        const pattern = value()
        assertGlob(flag, pattern)
        options.skip.push(pattern)
        break
      }
      case '--generated': {
        const pattern = value()
        assertGlob(flag, pattern)
        options.generated.push(pattern)
        break
      }
      case '--terminology': {
        const raw = value()
        const [code, pathValue] = raw.split('=', 2)
        if (code === undefined || pathValue === undefined || pathValue === '')
          throw new UsageError('--terminology expects <lang>=<path>')
        options.terminology.push({ code, path: pathValue })
        break
      }
      case '--root':
        options.root = value()
        break
      case '--apply':
        if (verb !== 'brief') throw new UsageError('--apply belongs to brief')
        options.apply = true
        break
      case '--all':
        if (verb !== 'write') throw new UsageError('--all belongs to write')
        options.all = true
        break
      case '--slug':
        options.regionSlug = value()
        break
      case '--body':
        options.regionBody = value()
        break
      default:
        if (flag.startsWith('-')) throw new UsageError('unknown option: ' + flag)
        options.pairs.push(flag)
    }
  }
  if (options.targets.length > 0) options.restrict = [...options.targets]
  else options.targets = [DEFAULT_TARGET]
  if (verb === 'region') {
    if (options.regionSlug === undefined || options.regionBody === undefined)
      throw new UsageError('region needs --slug and --body')
    if (options.pairs.length > 0) throw new UsageError('region takes no pair arguments')
    return { verb, options }
  }
  if (options.regionSlug !== undefined || options.regionBody !== undefined || options.regionFile !== undefined)
    throw new UsageError('region options belong to the region verb')
  if (verb === 'init') {
    if (
      options.pairs.length > 0 ||
      options.apply ||
      options.all ||
      options.generated.length > 0 ||
      options.select.length > 0 ||
      options.skip.length > 0 ||
      options.sourceLanguage !== undefined
    )
      throw new UsageError('init accepts only --target, --root and --terminology')
  }
  if (options.sourceLanguage !== undefined && verb !== 'write') throw new UsageError('--source-lang belongs to write')
  return { verb, options }
}

function readRepositoryFile(root: string, path: string): string | undefined {
  const absolute = isAbsolute(path) ? path : join(root, path)
  try {
    return statSync(absolute).isFile() ? readFileSync(absolute, 'utf8') : undefined
  } catch {
    return undefined
  }
}

function corpusOf(options: Options): PairCorpus {
  return buildCorpus({
    root: options.root,
    targets: options.targets,
    generated: options.generated,
    select: options.select,
    skip: options.skip,
    terminology: options.terminology,
    repositoryFileExists: (path) => readRepositoryFile(options.root, path) !== undefined,
    repositoryReadFile: (path) => readRepositoryFile(options.root, path),
  })
}

function terminologyPath(options: Options, target: Language): string {
  const override = options.terminology.find((entry) => entry.code === target.code)
  if (override !== undefined) return override.path
  const name = target.code === DEFAULT_TARGET.code ? 'terminology.md' : 'terminology.' + target.code + '.md'
  return join(options.root, '.agents', 'dsh-spec-translate-docs', name)
}

function readTerminology(options: Options, target: Language): string {
  const path = terminologyPath(options, target)
  const content = readRepositoryFile(options.root, path)
  if (content === undefined) {
    throw new UsageError(
      'terminology table missing for ' +
        target.code +
        ': run init --target ' +
        target.code +
        '=' +
        target.name +
        ' (expected ' +
        path +
        ')',
    )
  }
  return content
}

function existingTargets(options: Options, source: string): Language[] {
  const found = new Map<string, Language>()
  const recordText = readRepositoryFile(options.root, recordPath(source))
  if (recordText !== undefined) {
    const parsed = parseTranslationPairingRecord(recordText)
    if (parsed !== undefined) {
      for (const values of parsed.entries.values()) {
        for (const code of values.keys()) {
          if (code === parsed.sourceCode) continue
          const declared = options.targets.find((target) => target.code === code)
          found.set(code, declared ?? { code, name: code })
        }
      }
    }
  }
  for (const name of walkCounterparts(options.root, source)) {
    const language = languageFromCounterpartFilename(name)
    if (language === undefined) continue
    const declared = options.targets.find((target) => target.code === language.code)
    found.set(language.code, declared ?? language)
  }
  return [...found.values()].sort((left, right) => left.code.localeCompare(right.code))
}

function walkCounterparts(root: string, source: string): string[] {
  const dir = join(root, source.replace(/[^/]*$/, ''))
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

function selected(options: Options, corpus: PairCorpus): PairPaths[] {
  const seen = new Set<string>()
  const pairs: PairPaths[] = []
  for (const argument of options.pairs) {
    for (const pair of selectPairs(argument, corpus.declared, options.restrict, (source) =>
      existingTargets(options, source),
    )) {
      const paths = pairPaths(pair.source, pair.target)
      const key = paths.source + ' zero ' + pair.target.code
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push(paths)
    }
  }
  return pairs.sort(
    (left, right) => left.source.localeCompare(right.source) || left.target.code.localeCompare(right.target.code),
  )
}

function passesFilters(options: Options, source: string): boolean {
  if (options.select.length > 0 && !options.select.some((pattern) => match(pattern, source))) return false
  if (options.skip.some((pattern) => match(pattern, source))) return false
  return true
}

function match(pattern: string, value: string): boolean {
  return matchesGlob(value, pattern)
}

function discoveredPairs(options: Options, corpus: PairCorpus): PairPaths[] {
  return discoverPairs({ root: options.root, corpus })
    .map((pair) => pair.paths)
    .filter((paths) => passesFilters(options, paths.source))
}

function namedPairAbsent(options: Options, paths: PairPaths): boolean {
  return (
    readRepositoryFile(options.root, paths.source) === undefined &&
    readRepositoryFile(options.root, paths.counterpart) === undefined &&
    readRepositoryFile(options.root, paths.record) === undefined
  )
}

function verbList(options: Options): number {
  const corpus = corpusOf(options)
  const pairs = options.pairs.length > 0 ? selected(options, corpus) : discoveredPairs(options, corpus)
  const counts = { ok: 0, 'out-of-sync': 0, missing: 0 } as Record<string, number>
  for (const paths of pairs) {
    const check = checkPair({
      root: options.root,
      corpus,
      paths,
      readFile: (path) => readRepositoryFile(options.root, path),
    })
    counts[check.state] = (counts[check.state] ?? 0) + 1
    console.log(check.state.padEnd(12) + ' ' + paths.source + ' [' + paths.target.code + ']')
  }
  console.log(
    'translate-pair: ' +
      String(counts.ok ?? 0) +
      ' ok, ' +
      String(counts['out-of-sync'] ?? 0) +
      ' out-of-sync, ' +
      String(counts.missing ?? 0) +
      ' missing',
  )
  return 0
}

function verbCheck(options: Options): number {
  const corpus = corpusOf(options)
  const pairs = options.pairs.length > 0 ? selected(options, corpus) : discoveredPairs(options, corpus)
  if (options.pairs.length > 0) {
    for (const paths of pairs) {
      if (namedPairAbsent(options, paths))
        throw new UsageError(paths.source + ' [' + paths.target.code + '] names no pair on disk')
    }
  }
  if (pairs.length === 0) {
    throw new UsageError('check selected no existing pair; nothing to check is not a green check')
  }
  const problems: string[] = []
  for (const paths of pairs) {
    problems.push(
      ...checkPair({ root: options.root, corpus, paths, readFile: (path) => readRepositoryFile(options.root, path) })
        .errors,
    )
  }
  if (problems.length > 0) {
    console.error('translate-pair: pairing rules violated:')
    for (const problem of problems) console.error('  ' + problem)
    return 1
  }
  console.log('translate-pair: ' + String(pairs.length) + ' pair(s) consistent.')
  return 0
}

function verbWrite(options: Options): number {
  if (options.pairs.length === 0 && !options.all) {
    throw new UsageError('write requires the pair(s) you confirmed, or --all to re-record existing pairs')
  }
  if (options.pairs.length > 0 && options.all) throw new UsageError('write takes either named pairs or --all, not both')
  const corpus = corpusOf(options)
  const candidates = options.pairs.length > 0 ? selected(options, corpus) : discoveredPairs(options, corpus)
  const groups = new Map<string, PairPaths[]>()
  for (const paths of candidates) {
    const group = groups.get(paths.source) ?? []
    group.push(paths)
    groups.set(paths.source, group)
  }
  const results: { source: string; record?: string; remove?: boolean }[] = []
  for (const [source, group] of groups) {
    const sourceText = readRepositoryFile(options.root, source)
    if (sourceText === undefined) {
      if (options.pairs.length > 0) throw new UsageError('cannot record ' + source + ': missing ' + source)
      continue
    }
    const recordText = readRepositoryFile(options.root, recordPath(source))
    let parsed = recordText === undefined ? undefined : parseTranslationPairingRecord(recordText)
    if (recordText !== undefined && parsed === undefined) {
      if (options.pairs.length > 0) {
        throw new UsageError(recordPath(source) + ': malformed consistency record; cannot update it')
      }
      parsed = undefined
    }
    if (
      parsed !== undefined &&
      options.sourceLanguage !== undefined &&
      parsed.sourceCode !== options.sourceLanguage.code
    ) {
      throw new UsageError(
        recordPath(source) +
          ': record source language is ' +
          JSON.stringify(parsed.sourceCode) +
          ', not ' +
          JSON.stringify(options.sourceLanguage.code),
      )
    }
    const sourceCode = parsed?.sourceCode ?? options.sourceLanguage?.code ?? DEFAULT_SOURCE_LANGUAGE.code
    let record = parsed
    if (options.all && parsed !== undefined) {
      const present = new Set<string>()
      for (const paths of group) if (corpus.fileExists(paths.counterpart)) present.add(paths.target.code)
      for (const targetCode of new Set([...parsed.entries.values()].flatMap((targets) => [...targets.keys()]))) {
        if (present.has(targetCode)) continue
        record = record === undefined ? undefined : dropTranslationTarget(record, targetCode)
      }
    }
    let updated = false
    for (const paths of group) {
      const counterpartText = readRepositoryFile(options.root, paths.counterpart)
      if (counterpartText === undefined) {
        if (options.pairs.length > 0) {
          throw new UsageError('cannot record ' + source + ' [' + paths.target.code + ']: missing ' + paths.counterpart)
        }
        continue
      }
      const computed = computeTranslationPairingRecord(
        paths,
        maskGeneratedRegions(sourceText),
        maskGeneratedRegions(counterpartText),
        recordContext(corpus, paths.target),
      )
      record = updateTranslationPairingRecord(record, sourceCode, paths.target.code, computed)
      updated = true
    }
    if (!updated && record === undefined) {
      if (parsed !== undefined) results.push({ source, remove: true })
      continue
    }
    if (record === undefined) {
      if (options.pairs.length > 0) {
        throw new UsageError('cannot record ' + source + ': no counterpart exists for the selected target')
      }
      continue
    }
    results.push({ source, record: renderTranslationPairingRecord(source, record) })
  }
  if (results.length === 0) {
    console.error('translate-pair: nothing to record; no complete pair was named or found')
    return 1
  }
  let written = 0
  for (const result of results) {
    const path = recordPath(result.source)
    const absolute = join(options.root, path)
    if (result.remove === true) {
      rmSync(absolute, { force: true })
      console.log('translate-pair: removed ' + path)
      written += 1
      continue
    }
    mkdirSync(dirname(absolute), { recursive: true })
    writeFileSync(absolute, result.record as string)
    console.log('translate-pair: recorded ' + path)
    written += 1
  }
  console.log('translate-pair: ' + String(written) + ' record(s) written; run the check to validate the pairs.')
  return 0
}

interface LoadedPair {
  /** Source language code and display name. */
  source: Language
  /** Target language display name. */
  target: Language
  /** Current source and counterpart text. */
  sourceText: string
  counterpartText: string
}

function loadPair(options: Options, corpus: PairCorpus, paths: PairPaths): LoadedPair | string {
  const recordText = readRepositoryFile(options.root, paths.record)
  const sourceText = readRepositoryFile(options.root, paths.source)
  const counterpartText = readRepositoryFile(options.root, paths.counterpart)
  if (recordText === undefined || sourceText === undefined || counterpartText === undefined) {
    return (
      paths.source +
      ' [' +
      paths.target.code +
      ']: incomplete pair (missing ' +
      [paths.source, paths.counterpart, paths.record]
        .filter((path) => readRepositoryFile(options.root, path) === undefined)
        .join(', ') +
      '); a new counterpart is whole-document translation work, not a minimal update'
    )
  }
  const parsed = parseTranslationPairingRecord(recordText)
  if (parsed === undefined) return paths.record + ': malformed consistency record'
  const languages = pairLanguages(paths, corpus, (path) => readRepositoryFile(options.root, path), parsed.sourceCode)
  return { source: languages.source, target: languages.target, sourceText, counterpartText }
}

function verbBrief(options: Options): number {
  const corpus = corpusOf(options)
  const pairs = options.pairs.length > 0 ? selected(options, corpus) : discoveredPairs(options, corpus)
  if (pairs.length === 0) {
    throw new UsageError('brief selected no existing pair; nothing to brief is not a green brief')
  }
  const plans: { plan: ReturnType<typeof planBriefing>[number]; terminology: string }[] = []
  const drifts: string[] = []
  for (const paths of pairs) {
    const drift = regionDrift(corpus, options.root, paths, (path) => readRepositoryFile(options.root, path))
    if (drift !== undefined) drifts.push(drift)
    const loaded = loadPair(options, corpus, paths)
    if (typeof loaded === 'string') {
      if (options.pairs.length > 0) throw new UsageError(loaded)
      continue
    }
    const recordText = readRepositoryFile(options.root, paths.record) as string
    const state = loadPairState(options.root, corpus, paths, recordText, loaded.sourceText, loaded.counterpartText)
    if (typeof state === 'string') {
      if (options.pairs.length > 0) throw new UsageError(state)
      continue
    }
    if (!state.sourceDrifted && !state.counterpartDrifted) {
      if (options.pairs.length > 0)
        throw new UsageError(
          paths.source + ' [' + paths.target.code + ']: pair is consistent with its record - nothing to brief',
        )
      continue
    }
    const terminology = readTerminology(options, loaded.target)
    for (const plan of planBriefing({
      corpus,
      paths,
      state,
      sourceCurrent: loaded.sourceText,
      counterpartCurrent: loaded.counterpartText,
      terminology,
      sourceLanguage: loaded.source,
    }))
      plans.push({ plan, terminology })
  }
  if (drifts.length > 0) throw new UsageError(drifts.join('; ') + '; a brief cannot reconcile a generated region')
  if (options.apply) {
    const prose = plans.filter(
      (entry) => entry.plan.scope.kind !== 'mechanical' || entry.plan.mechanicalResult === undefined,
    )
    if (prose.length > 0) {
      const names = prose.map((entry) => entry.plan.paths.source + ' [' + entry.plan.paths.target.code + ']').join(', ')
      throw new UsageError(
        '--apply needs a code-fence-only change, but ' +
          names +
          ' has prose changes; run the briefing without --apply and translate the prose',
      )
    }
  }
  if (plans.length === 0) {
    console.log('translate-pair: every recorded pair matches its consistency record; nothing to brief.')
    return 0
  }
  if (options.apply) {
    const violations = plans.flatMap((entry) =>
      mechanicalUpdateErrors(corpus, entry.plan).map((error) => entry.plan.counterpartPath + ': ' + error),
    )
    if (violations.length > 0) {
      console.error(
        'translate-pair: the computed mechanical update would violate the pair structure; nothing was written:',
      )
      for (const violation of violations) console.error('  ' + violation)
      return 1
    }
    for (const entry of plans) writeBrief(corpus, entry.plan)
  }
  console.log(plans.map((entry) => renderBrief(entry.plan, entry.terminology)).join('\n\n---\n\n'))
  if (options.apply)
    console.error(
      'translate-pair: ' +
        String(plans.length) +
        ' mechanical update(s) applied and structure-validated; record the pairs after review.',
    )
  return 0
}

function verbInit(options: Options): number {
  const targets = options.restrict ?? options.targets
  if (targets.length !== 1) throw new UsageError('init takes exactly one target (--target <lang>[=<display>])')
  const target = targets[0] as Language
  const path = terminologyPath(options, target)
  if (readRepositoryFile(options.root, path) !== undefined) {
    console.log('translate-pair: ' + path + ' already exists; the template was not written')
    return 0
  }
  const template = [
    '# Terminology',
    '',
    'This table binds every ' + DEFAULT_SOURCE_LANGUAGE.name + '-' + target.name + ' pair the project keeps.',
    'Columns: the source term, its ' + target.name + ' rendering, the first-occurrence form (optional),',
    'renderings that must not be used, and a note. The briefing matches by column position.',
    '',
    '| ' + DEFAULT_SOURCE_LANGUAGE.name + ' | ' + target.name + ' | First occurrence | Forbidden renderings | Note |',
    '|---|---|---|---|---|',
    '',
  ].join('\n')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, template)
  console.log('translate-pair: wrote ' + path)
  return 0
}

function readBody(spec: string): string {
  if (spec === '-') return readFileSync(0, 'utf8')
  const content = readFileSync(isAbsolute(spec) ? spec : join(process.cwd(), spec), 'utf8')
  return content.endsWith('\n') ? content.slice(0, -1) : content
}

function verbRegion(options: Options): number {
  try {
    const slug = options.regionSlug as string
    const body = readBody(options.regionBody as string)
    if (options.regionAction === 'render') {
      process.stdout.write(renderGeneratedRegion(slug, body) + '\n')
      return 0
    }
    const file = options.regionFile as string
    const absolute = isAbsolute(file) ? file : join(options.root, file)
    const content = readFileSync(absolute, 'utf8')
    const next = spliceGeneratedRegion(content, slug, body)
    writeFileSync(absolute, next)
    console.log('translate-pair: spliced region ' + JSON.stringify(slug) + ' in ' + file)
    return 0
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }
}

function main(): void {
  const { verb, options } = parseOptions(process.argv.slice(2))
  switch (verb) {
    case 'list':
      process.exit(verbList(options))
      break
    case 'check':
      process.exit(verbCheck(options))
      break
    case 'write':
      process.exit(verbWrite(options))
      break
    case 'brief':
      process.exit(verbBrief(options))
      break
    case 'init':
      process.exit(verbInit(options))
      break
    case 'region':
      process.exit(verbRegion(options))
      break
    default:
      throw new UsageError('unknown verb: ' + verb)
  }
}

try {
  main()
} catch (error) {
  if (error instanceof UsageError) {
    console.error('translate-pair: ' + error.message)
    process.exit(2)
  }
  console.error('translate-pair: ' + (error instanceof Error ? error.message : String(error)))
  process.exit(1)
}

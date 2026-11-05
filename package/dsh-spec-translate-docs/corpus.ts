/**
 * SPDX-License-Identifier: MIT
 *
 * Extracted from the DeepSeek Harness bilingual-document mechanism at the pinned
 * `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
/**
 * Pair discovery and the corpus: the repository walk and its prunes, the recognized language set,
 * the existing targets of one source, pair languages, and pair discovery from counterpart files
 * and aggregate-record entries.
 *
 * The gate only checks pairs that already exist. Creation and update follow the project's
 * standing instructions or the user's instruction; this module never requires a source to be paired.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { matchesGlob, resolve } from 'node:path'
import { parseMarkdown } from './markdown.ts'
import type { TranslationLinkContext } from './pairing-links.ts'
import { parseTranslationPairingRecord, type TranslationPairingRecordContext } from './pairing-record.ts'
import { counterpartSwitcher } from './switchers.ts'
import {
  counterpartSuffix,
  languageFromCounterpartFilename,
  pairKey,
  pairPaths,
  type Language,
  type PairPaths,
} from './targets.ts'

const PRUNE_SEGMENTS = new Set([
  'node_modules',
  'vendor',
  'dist',
  'build',
  'out',
  'target',
  'coverage',
  '__pycache__',
  '.venv',
  '.cache',
  '.pnpm-store',
  '.git',
])
const PRUNE_TREES = ['.agents/skills', '.agents/dsh-spec-translate-docs']

/** Inputs that decide discovery and the declared target set. */
export interface CorpusOptions {
  /** Project root, absolute. */
  root: string
  /** Declared targets. */
  targets: Language[]
  /** Generator-owned source globs. */
  generated?: readonly string[]
  /** Content plane for existence checks; defaults to the working tree. */
  repositoryFileExists?: (repoPath: string) => boolean
  /** Content reader used to read aggregate records; defaults to the file system. */
  repositoryReadFile?: (repoPath: string) => string | undefined
  /** Selection globs repeated by briefing commands. */
  select?: readonly string[]
  /** Skip globs repeated by briefing commands. */
  skip?: readonly string[]
  /** Terminology path overrides repeated by briefing commands. */
  terminology?: { code: string; path: string }[]
}

/** The pair corpus. */
export interface PairCorpus {
  root: string
  declared: Language[]
  recognized: Language[]
  fileExists: (path: string) => boolean
  readFile: (path: string) => string | undefined
  isPaired: (path: string) => boolean
  /** Targets with pair artifacts for one source: a counterpart file or an aggregate-record entry. */
  existingTargets: (source: string) => Language[]
  /** Link-resolution inputs for one side of one pair. */
  linkContext: (paths: PairPaths, role: 'source' | 'counterpart') => TranslationLinkContext
  /** Record inputs shared by one pair's two sides. */
  recordContext: (target: Language) => TranslationPairingRecordContext
  isGeneratedSource(path: string): boolean
  generated: string[]
  select: string[]
  skip: string[]
  terminology: { code: string; path: string }[]
}

function prunedDirectory(relative: string): boolean {
  const segments = relative.split('/')
  if (segments.some((segment) => PRUNE_SEGMENTS.has(segment))) return true
  return PRUNE_TREES.some((tree) => relative === tree || relative.endsWith('/' + tree))
}

function walkRepository(root: string): string[] {
  const out: string[] = []
  const descend = (relative: string): void => {
    const absolute = relative === '' ? root : resolve(root, relative)
    let entries
    try {
      entries = readdirSync(absolute, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const next = relative === '' ? entry.name : relative + '/' + entry.name
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        if (prunedDirectory(next)) continue
        descend(next)
        continue
      }
      if (!entry.isFile()) continue
      if (entry.name.endsWith('.md') || entry.name.endsWith('.i18n.yaml')) out.push(next)
    }
  }
  descend('')
  return out
}

function statFileSync(root: string, repoPath: string): boolean {
  try {
    return statSync(resolve(root, repoPath)).isFile()
  } catch {
    return false
  }
}

/**
 * Build the corpus from the declared targets and the records that exist.
 * @param options - root, declared targets, generated globs and content plane.
 * @returns the corpus.
 */
export function buildCorpus(options: CorpusOptions): PairCorpus {
  const fileExists = (repoPath: string): boolean =>
    options.repositoryFileExists !== undefined
      ? options.repositoryFileExists(repoPath)
      : statFileSync(options.root, repoPath)
  const readFile = (repoPath: string): string | undefined =>
    options.repositoryReadFile !== undefined
      ? options.repositoryReadFile(repoPath)
      : (() => {
          try {
            return readFileSync(resolve(options.root, repoPath), 'utf8')
          } catch {
            return undefined
          }
        })()
  const found = new Map(options.targets.map((target) => [target.code, target]))
  const recorded = new Map<string, Set<string>>()
  for (const file of walkRepository(options.root)) {
    const counterpart = languageFromCounterpartFilename(file)
    if (counterpart !== undefined && !found.has(counterpart.code)) found.set(counterpart.code, counterpart)
    if (!file.endsWith('.i18n.yaml')) continue
    const text = readFile(file)
    if (text === undefined) continue
    const record = parseTranslationPairingRecord(text)
    if (record === undefined) continue
    const source = file.replace(/\.i18n\.yaml$/, '.md')
    const targets = recorded.get(source) ?? new Set<string>()
    for (const values of record.entries.values()) {
      for (const code of values.keys()) {
        if (code === record.sourceCode) continue
        targets.add(code)
        if (!found.has(code)) found.set(code, { code, name: code })
      }
    }
    recorded.set(source, targets)
  }
  const recognized = [...found.values()].sort((left, right) => left.code.localeCompare(right.code))
  const hasPairArtifacts = (sourcePath: string): boolean =>
    recognized.some((target) => {
      const paths = pairPaths(sourcePath, target)
      return fileExists(paths.counterpart) || fileExists(paths.record)
    })
  const isPaired = (path: string): boolean => {
    const named = languageFromCounterpartFilename(path)
    if (named !== undefined) return hasPairArtifacts(path.slice(0, -counterpartSuffix(named).length) + '.md')
    if (!path.endsWith('.md')) return false
    return hasPairArtifacts(path)
  }
  const existingTargets = (source: string): Language[] => {
    const codes = recorded.get(source)
    return recognized.filter(
      (target) => (codes?.has(target.code) ?? false) || fileExists(pairPaths(source, target).counterpart),
    )
  }
  const linkBase: Omit<TranslationLinkContext, 'sourcePath' | 'side'> = {
    repoRoot: options.root,
    isPairSource: isPaired,
    repositoryFileExists: fileExists,
  }
  const generated = [...(options.generated ?? [])]
  return {
    root: options.root,
    declared: [...options.targets],
    recognized,
    fileExists,
    readFile,
    isPaired,
    existingTargets,
    linkContext: (paths: PairPaths, role: 'source' | 'counterpart'): TranslationLinkContext => ({
      ...linkBase,
      sourcePath: role === 'source' ? paths.source : paths.counterpart,
      side: { role, target: paths.target },
    }),
    recordContext: (target: Language): TranslationPairingRecordContext => ({ base: linkBase, target }),
    isGeneratedSource: (path: string) => generated.some((pattern) => matchesGlob(path, pattern)),
    generated,
    select: [...(options.select ?? [])],
    skip: [...(options.skip ?? [])],
    terminology: [...(options.terminology ?? [])],
  }
}

/**
 * Derive the pair's source and target display names from the counterpart switcher.
 * @param paths - the pair.
 * @param corpus - the corpus.
 * @param sourceCode - the source language code recorded for the pair.
 * @returns source and target languages; names fall back to declared names or codes.
 */
export function pairLanguages(
  paths: PairPaths,
  corpus: PairCorpus,
  sourceCode: string,
): { source: Language; target: Language } {
  const text = corpus.readFile(paths.counterpart)
  const tree = text === undefined ? undefined : parseMarkdown(text)
  const info = text !== undefined && tree !== undefined ? counterpartSwitcher(tree, text, paths.source) : undefined
  const declaredTarget = corpus.declared.find((target) => target.code === paths.target.code)
  return {
    source: { code: sourceCode, name: info?.sourceLabel ?? sourceCode },
    target: { code: paths.target.code, name: declaredTarget?.name ?? info?.targetLabel ?? paths.target.code },
  }
}

/** One considered pair: its paths and which artifacts exist. */
export interface DiscoveredPair {
  paths: PairPaths
  present: { source: boolean; counterpart: boolean; record: boolean }
}

/**
 * Discover existing pair artifacts: counterpart files and aggregate record entries.
 * @param corpus - the pair corpus.
 * @returns discovered pairs, sorted by source then target.
 */
export function discoverPairs(corpus: PairCorpus): DiscoveredPair[] {
  const seen = new Map<string, DiscoveredPair>()
  const add = (paths: PairPaths): void => {
    const key = pairKey(paths)
    if (seen.has(key)) return
    seen.set(key, {
      paths,
      present: {
        source: corpus.fileExists(paths.source),
        counterpart: corpus.fileExists(paths.counterpart),
        record: corpus.fileExists(paths.record),
      },
    })
  }
  for (const file of walkRepository(corpus.root)) {
    const named = languageFromCounterpartFilename(file)
    if (named !== undefined) {
      add(pairPaths(file.slice(0, -counterpartSuffix(named).length) + '.md', named))
      continue
    }
    if (!file.endsWith('.i18n.yaml')) continue
    const source = file.replace(/\.i18n\.yaml$/, '.md')
    for (const target of corpus.existingTargets(source)) add(pairPaths(source, target))
  }
  return [...seen.values()].sort(
    (left, right) =>
      left.paths.source.localeCompare(right.paths.source) ||
      left.paths.target.code.localeCompare(right.paths.target.code),
  )
}

/**
 * The language and pair-path model for v2: a source document, one counterpart per target
 * language, and one aggregate multi-language consistency record per source.
 *
 * A source carries no language suffix; the source language is a property of the pair, read from
 * the record once one exists and supplied with --source-lang when the record is first written.
 * The default target is Simplified Chinese, which keeps the upstream counterpart naming; every
 * target shares the source's single foo.i18n.yaml record.
 */

/** One language of a pair; name is the display name the switcher line uses. */
export interface Language {
  /** Language code, lower-case BCP 47-style. */
  code: string
  /** Display name written into the switcher line. */
  name: string
}

/** The default target when no --target is passed. */
export const DEFAULT_TARGET: Language = { code: 'zh', name: '中文' }

const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/

/**
 * Parse one language option value.
 * @param value - raw option value, `code` or `code=display`.
 * @param flag - option name for the error message.
 * @param options - whether a bare non-default code needs a display name.
 * @returns the language.
 * @throws Error when the code is malformed or the required display name is missing.
 */
export function parseLanguage(
  value: string,
  flag: string,
  options: { requireDisplay: boolean; defaultLanguage?: Language },
): Language {
  const [code, name] = value.split('=', 2)
  if (code === undefined || !LANGUAGE_CODE.test(code)) {
    throw new Error(flag + ' expects <lang>=<display>, received ' + JSON.stringify(value))
  }
  if (name !== undefined && name !== '') return { code, name }
  if (options.defaultLanguage !== undefined && options.defaultLanguage.code === code) return options.defaultLanguage
  if (options.requireDisplay) {
    throw new Error(
      flag + ' ' + JSON.stringify(code) + ' needs a display name: use ' + flag + ' ' + code + '=<display>',
    )
  }
  return { code, name: code }
}

/** Parse one --target value; zh alone keeps the default display name. */
export function parseTarget(value: string): Language {
  return parseLanguage(value, '--target', { requireDisplay: true, defaultLanguage: DEFAULT_TARGET })
}

/** Parse one --source-lang value; en alone keeps the English display name. */
export function parseSourceLanguage(value: string): Language {
  return parseLanguage(value, '--source-lang', {
    requireDisplay: false,
    defaultLanguage: { code: 'en', name: 'English' },
  })
}

/** The source language assumed only when a record and the flag are both absent. */
export const DEFAULT_SOURCE_LANGUAGE: Language = { code: 'en', name: 'English' }

/** Whether the language keeps the upstream zh file naming. */
export function isDefaultLanguage(language: Language): boolean {
  return language.code === DEFAULT_TARGET.code
}

/** The counterpart file suffix for one target: .zh.md or .<code>.md. */
export function counterpartSuffix(language: Language): string {
  return isDefaultLanguage(language) ? '.zh.md' : '.' + language.code + '.md'
}

/** The single aggregate record path for a source. */
export function recordPath(source: string): string {
  if (!source.endsWith('.md')) throw new Error('expected a Markdown source path, received ' + JSON.stringify(source))
  return source.replace(/\.md$/, '.i18n.yaml')
}

/** The files that identify one pair. */
export interface PairPaths {
  /** Source document path. */
  source: string
  /** Counterpart document path for the target. */
  counterpart: string
  /** The source's aggregate consistency record. */
  record: string
  /** Target language of this pair. */
  target: Language
}

/**
 * Derive the counterpart and record paths from a source document and a target.
 * @param source - repository-relative source Markdown path.
 * @param target - the pair's target language.
 * @returns the pair paths.
 */
export function pairPaths(source: string, target: Language): PairPaths {
  if (!source.endsWith('.md')) throw new Error('expected a Markdown source path, received ' + JSON.stringify(source))
  return {
    source,
    counterpart: source.replace(/\.md$/, counterpartSuffix(target)),
    record: recordPath(source),
    target,
  }
}

/** Normalize any pair artifact path or bare stem to its source Markdown path. */
export function normalizePairArgument(argument: string): string {
  const normalized = argument.split('\\').join('/').replace(/^\.\//, '')
  if (normalized.endsWith('.i18n.yaml')) return normalized.replace(/\.i18n\.yaml$/, '.md')
  if (normalized.endsWith('.md')) return normalized
  return normalized + '.md'
}

/** The target language named by a counterpart filename, if the suffix parses. */
export function languageFromCounterpartFilename(path: string): Language | undefined {
  const match = /\.([a-z]{2,3}(?:-[A-Za-z0-9]{1,8})*)\.md$/.exec(path)
  if (match?.[1]) {
    const code = match[1]
    return code === DEFAULT_TARGET.code ? DEFAULT_TARGET : { code, name: code }
  }
  return undefined
}

/** One named or discovered pair. */
export interface SelectedPair {
  source: string
  target: Language
}

/**
 * Resolve one command-line pair argument to the pairs it names.
 *
 * A counterpart path names one target; a record path or source path names the existing targets
 * unless --target restricts them. There is no declared-completeness fallback: a source with no
 * pairs and no --target names nothing.
 *
 * @param argument - repository-relative path or bare stem.
 * @param declared - targets passed with --target.
 * @param restrict - --target values when the caller passed any.
 * @param existingTargets - targets of the artifacts that exist for a source.
 * @returns selected pairs.
 */
export function selectPairs(
  argument: string,
  declared: readonly Language[],
  restrict: readonly Language[] | undefined,
  existingTargets: (source: string) => Language[],
): SelectedPair[] {
  const path = argument.split('\\').join('/').replace(/^\.\//, '')
  const named = languageFromCounterpartFilename(path)
  if (named !== undefined) {
    const declaredMatch = declared.find((target) => target.code === named.code)
    const suffix = counterpartSuffix(named)
    return [{ source: path.slice(0, -suffix.length) + '.md', target: declaredMatch ?? named }]
  }
  const source = normalizePairArgument(path)
  const targets = restrict ?? existingTargets(source)
  return targets.map((target) => ({ source, target }))
}

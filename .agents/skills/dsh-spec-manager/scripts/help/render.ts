/**
 * The three shapes the command table is printed in: the global screen, one subject's page, and the
 * Markdown reference.
 *
 * The shape follows the tools a reader already knows: a one-sentence description, a `Usage:` line,
 * the commands grouped by purpose with a bare imperative phrase each, then the flags and a pointer
 * to per-command help. `kubectl --help`, `helm --help` and `mise --help` are the references — a row
 * there is a name and a phrase with no second clause, and the flags belong to the command's own help.
 *
 * A command is either a verb that acts (`install`, `check`) or a noun with a verb (`notes check`,
 * `translation-pair list`). A noun's help lists its verbs, a verb's help lists its own flags.
 *
 * Only the help is localized. The checks' reports stay English because a commit message or a note
 * quotes them as evidence and the functional suite asserts their text.
 *
 * Zero external dependencies.
 */

import { COMMAND_HELP, FLAGS, LABELS } from './catalog.ts'
import type { CommandHelp, HelpLanguage } from './catalog.ts'

/**
 * The language the help should speak.
 *
 * The flag decides first, then `DSH_SPEC_LANG`, then the locale variables in the order a program
 * usually reads them; a value whose language part starts with `zh` selects Chinese and anything else
 * selects English, because a locale is a locale and only the flag is an enum.
 *
 * @param args - the arguments after the script path.
 * @returns the language, or why the flag's value is not one.
 */
export function helpLanguage(args: readonly string[]): HelpLanguage | { error: string } {
  const index = args.findIndex(argument => argument === '--help' || argument === '-h')
  const explicit = args[index + 1]
  if (explicit !== undefined && !explicit.startsWith('-')) {
    if (explicit === 'zh' || explicit === 'en') return explicit
    return { error: `--help takes \`zh\` or \`en\`, not ${JSON.stringify(explicit)}` }
  }
  for (const name of ['DSH_SPEC_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const value = process.env[name]
    if (value !== undefined && value !== '') return value.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'en'
}

/** A Markdown table from rows, with the columns padded so the source stays readable. */
function table(header: readonly string[], rows: ReadonlyArray<readonly string[]>): string[] {
  // A cell's own `|` would end the cell, and the scope grammar is full of them.
  const cell = (text: string): string => text.replaceAll('|', '\\|')
  const escaped = rows.map(row => row.map(cell))
  const widths = header.map((heading, index) => Math.max(cell(heading).length, ...escaped.map(row => (row[index] ?? '').length)))
  const line = (cells: readonly string[]): string => `| ${cells.map((value, index) => value.padEnd(widths[index] ?? 0)).join(' | ')} |`
  return [line(header.map(cell)), `|${widths.map(width => '-'.repeat(width + 2)).join('|')}|`, ...escaped.map(line)]
}

/** One command's record, or nothing when no command has that name. */
function entryOf(command: string): CommandHelp | undefined {
  return COMMAND_HELP.find(entry => entry.command === command)
}

/** The commands a reader types at the top level: a verb, or a noun with no verb after it. */
function topLevel(): CommandHelp[] {
  return COMMAND_HELP.filter(entry => !entry.command.includes(' '))
}

/** The verbs of one noun, in the order its help lists them. */
function verbsOf(noun: string): CommandHelp[] {
  return COMMAND_HELP.filter(entry => entry.command.startsWith(`${noun} `))
}

/** The noun a two-word command belongs to. */
function nounOf(command: string): string | undefined {
  return command.includes(' ') ? command.split(' ')[0] : undefined
}

/** The long name of a flag, which is what the list is sorted by. */
function longName(flag: string): string {
  return flag.split(', ').find(part => part.startsWith('--')) ?? flag
}

/** The flag block, aligned like every other list here; a command's own flags come first by name. */
function flagLines(language: HelpLanguage, command?: string): string[] {
  const own = (command === undefined ? [] : entryOf(command)?.flags ?? []).map(([flag, en, zh]) => [flag, language === 'en' ? en : zh] as const)
  const merged = [...own, ...FLAGS[language]].sort((a, b) => longName(a[0]).localeCompare(longName(b[0])))
  const width = Math.max(...merged.map(([flag]) => flag.length))
  return merged.map(([flag, meaning]) => `  ${flag.padEnd(width)}  ${meaning}`)
}

/** The top-level rows of one group: a command, its verbs when it is a noun, and a phrase. */
function groupLines(group: CommandHelp['group'], language: HelpLanguage): string[] {
  const entries = topLevel().filter(entry => entry.group === group)
  const width = Math.max(...entries.map(entry => entry.command.length))
  return entries.map((entry) => {
    const verbs = entry.verbs.length === 0 ? '' : ` (${LABELS[language].verbsInline}: ${entry.verbs.join(', ')})`
    return `  ${entry.command.padEnd(width)}  ${entry[language].summary}${verbs}`
  })
}

/** A usage line's scope suffix: ` [scope: …]`, or nothing when the command takes no scope. */
function scopeSuffix(entry: CommandHelp, language: HelpLanguage): string {
  return entry.scope === '—' ? '' : ` [${LABELS[language].scopeLabel}: ${entry.scope}]`
}

/**
 * The screen `--help` prints: what the tool is, how to call it, its commands, its flags.
 * @param language - the language to print in.
 * @param invocation - the command as this installation spells it.
 * @returns the text, with a trailing newline.
 */
export function globalHelp(language: HelpLanguage, invocation: string): string {
  const labels = LABELS[language]
  return `${[
    labels.purpose,
    '',
    `${labels.usage}:`,
    `  node ${invocation} ${labels.metavars}`,
    '',
    `${labels.management}:`,
    ...groupLines('management', language),
    '',
    `${labels.commands}:`,
    ...groupLines('checks', language),
    '',
    `${labels.flags}:`,
    ...flagLines(language),
    '',
    labels.commandHint.replace('<invocation>', `node ${invocation}`),
    labels.backHint.replace('<invocation>', `node ${invocation}`),
    '',
  ].join('\n')}`
}

/**
 * The page one command gets from `<command> --help`.
 *
 * A noun answers with its verbs, a verb with its own flags and an example — the two levels a reader
 * moves between, which is why the usage line grows a column rather than the page repeating itself.
 *
 * @param command - the command to describe, as a reader types it.
 * @param language - the language to print in.
 * @param invocation - the command as this installation spells it.
 * @returns the text, with a trailing newline.
 */
export function subjectHelp(command: string, language: HelpLanguage, invocation: string): string {
  const entry = entryOf(command)
  if (entry === undefined) return ''
  const labels = LABELS[language]
  const parent = nounOf(entry.command)
  const verbRows = entry.verbs.length === 0
    ? []
    : [
        `${labels.verbs}:`,
        ...verbsOf(entry.command).map((verb) => {
          const wording = verb[language]
          return `  ${verb.command.slice(entry.command.length + 1).padEnd(Math.max(...entry.verbs.map(name => name.length)))}  ${wording.summary}`
        }),
        '',
      ]
  const usage = entry.verbs.length === 0
    ? `  node ${invocation} ${entry.command} [${labels.flagsLabel}]${scopeSuffix(entry, language)}`.trimEnd()
    : `  node ${invocation} ${entry.command} <${labels.verbLabel}> [${labels.flagsLabel}]`
  return `${[
    `${entry[language].summary}${labels.period}`,
    '',
    entry[language].detail,
    '',
    `${labels.usage}:`,
    usage,
    '',
    ...verbRows,
    `${labels.examples}:`,
    `  # ${entry[language].comment}`,
    `  node ${invocation} ${entry[language].example}`,
    '',
    `${labels.flags}:`,
    ...flagLines(language, entry.command),
    '',
    ...(parent === undefined ? [] : [labels.nounHint.replace('<noun>', parent).replace('<invocation>', `node ${invocation}`)]),
    labels.backHint.replace('<invocation>', `node ${invocation}`),
    '',
  ].join('\n')}`
}

/**
 * The Markdown reference, which is the same table rendered as a page.
 * @param language - the language to render in.
 * @param invocation - the command as this installation spells it.
 * @returns the page, with a trailing newline.
 */
export function markdownHelp(language: HelpLanguage, invocation: string): string {
  const labels = LABELS[language]
  const commandRows = (group: CommandHelp['group']): string[][] =>
    topLevel().filter(entry => entry.group === group).map(entry => [
      `\`${entry.command}\``,
      entry.verbs.length === 0 ? (entry.scope === '—' ? '—' : `\`${entry.scope}\``) : `\`${entry.verbs.join(' | ')}\``,
      entry[language].summary,
    ])
  return `${[
    '# dsh-spec',
    '',
    labels.purpose,
    '',
    `## ${labels.usage}`,
    '',
    '```sh',
    `node ${invocation} <command> [flags]`,
    '```',
    '',
    labels.engine,
    '',
    `## ${labels.management}`,
    '',
    ...table(['Command', 'What it does'], topLevel().filter(entry => entry.group === 'management').map(entry => [
      `\`${entry.command}\``,
      entry[language].summary,
    ])),
    '',
    `## ${labels.commands}`,
    '',
    ...table(['Command', 'Scope or verbs', 'What it does'], commandRows('checks')),
    '',
    `## ${labels.flags}`,
    '',
    ...table(['Flag', 'Meaning'], FLAGS[language].map(([flag, meaning]) => [`\`${flag}\``, meaning])),
    '',
    `## ${labels.exits}`,
    '',
    labels.exitsBody,
    '',
    `## ${labels.language}`,
    '',
    labels.languageBody,
    '',
    `## ${labels.inDetail}`,
    '',
    ...COMMAND_HELP.flatMap((entry) => {
      const verbs = entry.verbs.length === 0
        ? []
        : [`**${labels.verbs}:** ${entry.verbs.map(verb => `\`${verb}\``).join(', ')}`, '']
      return [
        `### ${entry.command}`,
        '',
        `${entry[language].summary}${labels.period}`,
        '',
        entry[language].detail,
        '',
        ...verbs,
        '```sh',
        `# ${entry[language].comment}`,
        `node ${invocation} ${entry[language].example}`,
        '```',
        '',
        ...(entry.flags.length === 0
          ? []
          : [
              '| Flag | Meaning |',
              '|---|---|',
              ...entry.flags.map(([flag, en, zh]) => `| \`${flag}\` | ${language === 'en' ? en : zh} |`),
              '',
              'The [global flags](#flags) apply to every command.',
              '',
            ]),
      ]
    }),
  ].join('\n')}`
}

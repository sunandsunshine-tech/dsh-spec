/**
 * The CLI's own usage text, in both languages it speaks.
 *
 * One table holds the facts — each subject's operations, its scope forms, what it does, one caveat
 * and one example — and three renderers read it: the screen a person gets from `--help`, the page
 * one subject gets from `<subject> --help`, and the Markdown reference (`references/cli.md`) that
 * `--help --markdown` writes. The reference is generated rather than described so the short form and
 * the long form cannot drift; `tests/help.test.ts` fails when either side moves alone.
 *
 * Only the help is localized. The checks' reports stay English because a commit message or a note
 * quotes them as evidence and the functional suite asserts their text.
 *
 * Zero external dependencies.
 */

/** The language the help is printed in. */
export type HelpLanguage = 'en' | 'zh'

/** One subject's usage facts, in both languages. */
interface SubjectHelp {
  subject: string
  group: 'management' | 'checks'
  /** The operations it accepts, as written in a usage line. */
  operations: string
  /** The scope forms it accepts, or an em dash when it takes none. */
  scope: string
  en: { summary: string, note: string, example: string }
  zh: { summary: string, note: string, example: string }
}

/** Every subject the entry point answers to, with what a reader needs to run it. */
const SUBJECT_HELP: readonly SubjectHelp[] = [
  {
    subject: 'install',
    group: 'management',
    operations: '—',
    scope: '—',
    en: {
      summary: 'Adopt the collection into a project, creating what it does not have',
      note: 'Acts by default; `--dry-run` prints the plan and writes nothing.',
      example: 'install --root . --dry-run',
    },
    zh: {
      summary: '把这套集合采用到项目里,缺什么建什么',
      note: '默认执行;`--dry-run` 只打印计划,不写任何东西。',
      example: 'install --root . --dry-run',
    },
  },
  {
    subject: 'upgrade',
    group: 'management',
    operations: '—',
    scope: '—',
    en: {
      summary: 'Refresh the deployed skills and the managed text',
      note: 'Creates nothing: a file the project deleted on purpose stays deleted. `--reinstall` forces the copy.',
      example: 'upgrade --root .',
    },
    zh: {
      summary: '刷新已部署的技能与受管文本',
      note: '不创建缺失的文件:项目有意删掉的东西保持被删。`--reinstall` 强制覆盖。',
      example: 'upgrade --root .',
    },
  },
  {
    subject: 'uninstall',
    group: 'management',
    operations: '—',
    scope: '—',
    en: {
      summary: "Remove the skill directories, leaving the project's own files",
      note: 'Names what it leaves behind: the marked block in `AGENTS.md`, the notes tree, `docs/` and `.rgignore`.',
      example: 'uninstall --dry-run --root .',
    },
    zh: {
      summary: '只删技能目录,项目自己的文件留着',
      note: '并点名它留下的东西:`AGENTS.md` 的标记块、笔记树、`docs/` 与 `.rgignore`。',
      example: 'uninstall --dry-run --root .',
    },
  },
  {
    subject: 'status',
    group: 'management',
    operations: '—',
    scope: '—',
    en: {
      summary: 'Report whether the installed set matches the manifest',
      note: 'Changes nothing, and exits non-zero on drift.',
      example: 'status --root .',
    },
    zh: {
      summary: '核对已安装的技能集与 manifest 是否一致',
      note: '不改动任何东西,发现漂移即以非零退出。',
      example: 'status --root .',
    },
  },
  {
    subject: 'notes',
    group: 'checks',
    operations: '--check',
    scope: '--all | <note...> | --files-from -',
    en: {
      summary: 'The active Agent Note tree: classification and format',
      note: 'Classification walks the tree; the format check reads exactly the notes it is handed.',
      example: 'notes --check --all --root .',
    },
    zh: {
      summary: '活跃的 Agent Note 树:分类与格式',
      note: '分类走整棵树;格式只读交给它的那些笔记。',
      example: 'notes --check --all --root .',
    },
  },
  {
    subject: 'notes-archived',
    group: 'checks',
    operations: '--check | --write',
    scope: '--all',
    en: {
      summary: 'The frozen archive and its append-only seal',
      note: 'The seal compares against a committed baseline; `--write` appends new hashes.',
      example: 'notes-archived --check --all --root .',
    },
    zh: {
      summary: '冻结归档与它的仅追加封存',
      note: '封存与已提交的基线比对;`--write` 追加新的 hash。',
      example: 'notes-archived --check --all --root .',
    },
  },
  {
    subject: 'translation-pair',
    group: 'checks',
    operations: '--check | --list | --explain <path> | --write',
    scope: '<pair...> | --files-from -',
    en: {
      summary: 'Bilingual pairs: completeness, structure and recorded hashes',
      note: 'A pair is declared by a `.zh.md` counterpart, an `.i18n.yaml` record, or a language switcher in the document itself.',
      example: 'translation-pair --check docs/guide.md --root .',
    },
    zh: {
      summary: '双语配对:完整、结构一致、已记录 hash',
      note: '配对由 `.zh.md` 对手文件、`.i18n.yaml` 记录,或文档里的语言切换器声明。',
      example: 'translation-pair --check docs/guide.md --root .',
    },
  },
  {
    subject: 'md-links',
    group: 'checks',
    operations: '--check',
    scope: '<markdown...> | --files-from -',
    en: {
      summary: 'Link targets, and the shapes a bulk rewrite leaves behind',
      note: 'No `--all`: it decides the asking side of a link, so a target deleted under an untouched referrer needs a scan of the whole corpus.',
      example: 'md-links --check docs/guide.md --root .',
    },
    zh: {
      summary: '链接目标,以及批量改写留下的坏形状',
      note: '没有 `--all`:它判定链接的发起侧,所以引用者未动而目标被删的情形需要扫全语料。',
      example: 'md-links --check docs/guide.md --root .',
    },
  },
  {
    subject: 'commit',
    group: 'checks',
    operations: '--check',
    scope: '--base <ref> | --head <ref>',
    en: {
      summary: 'The subjects this change owes, dispatched together',
      note: 'Hands each subject the paths its record owns and prints one line per subject, including the skipped ones.',
      example: 'commit --check --base main --root .',
    },
    zh: {
      summary: '这次改动欠下的检查,一并分派',
      note: '按各主语的记录把路径交给它,每个主语打一行,包括被跳过的那些。',
      example: 'commit --check --base main --root .',
    },
  },
  {
    subject: 'all',
    group: 'checks',
    operations: '--check',
    scope: '—',
    en: {
      summary: 'Every check whose assertion is about a tree',
      note: 'The file-selection checks are not here: they take a path list, and `md-links --help` says what that costs.',
      example: 'all --check --root .',
    },
    zh: {
      summary: '每一道断言关于整棵树的检查',
      note: '文件选区的检查不在这里:它们要一份路径清单,代价写在 `md-links --help` 里。',
      example: 'all --check --root .',
    },
  },
  {
    subject: 'brief',
    group: 'checks',
    operations: '[--apply]',
    scope: '<pair...>',
    en: {
      summary: 'The minimal-update briefing for an out-of-sync pair',
      note: '`--apply` splices a change that lives only inside code fences into the counterpart.',
      example: 'brief docs/guide.md --root .',
    },
    zh: {
      summary: '为失去同步的配对生成最小更新简报',
      note: '`--apply` 把仅发生在围栏代码块里的改动拼进对手文件。',
      example: 'brief docs/guide.md --root .',
    },
  },
]

/** The flag list, which is the same for every subject. */
const FLAGS: Record<HelpLanguage, ReadonlyArray<readonly [string, string]>> = {
  en: [
    ['--root <path>', 'The project to read or write (default: the current directory)'],
    ['--jobs <n>', 'How many checks run at once (default min(availableParallelism(), 8); DSH_SPEC_JOBS wins)'],
    ['--help [zh|en]', 'This help, in the given language'],
    ['-h', 'Shorthand for --help'],
    ['--markdown', 'Render the help as the reference page'],
  ],
  zh: [
    ['--root <path>', '要读写的项目(默认当前目录)'],
    ['--jobs <n>', '同时运行多少道检查(默认 min(availableParallelism(), 8);DSH_SPEC_JOBS 优先)'],
    ['--help [zh|en]', '打印本帮助,可指定语言'],
    ['-h', '--help 的简写'],
    ['--markdown', '以参考页的形式渲染帮助'],
  ],
}

/** The labels every rendering shares. */
const LABELS = {
  en: {
    purpose: 'The checks this collection publishes, one subject at a time',
    usage: 'Usage',
    management: 'Management',
    checks: 'Checks',
    flags: 'Flags',
    exits: 'Exit codes',
    exitsBody: '0 clean   1 a check found something or an operation failed   2 the invocation is wrong',
    example: 'Example',
    language: 'Language',
    languageBody: 'The help speaks English or Chinese: `--help zh`, or a `DSH_SPEC_LANG`, `LC_ALL`, `LC_MESSAGES` or `LANG` whose language part starts with `zh`.',
    subjectHint: 'Use "<invocation> <subject> --help" for one subject\'s operations, scope and example.',
    metavars: '<subject> <operation> [flags] [scope]',
    scopeLabel: 'scope',
    engine: '`<engine>` is the collection\'s engine directory — `.agents/skills/dsh-spec-manager/scripts` in a project, `skills/dsh-spec-manager/scripts` in the collection\'s own tree.',
    oneSubject: 'One subject in detail',
  },
  zh: {
    purpose: '这套集合发布的检查,一次一个主语',
    usage: '用法',
    management: '管理',
    checks: '检查',
    flags: '旗标',
    exits: '退出码',
    exitsBody: '0 干净   1 检查发现问题或操作失败   2 调用方式有误',
    example: '示例',
    language: '语言',
    languageBody: '帮助说英文或中文:`--help zh`,或 `DSH_SPEC_LANG`、`LC_ALL`、`LC_MESSAGES`、`LANG` 中语言部分以 `zh` 开头的那个。',
    subjectHint: '用 "<invocation> <主语> --help" 看某个主语的操作、范围与示例。',
    metavars: '<主语> <操作> [旗标] [范围]',
    scopeLabel: '范围',
    engine: '`<engine>` 是集合的引擎目录 —— 在项目里是 `.agents/skills/dsh-spec-manager/scripts`,在集合自己的源码树里是 `skills/dsh-spec-manager/scripts`。',
    oneSubject: '逐个主语',
  },
} as const

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
  const widths = header.map((cell, index) => Math.max(cell.length, ...rows.map(row => (row[index] ?? '').length)))
  const line = (cells: readonly string[]): string => `| ${cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join(' | ')} |`
  return [line(header), `|${widths.map(width => '-'.repeat(width + 2)).join('|')}|`, ...rows.map(line)]
}

/** The subjects of one group, one aligned line each, in the order the table declares them. */
function groupOf(group: SubjectHelp['group'], language: HelpLanguage): string[] {
  return SUBJECT_HELP.filter(entry => entry.group === group)
    .map(entry => `  ${entry.subject.padEnd(16)} ${entry.operations.padEnd(34)} ${entry[language].summary}`)
}

/**
 * The screen `--help` prints: the usage line, both subject groups, the flags and the exit codes.
 * @param language - the language to print in.
 * @param invocation - the command as this installation spells it.
 * @returns the text, with a trailing newline.
 */
export function globalHelp(language: HelpLanguage, invocation: string): string {
  const labels = LABELS[language]
  const lines = [
    `dsh-spec — ${labels.purpose}`,
    '',
    `${labels.usage}:`,
    `  node ${invocation} ${labels.metavars}`,
    '',
    `${labels.management}:`,
    ...groupOf('management', language),
    '',
    `${labels.checks}:`,
    ...groupOf('checks', language),
    '',
    `${labels.flags}:`,
    ...FLAGS[language].map(([flag, meaning]) => `  ${flag.padEnd(20)} ${meaning}`),
    '',
    `${labels.exits}:`,
    `  ${labels.exitsBody}`,
    '',
    labels.subjectHint.replace('<invocation>', `node ${invocation}`),
    '',
  ]
  return `${lines.join('\n')}`
}

/**
 * The page one subject gets from `<subject> --help`.
 * @param subject - the subject to describe.
 * @param language - the language to print in.
 * @param invocation - the command as this installation spells it.
 * @returns the text, with a trailing newline.
 */
export function subjectHelp(subject: string, language: HelpLanguage, invocation: string): string {
  const entry = SUBJECT_HELP.find(candidate => candidate.subject === subject)
  if (entry === undefined) return ''
  const labels = LABELS[language]
  const lines = [
    `${entry.subject} — ${entry[language].summary}`,
    '',
    `${labels.usage}:`,
    `  node ${invocation} ${entry.subject} ${entry.operations === '—' ? '' : `${entry.operations} `}[${labels.flags.toLowerCase()}]${entry.scope === '—' ? '' : ` [${labels.scopeLabel}: ${entry.scope}]`}`.trimEnd(),
    '',
    entry[language].note,
    '',
    `${labels.example}:`,
    `  node ${invocation} ${entry[language].example}`,
    '',
    `${labels.flags}:`,
    ...FLAGS[language].map(([flag, meaning]) => `  ${flag.padEnd(20)} ${meaning}`),
    '',
    `${labels.exits}:`,
    `  ${labels.exitsBody}`,
    '',
  ]
  return `${lines.join('\n')}`
}

/**
 * The Markdown reference, which is the same table rendered as a page.
 * @param language - the language to render in.
 * @param invocation - the command as this installation spells it.
 * @returns the page, with a trailing newline.
 */
export function markdownHelp(language: HelpLanguage, invocation: string): string {
  const labels = LABELS[language]
  const lines = [
    '# dsh-spec',
    '',
    labels.purpose,
    '',
    `## ${labels.usage}`,
    '',
    '```sh',
    `node ${invocation} <subject> <operation> [flags] [scope]`,
    '```',
    '',
    labels.engine,
    '',
    ...(['management', 'checks'] as const).flatMap((group) => {
      const title = group === 'management' ? labels.management : labels.checks
      const rows = SUBJECT_HELP.filter(entry => entry.group === group)
        .map(entry => [`\`${entry.subject}\``, entry.operations === '—' ? '—' : `\`${entry.operations}\``, entry.scope === '—' ? '—' : `\`${entry.scope}\``, entry[language].summary])
      return [`## ${title}`, '', ...table(['Subject', 'Operations', 'Scope', 'What it does'], rows), '']
    }),
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
    `## ${labels.oneSubject}`,
    '',
    ...SUBJECT_HELP.flatMap((entry) => [
      `### ${entry.subject}`,
      '',
      entry[language].summary,
      '',
      entry[language].note,
      '',
      '```sh',
      `node ${invocation} ${entry[language].example}`,
      '```',
      '',
    ]),
  ]
  return `${lines.join('\n')}`
}

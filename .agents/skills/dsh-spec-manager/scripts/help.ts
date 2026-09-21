/**
 * The CLI's own usage text, in both languages it speaks.
 *
 * The shape follows the tools a reader already knows: a one-sentence description, a `Usage:` line,
 * subjects grouped by purpose with a bare imperative phrase each, then the flags and a pointer to
 * per-subject help. `kubectl --help`, `helm --help` and `mise --help` are the references — a subject
 * row there is a name and a phrase with no second clause and no operations column, because the
 * operations belong to the subject's own help.
 *
 * One table holds the facts and three renderers read it: the screen `--help` prints, the page
 * `<subject> --help` prints, and the Markdown reference (`references/cli.md`) that
 * `--help --markdown` writes. The reference is generated rather than described, so the short form
 * and the long form cannot drift; `tests/help.test.ts` fails when either side moves alone.
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
  /** The operations the subject's usage line names. */
  operation: string
  /** The scope forms it accepts, or an em dash when it takes none. */
  scope: string
  en: { summary: string, detail: string, comment: string, example: string }
  zh: { summary: string, detail: string, comment: string, example: string }
}

/** Every subject the entry point answers to, with what a reader needs to run it. */
const SUBJECT_HELP: readonly SubjectHelp[] = [
  {
    subject: 'install',
    group: 'management',
    operation: '—',
    scope: '—',
    en: {
      summary: 'Install the collection into a project',
      detail: 'Acts by default. `--dry-run` prints both plans — the skills it would deploy and the files it would create — and writes nothing.',
      comment: 'See what adopting this project would do',
      example: 'install --root . --dry-run',
    },
    zh: {
      summary: '把集合安装到项目',
      detail: '默认执行。`--dry-run` 只打印两半计划——要部署哪些技能、要建哪些文件——不写任何东西。',
      comment: '先看采用这个项目会做什么',
      example: 'install --root . --dry-run',
    },
  },
  {
    subject: 'upgrade',
    group: 'management',
    operation: '—',
    scope: '—',
    en: {
      summary: 'Update the installed skills and the mechanism text',
      detail: 'Creates nothing: a file the project deleted on purpose stays deleted. `--reinstall` copies the skills again even when their content already matches.',
      comment: 'Refresh a project pinned to a new revision',
      example: 'upgrade --root .',
    },
    zh: {
      summary: '更新已安装的技能与机制文本',
      detail: '不创建缺失的文件:项目有意删掉的东西保持被删。`--reinstall` 在内容已一致时也重新拷贝技能。',
      comment: '把项目刷新到新的修订',
      example: 'upgrade --root .',
    },
  },
  {
    subject: 'uninstall',
    group: 'management',
    operation: '—',
    scope: '—',
    en: {
      summary: 'Remove the installed skills',
      detail: "Lists what it leaves behind — the marked block in `AGENTS.md`, the notes tree, `docs/` and `.rgignore` — because those are the project's own.",
      comment: 'See what removal would leave in place',
      example: 'uninstall --dry-run --root .',
    },
    zh: {
      summary: '删除已安装的技能',
      detail: '并列出它留下的东西——`AGENTS.md` 的标记块、笔记树、`docs/` 与 `.rgignore`——因为那些属于项目自己。',
      comment: '先看卸载会留下什么',
      example: 'uninstall --dry-run --root .',
    },
  },
  {
    subject: 'status',
    group: 'management',
    operation: '—',
    scope: '—',
    en: {
      summary: 'Check the installed set against the manifest',
      detail: 'Changes nothing, and exits non-zero when a skill is missing, unlisted, or not at the pinned revision.',
      comment: 'Report drift before pushing an instruction file',
      example: 'status --root .',
    },
    zh: {
      summary: '核对已安装的技能集与 manifest',
      detail: '不改动任何东西;技能缺失、未被列出或不在钉住的修订上,都以非零退出。',
      comment: '推送指令文件之前查一次漂移',
      example: 'status --root .',
    },
  },
  {
    subject: 'notes',
    group: 'checks',
    operation: '--check',
    scope: '--all | <note...> | --files-from -',
    en: {
      summary: 'Check the Agent Note tree and its notes',
      detail: 'Classification asserts over the whole tree, so it takes `--all`; the format check reads only the notes it is handed.',
      comment: 'Check the tree, and every note it holds',
      example: 'notes --check --all --root .',
    },
    zh: {
      summary: '检查 Agent Note 树与笔记本身',
      detail: '分类断言整棵树,所以要 `--all`;格式只读交给它的那些笔记。',
      comment: '检查整棵树与其中的每份笔记',
      example: 'notes --check --all --root .',
    },
  },
  {
    subject: 'notes-archived',
    group: 'checks',
    operation: '--check | --write',
    scope: '--all',
    en: {
      summary: 'Check the frozen archive and its seal',
      detail: 'The seal is compared against a committed baseline, and `--write` appends the hashes of newly archived notes.',
      comment: 'Verify the seal, then append what is new',
      example: 'notes-archived --check --all --root .',
    },
    zh: {
      summary: '检查冻结归档与它的封存',
      detail: '封存与已提交的基线比对;`--write` 追加新归档笔记的 hash。',
      comment: '校验封存,再追加新增的',
      example: 'notes-archived --check --all --root .',
    },
  },
  {
    subject: 'translation-pair',
    group: 'checks',
    operation: '--check | --list | --explain <path> | --write',
    scope: '<pair...> | --files-from -',
    en: {
      summary: 'Check a translated pair and its record',
      detail: 'A pair is declared by a `.zh.md` counterpart, an `.i18n.yaml` record, or a language switcher in the document itself. `--list` reports every pair, and `--write` records the ones you confirmed.',
      comment: 'Check one pair, then record it',
      example: 'translation-pair --check docs/guide.md --root .',
    },
    zh: {
      summary: '检查一对翻译文档及其记录',
      detail: '配对由对手文件 `.zh.md`、记录 `.i18n.yaml`,或文档里的语言切换器声明。`--list` 报告所有配对,`--write` 记录你确认过的那几对。',
      comment: '检查一对,然后记下它',
      example: 'translation-pair --check docs/guide.md --root .',
    },
  },
  {
    subject: 'md-links',
    group: 'checks',
    operation: '--check',
    scope: '<markdown...> | --files-from -',
    en: {
      summary: 'Check links in Markdown',
      detail: 'No `--all`: the asking side of a link is decided per file, so a target deleted under a referrer nobody touched needs a separate scan of the whole corpus.',
      comment: 'Check the links of the files a change touched',
      example: 'md-links --check docs/guide.md --root .',
    },
    zh: {
      summary: '检查 Markdown 里的链接',
      detail: '没有 `--all`:链接的发起侧按文件判定,所以引用者没改而目标被删的情况,要另外扫一遍全语料。',
      comment: '检查这次改动碰过的文件的链接',
      example: 'md-links --check docs/guide.md --root .',
    },
  },
  {
    subject: 'commit',
    group: 'checks',
    operation: '--check',
    scope: '--base <ref> | --head <ref>',
    en: {
      summary: 'Check what a change owes',
      detail: 'Hands each subject the paths its record owns and prints one line per subject, including the ones it skipped and why.',
      comment: 'Check a branch against its base',
      example: 'commit --check --base main --root .',
    },
    zh: {
      summary: '检查这次改动欠下的东西',
      detail: '按每个主语的记录把路径交给它,并逐行打印结果,包括被跳过的那些以及原因。',
      comment: '相对基线检查一个分支',
      example: 'commit --check --base main --root .',
    },
  },
  {
    subject: 'all',
    group: 'checks',
    operation: '--check',
    scope: '—',
    en: {
      summary: 'Check everything asserted over a tree',
      detail: 'The file-selection checks are not part of it: they take a path list, and `md-links --help` says what that costs.',
      comment: 'Run every tree check',
      example: 'all --check --root .',
    },
    zh: {
      summary: '检查所有以整棵树为断言的检查',
      detail: '文件选区的检查不在其中:它们要一份路径清单,代价写在 `md-links --help` 里。',
      comment: '跑完所有整树检查',
      example: 'all --check --root .',
    },
  },
  {
    subject: 'brief',
    group: 'checks',
    operation: '[--apply]',
    scope: '<pair...>',
    en: {
      summary: 'Print the update briefing for a pair',
      detail: 'The briefing maps what changed at the narrowest safe granularity. `--apply` splices a change that lives only inside code fences into the counterpart.',
      comment: 'Brief a translator for one out-of-sync pair',
      example: 'brief docs/guide.md --root .',
    },
    zh: {
      summary: '打印一对文档的更新简报',
      detail: '简报以能安全对齐的最窄粒度映射改动。`--apply` 把只发生在围栏代码块里的改动拼进对手文件。',
      comment: '为失去同步的一对文档生成简报',
      example: 'brief docs/guide.md --root .',
    },
  },
]

/** The flag list, which is the same for every subject, in the order a reader scans it. */
const FLAGS: Record<HelpLanguage, ReadonlyArray<readonly [string, string]>> = {
  en: [
    ['-h, --help [zh|en]', 'Print this help (zh or en; the default comes from DSH_SPEC_LANG, LC_ALL, LC_MESSAGES or LANG)'],
    ['--jobs <n>', 'Checks to run at once (default min(availableParallelism(), 8); DSH_SPEC_JOBS wins)'],
    ['--markdown', 'Print this help as the reference page'],
    ['--root <path>', 'Project to read or write (default: the current directory)'],
  ],
  zh: [
    ['-h, --help [zh|en]', '打印本帮助(可指定 zh 或 en;默认取 DSH_SPEC_LANG、LC_ALL、LC_MESSAGES、LANG)'],
    ['--jobs <n>', '同时运行的检查数(默认 min(availableParallelism(), 8);DSH_SPEC_JOBS 优先)'],
    ['--markdown', '以参考页的形式打印本帮助'],
    ['--root <path>', '要读写的项目(默认当前目录)'],
  ],
}

/** The labels every rendering shares. */
const LABELS = {
  en: {
    purpose: "dsh-spec runs this collection's checks against a project, one subject at a time.",
    usage: 'Usage',
    metavars: '<subject> <operation> [flags]',
    period: '.',
    management: 'Management Commands',
    checks: 'Check Commands',
    flags: 'Flags',
    flagsLabel: 'flags',
    scopeLabel: 'scope',
    examples: 'Examples',
    exits: 'Exit codes',
    exitsBody: '0 clean   1 a check found something or an operation failed   2 the invocation is wrong',
    language: 'Language',
    languageBody: 'The help speaks English or Chinese: `--help zh`, or a `DSH_SPEC_LANG`, `LC_ALL`, `LC_MESSAGES` or `LANG` whose language part starts with `zh`.',
    subjectHint: 'Use "<invocation> <subject> --help" for more information about a subject.',
    backHint: 'Use "<invocation> --help" for the list of subjects.',
    engine: "`<engine>` is the collection's engine directory — `.agents/skills/dsh-spec-manager/scripts` in a project, `skills/dsh-spec-manager/scripts` in the collection's own tree.",
    oneSubject: 'One subject in detail',
  },
  zh: {
    purpose: 'dsh-spec 把集合里的检查跑在项目上,一次一个主语。',
    usage: '用法',
    metavars: '<主语> <操作> [旗标]',
    period: '。',
    management: '管理命令',
    checks: '检查命令',
    flags: '旗标',
    flagsLabel: '旗标',
    scopeLabel: '范围',
    examples: '示例',
    exits: '退出码',
    exitsBody: '0 干净   1 检查发现问题或操作失败   2 调用方式有误',
    language: '语言',
    languageBody: '帮助说英文或中文:`--help zh`,或 `DSH_SPEC_LANG`、`LC_ALL`、`LC_MESSAGES`、`LANG` 中语言部分以 `zh` 开头的那个。',
    subjectHint: '用 "<invocation> <主语> --help" 看某个主语的用法与示例。',
    backHint: '用 "<invocation> --help" 看全部主语。',
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

/** The subjects of one group, one aligned line each: a name and a phrase, as a reader expects. */
function groupOf(group: SubjectHelp['group'], language: HelpLanguage): string[] {
  const subjects = SUBJECT_HELP.filter(entry => entry.group === group)
  const width = Math.max(...subjects.map(entry => entry.subject.length))
  return subjects.map(entry => `  ${entry.subject.padEnd(width)}  ${entry[language].summary}`)
}

/** The flag block, aligned like every other list here. */
function flagLines(language: HelpLanguage): string[] {
  const width = Math.max(...FLAGS[language].map(([flag]) => flag.length))
  return FLAGS[language].map(([flag, meaning]) => `  ${flag.padEnd(width)}  ${meaning}`)
}

/**
 * The screen `--help` prints: what the tool is, how to call it, its subjects, its flags.
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
    ...groupOf('management', language),
    '',
    `${labels.checks}:`,
    ...groupOf('checks', language),
    '',
    `${labels.flags}:`,
    ...flagLines(language),
    '',
    labels.subjectHint.replace('<invocation>', `node ${invocation}`),
    '',
  ].join('\n')}`
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
  const operation = entry.operation === '—' ? '' : `${entry.operation} `
  const scope = entry.scope === '—' ? '' : ` [${labels.scopeLabel}: ${entry.scope}]`
  return `${[
    `${entry[language].summary}${labels.period}`,
    '',
    entry[language].detail,
    '',
    `${labels.usage}:`,
    `  node ${invocation} ${entry.subject} ${operation}[${labels.flagsLabel}]${scope}`.trimEnd(),
    '',
    `${labels.examples}:`,
    `  # ${entry[language].comment}`,
    `  node ${invocation} ${entry[language].example}`,
    '',
    `${labels.flags}:`,
    ...flagLines(language),
    '',
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
  return `${[
    '# dsh-spec',
    '',
    labels.purpose,
    '',
    `## ${labels.usage}`,
    '',
    '```sh',
    `node ${invocation} <subject> <operation> [flags]`,
    '```',
    '',
    labels.engine,
    '',
    ...(['management', 'checks'] as const).flatMap((group) => {
      const title = group === 'management' ? labels.management : labels.checks
      const rows = SUBJECT_HELP.filter(entry => entry.group === group).map(entry => [
        `\`${entry.subject}\``,
        entry.operation === '—' ? '—' : `\`${entry.operation}\``,
        entry.scope === '—' ? '—' : `\`${entry.scope}\``,
        entry[language].summary,
      ])
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
    ...SUBJECT_HELP.flatMap(entry => [
      `### ${entry.subject}`,
      '',
      `${entry[language].summary}${labels.period}`,
      '',
      entry[language].detail,
      '',
      '```sh',
      `# ${entry[language].comment}`,
      `node ${invocation} ${entry[language].example}`,
      '```',
      '',
    ]),
  ].join('\n')}`
}

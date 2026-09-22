/**
 * The CLI's own usage text, in both languages it speaks.
 *
 * The shape follows the tools a reader already knows: a one-sentence description, a `Usage:` line,
 * the commands grouped by purpose with a bare imperative phrase each, then the flags and a pointer
 * to per-command help. `kubectl --help`, `helm --help` and `mise --help` are the references — a row
 * there is a name and a phrase with no second clause, and the flags belong to the command's own help.
 *
 * A command is either a verb that acts (`install`, `check`) or a noun with a verb (`notes check`,
 * `translation-pair list`). A noun's help lists its verbs, a verb's help lists its own flags, and one
 * table holds every fact for all of it: the screen `--help` prints, the pages `<command> --help`
 * prints, and the Markdown reference (`references/cli.md`) that `--help --markdown` writes. The
 * reference is generated rather than described, so the short form and the long form cannot drift;
 * `tests/help.test.ts` fails when either side moves alone.
 *
 * Only the help is localized. The checks' reports stay English because a commit message or a note
 * quotes them as evidence and the functional suite asserts their text.
 *
 * Zero external dependencies.
 */

/** The language the help is printed in. */
export type HelpLanguage = 'en' | 'zh'

/** The four sentences a command carries, in one language. */
interface Wording {
  summary: string
  detail: string
  comment: string
  example: string
}

/** One command's usage facts, in both languages. */
interface CommandHelp {
  /** The command as a reader types it: `check`, or a noun and its verb with one space between. */
  command: string
  group: 'management' | 'checks'
  /** The verbs a noun answers to; empty for a verb. */
  verbs: readonly string[]
  /** The scope forms it accepts, or an em dash when it takes none. */
  scope: string
  /** The flags that belong to this command alone: long name, English, Chinese. */
  flags: ReadonlyArray<readonly [string, string, string]>
  en: Wording
  zh: Wording
}

/** Every command the entry point answers to, with what a reader needs to run it. */
const COMMAND_HELP: readonly CommandHelp[] = [
  {
    command: 'install',
    group: 'management',
    verbs: [],
    scope: '—',
    flags: [
      ['--dry-run', 'Print the plan and write nothing', '只打印计划,不写任何东西'],
      ['--revision <ref>', "Install at this ref instead of the manager's own", '安装在这个 ref,而不是 manager 自己的 ref'],
    ],
    en: {
      summary: 'Install the collection into a project',
      detail: 'Acts by default. The set is installed at the ref `gh skill install` injected into this manager, or at `--revision <ref>`. `--dry-run` prints both plans — the skills it would deploy and the files it would create — and writes nothing.',
      comment: 'See what adopting this project would do',
      example: 'install --root . --dry-run',
    },
    zh: {
      summary: '把技能集合安装到项目',
      detail: '默认执行。技能集合装在 `gh skill install` 注入到这个 manager 的 ref 上,或用 `--revision <ref>` 指定。`--dry-run` 只打印两半计划——要部署哪些技能、要建哪些文件——不写任何东西。',
      comment: '先看采用这个项目会做什么',
      example: 'install --root . --dry-run',
    },
  },
  {
    command: 'upgrade',
    group: 'management',
    verbs: [],
    scope: '—',
    flags: [
      ['--dry-run', 'Print the plan and write nothing', '只打印计划,不写任何东西'],
      ['--only-skill-set', 'Skip the manager self-update and install only the skill set', '跳过 manager 自更新,只装技能集合'],
      ['--reinstall', 'Copy the skills again even when their content matches', '内容已一致时也重新拷贝技能'],
      ['--revision <ref>', 'Update to this ref instead of the newest published release', '更新到这个 ref,而不是最新的已发布 release'],
    ],
    en: {
      summary: 'Update the installed skills and the mechanism text',
      detail: 'Self-updates the manager first, re-executes that new copy, and then installs the skill set at the ref it was updated to. `--only-skill-set` skips the first half and installs the set at the manager\'s own ref. Creates nothing: a file the project deleted on purpose stays deleted. `--reinstall` copies the skills again even when their content already matches.',
      comment: 'Refresh a project pinned to a new revision',
      example: 'upgrade --root .',
    },
    zh: {
      summary: '更新已安装的技能与机制文本',
      detail: '先把 manager 自更新到目标 ref,再跑一次那份新副本,然后按它安装技能集合。`--only-skill-set` 跳过前半段,按 manager 自己的 ref 安装技能集合。不创建缺失的文件:项目有意删掉的东西保持被删。`--reinstall` 在内容已一致时也重新拷贝技能。',
      comment: '把项目刷新到新的修订',
      example: 'upgrade --root .',
    },
  },
  {
    command: 'uninstall',
    group: 'management',
    verbs: [],
    scope: '—',
    flags: [['--dry-run', 'Print the plan and write nothing', '只打印计划,不写任何东西']],
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
    command: 'status',
    group: 'management',
    verbs: [],
    scope: '—',
    flags: [],
    en: {
      summary: "Check the installed set against the manager's own revision",
      detail: 'Changes nothing, and exits non-zero when a skill is missing, unlisted, or not at the revision the manager itself was installed from.',
      comment: 'Report drift before pushing an instruction file',
      example: 'status --root .',
    },
    zh: {
      summary: '核对已安装的技能集合与 manager 自己的修订',
      detail: '不改动任何东西;技能缺失、未被列出,或与 manager 自己被安装的修订不一致,都以非零退出。',
      comment: '推送指令文件之前查一次漂移',
      example: 'status --root .',
    },
  },
  {
    command: 'check',
    group: 'checks',
    verbs: [],
    scope: '<path...> | --base <ref> | --all',
    flags: [
      ['--all', 'Run the two checks asserted over a tree', '运行两道以整棵树为断言的检查'],
      ['--base <ref>', 'Compute the path list from a change against this ref', '相对这个 ref 从改动算出路径清单'],
      ['--head <ref>', 'The commit the change is measured to (default HEAD)', '改动的头部提交(默认 HEAD)'],
      ['--files-from <file|->', 'Read the path list from a file, or from stdin', '从文件或 stdin 读取路径清单'],
    ],
    en: {
      summary: 'Run the checks a selection owes',
      detail: 'A path list runs the checks that claim those paths, `--base <ref>` computes that list from the change instead, and `--all` runs the two tree checks. With none of the three it prints the forms and reads nothing.',
      comment: 'Check what a branch changed',
      example: 'check --base main --root .',
    },
    zh: {
      summary: '运行某个选区欠下的检查',
      detail: '路径清单只跑认领这些路径的检查,`--base <ref>` 改为从改动算出这份清单,`--all` 跑两道整树检查。三者都不给时只打印可选形式,什么也不读。',
      comment: '检查一个分支改了什么',
      example: 'check --base main --root .',
    },
  },
  {
    command: 'notes',
    group: 'checks',
    verbs: ['check'],
    scope: '—',
    flags: [],
    en: {
      summary: 'Check the Agent Note tree and its notes',
      detail: 'The classification check asserts over the whole active tree; the format check reads only the notes it is handed. The frozen archive belongs to `notes-archived`.',
      comment: 'Check the whole active tree',
      example: 'notes check --all --root .',
    },
    zh: {
      summary: '检查 Agent Note 树与笔记本身',
      detail: '分类检查断言整棵活跃树;格式检查只读交给它的那些笔记。冻结的归档归 `notes-archived`。',
      comment: '检查整棵活跃树',
      example: 'notes check --all --root .',
    },
  },
  {
    command: 'notes check',
    group: 'checks',
    verbs: [],
    scope: '--all | <note...> | --files-from -',
    flags: [
      ['--all', 'Read every active note', '读取所有活跃笔记'],
      ['--files-from <file|->', 'Read the path list from a file, or from stdin', '从文件或 stdin 读取路径清单'],
    ],
    en: {
      summary: 'Check the whole tree, and the format of the notes handed in',
      detail: 'The classification check asserts over the whole tree, so it takes `--all`; the format check reads only the notes it is handed. A path list is the narrow form and `--all` the explicit whole-tree one.',
      comment: 'Check one note',
      example: 'notes check <note...> --root .',
    },
    zh: {
      summary: '检查整棵树,以及交给它的那些笔记的格式',
      detail: '分类检查断言整棵树,所以要 `--all`;格式检查只读交给它的那些笔记。路径清单是窄形式,`--all` 是显式的整树形式。',
      comment: '检查一条笔记',
      example: 'notes check <note...> --root .',
    },
  },
  {
    command: 'notes-archived',
    group: 'checks',
    verbs: ['check', 'write'],
    scope: '—',
    flags: [],
    en: {
      summary: 'Check the frozen archive and its seal',
      detail: 'Neither verb takes a path list: the archive is one tree, and its seal is compared against a committed baseline.',
      comment: 'Verify the seal, then append what is new',
      example: 'notes-archived check --all --root .',
    },
    zh: {
      summary: '检查冻结归档与它的封存',
      detail: '两个动词都不接路径清单:归档是一棵树,而它的封存与已提交的基线比对。',
      comment: '校验封存,再追加新增的',
      example: 'notes-archived check --all --root .',
    },
  },
  {
    command: 'notes-archived check',
    group: 'checks',
    verbs: [],
    scope: '--all',
    flags: [['--all', 'Read the whole archive', '读取整份归档']],
    en: {
      summary: 'Verify the archive against its committed seal',
      detail: 'A moved, edited or deleted frozen artifact fails here, which is what makes the archive evidence rather than a snapshot.',
      comment: 'Verify the seal',
      example: 'notes-archived check --all --root .',
    },
    zh: {
      summary: '按已提交的封存校验归档',
      detail: '冻结的制品一旦被移动、编辑或删除就在这里失败,归档因此是证据而不是快照。',
      comment: '校验封存',
      example: 'notes-archived check --all --root .',
    },
  },
  {
    command: 'notes-archived write',
    group: 'checks',
    verbs: [],
    scope: '--all',
    flags: [['--all', 'Read the whole archive', '读取整份归档']],
    en: {
      summary: 'Append the hashes of newly archived notes',
      detail: 'First proves every existing seal still matches, then appends only the new triplet hashes. The archive has no narrower form, so the whole tree is the scope.',
      comment: 'Seal what was just archived',
      example: 'notes-archived write --all --root .',
    },
    zh: {
      summary: '追加新归档笔记的 hash',
      detail: '先证明每一份已有封存仍然匹配,再只追加新增三元组的 hash。归档没有更窄的形式,所以整棵树就是范围。',
      comment: '给刚归档的东西封存',
      example: 'notes-archived write --all --root .',
    },
  },
  {
    command: 'translation-pair',
    group: 'checks',
    verbs: ['check', 'list', 'explain', 'write', 'brief'],
    scope: '—',
    flags: [],
    en: {
      summary: 'Check a translated pair, or brief an update',
      detail: 'A pair is declared by a `.zh.md` counterpart, an `.i18n.yaml` record, or a language switcher in the document itself.',
      comment: 'Check one pair, then record it',
      example: 'translation-pair check docs/guide.md --root .',
    },
    zh: {
      summary: '检查一对翻译文档,或生成更新简报',
      detail: '配对由对手文件 `.zh.md`、记录 `.i18n.yaml`,或文档里的语言切换器声明。',
      comment: '检查一对,然后记下它',
      example: 'translation-pair check docs/guide.md --root .',
    },
  },
  {
    command: 'translation-pair check',
    group: 'checks',
    verbs: [],
    scope: '<pair...> | --files-from -',
    flags: [
      ['--cached', 'Check the staged bytes instead of the working tree', '检查已暂存的字节,而不是工作区'],
      ['--files-from <file|->', 'Read the path list from a file, or from stdin', '从文件或 stdin 读取路径清单'],
    ],
    en: {
      summary: 'Check the pairs handed in',
      detail: 'A named pair must be complete, recorded, and structurally identical on both sides. There is no `--all`: name the pairs, or compute the list with `--files-from`.',
      comment: 'Check one pair',
      example: 'translation-pair check docs/guide.md --root .',
    },
    zh: {
      summary: '检查交给它的那些配对',
      detail: '点名的配对必须完整、有记录,且两侧结构一致。没有 `--all`:点名配对,或用 `--files-from` 算出清单。',
      comment: '检查一对',
      example: 'translation-pair check docs/guide.md --root .',
    },
  },
  {
    command: 'translation-pair list',
    group: 'checks',
    verbs: [],
    scope: '—',
    flags: [],
    en: {
      summary: 'Report every pair and its state',
      detail: 'Prints one row per in-scope document — missing, out-of-sync or ok — and never fails. The `missing` and `out-of-sync` rows are what the check rejects.',
      comment: 'See the whole corpus',
      example: 'translation-pair list --root .',
    },
    zh: {
      summary: '报告所有配对及其状态',
      detail: '范围内每篇文档一行——missing、out-of-sync 或 ok——从不失败。其中 missing 与 out-of-sync 行就是检查会拒绝的违规。',
      comment: '看整个语料',
      example: 'translation-pair list --root .',
    },
  },
  {
    command: 'translation-pair explain',
    group: 'checks',
    verbs: [],
    scope: '<path>',
    flags: [],
    en: {
      summary: 'Say why a path is or is not a pair',
      detail: 'Names the counterpart it looked for and whether it exists, without reading the rest of the corpus.',
      comment: 'Ask about one path',
      example: 'translation-pair explain docs/guide.md --root .',
    },
    zh: {
      summary: '说明一条路径为何算或不算配对',
      detail: '点名它去找的对侧文件以及该文件是否存在,不读语料的其余部分。',
      comment: '问一条路径',
      example: 'translation-pair explain docs/guide.md --root .',
    },
  },
  {
    command: 'translation-pair write',
    group: 'checks',
    verbs: [],
    scope: '<pair...> | --all',
    flags: [['--all', 'Re-record every complete pair', '重记所有完整配对']],
    en: {
      summary: 'Record the pairs you confirmed',
      detail: 'The YAML record it writes is the reviewable act of confirming consistency, so it requires the pairs you confirmed. `--all` is the explicit corpus-wide form.',
      comment: 'Record a pair you brought back in line',
      example: 'translation-pair write docs/guide.md --root .',
    },
    zh: {
      summary: '记录你确认过的那几对',
      detail: '它写下的 YAML 记录就是"确认一致"这个可评审的动作,所以要求点名你确认过的配对。`--all` 是显式的全语料形式。',
      comment: '记下一对已经补齐的文档',
      example: 'translation-pair write docs/guide.md --root .',
    },
  },
  {
    command: 'translation-pair brief',
    group: 'checks',
    verbs: [],
    scope: '[<pair...>]',
    flags: [['--apply', 'Splice a code-fence-only change after structural validation', '结构校验后拼进仅涉及围栏代码块的改动']],
    en: {
      summary: 'Print the update briefing for a pair',
      detail: 'Maps the change at the narrowest safely aligned granularity. With no paths it briefs every out-of-sync pair; with paths it briefs exactly those and fails loud on an in-sync one.',
      comment: 'Brief the translator on one pair',
      example: 'translation-pair brief --apply docs/guide.md --root .',
    },
    zh: {
      summary: '打印一对文档的更新简报',
      detail: '按能安全对齐的最窄粒度汇集这次改动。不给路径时简报每一个失去同步的配对;给了路径就只简报这些,并在其中一对本就同步时直接失败。',
      comment: '给译者简报一对文档',
      example: 'translation-pair brief --apply docs/guide.md --root .',
    },
  },
  {
    command: 'md-links',
    group: 'checks',
    verbs: ['check'],
    scope: '—',
    flags: [],
    en: {
      summary: 'Check links in Markdown',
      detail: 'The asking side of a link is decided per file, which is why this command takes a path list and never `--all`.',
      comment: 'Check the links the change touched',
      example: 'md-links check docs/guide.md --root .',
    },
    zh: {
      summary: '检查 Markdown 里的链接',
      detail: '链接的发起侧按文件判定,所以这个命令接路径清单,从不接 `--all`。',
      comment: '检查这次改动碰过的文件的链接',
      example: 'md-links check docs/guide.md --root .',
    },
  },
  {
    command: 'md-links check',
    group: 'checks',
    verbs: [],
    scope: '<markdown...> | --files-from -',
    flags: [['--files-from <file|->', 'Read the path list from a file, or from stdin', '从文件或 stdin 读取路径清单']],
    en: {
      summary: 'Check the files handed in',
      detail: 'Resolves relative links, images and definitions, and rejects the two shapes a bulk rewrite leaves behind. No `--all`: a target deleted under a referrer nobody touched needs a separate scan of the whole corpus.',
      comment: 'Check one document',
      example: 'md-links check docs/guide.md --root .',
    },
    zh: {
      summary: '检查交给它的那些文件',
      detail: '解析相对链接、图片与引用定义,并拒绝批量重写留下的两种形状。没有 `--all`:引用者没人碰而目标被删的情况,要另外扫一遍全语料。',
      comment: '检查一篇文档',
      example: 'md-links check docs/guide.md --root .',
    },
  },
]

/** The flags every command accepts, in the order a reader scans them. */
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
    purpose: "dsh-spec runs this collection's checks against a project: a verb acts, and a noun takes a verb.",
    usage: 'Usage',
    metavars: '<command> [flags]',
    period: '.',
    management: 'Management Commands',
    commands: 'Commands',
    flags: 'Flags',
    flagsLabel: 'flags',
    scopeLabel: 'scope',
    verbs: 'Verbs',
    verbLabel: 'verb',
    verbsInline: 'verbs',
    examples: 'Examples',
    exits: 'Exit codes',
    exitsBody: '0 clean   1 a check found something or an action failed   2 the invocation is wrong',
    language: 'Language',
    languageBody: 'The help speaks English or Chinese: `--help zh`, or a `DSH_SPEC_LANG`, `LC_ALL`, `LC_MESSAGES` or `LANG` whose language part starts with `zh`.',
    commandHint: 'Use "<invocation> <command> --help" for the flags and an example of one command.',
    nounHint: 'Use "<invocation> <noun> --help" for the verbs of that command.',
    backHint: 'Use "<invocation> --help" for the list of commands.',
    engine: "`<engine>` is the collection's engine directory — `.agents/skills/dsh-spec-manager/scripts` in a project, `skills/dsh-spec-manager/scripts` in the collection's own tree.",
    inDetail: 'Commands in detail',
  },
  zh: {
    purpose: 'dsh-spec 把技能集合里的检查跑在项目上:动词直接执行,名词后面跟动词。',
    usage: '用法',
    metavars: '<命令> [旗标]',
    period: '。',
    management: '管理命令',
    commands: '命令',
    flags: '旗标',
    flagsLabel: '旗标',
    scopeLabel: '范围',
    verbs: '动词',
    verbLabel: '动词',
    verbsInline: '动词',
    examples: '示例',
    exits: '退出码',
    exitsBody: '0 干净   1 检查发现问题或动作失败   2 调用方式有误',
    language: '语言',
    languageBody: '帮助说英文或中文:`--help zh`,或 `DSH_SPEC_LANG`、`LC_ALL`、`LC_MESSAGES`、`LANG` 中语言部分以 `zh` 开头的那个。',
    commandHint: '用 "<invocation> <命令> --help" 看某个命令的旗标与示例。',
    nounHint: '用 "<invocation> <名词> --help" 看该命令的动词。',
    backHint: '用 "<invocation> --help" 看全部命令。',
    engine: '`<engine>` 是技能集合的引擎目录 —— 在项目里是 `.agents/skills/dsh-spec-manager/scripts`,在技能集合自己的源码树里是 `skills/dsh-spec-manager/scripts`。',
    inDetail: '逐个命令',
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

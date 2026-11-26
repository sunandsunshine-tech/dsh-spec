# Agent Note: 从上游笔记机制锻造 dsh-spec-agent-notes

Status: implemented

[English](2026-10-27-forging-dsh-spec-agent-notes.md) | 中文

## 问题

技能集合里没有任何技能拥有 Agent Notes 生命周期。采用项目可以把决策留在对话或临时文档里，但没有一份面向 agent 的约定说明决策记录放在哪里、何时写、必须包含什么、如何在生命周期之间移动、何时合并或删除，以及一份已完成的记录如何冻结，好让后来的会话能够信任它。上游 `dsh` 恰好带有这套机制——一份笔记约定加一套归档工作流——但它是写进那个仓库自己的惯例里的：它的路径、它的双语三件套、它的门禁命令、它的封印例外。照搬会带入另一个项目的策略；略去则会丢掉这套模式点名的一项机制。

## 决策

技能 `dsh-spec-agent-notes` 从上游笔记约定与归档工作流锻造而来，适配到通用的 agent 使用领域，以及预期决策能跨会话留存的读者。提案先行执行层由[实质工作从提案开始](2026-11-25-substantial-work-starts-as-a-proposal.zh.md)拥有。技能是一个目录，包含：

- `SKILL.md` —— agent 加载的任务路由与安全边界：提案先行路由与检查点、取代检查、生命周期选择、必需的 workflow/notes/archive 约定加载、语义修剪、单元与翻译伴随规则、归档 readiness 与冻结边界、命令入口，以及停下并交接的规则。
- `references/workflow.md` —— 提案先行执行层：提案／issue／commit 所有权、目标清单的可发现性、以 proposed 状态保留、部分与完整检查点、多目标提案与 work-record 所有权，包括任何经测量的重新引入条件。
- `references/notes-contract.md` —— 活跃树约定：布局、分类、何时写、文件格式、生命周期移动、伴随文件、修剪。
- `references/archive-contract.md` —— 冻结归档：什么可以进入、单元、归档变更、manifest、冻结保证、封印与验证、交接。
- `scripts/notes.mjs` —— 适配后的机械门禁：`init` 用于一次性生成树骨架，`check` 用于活跃树，`archive` 用于验证，`archive --prepare` 生成不写 manifest 的封印计划，绑定计划的 `archive --write` 写入冻结归档。
- `THIRD_PARTY_NOTICES` —— 技能文本与打包门禁从上游改编后的来源声明；frontmatter 的 `license` 字段点名它。
- `package/dsh-spec-agent-notes/` —— 门禁的 TypeScript 源码，带 `vite.config.ts` 与 `build.ts`；打包产物是 `scripts/notes.mjs`。
- `tests/agent-notes.test.ts` —— 门禁的测试，维护在本仓库中，不随技能发布。

默认记录根目录：项目根下直接放置 `.agents/dsh-spec-agent-notes/`，可用 `--root` 覆盖，并由采用方的声明指定；归档根目录始终是 `<notes root>/archived`。按 [2026-10-28 锻造记录](2026-10-28-forging-dsh-spec-agent-experience.zh.md) 的规则，来源声明是技能根 `THIRD_PARTY_NOTICES` 通知加 frontmatter 的 `license` 字段，技能规范门禁报告 15 项检查，其中包含该字段。

- 交付语言是英语；评审语言是中文，由于评审语言与交付语言不同，description 追加中文触发语言。
- 运行时：Node.js 24.11+ 或 26+；每条命令都在 Git checkout 内运行，没有非 Git 模式（R11）。
- description 承担触发：在非平凡变更前使用本技能，判断该变更是否需要持久决策记录，以及各生命周期动作；正文拥有写入范围与机械/局部豁免（R29）。
- 跨技能指引：`## Companions` 只把 `dsh-spec-translate-docs` 作为可用性限定的示例点名；项目的配对门禁仍是约束机制。

## 来源与修订

上游来源：`deepseek-ai/deepseek-harness`，tag `dsh-v0.2.1-rc.3`，提交 `1f81c047fc48fa190a683e469daa699857e9afe8`——阅读日期的最新 release tag（2026-10-27）。那一天 `submodules/dsh` 的 pin 是 `687f282e8625c6b8d11ff58211a90524be2e4317`（`dsh-v0.2.1-rc.2`）；它既未抓取也未编辑。所点名的来源文件——笔记约定、归档指令、归档技能与笔记门禁脚本——在 pin 与最新 tag 之间逐字节相同，所以这套做法没有在两个修订之间移动；该 tag 还带有无关的非笔记脚本改动，它们不是本技能的来源。最新 tag 是来源，因为请求点名了最新的上游版本。

从上游树读取作为来源（pin 的 `submodules/dsh` 与 tag `dsh-v0.2.1-rc.3`；下列路径是上游路径，不是本仓库的安装副本）：

- `.agents/notes/README.md` —— 笔记约定。
- `.agents/notes/AGENTS.md`、`.agents/notes/implemented/AGENTS.md`、`.agents/notes/archived/AGENTS.md` —— 生命周期、取代与归档指令。
- `.agents/skills/dsh-archive-agent-notes/SKILL.md` —— 归档工作流。
- `.agents/notes/archived/manifest.json` —— manifest 的形状。
- `scripts/agent-note-tree.ts`、`scripts/verify-agent-note-format.ts`、`scripts/verify-agent-note-classification.ts`、`scripts/archived-agent-notes.ts`、`scripts/verify-archived-agent-notes.ts` —— 结构、格式与归档门禁。

当前关于归档 readiness 的裁定已于 2026-11-25 对照 `deepseek-ai/deepseek-harness` tag `dsh-v0.2.3-alpha.2`（`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`）核对：归档工作流要求在封印前配齐伴随文件，且 `archived-agent-notes.ts` 会验证完整的三件套。同日阅读的 Agent Skills 页面为[索引](https://agentskills.io/llms.txt)、[最佳实践](https://agentskills.io/skill-creation/best-practices.md)、[规范](https://agentskills.io/specification.md)与[使用脚本](https://agentskills.io/skill-creation/using-scripts.md)。

提案先行工作流并非源自上游。其要求来源是当前请求与[实质工作从提案开始](2026-11-25-substantial-work-starts-as-a-proposal.zh.md)；上游来源提供笔记与归档机制，本地工作流则围绕该机制叠加。当前请求提供 W6-W10 所记录的部分变更、检查点、放弃、常驻指令与报告要求；`references/workflow.md` 是这些要求的目标位置，绝不是其来源。

未作为上游来源读取：本仓库自己的笔记相关技能及其早先的归档移植（`dsh-archive-agent-notes` 技能与 `dsh-spec-manager` 脚本，两者均已移除），以及更早的仓库决策记录。凡本记录点名它之处，提案先行拥有者记录就是当前项目的权威，而不是上游约束的证据。采用方的笔记机制提供本记录使用的决策记录格式——一条说明记录存放在哪里的工作区指令——而本地工作流决定该机制如何参与提案与执行所有权。

## 约束处置

处置沿用锻造技能的取值：**Keep** 在语言与布局调整下保留原措辞与含义；**Adapt** 实例化一个目标值；**Re-bind** 把已消失的指称抽象到其目的，并找到目标中的等价物；**Dissolve** 记录该指称已消失，以及由哪项检查接手。目标归属：`SK` = `SKILL.md`，`WF` = `references/workflow.md`，`NC` = `references/notes-contract.md`，`AC` = `references/archive-contract.md`，`gate` = `scripts/notes.mjs`，`test` = `tests/agent-notes.test.ts`。

### 笔记约定与生命周期指令

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| N1 | `README` § intro | 一份记录记载影响代码库的决策或提案——为什么、放弃了什么，以及代码、测试与文档无法承载的部分。 | Keep | SK intro; NC intro | 上游文本 |
| N2 | `README` § Layout | 路径是 `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`。 | Keep | NC § Layout; gate walk | 上游文本 |
| N3 | `README` § Layout | `proposed/` 存放实施前评审的提案：尚未构建，或只构建了一部分。 | Keep | NC § Layout; SK § Procedure | 上游文本 |
| N4 | `README` § Layout; `implemented/AGENTS` | `implemented/` 是已交付的决策，与实际交付的内容保持同步——同步的是事实，不是决策。 | Keep | NC § Layout, § When; SK § Procedure | 上游文本 |
| N5 | `README` § Layout | `rejected/` 是被否决的提案，仅当其理由能阻止一种诱人且影响重大的错误时才保留。 | Keep | NC § Layout; SK § Procedure | 上游文本 |
| N6 | `README` § Classification | 类别标出决策属于哪一类。 | Keep | NC § Classification | 上游文本 |
| N7 | `README` § Layout | 文件名日期是主题首次被提出的时间，依据仓库历史；它随移动保留。 | Adapt | NC § Layout | “repository history” 对不绑定 VCS 的采用方变为“项目历史” |
| N8 | `README` § Layout | 交叉引用是相对 Markdown 链接，绝不用裸正文或编号。 | Keep | NC § Layout | 上游文本 |
| N9 | `README` § Layout | 活跃树就是工作清单；没有集中式 `INDEX.md`。 | Keep | NC § Layout; gate | 上游文本；门禁报出 `INDEX.md` |
| N10 | `README` § Layout | 有历史价值但未来指导价值很小的 implemented 记录会移到冻结归档。 | Keep | NC § Layout; AC § What enters | 上游文本 |
| N11 | `README` § Classification | 类别集合是封闭的；新增一个类别会更新规范集合与该章节。 | Adapt | NC § Classification; gate `CLASSES` | 规范集合从 `scripts/agent-note-tree.ts` 移入随附门禁加约定 |
| N12 | `README` § Classification | 六个类别定义：feature、bug-fix、simplification、architecture、process、testing。 | Keep | NC § Classification | 名称与定义逐字保留上游；通用领域映射是加在表格旁边的 agent 指南，不是重写定义 |
| N13 | `README` § Classification | architecture 是已交付的源码；process 是周围的工具；`refactor` 有意缺席。 | Keep | NC § Classification | 上游文本 |
| N14 | `README` § Archiving | 删除只描述小型 UI 或机械性改动的 implemented 记录；英语、中文与伴随记录（sidecar）一并删除；修复或移除入站链接。 | Adapt | NC § Pruning; AC § What enters | “三件套”变为项目声明的单元/伴随文件 |
| N15 | `README` § Archiving | 局部缺陷修复、性能改动、新能力或实质性决策，不会仅因其实现很小就符合删除条件。 | Keep | NC § Pruning | 上游文本 |
| N16 | `README` § Archiving | 只归档一份完整、已交付、不太可能指导未来工作，而其历史理由仍值得保存的决策。 | Keep | AC § What enters | 上游文本 |
| N17 | `README` § Archiving | 当一份记录的备选方案、所有权边界、否定性保证、持久或线上语义、安全规则或重新引入条件仍然有用时，保留它。 | Keep | NC § Pruning; AC § What enters | 上游文本 |
| N18 | `README` § Archiving | 永不归档 proposed 记录；否决一份过时提案。 | Keep | NC § Pruning; AC § What enters | 上游文本 |
| N19 | `README` § Archiving | 仅在否决记录能阻止一个可信的错误时保留它；否则删除该单元。 | Keep | NC § Pruning; AC § What enters | 上游文本 |
| N20 | `README` § Archiving | 使用经校准的工作流，而不是字数、年龄或配额。 | Keep | AC § What enters | 上游文本；调用点保留 |
| N21 | `README` § Archiving | 归档路径是 `archived/{class}/…`；`implemented` 有意缺席；只有 implemented 记录可以进入。 | Keep | AC § Path; SK § Archiving | 上游文本 |
| N22a | `README` § Archiving | 归档变更恰好是：移动完整单元、保留状态、在每一个 Markdown 侧的 status 下方插入一条完全相同的 `Archived:` 行，并修复或移除入站链接；没有其他内容改动。 | Keep | AC § Archival change | 允许的变更集保留；移动对象按 R2 是单元（N22b） |
| N22b | `README` § Archiving | 移动单元是英语/中文/伴随记录三件套。 | Adapt | AC § Path; SK § Archiving | 三件套变为项目声明的单元与伴随文件 |
| N22c | `README` § Archiving | 元数据编辑后重新记录伴随记录的哈希。 | Re-bind | AC § Archival change | 伴随记录的哈希格式是项目策略，所以等价物是项目自己的配对机制 |
| N23 | `README` § Archiving | 既有标题标点、空行布局与语言切换行措辞不阻碍归档；把它们保留下来。 | Keep | AC § Archival change | 上游文本 |
| N24 | `README` § Archiving | 已封印单元是冻结的；绝不编辑、翻译、重排格式、更新、移动或删除它；绝不把它当作权威；活跃正文可以为历史而链接它。 | Adapt | AC § Frozen guarantee; SK § Archiving | 三件套按 R2 变为单元；冻结规则保留 |
| N25 | `README` § Archiving | 验证器强制执行封闭类别树、完整三件套、归档元数据、伴随记录哈希与仅追加 manifest。 | Re-bind | AC § Sealing and verification; gate | 随附门禁强制执行类别树、准备后的单元成员、元数据与 manifest；伴随文件一致性与语义完整性由项目的外部机制负责 |
| N26 | `README` § When to write | 只有在代码、测试与文档都解释不了的持久理由上，才在同一 PR（Pull Request）中新增或更新记录。 | Adapt | NC § When; SK § Procedure | “PR”在通用领域变为“change” |
| N27 | `README` § When to write | 面向未来实质工作的提案从 proposed 开始；已经做出的决策从 implemented 开始；选择匹配的类别。 | Keep | NC § When | 上游文本 |
| N28 | `README` § When to write | 更新拥有者记录，而不是复制；机械性或局部编辑可豁免，包括局部 UI 展示与交互改动；记录永远不会被编辑成另一个决策；用交叉链接取代。 | Keep | NC § When; SK § Writing | 上游文本，包括 UI 展示条款 |
| N29 | `README` § When to write | 编辑 implemented 记录以跟踪其决策所在位置是必需的，而不是禁止的。 | Keep | NC § When | 上游文本 |
| N30 | `README` § When to write | 一份被完全取代的记录可以合并进拥有者并删除：保留每一处独有理由、备选方案、后果、验证与具名覆盖缺口；修复入站链接；删除中文对侧文件与记录。 | Adapt | NC § When | 伴随文件变为项目声明的单元 |
| N31 | `README` § When to write | 部分取代保持活跃并互相链接，同时更新每一处当前事实。 | Keep | NC § When | 上游文本 |
| N32 | `README` § When to write | 合并不得把旧文件重写为其反面，也不得依赖 Git 历史作为理由的唯一副本。 | Adapt | NC § When | “Git history”对不绑定 VCS 的采用方变为“项目历史”（同 N7） |
| N33 | `README` § When to write | 功能新增记录只在缺失条件下才合并进后来的移除记录；移除记录的拥有者保留所列理由；移除理由与验证缺失的测试可以保留，而过时的实现清单与只验证过被删除行为的测试不是当前验证证据；部分取代已有定义。 | Keep | NC § When | 上游文本 |
| N34 | `README` § File format | 统一格式由一条仓库命令强制执行，该命令是文档同步的一部分。 | Adapt | NC §§ Companions, Checks; SK § Checks; gate | 项目的检查以 `<skill-dir>/scripts/notes.mjs check` 为基础，并传入笔记约定声明的全部伴随选项；源侧的 docs-sync 接线被取消，交由项目自己的检查 |
| N35 | `README` § Header block | 前三行精确为 `# Agent Note: <title>`、空行、`Status: <status>`，然后是一个空行。 | Keep | NC § Header; gate | 上游文本；门禁强制执行第 1–4 行 |
| N36 | `README` § Header block | Status 有三种形式，且必须与生命周期文件夹一致；门禁会交叉核对。 | Keep | NC § Header; gate | 上游文本 |
| N37 | `README` § Header block | Status 不带日期或括注；文件名承载日期，项目历史承载其余一切；修正后的验收是正文内容。 | Adapt | NC § Header | “Git history”变为“项目历史”（N7）；状态规则保留 |
| N38 | `README` § Header block | 否决理由是唯一带内容的状态。 | Keep | NC § Header | 上游文本 |
| N39 | `README` § Skeleton | 每份记录都以 `## Problem` 开启正文，写得无需解决方案也能独立成立。 | Keep | NC § Body; gate | 上游文本 |
| N40 | `README` § Skeleton | 反复出现的章节使用规范名称；真正专有的技术章节可以放在必需章节之间。 | Keep | NC § Body | 上游文本 |
| N41 | `README` § Skeleton | proposed 骨架：Problem、Proposal、专有章节、Alternatives considered、Acceptance criteria、Risks。 | Keep | NC § Body; gate | 上游文本 |
| N42 | `README` § Skeleton | Proposal 可以使用将来时；验收标准定义可观察的完成；风险覆盖失败与放弃的东西。 | Keep | NC § Body | 上游文本 |
| N43 | `README` § Skeleton | implemented 骨架：Problem、Decision、专有章节、Alternatives considered、Consequences。 | Keep | NC § Body; gate | 上游文本 |
| N44 | `README` § Skeleton | Decision 用现在时，文件与之保持同步。 | Keep | NC § Body | 上游文本 |
| N45 | `README` § Skeleton | Consequences 记录权衡付出了什么代价、换来了什么。 | Keep | NC § Body | 上游文本 |
| N46a | `README` § Skeleton | 提案时期的标题在 implemented 记录中被禁止。 | Keep | NC § Body; gate | 上游文本；门禁强制执行该禁令 |
| N46b | `README` § Skeleton | 源侧为理由点名了一份独立的 slop 清单。 | Dissolve | — | 链接的清单在通用采用方项目中不存在；禁令本身保留 |
| N47 | `README` § Skeleton | `## Testing`、`## Deferred`、`## Related` 在陈述现在时态事实时是允许的。 | Keep | NC § Body | 上游文本 |
| N48 | `README` § Skeleton | 被否决的记录就是冻结的提案；只有头部、Problem、Proposal 与备选方案规则适用。 | Keep | NC § Body | 上游文本 |
| N49 | `README` § Alternatives | 每份记录都带 `## Alternatives considered`：列出每一个真实备选方案以及它为何落败，每个备选方案一段加粗开头的段落，或一个 Why-not 子章节。 | Keep | NC § Alternatives; gate | 上游文本；门禁要求该章节 |
| N50 | `README` § Alternatives | 备选方案是被记录下来的，绝不虚构。 | Keep | NC § Alternatives; SK § Writing | 上游文本 |
| N51 | `README` § Alternatives | 备选方案无法重建的格式前记录携带那条精确注释；门禁只对日期早于格式日期的记录接受它。 | Adapt | NC § Alternatives; SK § Writing; gate | 固定日期变为项目声明的 `--format-adopted <yyyy-mm-dd>`；精确注释与格式前有效性规则保留 |
| N52 | `README` § Moving | 在生命周期之间移动会在同一个变更里更新 `Status:` 并重新满足目标骨架；proposed→implemented 的重写与 proposed→rejected 的冻结已有定义。 | Keep | NC § Moving; SK § Procedure | 上游文本 |
| N53 | `README` § Chinese counterparts | `.zh.md` 对侧文件镜像结构；机器检查的头部 token 保持英语；格式门禁跳过它，一致性归配对门禁所有。 | Re-bind | NC § Companions; SK § Companions | 通用项目声明伴随后缀；一致性归项目的配对门禁，单元形状与准备成员集归本技能 |
| N54a | `notes/AGENTS` | Agent Note 实质上是由 agent 撰写的 RFC。 | Keep | NC intro | 上游文本；面向 agent 的 `SK` 引言用自己的话介绍该记录 |
| N54b | `notes/AGENTS` | 遵循文档标准。 | Dissolve | — | 链接的标准属于源仓库；通用采用方遵循自己的策略 |
| N55 | `notes/AGENTS` | 每份新记录都会触发取代检查：搜索活跃树、对匹配项分类、在同一个变更里归档符合条件的 implemented 三件套、让部分取代保持活跃并互相链接。 | Adapt | SK § Procedure; NC § When | “same PR”变为“same change”，“三件套”变为“单元”（A4b、R2） |
| N56 | `notes/AGENTS` | `archived/` 下的文件是冻结的历史快照；绝不编辑，也绝不把它们当作权威。 | Keep | AC § Frozen guarantee; SK § Archiving | 上游文本 |
| N57a | `implemented/AGENTS` | 格式门禁拥有 implemented 记录的生命周期结构。 | Keep | NC § Body; gate | 上游文本；门禁保留 |
| N57c | `implemented/AGENTS` | implemented 记录遵循根指令。 | Dissolve | — | 采用方自己的声明拥有其指令；本技能只为记录根目录读取该声明（N69、R1） |
| N57b | `implemented/AGENTS` | 遵循文档标准。 | Dissolve | — | 链接的标准属于源仓库；通用采用方遵循自己的策略 |
| N58 | `implemented/AGENTS` | 在同一个变更里保持路径、符号、默认值与机制最新；就地重写陈旧事实；不要追加变更历史。 | Keep | NC § When; SK § Procedure | 上游文本 |
| N59 | `implemented/AGENTS` | 当一份已交付的记录不太可能指导未来工作时，通过经校准的工作流归档其完整三件套。 | Adapt | AC § What enters | 三件套变为单元 |
| N60 | `implemented/AGENTS` | 就地更新事实不是重写决策的许可；反转或理由改动需要一份新记录并交叉链接；被完全取代的记录只通过合并删除。 | Keep | NC § When | 上游文本 |
| N61 | `archived/AGENTS` | 已归档三件套是冻结的历史快照，不是当前权威；绝不编辑、重排格式、翻译、修复、删除或移动其中之一；新决策使用活跃记录。 | Adapt | AC § Frozen guarantee | 三件套变为单元/伴随文件 |
| N62a | `archived/AGENTS` | 归档变更只可以移动完整单元、在 status 下方插入完全相同的 `Archived:` 行，并修复或删除入站链接；绝不检查、验证或修复归档记录发出的链接。 | Adapt | AC § Archival change | 三件套变为单元；限制与出站链接规则保留 |
| N62b | `archived/AGENTS` | 元数据编辑后重新记录伴随记录。 | Re-bind | AC § Archival change | 伴随记录的哈希格式是项目策略；等价物是项目自己的配对机制 |
| N63 | `archived/AGENTS` | 运行归档工作流并用 `verify-archived-agent-notes --write` 追加哈希；常规验证器报出被改动或缺失的已封印产物、不完整的三件套、未知类别文件夹与无效元数据。 | Adapt | SK § Archiving; AC § Sealing and verification; gate | 命令变为 `archive --prepare`、外部 readiness 与绑定计划的 `archive --write`；报出清单保留 |
| N64 | `archived/AGENTS` | 为一次获授权的 Figma 链接移除而设的三条精确的旧到新封印例外。 | Dissolve | AC § Handover | 源语料例外不是目标策略；需要的封印变更是一次维护者迁移，门禁不授予任何例外 |
| N65 | `README` § Archiving | 一份源仓库归档策略记录拥有冻结理由。 | Dissolve | AC intro | 目标自己的归档约定拥有理由；源记录不携带 |
| N66 | `README` § File format | 一份源仓库归档记录拥有统一格式理由。 | Dissolve | NC intro | 目标约定陈述自己的理由；源记录不携带 |
| N67 | `README` § Archiving | 文档门禁跳过归档来源，包括它们的出站链接。 | Keep | AC intro; SK § Archiving | 上游文本 |
| N68 | `README` § File format | 已归档记录保留封印时的格式，另加归档日期行。 | Keep | NC § File format; AC § Archival change | 上游文本 |
| N69 | `agent-note-tree.ts` | 笔记根是固定的 `.agents/notes`，从模块位置解析。 | Adapt | SK § Where; NC § Layout; gate `DEFAULT_ROOT` | 默认值变为 `.agents/dsh-spec-agent-notes`，相对项目 checkout 根解析，可用 `--root` 覆盖（R1）；项目可以在 checkout 内指定另一个根 |

### 归档工作流

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| A1 | `archive SKILL` description | 在新增、审计、修剪、归档、恢复或评审 Agent Notes 时触发；检查取代；删除小型记录；按未来价值分类；处理否决记录；应用冻结三件套与 manifest 规则。 | Adapt | SK description; SK § Procedure | description 是为这一个技能合并改写的；触发与语义保留，冻结三件套被泛化为单元（R2） |
| A2 | `archive SKILL` intro | 在不抹去仍在指导工作的历史的前提下缩减活跃语料；按语义判断；字数与年龄是发现辅助，永远不是标准。 | Keep | AC § What enters | 上游文本 |
| A3 | `archive SKILL` § Read | 分类之前先读笔记规则、归档指令与生命周期指令；把当前代码、配置、文档、目录、较新的记录与入站链接作为证据。 | Keep | SK § Procedure; AC § What enters | 上游文本 |
| A4a | `archive SKILL` § Supersession | 起草之前先应用创建标准；每份新记录都会触发一次限定范围的审计；对匹配项分类；保留部分取代并交叉链接；否决过时提案；删除不再诱人的否决记录；当拥有者吸收全部内容时合并；绝不推迟已知的匹配项。 | Keep | SK § Procedure; NC § When | 上游文本 |
| A4b | `archive SKILL` § Supersession | 在同一 PR 中归档符合条件的 implemented 三件套。 | Adapt | SK § Procedure; NC § When | “same PR”对不绑定 VCS 的采用方变为“same change” |
| A5 | `archive SKILL` § Classify | Implemented——在保留/归档之前先应用删除标准：删除只描述小型 UI 调整或机械性改动的完整单元；不符合条件的情形已有定义。 | Adapt | NC § Pruning; AC § What enters | 三件套 → 单元/伴随文件；优先级保留 |
| A6 | `archive SKILL` § Classify | Implemented——当理由、备选方案、否定性保证、持久/线上语义、所有权边界、安全规则或重新引入条件可能指导工作时保留；分类决策，而不是机械细节。 | Keep | NC § Pruning; AC § What enters | 上游文本 |
| A7 | `archive SKILL` § Classify | Implemented——归档一份完整、实质性、不太可能指导未来工作但值得保存的历史决策；不要归档删除标准覆盖的内容。 | Keep | AC § What enters | 上游文本 |
| A8 | `archive SKILL` § Classify | Proposed——永不归档；保留一份活跃提案，或用一个诚实的理由否决它并满足 rejected 格式。 | Keep | NC § Pruning; AC § What enters | 上游文本 |
| A9 | `archive SKILL` § Classify | Rejected——仅当记录解释它为何落败、并能阻止一个诱人且影响重大的错误时，才作为护栏保留；否则删除该单元，并修复或删除入站链接。 | Keep | NC § Pruning; AC § What enters | 上游文本 |
| A10 | `archive SKILL` § Classify | 不要为配额而归档；检查范围内的每一份记录；把类似的组按同一条原则分类；把真正临界的决策记录进交接。 | Keep | AC § What enters, § Reporting | 上游文本 |
| A11 | `archive SKILL` § Examples | 删除源语料中的示例（折叠的侧边栏导轨；issue 策略模块搬迁）及其字数。 | Adapt | AC § What enters | 源语料标题与计数已移除；通用原型保住了大小不是检验标准这一教训 |
| A12 | `archive SKILL` § Examples | 保留源语料中的示例（事件溯源会话；harness-home 解析器；项目会话目录；预推送门禁；被丢弃的图片内容块）及其字数。 | Adapt | AC § What enters | 源语料标题与计数变为通用原型（持久性边界、所有权规则、存储策略、门禁调度、重新引入条件） |
| A13 | `archive SKILL` § Examples | 源语料中的否决记录示例（包拆分；流式工作流进度；ACP 终端元数据）及其字数。 | Adapt | AC § What enters | 源语料标题变为通用原型（仍然诱人的提案；过时的前提；被后来的决策解决） |
| A14a | `archive SKILL` § Archive one triplet | 把完整单元移到 `archived/{kind}/`；不做正文编辑；只在每一个 Markdown 侧的 status 下方插入 `Archived:` 行；不要翻译、重排格式、更新事实或修复链接。 | Adapt | SK § Archiving; AC § Archival change | 三件套 → 已声明单元；不编辑规则保留 |
| A14b | `archive SKILL` § Archive one triplet | 元数据编辑后重新记录伴随记录的哈希。 | Re-bind | AC § Archival change | 伴随记录重新记录 → 项目自己的配对机制 |
| A15 | `archive SKILL` § Archive one | 从活跃正文搜索入站链接；重定向、为有意的历史引用重新指向，或删除；绝不验证或修复归档记录发出的链接。 | Keep | AC § Archival change | 上游文本 |
| A16a | `archive SKILL` § Validate | 运行带 `--write` 的仅追加验证器，再运行常规验证器；运行聚焦测试。 | Adapt | SK § Checks; AC § Sealing and verification; gate | 源命令变为随附门禁；其测试位于本仓库的 `tests/` 下，不在随技能发布的技能里 |
| A16b | `archive SKILL` § Validate | 运行 docs sync、lint、`git diff --check` 以及任何额外的预推送检查。 | Dissolve | — | 那些是源仓库的流水线；采用方自己的门禁接手 |
| A17 | `archive SKILL` § After | 封印之后，绝不编辑、移动、翻译、重排格式或删除该单元；它作为历史快照仍是有效的入站目标，但不是权威。 | Keep | AC § Frozen guarantee | 上游文本 |
| A18 | `archive SKILL` § Validate and report | 报告保留、删除或归档的活跃记录，保留或删除的否决记录，被否决的提案，以及每一个临界案例及其结果；不要声称归档记录的出站链接有效。 | Keep | AC § Reporting; NC § Reporting | 上游文本；字数随通用原型一并移除 |

### 门禁与 manifest

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| G1 | `agent-note-tree.ts` | 一个共享的结构性单一事实来源；生命周期集合是封闭的。 | Adapt | NC § Layout; gate | 单个模块变为随附门禁加约定；两个集合都在那里镜像 |
| G2 | `agent-note-tree.ts` | 类别集合是封闭的；新增类别是一次有意行为，会扩展列表与 README 章节。 | Adapt | NC § Classification; gate `CLASSES` | 规范来源移到随附门禁与约定 |
| G3 | `agent-note-tree.ts` | 归档文件夹名是一个固定常量。 | Keep | AC § Path; gate | 上游文本 |
| G4 | `agent-note-tree.ts` | `AGENTS.md` 与 `CLAUDE.md` 可以直接位于生命周期根。 | Keep | gate `ROOT_ALLOWLIST` | 上游文本 |
| G5 | `agent-note-tree.ts` | 遍历器报出 `INDEX.md`、未知生命周期文件夹、错误深度、未知类别文件夹与 `yyyy-mm-dd-topic.md` 之外的文件名；它返回有效记录与错误。 | Keep | gate `walkActiveTree`; test | 上游行为；文件名只做形状检查，不做日历校验；空目录像源侧的 Markdown glob 一样被忽略；类别文件夹或生命周期根处的已声明伴随文件与其源记录配对，孤儿会被报出（R23），而更深的已声明伴随文件像源侧遍历器一样被忽略 |
| G6 | `verify-agent-note-format.ts` | 格式门禁拥有头部、生命周期专属章节、备选方案与退役标记；分类与文件名归树门禁；译文结构归配对门禁。 | Adapt | gate `formatErrors`; NC § Checks | 伴随文件结构委托给项目的配对门禁；其他范围保留 |
| G7 | `verify-agent-note-format.ts` | 固定的格式采用日期控制历史存量注释是否放行。 | Adapt | gate `--format-adopted`; NC § Alternatives | 固定日期变为项目声明的标志 |
| G8 | `verify-agent-note-format.ts` | 两个退役的债务标记被禁止，以免它们重新潜入。 | Dissolve | — | 源语料迁移标记；新的目标语料从未携带它们，备选方案规则接手 |
| G9 | `verify-agent-note-format.ts` | `Status:` 语法按生命周期固定。 | Keep | gate | 上游文本 |
| G10 | `verify-agent-note-format.ts` | 除 `## Problem` 之外，必需的 `##` 标题按生命周期固定。 | Keep | gate | 上游文本 |
| G11 | `verify-agent-note-format.ts` | 提案时期的标题在 implemented 记录中被报出。 | Keep | gate | 上游文本 |
| G12 | `verify-agent-note-format.ts` | 围栏示例内的格式 token 不是文档结构。 | Keep | gate `proseLines`; test | 上游文本 |
| G13 | `verify-agent-note-format.ts` | 头部第 1–4 行精确；正文中恰好存在一行 `Status:`。 | Keep | gate | 上游文本 |
| G14 | `verify-agent-note-format.ts` | 第一个 H2 是 `## Problem`；每一个必需章节都存在。 | Keep | gate | 上游文本 |
| G15 | `verify-agent-note-format.ts` | 备选方案章节与历史存量注释互斥；注释只在采用日期之前有效。 | Adapt | gate | 日期参数化；其余保留 |
| G16 | `verify-agent-note-classification.ts` | 分类门禁复用遍历器，并报出遗留根 `docs/rfc` 与 `docs/rfcs`。 | Dissolve | — | 遗留根是源仓库历史；目标没有固定的遗留树，遍历会报出记录根内的未知生命周期文件夹（它无法管束根之外的树），而根之外的树是项目自己的事 |
| G17a | `archived-agent-notes.ts` | manifest 精确为 `{version: 1, files: {path: sha256}}`，并且哈希会被校验。 | Keep | AC § The frozen guarantee; gate | 上游文本 |
| G17b | `archived-agent-notes.ts` | 渲染出的 manifest 是确定性的，并按路径排序。 | Adapt | gate `renderManifest` | 路径排序使用码点顺序而不是 locale 顺序，以便跨环境确定性输出 |
| G18a | `archived-agent-notes.ts` | 产物必须匹配单元模式、封闭类别、完整单元、implemented 状态、有效的 `Archived:` 元数据、每个 Markdown 侧同一个归档日期、不早于文件名的有效归档日期，以及完整的已声明伴随文件集。 | Adapt | AC § Path, § Sealing and verification; gate | 单元通过后缀分类与精确路径成员泛化；准备计划绑定当前精确成员集，每个 Markdown 侧都携带元数据，且所有侧共享该日期 |
| G18b | `archived-agent-notes.ts` | 伴随记录恰好包含两个 blob 哈希。 | Re-bind | AC § Sealing and verification | 伴随文件的哈希内容归项目的配对门禁管；manifest 仍然冻结伴随文件的字节 |
| G19a | `archived-agent-notes.ts` | manifest 是仅追加的：已有条目缺失或被改动就是错误。 | Keep | AC § Frozen guarantee; gate | 上游文本 |
| G19b | `archived-agent-notes.ts` | 唯一的例外是三个精确的 Figma 封印。 | Dissolve | — | 语料专属例外不是目标策略；门禁不授予任何例外 |
| G20 | `archived-agent-notes.ts` | 扩展 manifest 会证明每个已封印产物存在且未变，然后只按排序顺序追加新路径。 | Keep | gate `extendManifest`; test | 上游文本 |
| G21 | `verify-archived-agent-notes.ts` | CLI（命令行界面）：无参数即验证，`--write` 封印；归档根存在；允许的根文件（`archived/AGENTS.md`、`manifest.json`）；封闭类别目录；要求全部六个类别目录；仅常规文件；除非写入，否则要求 manifest；基线是 `DSH_ARCHIVE_BASE_REF` 或 `HEAD`；基线 manifest 用 `git ls-tree`/`git show` 读取；预置的新增项是未封印错误；写入路径只在检查通过时渲染；摘要行与退出码。 | Adapt | SK § Checks; AC § Sealing and verification; gate; test | 根文件允许列表变为 `manifest.json` 加可选且被忽略的 `AGENTS.md`（R6）；全部六个类别目录仍被要求，`init` 用被忽略的占位文件创建它们（R5、R26）；`--prepare` 为新单元精确成员生成哈希绑定计划，`--write --expect-plan` 校验该状态并运行无 shell 的外部 readiness，两个路径都不重新验证冻结历史（R2、R23）；带伴随文件的新增单元缺少该命令时会被拦下，空归档则无法通过语料门禁（R20）；环境变量变为显式的 `--base-ref` 标志（R7）；Git 基线机制与 manifest 受跟踪规则保留（R27） |
| G22 | `archived-agent-notes.ts` | 归档日期按真实日历日期校验。 | Keep | gate `validDate` | 上游文本 |

### manifest

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| M1 | `manifest.json`; `archived-agent-notes.ts` | manifest schema 是 `version: 1`，以及一个从产物路径到小写 SHA-256 内容哈希的 `files` 映射。 | Keep | AC § The frozen guarantee; gate `parseManifest` | 上游文本 |
| M2 | `verify-archived-agent-notes.ts` | 条目相对可信基线是仅追加的；基线 manifest 缺失意味着归档为空。 | Keep | AC § Frozen guarantee; gate `readBaseline` | 上游文本 |
| M3 | `archived-agent-notes.ts` | 渲染出的 manifest 是两空格 JSON、路径排序、末尾换行，因此在没有变化时重新封印是空操作。 | Keep | gate `renderManifest`; test | 上游文本；排序基于码点 |
| M4 | `verify-archived-agent-notes.ts` | 基线提交从 Git 读取；manifest 在该提交处不存在，或被严格解析。 | Keep | AC § Frozen guarantee; gate | 上游文本 |

### 提案先行工作流

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| W1 | 提案先行拥有者记录 § Decision；§ Consequences | proposed 记录拥有设计理由与验收标准；其执行跟踪器条目拥有依赖、状态、已完成与待办证据以及下一个检查点。该记录链接跟踪器，跟踪器也链接回该记录，不复制完整设计。 | Keep | `WF` § One owner for each fact；§ Retain the proposal before implementation；提案先行拥有者记录 | 当前请求与拥有者决策 |
| W2 | 提案先行拥有者记录 § Decision | 只存在于工作树、Draft 变更、未合入分支或陈旧本地修订中的提案不计入有效清单。实现只能从已保留在目标分支 `proposed/` 下的提案开始。 | Keep | `WF` § Retain the proposal before implementation | 当前请求与拥有者决策 |
| W3 | 提案先行拥有者记录 § Decision；§ Consequences | 只要仍有任何已获认可的验收条件或目标尚未交付，提案就保持 `proposed`。只有当每一项已获认可的验收条件都已交付并验证时，它才作为一个完整单元移动到 `implemented/`。 | Keep | `WF` § Checkpoint full and partial work；`SK` § Procedure；`NC` § Moving between lifecycles | 当前请求与拥有者决策 |
| W4 | 提案先行拥有者记录 § Consequences | 相互独立的决策使用各自的提案与跟踪器条目。一份连贯提案按其完整的已获认可目标集合来评估，并且一个已完成目标绝不会使一份未完成提案被视为已完成。 | Keep | `WF` § Multi-goal proposals | 当前请求与拥有者决策 |
| W5 | 提案先行拥有者记录 § Decision；§ Consequences | 对决策、备选方案或已获认可范围的改动会使提案回到设计评审。在其验收条件与伴随文件完成更新和评审之前，不得用缩减或扩大的范围宣告完成。 | Keep | `WF` § Checkpoint full and partial work；§ Multi-goal proposals | 当前请求与拥有者决策 |
| W6 | 当前请求；提案先行拥有者记录 § Decision | 一项使已获认可范围仍未完成的变更，采用项目的非关闭式引用约定，保持跟踪器状态明确，并记录已完成的验收条件、承载该验收条件的变更、验证与剩余工作。 | Keep | `WF` § Record execution evidence | 当前请求；拥有者决策把执行证据分配给跟踪器 |
| W7 | 当前请求；提案先行拥有者记录 § Decision；§ Consequences | 在每个实质性实现目标完成后、整体完成前，以及每当工作暂停或恢复时，都执行检查点。读取当前提案与跟踪器，然后将每项已获认可的验收条件与已交付的实现及其验证进行比对。 | Keep | `WF` § Checkpoint full and partial work | 当前请求；拥有者决策定义完整与部分检查点 |
| W8 | 提案先行拥有者记录 § Consequences | 被放弃的提案在笔记生命周期中予以否决或删除；它绝不会作为隐式积压项继续留存。 | Keep | `WF` § Checkpoint full and partial work；`NC` § When to write one；§ Pruning the active tree | 拥有者决策要求否决或删除被放弃的提案 |
| W9 | 提案先行拥有者记录 § Decision | 本工作流不创建重复的常驻指令（standing instructions）资产。它不会创建或修改 `AGENTS.md`、生成的策略或其他常驻指令文件；项目现有指令与已安装技能提供该规则。 | Keep | `WF` § Do not copy standing instructions；`SK` § Writing the note | 当前请求与拥有者决策 |
| W10 | 当前请求；提案先行拥有者记录 § Decision | 报告设计拥有者与状态、执行跟踪器、已完成证据、剩余的已获认可目标及相关检查；完整检查点还要报告 implemented 路径与更新后的链接。 | Keep | `WF` § Report a checkpoint | 当前请求；拥有者决策把状态与证据分配给跟踪器 |

### 目标裁定

| # | 裁定 | 理由 | 可撤销方式 |
|---|---|---|---|
| R1 | 项目根是工作目录的 Git checkout 根；默认记录根目录是其下直接放置的 `.agents/dsh-spec-agent-notes/`，生命周期文件夹与 `archived/` 树都在该目录内。`--root` 指定项目根内的另一个目录，项目声明也可以指定一个。归档根目录始终是 `<notes root>/archived`；没有可单独配置的归档根。 | 笔记路径是分支树里的相对路径，所以 Git checkout 提供了它需要的锚点；以技能命名的命名空间让这棵树不会与采用方的其他 `.agents/` 机制冲突，而单一根目录让生命周期及其冻结分支同处一棵树。 | 修改默认值、参数，或 SKILL、两份约定与门禁中的归档子目录规则。 |
| R2 | 上游三件套变为通用单元：一个源记录加上分配给该记录的所有伴随文件。重复的 `--companion <suffix>` 只分类可能的伴随文件，不构成项目级必需集合。外部机制拥有伴随文件的名称、格式、一致性记录与语义检查；Agent Notes 拥有单元成员关系、移动、计划阶段的完整性和冻结。对于翻译，[能力感知默认值](../feature/2026-11-18-agent-notes-capability-aware-bilingual-defaults.zh.md)按以下顺序解析目标集：当前请求、持久项目策略、同一 owner 定义类别中完整 peer 配对的一致集合、与源语言不同的主 agent 用户语言，或没有目标。这些环境判断由模型完成，脚本接收已解析事实。生成翻译前，所选机制的工作分离规则适用；没有分离时，源记录保持完成，目标作为具名待办成员进入交接。显式集合可以包含多个目标。新增目标采用渐进方式：新记录使用当前集合，被编辑的记录补上缺失目标，未触碰记录不回填。取消目标会清理所有符合条件的 active 与未封印单元；已封印单元不变。首次封印准备精确成员集与哈希，运行项目的无 shell readiness 命令，并只在匹配计划且确认 readiness 未修改单元后写入。任何包含伴随文件的新单元若没有该命令，都无法准备；仅含源文件的单元可以省略该命令。 | 采用方可以替换翻译机制，因此任何后缀、目标代码、记录形状或兄弟 API 都不能成为单元模型。把范围策略与单单元组成分离，避免昂贵回填，同时允许低成本删除清理。哈希绑定的准备式封印记录最终状态，又不让 Agent Notes 学会另一机制的格式。翻译质量仍需要该机制的独立生产或评审边界。 | 重新引入翻译专用的单元语义、全局后缀完整性、CLI 自动目标推断，在缺少分离时于工作上下文翻译选定目标，或绕过准备式 readiness 的封印路径。 |
| R3 | 固定的格式采用日期变为 `--format-adopted <yyyy-mm-dd>`；没有它，任何格式前注释都不被接受。 | 通用采用方有自己的采用日期；一次全新的采用不得获得逃生口。 | 去掉该标志或恢复固定日期。 |
| R4 | 三个 Figma 封印例外不携带。 | 它们授权对一件源产物做一次性改动；携带它们会凭空发明目标策略。 | 如果采用方需要，新增一个显式例外机制。 |
| R5 | 要求六个归档类别目录，`init` 用 `.gitkeep` 占位文件创建它们；占位文件被门禁忽略，且绝不进入 manifest。 | 上游要求六个类别目录；已提交的占位文件解决了 Git 的空目录问题，同时不削弱封闭树。 | 去掉该要求，或停止在 `init` 中创建这些目录。 |
| R6 | 不要求 `archived/AGENTS.md`：规则归技能所有，所以项目本地的策略文件会与之重复并漂移。保留该文件的项目可以放一个可选的 `archived/AGENTS.md`，门禁忽略它，且绝不封印它；其他任何根文件都被报出。 | 这套机制已经变成一个技能；它的参考文件拥有规则，同时允许一个已有的可选策略文件，让上游归档语料仍可加载，而不把它变成单元或 manifest 的一部分。 | 重新要求或忽略项目本地的归档策略文件。 |
| R7 | `DSH_ARCHIVE_BASE_REF` 变为显式的 `--base-ref` 标志。 | 通用 CLI 携带自己的输入；CI 调用方传入可信提交。 | 改为读取环境变量，或同时读取。 |
| R8 | 源仓库的 `pnpm run …` 门禁命令变为直接随附的命令，并带有已记录的退出码。 | 技能自包含，不安装任何东西。 | 在落地时把它们包进一个 package 脚本。 |
| R9 | 源仓库文档链接（文档标准、slop 清单、归档策略记录、格式理由）被取消；规则就地陈述。 | 那些文档在通用采用方项目中不存在。 | 重新引入项目自己的文档标准。 |
| R10 | 遗留迁移标记与遗留笔记根被取消。 | 它们是源语料历史；目标没有这样的语料。 | 如果采用方要导入，新增一节迁移说明。 |
| R11 | Git 是前提，而不是可选的归档模式：每条命令都在 Git checkout 内工作，没有 Git 的项目会被告知安装 Git 并初始化/提交仓库。冻结保证保留上游信任模型：manifest 相对可信基线仅追加，不做对抗性的 Git 历史取证；本地伪造 `.git` 布局与重写历史都在信任模型之外，属于项目的 CI 与受保护历史。 | 持久决策记录需要 Git 的变更控制；把它变成前提移除了一种静默的更弱模式，而冻结信任仍然依赖项目受保护的历史，而不是取证引擎。 | 恢复非 Git 模式，或用历史验证扩展门禁。 |
| R12 | 门禁的测试位于本仓库的 `tests/agent-notes.test.ts` 下，不在随技能发布的技能里；`scripts/` 只包含 `notes.mjs`。 | 仓库测试是维护者证据；技能随附它的门禁，而不是它的测试脚手架，测试套件归仓库的测试运行器所有。 | 再次把测试随技能发布。 |
| R13 | 脚本用 TypeScript 编写，位于 `package/dsh-spec-agent-notes/`，带有自己的 `vite.config.ts` 与 `build.ts`，打包进工作目录的 `scripts/notes.mjs`，成为单个自包含、无运行时依赖的 ES module；根 `skill:build` 参数化，可构建一个技能或全部。 | 符合本仓库的打包惯例，保持技能隔离（无跨技能依赖），对打包产物做 tree-shake，并让一次锻造只重建被触及的技能，而 CI 构建全部。 | 交付一个没有包源的普通 JavaScript 脚本。 |
| R14 | 中文评审配对只在停下时产出；在那之前它们可能是陈旧的，并在最终交接前与本记录配对一起重新生成。 | 请求把译文配对推迟到停下时；在设计仍在变动时保持配对最新只会增加无评审价值的反复。 | 持续翻译并在循环期间运行配对门禁。 |
| R15 | 候选在锻造分支上提交，在最终评审之前不发布也不刷新。 | 请求要求提交但不落地，并在最终评审处停下。 | 验收之后发布并刷新。 |
| R16 | manifest 路径按码点排序。 | 依赖 locale 的排序会让渲染出的 manifest 依赖环境。 | 恢复 `localeCompare`。 |
| R17 | 门禁在 stdout 上报告违规，并以退出码 0/1/2 退出。 | agent 消费读取 stdout；锻造门禁使用同一惯例。 | 改为在 stderr 上打印违规。 |
| R18 | 封闭的生命周期与类别集合同时出现在约定文本与门禁常量中，并且保持上游的六个类别及其上游名称与定义。分类是语义的：通用领域的 agent 把自己领域的决策映射到这些意向上，这种对模型语义的依赖被记录为假设，而不是机械化。 | 源侧保留一个规范集合，门禁必须在不解析正文的情况下决定它；保留上游名称维持迁移保真度，且不为通用领域新增本地分类法扩展。 | 新增一个类别，或加入可配置的分类法。 |
| R19 | `--json` 与 `--help` 是仅展示的接口增项；它们不改变任何检查。 | 消费门禁的 agent 需要稳定输出与可发现的选项；源脚本只打印人类可读行。 | 去掉这些标志，保留行输出。 |
| R20 | 门禁没有语料就会失败。`check` 要求至少有一条活跃记录，每次归档调用都要求至少有一件候选产物或已封印产物；仅有空 manifest 不算通过。候选归档仍由 `--prepare` 和 `--write` 走首次封印路径，而 `init` 独立创建六个类别目录与 `.gitkeep` 占位文件。 | 一次零结果运行无法区分健康语料与损坏的路径。源侧让空语料通过，但本仓库的既定边界让非空证据成为每道门禁的一部分；将首次封印候选与初始化分开处理，可同时保留初始化与封印。 | 让空活跃树或空已封印归档返回成功，或把初始化覆盖并入空语料通过的处理。 |
| R21 | 门禁保留源侧文件名规则：`yyyy-mm-dd-topic.md` 形状，而不是真实日历日期；文件名日期不做日历校验。空的类别目录与没有 Markdown 的生命周期根目录被忽略，正如源侧 Markdown glob 忽略它们。 | 日历校验与目录严格性是源侧未定义的扩展；因此门禁留在源侧范围内。 | 新增这些检查及其裁定。 |
| R22 | 这套机制把笔记树锚定到项目当前的 Git checkout：项目根是工作目录的 checkout 根；记录根与归档根必须解析到它内部；归档根不得解析到项目的 Git 目录内；归档根的绝对 Git 目录必须是项目自己的。门禁不枚举 Git 布局：只要这些不变量成立，linked worktree、submodule 与分离 Git 目录都可以工作；bare 仓库或不是真实 checkout 的目录则是一次交接。当归档列出产物时，验证还要求 manifest 受 Git 跟踪（R27）；残留的本地布局信任边界在约定中说明（R28），不靠机械检测。 | 笔记目录是分支树里的相对路径；把它锚定到当前 checkout，让基线与封印留在同一棵树里，而不枚举 Git 机制，且廉价的 manifest 受跟踪检查能抓住未受跟踪视图这一类，否则那类视图会产生空基线。 | 修改锚定规则，或加入机械布局检测。 |
| R23 | 活跃检查会报出没有同 stem 源记录的后缀分类伴随文件，并把每一条 `--member <source>=<companion>` 路径验证为源生命周期与类别下存在的常规文件。它只检查单元形状，绝不检查伴随文件内容。封印准备绑定每个新单元的精确当前成员与哈希。带伴随文件的候选必须把外部 owner readiness 命令纳入计划；随后该单元携带其归档元数据，而该命令在哈希绑定写入前证明语义完整性。仅含源文件的候选可以省略该命令。后缀不再被声明的冻结产物仍留在 manifest；新的未声明非 Markdown 产物被拦下；新的未声明 Markdown 文件只有在没有路径成员声明它时才是自己的记录。之后的验证只比对 manifest：它不重放当前声明，也不重新验证冻结元数据。 | 后缀分类仍方便同 stem 机制，显式成员路径则支持不同 stem 或类别目录下的嵌套文件，而不让 Agent Notes 学会另一机制的格式。精确准备集合支持渐进新增，而外部 readiness 命令是必需项，用于验证机制专用完整性。 | 把孤儿与成员路径检查，或准备单元元数据检查委托给项目的配对门禁。 |
| R24 | 活跃检查会跟随符号链接的生命周期文件夹、类别文件夹与记录文件，但仅当其真实路径留在项目工作树内；解析到 checkout 之外、或解析到项目 Git 目录内的条目是违规，并会报告属于哪一种情况。损坏的 Markdown 条目无论位于类别文件夹之下何处都会被报出；类别文件夹或生命周期根处的已声明伴随文件条目在无法读取时会被报出。其他不可读条目像源侧遍历器一样被忽略。 | 源侧的 Markdown glob 跟随符号链接的生命周期文件夹与符号链接的记录文件，但不跟随符号链接的类别文件夹；跟随类别文件夹是面向通用领域的目标扩展，静默跳过会藏起一个损坏的单元。包含性让这棵树留在读取归档基线所用的工作树内。 | 停止跟随类别文件夹，或把它们作为交接报出。 |
| R25 | 伴随后缀是扁平的分类规则：被匹配为伴随文件的路径本身不能作为单元源。`--member` 另行声明精确的 source-to-companion 路径，包括不同 stem 或类别目录下的嵌套路径。每个 Markdown unit side 都按源侧大小写敏感的 `.md` 规则做元数据检查。当一个已声明后缀以另一个结尾时（例如 `.yaml` 与 `.i18n.yaml`），最长声明后缀匹配文件，所以声明顺序永远不会改变结果。 | 源侧固定三件套没有嵌套，但外部 companion 机制可能有。保持后缀分类扁平、成员路径显式，就能同时支持两者而不猜测提供方的命名模型。 | 只允许扁平后缀匹配，或让 CLI 从命名约定推断嵌套成员。 |
| R26 | `notes.mjs init` 一次性初始化笔记树：创建三个生命周期文件夹及其六个类别文件夹、六个归档类别文件夹，并在空文件夹中创建 `.gitkeep` 占位文件；它是幂等的，绝不覆盖已有文件，也不创建 manifest 或任何 `AGENTS.md`。门禁忽略 `.gitkeep` 占位文件，它们绝不进入归档 manifest。 | 一次初始化避免了零散的设置，并让六个目录的归档要求可以在 Git 中表达；create-vs-update 让采用方的新增内容保持安全。 | 移除 `init`、改变其布局，或停止忽略占位文件。 |
| R27 | 在验证模式下，当 manifest 列出产物时，门禁要求 manifest 路径在项目中被 Git 跟踪（已暂存或已提交）；`--write` 与空 manifest 豁免。首次封印流程是：准备、运行 owner readiness 检查、受保护的写入、暂存或提交归档，然后验证。 | 上游允许未受跟踪的首次封印相对空基线通过验证；跟踪 manifest 让验证保持有意义，并拦下一个 manifest 尚未进入分支的未受跟踪伪造视图。准备计划在不可逆写入前绑定精确最终状态与外部 readiness。能暂存或提交 manifest 的本地行为者在信任模型之内（R28），不是门禁必须检测的布局。 | 移除该检查、绕过准备式写入，或收紧为只检查 HEAD。 |
| R28 | 信任模型是被陈述出来的，而不是机械化的：验证信任工作树、Git index 与项目的分支历史；能伪造 `.git` 布局或重写历史的本地行为者在保证之外，项目的 CI 与受保护历史才是锚点。 | 源侧的信任模型相同；把它陈述出来让门禁的范围保持诚实，并避免一个机制并不需要的本地对抗性沙箱。 | 加入对抗性布局检测。 |
| R29 | 技能 description 承担触发：在非平凡变更前使用它，判断该变更是否需要持久决策记录，以及生命周期动作。上游常驻的范围句——只为持久决策理由写、机械或局部编辑豁免——留在技能正文。 | 采用方项目没有上游根 AGENTS 的常驻指令（standing orders），因此只有生命周期动作的 description 不会在变更前加载技能；在 description 中重复范围又会把技能选择与正文拥有的规则混为一谈。 | 把范围句移回 description，或去掉变更前触发。 |

## 要求锚点

每条被锻造的要求都在可用的最精确层级上有一个锚点。机械锚点由命令决定；判断锚点点名指南并记录一个结论；未验证锚点在各自的证据单元格中携带其理由。

| # | 要求 | 锚点 | 证据 |
|---|---|---|---|
| 1 | 生命周期/类别放置、文件名形状、封闭树、无 `INDEX.md` | 机械 | gate `walkActiveTree`；测试 “check rejects unknown lifecycle, class and filename folders”、“check checks the filename shape only and rejects INDEX.md”、“check ignores an empty class directory and rejects Markdown nested deeper” |
| 2 | 头部块、状态语法、单行状态 | 机械 | gate `formatErrors`；测试 “check rejects a status that disagrees with the lifecycle”、“check reports a malformed header line” |
| 3 | 按生命周期的骨架与被禁止的 implemented 标题；围栏示例被忽略 | 机械 | gate `formatErrors`；测试 “check rejects a missing required section and a missing alternatives section”、“check rejects proposal-era headings in implemented notes but ignores fenced examples” |
| 4 | 强制备选方案；格式前注释受采用日期控制 | 机械 | gate `formatErrors`；测试 “check gates the pre-format alternatives comment by the adoption date” |
| 5 | 伴随文件配对与孤儿报告 | 机械 | gate `walkActiveTree`；测试 “check pairs declared companions with their source note”、“check pairs a lifecycle-root companion with its allowlisted source” |
| 6 | 活跃树符号链接只在 checkout 内跟随；损坏条目被报出 | 机械 | 测试 “check follows a symlinked lifecycle folder and a symlinked note file”、“check reports a broken Markdown symlink instead of skipping it”、“check reports a broken declared companion”、“check rejects a class symlink that resolves outside the project”、“check rejects a class entry inside the project Git directory” |
| 7 | 默认记录根目录直接在项目 checkout 下；非默认根在其内部 | 机械 | 测试 “check uses the default notes root”、“check resolves a non-default root against the project root”、“check rejects a symlinked notes root that resolves outside the project”；`NC` § Layout |
| 8 | 每条命令都以 Git 为前提 | 机械 | gate `detectProjectRoot`；测试 “check requires a Git repository”、“archive requires a Git repository”、“check requires a worktree, not a bare repository” |
| 9 | `init` 一次性创建骨架，幂等，不覆盖，也不逃出 checkout | 机械 | gate `initCommand`；测试 “init creates the default notes skeleton idempotently”、“init rejects a notes root outside the project”、“init rejects a notes root inside the project Git directory”、“init rejects a root symlink that resolves outside the project”、“init rejects a root symlink that resolves into the project Git directory”、“init rejects a symlinked lifecycle folder that escapes the checkout”、“init rejects a symlinked archived folder that escapes the checkout”、“init rejects a class folder symlink that resolves outside the project”、“init rejects a lifecycle folder symlink into the project Git directory”、“init rejects an archived folder symlink into the project Git directory”、“init rejects a class symlink into the project Git directory”、“init rejects a notes root inside a nested Git checkout”、“init rejects a dangling root symlink once”、“init writes nothing when a skeleton obstacle is found”、“init reports a non-directory obstacle instead of crashing” |
| 10 | 要求六个归档类别目录；可选的 `archived/AGENTS.md` 被忽略；根占位文件被拦下 | 机械 | gate `archiveCommand`；测试 “archive requires the init skeleton”、“archive requires every archived class directory”、“archive rejects an unknown class directory”、“archive allows an optional archived/AGENTS.md without sealing it”、“archive rejects a root .gitkeep and init leaves non-empty folders alone” |
| 11 | 封印时的归档元数据：implemented 状态、恰好一行正文 `Status:`、每个 Markdown 侧一行 `Archived:`、不早于记录的有效日期、各侧同一个日期；验证不重新验证冻结元数据 | 机械 | gate `unitErrors`（在 `--prepare`/`--write` 下）；测试 “archive rejects archive metadata without the Archived line”、“archive requires one identical Archived date across Markdown sides”、“archive rejects an invalid or predating archive date”、“archive seals a unit whose fenced example shows a status line”、“archive --write rejects two prose Status lines” |
| 12 | 封印完整性是精确的准备成员集与文件哈希，而不是项目级伴随文件并集；每一个带伴随文件的新单元都要求执行语义 owner 检查，该检查必须成功且不改变计划；仅含源文件的单元可以省略该检查 | 机械 | gate `unsealedCompanionUnits` / `sealPlanFor` / `--prepare` / `--write`；测试 “archive --prepare prints a hash-bound plan and writes nothing”、“archive rejects a companion-bearing unit without an owner readiness command”、“archive --write rejects a plan after the candidate unit changes”、“archive --write lets an external preflight reject a semantically incomplete unit”、“archive --write seals after a successful preflight”、“archive --write rejects a preflight that changes the prepared unit”、“archive seals companion artifacts after a successful owner readiness check” |
| 13 | 已封印单元不能新增产物（封印时相对基线检查） | 机械 | gate `unitErrors`（在 `--write` 下）；测试 “archive --write rejects an artifact added to a sealed unit against the baseline” |
| 14 | manifest schema 与哈希形式 | 机械 | gate `parseManifest`；测试 “archive --write seals a unit and the sealed archive verifies”、“archive rejects an unsupported manifest schema”、“archive rejects a malformed manifest hash” |
| 15 | 已封印产物存在且未变；没有未封印新增；相对基线仅追加 | 机械 | gate `extendManifest` / `readBaseline`；测试 “archive rejects a changed sealed artifact”、“archive rejects a manifest entry removed against the baseline”、“archive rejects a sealed artifact that is missing” |
| 16 | 验证比对 manifest，不重放当前声明，也不重新验证冻结历史 | 机械 | gate `archiveCommand`；测试 “archive accepts historical units when the declared companion set grows” |
| 17 | 非空 manifest 在验证前必须受 Git 跟踪；未受跟踪的伪造视图被拦下 | 机械 | gate `archiveCommand` `git ls-files`；测试 “archive verification requires the manifest tracked by Git”、“archive rejects a fabricated view whose manifest stays untracked” |
| 18 | 根位于项目内、在项目 Git 目录之外，归档位于同一个绝对 Git 目录；真实 checkout（包括 linked worktree）可以工作 | 机械 | gate `archiveCommand` / `walkActiveTree` / `initCommand`；测试 “check rejects a symlinked notes root that resolves outside the project”、“archive rejects an archive root symlink that resolves outside the project”、“init rejects a root symlink that resolves outside the project”、“init rejects a root symlink that resolves into the project Git directory”、“init rejects a notes root inside a nested Git checkout”、“archive accepts a linked worktree as the project checkout” |
| 19 | prepare 不写 manifest；受保护的写入需要匹配计划；readiness 失败或计划被修改时不写；重新封印是空操作；退出码与 `--json`；选项可发现 | 机械 | gate `archiveCommand`；测试 “archive --write requires a matching plan for a new artifact”、“archive --write writes nothing when a check fails”、“archive --write is a no-op when nothing changed”、“usage errors exit 2 and --json reports the summary”、“--help exits 0 and prints usage” |
| 20 | 用 `--base-ref` 指定可信外部基线 | 机械 | 测试 “archive reads a trusted external baseline with --base-ref”；`AC` § Frozen guarantee |
| 21 | 空活跃树与空已封印归档的行为 | 机械 | 测试 “check rejects an empty active tree”、“archive rejects an empty sealed archive”、“archive --write writes nothing when a check fails” |
| 22 | 最长已声明后缀胜出，与声明顺序无关；Markdown 元数据大小写敏感 | 机械 | gate `companionSuffixOf`；测试 “archive matches the longest declared companion suffix regardless of order”、“archive treats Markdown metadata case-sensitively”；R25 |
| 23 | 何时写一份记录；取代审计 | 判断 | `NC` § When to write one；变更记录每一次匹配及其结果 |
| 24 | 保留/归档/删除/否决的分类与校准 | 判断 | `AC` § What enters；交接报告为每份记录记录一个结果 |
| 25 | 完全合并保留每一个独有命题；部分取代保持交叉链接 | 判断 | `NC` § When to write one；变更记录被保留的条目与交叉链接 |
| 26 | 功能移除时的合并条件 | 判断 | `NC` § When to write one；变更记录缺失证据 |
| 27 | 入站链接修复与有意的历史引用 | 判断 | `AC` § The archival change；项目自己的链接检查加变更记录 |
| 28 | 归档资格是语义判断，不是机械判断 | 判断 | `AC` § What enters；交接报告记录决定与临界案例 |
| 29 | 停下并交接的条件 | 判断 | `SK` § Archiving 与 § Stop and hand over；每次交接点名失败步骤、已完成与待办工作以及可恢复的下一步行动；archive readiness 失败时保持单元未封印、manifest 不变，并给出修复、重新 prepare 与再次 write 的顺序 |
| 30 | 上游语料兼容性 | 机械 | 随附门禁接受上游语料：346 份活跃记录与 692 个伴随文件在上游记录根下通过 `check`，2,772 件归档产物在没有伴随文件声明的情况下通过 `archive`，上游可选的 `archived/AGENTS.md` 被接受并忽略 |
| 31 | 译文/一致性记录的伴随文件一致性 | 未验证 | 委托给项目自己的配对门禁；本技能不运行内容检查（R2） |
| 32 | 在没有外部基线的情况下，检测一次隐藏已封印编辑的强推重写 | 未验证 | 上游机制也没有这种证明；可信的 `--base-ref` 属于项目的 CI（R11、R28） |
| 33 | 模型解析的翻译目标集、通用单元组成与渐进迁移 | 判断 | 五步选择顺序、多目标集合、通用／外部伴随边界、首次封印规则、渐进新增、active 删除与已封印不可变性由 `tests/skill-defaults.test.ts` 与语义场景门禁锁定。`tests/skill-evals/dsh-spec-agent-notes/` 的开发语料携带 22 个场景，覆盖无机制、仅安装不启用、请求与项目覆盖、peer 推断与冲突、用户语言回退、源语言冲突、多目标、外部伴随机制、readiness 失败、首次封印、未触碰记录、渐进新增、active 删除、非翻译伴随、已封印历史、提案先行机制的可发现性、不可检视清单的交接与完整／部分检查点。模型运行证据在 CI 之外（R2）。 |
| 34 | 早于格式日期的语料的导入路径 | 判断 | `NC` § Alternatives considered；采用方传入 `--format-adopted`，门禁只接受日期早于它的记录（R3） |
| 36 | 归档被排除在文档门禁之外，包括出站链接，且不是当前行为的权威 | 判断 | `AC` 引言；项目自己的文档门禁配置 |
| 37 | 候选正文派生自上游来源，而不是采用方的笔记树 | 判断 | § 来源与修订；正文从上游文件重新推导；限定范围的 5/6-gram 扫描报告没有仅采用方的 shingle；上游根指令文件作为触发措辞的来源被纳入 |
| 38 | 实质未来工作有一个设计拥有者和一个执行跟踪器条目；两者互相链接，部分工作保持 proposed，且只有完整且已获认可的单元才移动到 implemented | 判断 | `SK` § Procedure；`WF` § One owner、§ Checkpoint、§ Multi-goal；[拥有者 Agent Note](2026-11-25-substantial-work-starts-as-a-proposal.zh.md)；提案先行与检查点场景 |
| 39 | 执行跟踪器所有权与设计所有权保持区分，且提案到跟踪器、跟踪器到提案两个方向的链接都存在 | 判断 | `WF` § One owner for each fact；提案先行场景的断言检查两个方向 |
| 40 | 分支本地、Draft 与未合入的提案不计入有效清单；实现使用保留在目标分支上的提案 | 判断 | `WF` § Retain the proposal before implementation；提案先行与不可检视清单场景 |
| 41 | 部分完成的提案保持 `proposed`；完成要求在完整检查点中满足每一项已获认可的验收条件、配齐全部伴随文件并完成验证 | 判断 | `WF` § Checkpoint full and partial work；带完整双语单元的检查点场景 |
| 42 | 相互独立的决策使用各自的提案与跟踪器条目；一份连贯提案要针对其全部已获认可的目标进行评估 | 判断 | `WF` § Multi-goal proposals；带独立跟踪器条目的检查点 fixture（测试前置数据） |
| 43 | 已获认可范围的任何缩减或扩大，都必须先回到提案评审，才能宣告完成 | 判断 | `WF` § Checkpoint full and partial work、§ Multi-goal proposals；评审锚点是工作流文本 |
| 44 | 部分变更使用非关闭式引用，并在跟踪器中记录已完成项、承载该已完成项的变更、验证结果与剩余工作作为证据 | 判断 | `WF` § Record execution evidence；评审锚点是工作流文本 |
| 45 | 检查点在每项实质性目标之后、完成之前，以及暂停或恢复时运行，并对照当前提案与跟踪器 | 判断 | `WF` § Checkpoint full and partial work；评审锚点是工作流文本 |
| 46 | 被放弃的提案会被否决或删除，而不是作为隐式积压项保留 | 判断 | `WF` § Checkpoint full and partial work；`NC` § Pruning the active tree；工作流与笔记约定陈述该结果 |
| 47 | 该工作流不创建 `AGENTS.md` 或其他重复的常驻指令资产 | 判断 | `WF` § Do not copy standing instructions；`SK` § Writing the note；提案先行拥有者决策保持项目指令为来源 |
| 48 | 检查点报告点名设计拥有者与状态、跟踪器、已完成与剩余证据、相关检查；完整检查点还点名 implemented 路径与链接 | 判断 | `WF` § Report a checkpoint；工作流文本点名每个必需的报告字段 |

## 曾考虑的替代方案

**逐字携带源侧的中文/英语/伴随记录三件套。** 它落败，因为目标受众是通用 agent 使用领域，在那里项目的翻译与一致性策略是它自己的；逐字三件套会强加源仓库的双语惯例，并让归档门禁依赖一种技能并不拥有的伴随记录格式。伴随后缀是等价手段：单元成员关系与准备计划保持机械，而一致性与语义完整性被委托出去。

**携带固定的格式采用日期与遗留标记。** 它们落败，因为它们点名源语料历史。通用采用方有自己的采用日期，所以日期变成一个输入，而目标中从未存在过的标记被丢弃；没有该标志，全新的采用没有逃生口。

**携带三个 Figma 封印例外。** 它们落败，因为它们授权对一件源产物做一次性改动；携带它们会凭空发明目标策略。目标不授予任何例外，并把需要的封印变更视为一次交接。

**携带一个更严格的、带 Git 历史取证的冻结门禁（仅合并删除、graft、replace ref、浅克隆检测、逐提交 blob 证明）。** 它落败，因为源机制把保证定义为相对可信基线的仅追加 manifest，而重写历史的信任属于项目的 CI 与受保护分支。加入历史取证会扩展一个上游并不存在的机制，把门禁扩大到超出技能受众所需，并让技能对采用普通 Git 工作流的采用方变得脆弱。

**只交付正文，把所有机械检查委托出去。** 它落败，因为机械检查是上游机制的一部分，而归档冻结只有在被封印并验证时才是证据；面向通用采用方的自包含技能不能假设项目已经有等价的门禁。

**把本仓库已安装的笔记技能保留为设计来源。** 它落败，因为请求排除本仓库的笔记相关技能及其设计，而上游修订才是点名的来源。

**使用 pin 的 `dsh-v0.2.1-rc.2` submodule，而不是最新 tag。** 它落败，因为请求点名最新的上游版本；约定在 pin 与该 tag 之间逐字节相同，所以没有引入做法差异。

**去掉语义工作流，只保留门禁。** 它落败，因为机制的价值在于决策实践——何时需要一份记录、什么胜过另一个、何时修剪或归档——而门禁的存在是让这种实践保持诚实，不是取代它。

**保留文件名日历校验与类别目录严格性。** 它们落败，因为源侧遍历器只检查文件名形状，并忽略没有 Markdown 的目录；两者均被排除（R21），而不是记录为目标扩展。

**把每个已声明伴随后缀都作为每个 active 单元的必需项。** 它落败，因为项目可以渐进新增目标，而且不同机制的文件集不同。因此 active 门禁只检查单元形状与孤儿，负责写入或封印该单元的 owner 检查验证所选集合（R2、R23）。

**携带采用方的笔记正文。** 它落败，因为请求排除那棵树作为来源；技能正文从上游文件重新推导，本记录陈述其来源，而不是声称来源干净。

**从外部记录根自己的仓库读取归档基线。** 它落败，因为目标的基线是项目自己的 Git 历史，且没有指定第二重信任边界；根必须留在项目内，而把笔记放在别处的项目要交接（R22）。

**接受解析到别处的符号链接根或归档目录。** 它落败，因为那样 manifest 就没有可信基线，`--write` 会在项目之外产生效果；规范化包含性是 R22 的廉价实现，回归测试把它钉住。

**拦下每一个符号链接的归档根。** 它落败，因为项目内的符号链接是普通布局，失败的是词法基线路径，而不是符号链接；在同一仓库内按解析后的路径读取基线，保留布局同时恢复保证（R22）。仓库身份是绝对 Git 目录加 worktree toplevel，所以仅仅共享项目 Git 目录的 worktree 视图会被拦下。

**只支持扁平的伴随后缀。** 它落败，因为通用 unit 可能来自使用不同 stem 或类别目录下嵌套路径的外部机制。显式路径声明增加这项能力，又不让后缀模式猜测成员关系（R25）。

**保留枚举 Git 布局的身份层。** 它落败，因为枚举已注册 worktree、gitfile 视图、per-worktree `core.worktree`、父与同级 checkout 条目会无止境地增长；把笔记路径锚定到当前 checkout 再加 manifest 受跟踪检查，用少得多的机制把基线留在同一棵树里（R22、R27）。

**保留上游在每次验证时重放三件套完整性。** 它落败，因为已声明后缀集是项目能力，可能随时间增长；把当前集合重放到冻结历史上会让后来新增目标不编辑已封印单元就无法进行。封印准备绑定精确成员集，验证比对 manifest（R2、R23）。

**在 `init` 中生成一个笔记树 `AGENTS.md` 模板。** 它落败，因为技能的 description 与正文已经带有触发与规则；生成的策略文件会重复它们、漂移，并在更新时被覆盖，违背本仓库的 create-vs-update 规范。

**把门禁测试留在随技能发布的技能里。** 它落败，因为本仓库拥有自己的测试套件，技能应随附它的门禁，而不是它的脚手架（R12）；测试留在 `tests/` 下，并检验工作目录或落地后的脚本。

**保留最初设计的候选。** 它落败，因为更简单的机制更适合目标：Git 前提、以技能命名的根、带仅 manifest 验证的声明式伴随文件、已初始化的骨架、不变的类别与仓库原生的打包。

## 后果

- 技能从 `skills/dsh-spec-agent-notes/` 交付，并在 `.agents/skills/` 下有安装副本；该目录携带技能、工作流层、两份格式／归档约定与打包门禁，不携带工作目录，也不携带中文评审配对。
- 本仓库的决策记录及其中文伴随文件位于 `.agents/dsh-spec-agent-notes/`；早先的笔记机制与 `dsh-archive-agent-notes` 安装已不存在。
- 笔记语料保留既有正文与伴随文件；本记录位于 `implemented/process`。
- 子模块基线 pin 在 `dsh-v0.2.3-alpha.2`（`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`）。
- notes 专属的 `dsh-spec-manager` 模块已不存在；当前没有代码消费它们。
- description 要求 agent 在非平凡变更前使用本技能；正文承载写入范围与机械/局部豁免，因此加载技能是判断是否需要记录的一部分。
- **门禁范围刻意保持精简。** 门禁不枚举 Git 布局：它保留规范化包含性、同一 Git 目录锚定与 manifest 受跟踪检查（R22、R27），约定陈述残留的本地布局信任边界（R28）；要求新增布局检查的请求从本记录得到回答，而不是靠扩大门禁。
- **归档语义偏离上游验证器。** 封印新单元时会强制执行准备成员集与归档元数据，带伴随文件的单元若没有外部 readiness 命令就无法进入封印计划（R2、R23）。`archived/AGENTS.md` 可选且被忽略（R6），非空 manifest 必须受 Git 跟踪（R27），空归档不能算作能通过门禁的语料（R20）。一条手工添加的 manifest 条目若给已封印单元一件新产物，会通过仅 manifest 的验证；执行点是封印命令与项目的评审和 CI（R28）。
- **manifest 受跟踪检查不证明工作树就是已提交的树。** 它证明 manifest 在项目的 Git index 中；能在正确路径暂存 manifest 的本地行为者在信任模型之内，该模型把历史委托给 CI 与受保护分支（R28）。一次同时改写 manifest 的强推重写，在没有外部可信 `--base-ref` 的情况下无法检测（R11、R28）。
- **分类依赖模型语义。** 上游六个类别带有软件色彩，通用领域的 agent 必须把自己的决策映射到它们上面；这种映射是一项假设（R18），采用方自己的语料是证据。
- **Git 是硬前提。** 没有 Git 的项目不能使用任何命令；compatibility 行陈述安装/初始化要求，采用方集合的收窄是有意为之（R11）。
- **归档那一半对某些采用方而言是部分机制。** 活跃生命周期适用于任何决策领域；封印还要求 Git、准备成员集以及伴随文件 owner 要求的外部 readiness 命令（R2）。
- **提案先行所有权是一项本地扩展。** 上游来源提供笔记与归档机制；当前请求及其拥有者记录提供执行跟踪器所有权、提案在目标分支上的保留、检查点与多目标规则。work-record 的重新引入仍受早先决策中经测量的条件约束。
- **语料兼容性结果是一次记录的运行，不是自动化测试。** 后来的源修订可能让某项格式假设失效，因此在门禁改动之前，会对 pin 的 submodule 重跑语料检查。
- **随附脚本及其测试套件是维护成本。** 脚本只镜像一层小而具名的门禁表面，身份不变量很少，且测试位于仓库测试套件中，而不是随技能发布的技能里。

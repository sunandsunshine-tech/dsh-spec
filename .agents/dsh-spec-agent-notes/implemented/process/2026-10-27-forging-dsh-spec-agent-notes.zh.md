# Agent Note: 从上游笔记机制锻造 dsh-spec-agent-notes

Status: implemented

[English](2026-10-27-forging-dsh-spec-agent-notes.md) | 中文

## 问题

技能集合里没有任何技能拥有 Agent Notes 生命周期。采用项目可以把决策留在对话或临时文档里，但没有一份面向 agent 的约定说明决策记录放在哪里、何时写、必须包含什么、如何在生命周期之间移动、何时合并或删除，以及一份已完成的记录如何冻结，好让后来的会话能够信任它。上游 `dsh` 恰好带有这套机制——一份笔记约定加一套归档工作流——但它是写进那个仓库自己的惯例里的：它的路径、它的双语三件套、它的门禁命令、它的封印例外。照搬会带入另一个项目的策略；略去则会丢掉这套模式点名的一项机制。

## 决策

技能 `dsh-spec-agent-notes` 从上游笔记约定与归档工作流锻造而来，适配到通用的 agent 使用领域，以及预期决策能跨会话留存的读者，现已落地。落地的技能是一个目录，包含：

- `SKILL.md` —— agent 加载的流程：取代检查、生命周期与类别放置、统一格式、修剪与合并、归档流程、各项检查，以及停下并交接的规则。
- `references/notes-contract.md` —— 活跃树约定：布局、分类、何时写、文件格式、生命周期移动、伴随文件、修剪。
- `references/archive-contract.md` —— 冻结归档：什么可以进入、单元、归档变更、manifest、冻结保证、封印与验证、交接。
- `scripts/notes.mjs` —— 适配后的机械门禁：`init` 用于一次性生成树骨架，`check` 用于活跃树，`archive`/`archive --write` 用于冻结归档。
- `package/dsh-spec-agent-notes/` —— 门禁的 TypeScript 源码，带 `vite.config.ts` 与 `build.ts`；打包产物是 `scripts/notes.mjs`。
- `tests/agent-notes.test.ts` —— 门禁的测试，维护在本仓库中，不随技能发布。

默认记录根目录：项目根下直接放置 `.agents/dsh-spec-agent-notes/`，可用 `--root` 覆盖，并由采用方的声明指定；归档根目录始终是 `<notes root>/archived`。首次停下之后，人工简化了设计——Git 作为前提、以技能命名的根目录、封印时的伴随文件完整性与只比对 manifest 的验证、一个 `init` 命令、一个精简的、锚定 checkout 的身份检查、上游类别保持不变，以及一个带仓库测试的 TypeScript 打包脚本。这次重设计记录在 § 首次停下之后的重设计 中；落地时工作目录已发布到 `skills/`，安装副本已刷新，本仓库的笔记已迁移到新的默认根目录。

## 来源与修订

上游来源：`deepseek-ai/deepseek-harness`，tag `dsh-v0.2.1-rc.3`，提交 `1f81c047fc48fa190a683e469daa699857e9afe8`——阅读时的最新 release tag（2026-10-27）。它读自 `/tmp/dsh-latest` 中的一个只读稀疏克隆；`submodules/dsh` 停留在 pin 的 `687f282e8625c6b8d11ff58211a90524be2e4317`（`dsh-v0.2.1-rc.2`），既未抓取也未编辑。所点名的来源文件——笔记约定、归档指令、归档技能与笔记门禁脚本——在 pin 与最新 tag 之间逐字节相同，所以这套做法没有在两个修订之间移动；该 tag 还带有无关的非笔记脚本改动，它们不是本技能的来源。使用最新 tag，是因为请求点名了最新的上游版本。

从上游 checkout 读取作为来源（pin 的 `submodules/dsh` 与最新 tag 的克隆；下列路径是上游路径，不是本仓库的安装副本）：

- `.agents/notes/README.md` —— 笔记约定。
- `.agents/notes/AGENTS.md`、`.agents/notes/implemented/AGENTS.md`、`.agents/notes/archived/AGENTS.md` —— 生命周期、取代与归档指令。
- `.agents/skills/dsh-archive-agent-notes/SKILL.md` —— 归档工作流。
- `.agents/notes/archived/manifest.json` —— manifest 的形状。
- `scripts/agent-note-tree.ts`、`scripts/verify-agent-note-format.ts`、`scripts/verify-agent-note-classification.ts`、`scripts/archived-agent-notes.ts`、`scripts/verify-archived-agent-notes.ts` —— 结构、格式与归档门禁。

未作为来源读取：本仓库自己的笔记相关技能及其旧移植（本仓库安装的 `.agents/skills/dsh-archive-agent-notes` 与 `scripts/dsh-spec-manager/`），以及任何先前会话的锻造记录或决策记录。`.agents/dsh-spec/notes/README.md` 与 `AGENTS.md` 仅作为采用方的决策记录格式为本笔记而读——它是关于记录放在哪里的一条工作区指令，不是设计来源。

三轮评审发现候选正文带有从那个采用方树搬来的文字。第 1 轮点名了 bug-fix 定义（N12）、格式理由（N34）、归档理由（AC 引言）与 INDEX 理由（N9）。第 2 轮又找到三处：豁免句（`NC` 第 46 行）、格式引言句（`NC` 第 54 行）与引言三句组（`SK` 第 9 行），外加 N34 里一个残留的检索理由短语。第 3 轮找到一处残留的引言从句，其 6-gram 匹配到一条采用方笔记，却没被只扫 README 的检查发现。第 4 轮从上游文件重新推导了全部八处。

来源证据是限定范围并归一化的。仅采用方是指一个候选 shingle 出现在采用方语料中且不出现在上游语料中（候选 ∩ 采用方，减去上游），而不是只在某一侧缺失的 shingle。候选侧是技能正文与两个约定文件。归一化把文本转为小写，把 Unicode 字母与数字保留为词字符，保留撇号，把其他标点映射为空格；shingle 是连续的词 n-gram。范围（a）把候选与上游笔记 README 以及 `.agents/` 与 `scripts/` 下的另外十个来源文件比较，再加上上游根的 `AGENTS.md` 与 `CLAUDE.md`，因为触发措辞是从那里移植过来的。范围（b）把整个采用方笔记树（包括采用方 README；排除本记录及其中文对侧文件与冻结归档）与稀疏克隆的 checkout（5,093 个工作树文件：46 个根文件，其下 5,047 个；根 `AGENTS.md` 与 `CLAUDE.md` 作为指令文件读取，只有其中笔记钩子的措辞出现在候选里）比较；更大的上游语料只会移除仅采用方的 shingle。只读上游笔记子树会留下一个由归档 `SKILL.md` 带入的 shingle，而它是具名来源，所以不是仅采用方。在该归一化下，5/6-gram 扫描在两个范围里都报告没有仅采用方的 shingle；一次仅 ASCII 的交叉检查最多只能加入 `README.zh.md` 的格式 token 标题枚举，绝不会加入正文。4-gram 交叉检查保留通用短语与路径 token 的重叠，其确切列表取决于语料与归一化，因此不记为固定证据。采用方树被排除作为设计来源；采用方 README 被纳入范围（b）仅用于泄漏检测；早先关于该树从未影响正文的主张被撤回。

2026-10-27 在线阅读的 Agent Skills 页面，早于撰写技能：

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/using-scripts.md`

每个页面都可读；锻造技能的离线回退未被使用。

## 设置

| 设置 | 值 | 依据 |
|---|---|---|
| 技能名称 | `dsh-spec-agent-notes` | 请求 |
| 交付语言 | 英语 | 锻造默认；本包的技能是英语 |
| 评审语言 | 中文 | 请求的语言与本包的双语实践 |
| 附加触发语言 | 中文，追加到 description | 评审语言与交付语言不同 |
| 默认记录根目录 | 项目根下直接放置 `.agents/dsh-spec-agent-notes/`：该目录就是笔记树，生命周期与 `archived/` 都在其中。`--root` 指定项目根内的另一个目录；项目可以在其声明中指定一个。归档根目录始终是 `<notes root>/archived`，不可单独配置。 | 首次停下之后的人工裁定；以技能命名的命名空间可避免与采用方的其他 `.agents/` 机制冲突，而单一根目录让生命周期及其冻结分支同处一棵树 |
| 运行时 | Node.js 22.19+ 或 24+；每条命令都以 Git 为前提（没有非 Git 模式） | 随附门禁的接口；持久记录需要 Git 变更控制 |
| 候选 | `.agents/dsh-spec-skill-forge/dsh-spec-agent-notes/` | 锻造工作目录 |
| 分支 | `forge/dsh-spec-agent-notes`，基于 `8921e45` 上的 `refactor/dsh-skills` | 请求的基线 |
| 需要评审 | 是，在重设计后的停下时；译文配对在重设计期间推迟，并在交接前重新生成 | 请求 |
| 说明触发 | “在非平凡变更前先使用本技能，判断该变更是否需要持久决策记录”，然后是生命周期动作 | 人工裁定：description 选择技能，正文拥有写入范围与机械/局部豁免（R29） |
| 评审轮次 | 锻造分支上每轮一个或多个提交，不落地。重设计之前的第 1–20 轮记录在 § 评审 中；重设计跑了 P0（`29193f6`）、P1/P2/P3（`569b536`）、P4（`dec7d79`）、P5（`36b8f1d`）、第 21 轮（`36b8f1d`，两者都是 *needs revision*）、第 22 轮（`8d6e18d`，A *needs revision*，B *accept*）、第 23 轮（`11a16fc`，A *accept*，B *needs revision*）、修复（`b5b9bfc`）与第 24 轮（`b5b9bfc`，两者都是 *accept*）。随后做一次 description 触发改动；第 25 轮两名评审者都返回 *accept*，没有阻断项或主要问题；本次提交带上触发、R29、837 字符指标与重新记录后的配对。 | 请求；逐轮历史在 § 评审 中 |
| 译文配对 | 最终停下时最新：工作目录的三个配对与记录配对都已记录并检查 | 请求 |
| 类别集合 | 上游的六个类别，其名称与定义保持不变 | 人工裁定；agent 按语义而不是按分类法来泛化它们的含义 |
| 归档骨架 | 要求六个归档类别目录；`init` 用 `.gitkeep` 占位文件在空类别文件夹中创建它们，门禁忽略这些占位文件，且绝不封印它们；允许一个可选的 `archived/AGENTS.md`，并忽略它 | 与上游一致，加上一套受 Git 版本控制的空骨架，同时不要求本地策略文件 |
| manifest 跟踪 | 当 manifest 列出产物时，验证要求 manifest 受 Git 跟踪；`--write` 与空 manifest 豁免 | R27：一项廉价检查，让验证保持有意义，并拦下未受跟踪的伪造视图 |
| 打包 | TypeScript 包源位于 `package/dsh-spec-agent-notes/`，打包进工作目录；测试位于本仓库的 `tests/` 下 | 本仓库的打包惯例；技能随附它的门禁，而不是它的测试脚手架 |

## 首次停下之后的重设计

重设计之前的候选到达人工评审后，人工评审了设计并要求简化。以下是记录其余部分遵循的方向：

- **Git 是前提。** 每条命令都在 Git checkout 内运行；没有 Git 的项目会被告知安装 Git 并初始化/提交，而不是得到一种更弱的归档模式（R11）。
- **单一根目录，归档在里面。** 默认记录根目录是项目 checkout 根下直接放置的 `.agents/dsh-spec-agent-notes/`；`--root` 可以指定项目内的另一个目录；归档根目录始终是 `<notes root>/archived`（R1）。
- **配对是声明式的，且发生在封印时。** `--companion` 声明任意一组后缀与语言；活跃树保持可选；归档只在封印新单元时强制完整性，而验证比对 manifest，而不是把当前声明重放到历史上（R2、R23）。
- **归档保留上游骨架。** 要求六个类别目录，`init` 用被忽略的 `.gitkeep` 占位文件在空类别文件夹中创建它们，并且要求 `manifest.json`；不要求 `archived/AGENTS.md`，因为规则归技能所有，同时允许并忽略一个同名的可选文件（R5、R6、R20）。
- **身份跟随逻辑 checkout，而不是 Git 机制。** 笔记路径锚定到当前 checkout 根；门禁保留包含性与同一 Git 目录检查，并新增 manifest 受跟踪检查（R22、R27），而不是枚举 worktree、gitfile 视图与 `core.worktree` 欺骗。残留的本地布局信任边界在约定中说明（R28）。
- **类别集合保持上游。** 六个名称与定义不变；通用领域的 agent 按语义把自己的工作映射到它们上面，这种依赖被记录为一项假设（R18，§ 未验证项）。
- **打包跟随本仓库。** 一套 TypeScript 包源，按技能打包，根 `skill:build` 参数化，测试位于 `tests/` 下且不随技能发布（R12、R13）。
- **触发在 description，范围在正文。** description 要求 agent 在非平凡变更前使用本技能，判断该变更是否需要持久记录，并保留生命周期动作触发；上游常驻的范围句——只为持久决策理由写、机械与局部编辑豁免——留在技能正文，而不是在 description 中重复（R29）。

## 约束处置

处置沿用锻造技能的取值：**Keep** 在语言与布局调整下保留原措辞与含义；**Adapt** 实例化一个目标值；**Re-bind** 把已消失的指称抽象到其目的，并找到目标中的等价物；**Dissolve** 记录该指称已消失，以及由哪项检查接手。目标归属：`SK` = `SKILL.md`，`NC` = `references/notes-contract.md`，`AC` = `references/archive-contract.md`，`gate` = `scripts/notes.mjs`，`test` = `tests/agent-notes.test.ts`。

### 笔记约定与生命周期指令

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| N1 | `README` § intro | 一份记录记载影响代码库的决策或提案——为什么、放弃了什么，以及代码、测试与文档无法承载的部分。 | Keep | SK intro; NC intro | 上游文本 |
| N2 | `README` § Layout | 路径是 `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`。 | Keep | NC § Layout; SK § Where; gate walk | 上游文本 |
| N3 | `README` § Layout | `proposed/` 存放实施前评审的提案：尚未构建，或只构建了一部分。 | Keep | NC § Layout; SK § Where | 上游文本 |
| N4 | `README` § Layout; `implemented/AGENTS` | `implemented/` 是已交付的决策，与实际交付的内容保持同步——同步的是事实，不是决策。 | Keep | NC § Layout, § When; SK § Procedure | 上游文本 |
| N5 | `README` § Layout | `rejected/` 是被否决的提案，仅当其理由能阻止一种诱人且影响重大的错误时才保留。 | Keep | NC § Layout; SK § Where | 上游文本 |
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
| N25 | `README` § Archiving | 验证器强制执行封闭类别树、完整三件套、归档元数据、伴随记录哈希与仅追加 manifest。 | Re-bind | AC § Sealing and verification; gate | 随附门禁强制执行类别树、单元、元数据与 manifest；伴随文件一致性归项目自己的配对门禁 |
| N26 | `README` § When to write | 只有在代码、测试与文档都解释不了的持久理由上，才在同一 PR（Pull Request）中新增或更新记录。 | Adapt | NC § When; SK § Procedure | “PR”在通用领域变为“change” |
| N27 | `README` § When to write | 面向未来实质工作的提案从 proposed 开始；已经做出的决策从 implemented 开始；选择匹配的类别。 | Keep | NC § When | 上游文本 |
| N28 | `README` § When to write | 更新拥有者记录，而不是复制；机械性或局部编辑可豁免，包括局部 UI 展示与交互改动；记录永远不会被编辑成另一个决策；用交叉链接取代。 | Keep | NC § When; SK § Writing | 上游文本，包括 UI 展示条款 |
| N29 | `README` § When to write | 编辑 implemented 记录以跟踪其决策所在位置是必需的，而不是禁止的。 | Keep | NC § When | 上游文本 |
| N30 | `README` § When to write | 一份被完全取代的记录可以合并进拥有者并删除：保留每一处独有理由、备选方案、后果、验证与具名覆盖缺口；修复入站链接；删除中文对侧文件与记录。 | Adapt | NC § When | 伴随文件变为项目声明的单元 |
| N31 | `README` § When to write | 部分取代保持活跃并互相链接，同时更新每一处当前事实。 | Keep | NC § When | 上游文本 |
| N32 | `README` § When to write | 合并不得把旧文件重写为其反面，也不得依赖 Git 历史作为理由的唯一副本。 | Adapt | NC § When | “Git history”对不绑定 VCS 的采用方变为“项目历史”（同 N7） |
| N33 | `README` § When to write | 功能新增记录只在缺失条件下才合并进后来的移除记录；移除记录的拥有者保留所列理由；移除理由与验证缺失的测试可以保留，而过时的实现清单与只验证过被删除行为的测试不是当前验证证据；部分取代已有定义。 | Keep | NC § When | 上游文本 |
| N34 | `README` § File format | 统一格式由一条仓库命令强制执行，该命令是文档同步的一部分。 | Adapt | SK § Checks; gate | 仓库命令变为 `<skill-dir>/scripts/notes.mjs check`；源侧的 docs-sync 接线被取消，交由项目自己的检查 |
| N35 | `README` § Header block | 前三行精确为 `# Agent Note: <title>`、空行、`Status: <status>`，然后是一个空行。 | Keep | NC § Header; gate | 上游文本；门禁强制执行第 1–4 行 |
| N36 | `README` § Header block | Status 有三种形式，且必须与生命周期文件夹一致；门禁会交叉核对。 | Keep | NC § Header; gate | 上游文本 |
| N37 | `README` § Header block | Status 不带日期或括注；文件名承载日期，项目历史承载其余一切；以修正后的形式接受是正文内容。 | Adapt | NC § Header | “Git history”变为“项目历史”（N7）；状态规则保留 |
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
| N53 | `README` § Chinese counterparts | `.zh.md` 对侧文件镜像结构；机器检查的头部 token 保持英语；格式门禁跳过它，一致性归配对门禁所有。 | Re-bind | NC § Companions; SK § Companions | 通用项目声明伴随后缀；结构一致性归项目的配对门禁，单元完整性归本技能 |
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
| N63 | `archived/AGENTS` | 运行归档工作流并用 `verify-archived-agent-notes --write` 追加哈希；常规验证器报出被改动或缺失的已封印产物、不完整的三件套、未知类别文件夹与无效元数据。 | Adapt | SK § Archiving; AC § Sealing and verification; gate | 命令变为 `node scripts/notes.mjs archive --write`；报出清单保留 |
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
| G18a | `archived-agent-notes.ts` | 产物必须匹配单元模式、封闭类别、完整单元、implemented 状态、有效的 `Archived:` 元数据、每个 Markdown 侧同一个归档日期、不早于文件名的有效归档日期，以及完整的已声明伴随文件集。 | Adapt | AC § Path, § Sealing and verification; gate | 单元通过已声明的伴随后缀泛化；每个 Markdown 侧都携带元数据，且所有侧共享该日期 |
| G18b | `archived-agent-notes.ts` | 伴随记录恰好包含两个 blob 哈希。 | Re-bind | AC § Sealing and verification | 伴随文件的哈希内容归项目的配对门禁管；manifest 仍然冻结伴随文件的字节 |
| G19a | `archived-agent-notes.ts` | manifest 是仅追加的：已有条目缺失或被改动就是错误。 | Keep | AC § Frozen guarantee; gate | 上游文本 |
| G19b | `archived-agent-notes.ts` | 唯一的例外是三个精确的 Figma 封印。 | Dissolve | — | 语料专属例外不是目标策略；门禁不授予任何例外 |
| G20 | `archived-agent-notes.ts` | 扩展 manifest 会证明每个已封印产物存在且未变，然后只按排序顺序追加新路径。 | Keep | gate `extendManifest`; test | 上游文本 |
| G21 | `verify-archived-agent-notes.ts` | CLI（命令行界面）：无参数即验证，`--write` 封印；归档根存在；允许的根文件（`archived/AGENTS.md`、`manifest.json`）；封闭类别目录；要求全部六个类别目录；仅常规文件；除非写入，否则要求 manifest；基线是 `DSH_ARCHIVE_BASE_REF` 或 `HEAD`；基线 manifest 用 `git ls-tree`/`git show` 读取；预置的新增项是未封印错误；写入路径只在检查通过时渲染；摘要行与退出码。 | Adapt | SK § Checks; AC § Sealing and verification; gate; test | 根文件允许列表变为 `manifest.json` 加可选且被忽略的 `AGENTS.md`（R6）；全部六个类别目录仍被要求，`init` 用被忽略的占位文件创建它们（R5、R26）；`--write` 检查新封印单元的归档元数据与已声明伴随文件完整性，并拦下向已封印单元添加产物，而验证比对 manifest，不重新验证冻结历史（R2、R23）；环境变量变为显式的 `--base-ref` 标志（R7）；Git 基线机制与 manifest 受跟踪规则保留（R27） |
| G22 | `archived-agent-notes.ts` | 归档日期按真实日历日期校验。 | Keep | gate `validDate` | 上游文本 |

### manifest

| # | 来源 | 约束 | 处置 | 归属 | 依据 |
|---|---|---|---|---|---|
| M1 | `manifest.json`; `archived-agent-notes.ts` | manifest schema 是 `version: 1`，以及一个从产物路径到小写 SHA-256 内容哈希的 `files` 映射。 | Keep | AC § The frozen guarantee; gate `parseManifest` | 上游文本 |
| M2 | `verify-archived-agent-notes.ts` | 条目相对可信基线是仅追加的；基线 manifest 缺失意味着归档为空。 | Keep | AC § Frozen guarantee; gate `readBaseline` | 上游文本 |
| M3 | `archived-agent-notes.ts` | 渲染出的 manifest 是两空格 JSON、路径排序、末尾换行，因此在没有变化时重新封印是空操作。 | Keep | gate `renderManifest`; test | 上游文本；排序基于码点 |
| M4 | `verify-archived-agent-notes.ts` | 基线提交从 Git 读取；manifest 在该提交处不存在，或被严格解析。 | Keep | AC § Frozen guarantee; gate | 上游文本 |

### 目标裁定

| # | 裁定 | 理由 | 可撤销方式 |
|---|---|---|---|
| R1 | 项目根是工作目录的 Git checkout 根；默认记录根目录是其下直接放置的 `.agents/dsh-spec-agent-notes/`，生命周期文件夹与 `archived/` 树都在该目录内。`--root` 指定项目根内的另一个目录，项目声明也可以指定一个。归档根目录始终是 `<notes root>/archived`；没有可单独配置的归档根。 | 笔记路径是分支树里的相对路径，所以 Git checkout 提供了它需要的锚点；以技能命名的命名空间让这棵树不会与采用方的其他 `.agents/` 机制冲突，而单一根目录让生命周期及其冻结分支同处一棵树。 | 修改默认值、参数，或 SKILL、两份约定与门禁中的归档子目录规则。 |
| R2 | 上游的中文/英语/伴随记录三件套变为项目声明的伴随后缀集（`--companion`，可重复，任意数量的后缀与语言）。活跃树可以选择性翻译：已声明的伴随文件存在时配对，孤儿会被报出，缺少伴随文件不是错误。归档只在封印新单元时强制完整性：该单元必须存在每一个已声明后缀；验证不会把当前后缀集重放到历史单元上。伴随文件一致性委托给项目自己的配对门禁；记录用英语为 agent 而写，译文是供人阅读的可选伴随文件。 | 通用采用方的翻译策略是它自己的，且可能随时间变化；声明集合让配对与封印保持机械，而不强制双语维护，封印时的完整性在集合后来增长时让冻结历史保持有效。 | 修改 `--companion` 语义、封印时完整性规则或约定中的语言策略。 |
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
| R14 | 中文评审配对只在停下时产出；重设计期间它们可能是陈旧的，并在最终交接前与本记录配对一起重新生成。 | 请求把译文配对推迟到循环停止；在设计仍在变动时保持配对最新只会增加无评审价值的反复。 | 持续翻译并在循环期间运行配对门禁。 |
| R15 | 候选在锻造分支上每轮提交，锻造期间绝不发布或刷新。 | 请求要求提交但不落地，并在人工评审处停下。 | 验收之后发布并刷新。 |
| R16 | manifest 路径按码点排序。 | 依赖 locale 的排序会让渲染出的 manifest 依赖环境。 | 恢复 `localeCompare`。 |
| R17 | 门禁在 stdout 上报告违规，并以退出码 0/1/2 退出。 | agent 消费读取 stdout；锻造门禁使用同一惯例。 | 改为在 stderr 上打印违规。 |
| R18 | 封闭的生命周期与类别集合同时出现在约定文本与门禁常量中，并且保持上游的六个类别及其上游名称与定义。分类是语义的：通用领域的 agent 把自己领域的决策映射到这些意向上，这种对模型语义的依赖被记录为假设，而不是机械化。 | 源侧保留一个规范集合，门禁必须在不解析正文的情况下决定它；保留上游名称维持迁移保真度，且不为通用领域新增本地分类法扩展。 | 新增一个类别，或加入可配置的分类法。 |
| R19 | `--json` 与 `--help` 是仅展示的接口增项；它们不改变任何检查。 | 消费门禁的 agent 需要稳定输出与可发现的选项；源脚本只打印人类可读行。 | 去掉这些标志，保留行输出。 |
| R20 | 空的活跃树带一行计数通过，与源侧的活跃门禁一致。归档预期已被初始化：`init` 创建六个类别目录与 `.gitkeep` 占位文件，`archive` 要求 `manifest.json`，而空 manifest 的空归档通过。 | 源侧的活跃门禁对零通过，而全新的归档需要已初始化的机械骨架；已提交的占位文件让这套骨架可以在 Git 中表达，同时不削弱归档检查。 | 在空树或空归档时失败，或让归档骨架隐式存在。 |
| R21 | 门禁保留源侧文件名规则：`yyyy-mm-dd-topic.md` 形状，而不是真实日历日期；文件名日期不做日历校验。空的类别目录与没有 Markdown 的生命周期根目录被忽略，正如源侧 Markdown glob 忽略它们。 | 日历校验与目录严格性是源侧未定义的扩展；第 1 轮发现它们没有裁定，于是移除它们，让门禁留在源侧范围内。 | 新增这些检查及其裁定。 |
| R22 | 这套机制把笔记树锚定到项目当前的 Git checkout：项目根是工作目录的 checkout 根；记录根与归档根必须解析到它内部；归档根不得解析到项目的 Git 目录内；归档根的绝对 Git 目录必须是项目自己的。门禁不枚举 Git 布局：只要这些不变量成立，linked worktree、submodule 与分离 Git 目录都可以工作；bare 仓库或不是真实 checkout 的目录则是一次交接。当归档列出产物时，验证还要求 manifest 受 Git 跟踪（R27）；残留的本地布局信任边界在约定中说明（R28），不靠机械检测。 | 笔记目录是分支树里的相对路径；把它锚定到当前 checkout，让基线与封印留在同一棵树里，而不枚举 Git 机制，且廉价的 manifest 受跟踪检查能抓住未受跟踪视图这一类，否则那类视图会产生空基线。 | 修改锚定规则，或加入机械布局检测。 |
| R23 | 活跃检查会报出一个已声明伴随文件：它在类别文件夹或生命周期根处没有常规文件源记录；可读的更深的已声明伴随文件像源侧遍历器一样被忽略，而类别文件夹或生命周期根处不可读的已声明伴随文件会被报出。它只检查配对，绝不检查伴随文件内容。在归档中，当每个已声明后缀在封印时都存在，单元就是完整的；新封印的单元那时也携带其归档元数据。后缀不再被声明的冻结产物保持原样；没有已声明后缀的新非 Markdown 产物被拦下；新的未声明 Markdown 文件就是它自己的记录。之后的验证只比对 manifest：它不重放当前声明，也不重新验证冻结元数据。 | 源侧遍历器跳过已声明的译文文件，把配对留给项目的配对门禁；封印时的完整性与元数据在声明集合增长时让历史保持冻结，而验证仍然只是 manifest 比对；一致性仍然委托出去（R2）。 | 把孤儿报告或封印时元数据检查委托给项目的配对门禁。 |
| R24 | 活跃检查会跟随符号链接的生命周期文件夹、类别文件夹与记录文件，但仅当其真实路径留在项目工作树内；解析到 checkout 之外、或解析到项目 Git 目录内的条目是违规，并会报告属于哪一种情况。损坏的 Markdown 条目无论位于类别文件夹之下何处都会被报出；类别文件夹或生命周期根处的已声明伴随文件条目在无法读取时会被报出。其他不可读条目像源侧遍历器一样被忽略。 | 源侧的 Markdown glob 跟随符号链接的生命周期文件夹与符号链接的记录文件，但不跟随符号链接的类别文件夹；跟随类别文件夹是面向通用领域的目标扩展，静默跳过会藏起一个损坏的单元。包含性让这棵树留在读取归档基线所用的工作树内。 | 停止跟随类别文件夹，或把它们作为交接报出。 |
| R25 | 伴随后缀是扁平的：已声明的伴随文件本身不能作为单元源，嵌套的伴随记录（一个伴随文件的记录）不受支持。Markdown 伴随文件按源侧大小写敏感的 `.md` 规则做元数据检查。归档会拦下作为单元源的伴随文件；活跃检查只在类别文件夹与生命周期根深度配对，不拦下嵌套配对。当一个已声明后缀以另一个结尾时（例如 `.yaml` 与 `.i18n.yaml`），最长声明后缀匹配文件，所以声明顺序永远不会改变结果。 | 源侧固定三件套没有嵌套；扁平模型是目标裁定，确定性的最长匹配让扩展后缀集与参数顺序无关，且不新增嵌套机制。 | 引入嵌套单元模型，或不接受重叠声明。 |
| R26 | `notes.mjs init` 一次性初始化笔记树：创建三个生命周期文件夹及其六个类别文件夹、六个归档类别文件夹，并在空文件夹中创建 `.gitkeep` 占位文件；它是幂等的，绝不覆盖已有文件，也不创建 manifest 或任何 `AGENTS.md`。门禁忽略 `.gitkeep` 占位文件，它们绝不进入归档 manifest。 | 一次初始化避免了零散的设置，并让六个目录的归档要求可以在 Git 中表达；create-vs-update 让采用方的新增内容保持安全。 | 移除 `init`、改变其布局，或停止忽略占位文件。 |
| R27 | 在验证模式下，当 manifest 列出产物时，门禁要求 manifest 路径在项目中被 Git 跟踪（已暂存或已提交）；`--write` 与空 manifest 豁免。首次封印流程是：封印、暂存或提交归档，然后验证。 | 上游允许未受跟踪的首次封印相对空基线通过验证；跟踪 manifest 让验证保持有意义，并拦下一个 manifest 尚未进入分支的未受跟踪伪造视图。能暂存或提交 manifest 的本地行为者在信任模型之内（R28），不是门禁必须检测的布局。 | 移除该检查，或收紧为只检查 HEAD。 |
| R28 | 信任模型是被陈述出来的，而不是机械化的：验证信任工作树、Git index 与项目的分支历史；能伪造 `.git` 布局或重写历史的本地行为者在保证之外，项目的 CI 与受保护历史才是锚点。 | 源侧的信任模型相同；把它陈述出来让门禁的范围保持诚实，并避免一个机制并不需要的本地对抗性沙箱。 | 加入对抗性布局检测。 |
| R29 | 技能 description 承担触发：在非平凡变更前使用它，判断该变更是否需要持久决策记录，以及生命周期动作。上游常驻的范围句——只为持久决策理由写、机械或局部编辑豁免——留在技能正文。 | 采用方项目没有上游根 AGENTS 的常驻规则，因此只有生命周期动作的 description 不会在变更前加载技能；在 description 中重复范围又会把技能选择与正文拥有的规则混为一谈。 | 把范围句移回 description，或去掉变更前触发。 |

## 要求锚点

每条被锻造的要求都在可用的最精确层级上有一个锚点。机械锚点由命令决定；判断锚点点名指南并记录一个结论；未验证项在 § 未验证项 中携带其理由。

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
| 11 | 封印时的归档元数据：implemented 状态、恰好一行正文 `Status:`、每个 Markdown 侧一行 `Archived:`、不早于记录的有效日期、各侧同一个日期；验证不重新验证冻结元数据 | 机械 | gate `unitErrors`（在 `--write` 下）；测试 “archive rejects archive metadata without the Archived line”、“archive requires one identical Archived date across Markdown sides”、“archive rejects an invalid or predating archive date”、“archive seals a unit whose fenced example shows a status line”、“archive --write rejects two prose Status lines” |
| 12 | 只在封印时检查已声明伴随文件的完整性 | 机械 | gate `unitErrors`（在 `--write` 下）；测试 “archive enforces declared companion completeness”、“archive requires declared companions for a newly sealed unit”、“archive accepts historical units when the declared companion set grows” |
| 13 | 已封印单元不能新增产物（封印时相对基线检查） | 机械 | gate `unitErrors`（在 `--write` 下）；测试 “archive --write rejects an artifact added to a sealed unit against the baseline” |
| 14 | manifest schema 与哈希形式 | 机械 | gate `parseManifest`；测试 “archive --write seals a unit and the sealed archive verifies”、“archive rejects an unsupported manifest schema”、“archive rejects a malformed manifest hash” |
| 15 | 已封印产物存在且未变；没有未封印新增；相对基线仅追加 | 机械 | gate `extendManifest` / `readBaseline`；测试 “archive rejects a changed sealed artifact”、“archive rejects a manifest entry removed against the baseline”、“archive rejects a sealed artifact that is missing” |
| 16 | 验证比对 manifest，不重放当前声明，也不重新验证冻结历史 | 机械 | gate `archiveCommand`；测试 “archive accepts historical units when the declared companion set grows” |
| 17 | 非空 manifest 在验证前必须受 Git 跟踪；未受跟踪的伪造视图被拦下 | 机械 | gate `archiveCommand` `git ls-files`；测试 “archive verification requires the manifest tracked by Git”、“archive rejects a fabricated view whose manifest stays untracked” |
| 18 | 根位于项目内、在项目 Git 目录之外，归档位于同一个绝对 Git 目录；真实 checkout（包括 linked worktree）可以工作 | 机械 | gate `archiveCommand` / `walkActiveTree` / `initCommand`；测试 “check rejects a symlinked notes root that resolves outside the project”、“archive rejects an archive root symlink that resolves outside the project”、“init rejects a root symlink that resolves outside the project”、“init rejects a root symlink that resolves into the project Git directory”、“init rejects a notes root inside a nested Git checkout”、“archive accepts a linked worktree as the project checkout” |
| 19 | 检查失败时封印不写入任何东西；重新封印是空操作；退出码与 `--json`；选项可发现 | 机械 | gate `archiveCommand`；测试 “archive --write writes nothing when a check fails”、“archive --write is a no-op when nothing changed”、“usage errors exit 2 and --json reports the summary”、“--help exits 0 and prints usage” |
| 20 | 用 `--base-ref` 指定可信外部基线 | 机械 | 测试 “archive reads a trusted external baseline with --base-ref”；`AC` § Frozen guarantee |
| 21 | 空活跃树与空已封印归档的行为 | 机械 | 测试 “check passes an empty active tree with a zero count”、“archive passes an empty sealed archive with a zero count”、“archive --write writes nothing when a check fails” |
| 22 | 最长已声明后缀胜出，与声明顺序无关；Markdown 元数据大小写敏感 | 机械 | gate `companionSuffixOf`；测试 “archive matches the longest declared companion suffix regardless of order”、“archive treats Markdown metadata case-sensitively”；R25 |
| 23 | 何时写一份记录；取代审计 | 判断 | `NC` § When to write one；变更记录每一次匹配及其结果 |
| 24 | 保留/归档/删除/否决的分类与校准 | 判断 | `AC` § What enters；交接报告为每份记录记录一个结果 |
| 25 | 完全合并保留每一个独有命题；部分取代保持交叉链接 | 判断 | `NC` § When to write one；变更记录被保留的条目与交叉链接 |
| 26 | 功能移除时的合并条件 | 判断 | `NC` § When to write one；变更记录缺失证据 |
| 27 | 入站链接修复与有意的历史引用 | 判断 | `AC` § The archival change；项目自己的链接检查加变更记录 |
| 28 | 归档资格是语义判断，不是机械判断 | 判断 | `AC` § What enters；交接报告记录决定与临界案例 |
| 29 | 停下并交接的条件 | 判断 | `SK` § Stop and hand over；交接点名阻断条件与可撤销的选项 |
| 30 | 上游语料兼容性 | 机械 | § 验证：346 份活跃记录 + 692 个伴随文件用 `--root .agents/notes` 通过 `check`；2,772 件归档产物在没有伴随文件声明的情况下通过 `archive`，且上游可选的 `archived/AGENTS.md` 被接受并忽略 |
| 31 | 译文/一致性记录的伴随文件一致性 | 未验证 | 委托给项目自己的配对门禁；本技能不运行内容检查（R2） |
| 32 | 在没有外部基线的情况下，检测一次隐藏已封印编辑的强推重写 | 未验证 | 上游机制也没有这种证明；可信的 `--base-ref` 属于项目的 CI（R11、R28） |
| 33 | 选择性翻译（部分记录翻译，部分不翻译） | 未验证 | 活跃树允许这样做；封印时完整性只适用于新封印单元，选择性归档单元是项目偏离（R2） |
| 34 | 早于格式日期的语料的导入路径 | 判断 | `NC` § Alternatives considered；采用方传入 `--format-adopted`，门禁只接受日期早于它的记录（R3） |
| 35 | 本次锻造逐轮评审的结论 | 判断 | § 评审；每一轮记录快照提交、评审者的结论与发现；冻结的 sha256 值留在评审报告中，而不是本记录中 |
| 36 | 归档被排除在文档门禁之外，包括出站链接，且不是当前行为的权威 | 判断 | `AC` 引言；项目自己的文档门禁配置 |
| 37 | 候选正文派生自上游来源，而不是采用方的笔记树 | 判断 | § 来源与修订；重新推导与 § 验证 中的限定范围扫描；上游根指令文件作为触发措辞的来源被纳入 |

## 验证

重设计后的候选：行为快照 b5b9bfc；此后只改文档、测试与配对；本快照在 description 触发改动与第 25 轮之后，2026-10-27。除点名了不同目录外，命令都从仓库根运行。

| 检查 | 命令 | 结果 |
|---|---|---|
| 技能规范门禁 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/dsh-spec-agent-notes` | 14 项检查，0 项失败；123 行，约 4,973 tokens；description 837 个字符；compatibility 117 个字符 |
| 随附门禁构建 | `pnpm run skill:build -- dsh-spec-agent-notes` | 从 `package/dsh-spec-agent-notes/notes.ts` 构建一个包；38,121 字节，gzip 后 9,634 字节；单个自包含 ES module，无运行时依赖 |
| 门禁语法 | `node --check .agents/dsh-spec-skill-forge/dsh-spec-agent-notes/scripts/notes.mjs` | 退出码 0 |
| 门禁测试套件 | `node --test tests/agent-notes.test.ts` | 82 个测试，82 个通过，0 个失败 |
| 仓库测试套件 | `pnpm test` | 194 个测试，194 个通过，0 个失败 |
| 上游活跃语料 | `cd /tmp/dsh-latest && node <skill-dir>/scripts/notes.mjs check --root .agents/notes --companion .zh.md --companion .i18n.yaml --format-adopted 2026-07-05` | `ok check — 346 note(s) and 692 companion(s) checked`，退出码 0 |
| 上游归档语料 | `cd /tmp/dsh-latest && node <skill-dir>/scripts/notes.mjs archive --root .agents/notes` | `ok archive — 2,772 frozen artifact(s) checked`，退出码 0；验证不依赖声明；上游可选的 `archived/AGENTS.md` 被接受并忽略 |
| 来源扫描 | 候选：SKILL.md 与两个约定文件；上游范围：.agents/、scripts/，以及根 AGENTS.md 与 CLAUDE.md；采用方范围：采用方笔记树，排除本记录、其配对与冻结归档；归一化如 § 来源与修订 所记；连续的 5-gram 与 6-gram | 在两个范围里，SKILL.md、notes-contract.md 与 archive-contract.md 都没有仅采用方的 shingle |
| 模拟发布 | 把不含 `*.zh.md`/`*.i18n.yaml` 的工作目录复制到名为 `dsh-spec-agent-notes` 的目录；在那里运行技能门禁 | 14 项检查，0 项失败；只剩 SKILL.md、两个参考文件与 scripts/notes.mjs；没有配对残留 |
| 记录格式 | `node skills/dsh-spec-agent-notes/scripts/notes.mjs check --companion .zh.md --companion .i18n.yaml` | `ok check — 30 note(s) and 60 companion(s) checked`，退出码 0；四个配对在此快照中全部最新并已重新记录 |
| Init 与默认根 | 在一个全新的 Git 项目上运行 `init`，然后运行 `check` 与 `archive --write` | 在没有先前树的项目里创建 48 个骨架项；第二次 `init` 报告已初始化并保留采用方文件；占位文件只出现在空类别文件夹；空 check 与空已封印归档退出码 0；默认根是 `.agents/dsh-spec-agent-notes` |
| Init 包含性 | 用指向 .git 之外/之内的根符号链接、指向 .git 之外/之内的生命周期、归档或类别文件夹符号链接、悬空的根符号链接，以及一个非目录障碍运行 `init` | 每一项都带违规退出码 1；失败的预验证不写入任何东西；init 覆盖它创建的笔记/归档树（包括嵌套 Git checkout 内的记录根），check 覆盖它遍历的活跃条目，archive 覆盖归档根的 Git 放置 |
| 仅 manifest 验证 | 一个声明后来增长的历史已封印单元；一次已提交但无元数据的封印；一次带围栏示例 Status 行的封印 | 历史单元原样通过验证；验证比对 manifest，不重放声明，也不重新验证冻结元数据；围栏示例在封印时不会被算作第二个 status |
| 封印时检查 | 一个没有 Archived 元数据的新单元；一个带两行正文 Status 的新单元；一个缺少已声明伴随文件的新单元；相对可信基线向已封印单元添加一件产物；一个后缀不再被声明的冻结非 Markdown 伴随文件，随后是一个新单元 | 每一次被拦下的封印都带违规退出码 1，且不写 manifest；新单元在后缀被丢弃后的封印退出码 0 |
| 受跟踪 manifest 与伪造视图 | 封印一个单元，在暂存前验证，然后暂存并验证；一个不跟踪 manifest 就封印的嵌套 gitfile 视图 | 未受跟踪时 `manifest: ... is not tracked by Git`，退出码 1；已暂存和已提交的验证退出码 0；未受跟踪视图以同一条消息失败（R27） |
| 首次封印与 bare 仓库 | 一个没有提交的项目；一个作为项目根的 bare 仓库 | `cannot read baseline "HEAD"`，退出码 1；`bare Git repository with no worktree`，退出码 1；两者都记录为交接 |
| 不可读条目 | 一个 chmod-000 的记录与一个 chmod-000 的归档记录 | `unreadable note` / `unreadable file` 违规，退出码 1，没有堆栈跟踪 |
| Checkout 布局与历史 | 把 linked worktree 作为项目 checkout；一个在后来声明增长之前已提交的已封印单元 | 两者验证都退出码 0；历史单元不会按新后缀集重放（R2、R23） |
| 格式 | `pnpm run format:check` | 所有匹配文件都使用正确格式，退出码 0 |
| 提交尾注 | `node scripts/verify-dco.ts --base=8921e45 --head=HEAD` | 范围内的每个提交都带有指明其作者的 Signed-off-by，退出码 0 |
| 译文配对 | `node skills/dsh-spec-skill-forge/scripts/forge.mjs review dsh-spec-agent-notes --forge .agents/dsh-spec-skill-forge --check`；`node scripts/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check <record> --root .` | 技能配对经锻造记录最新；记录配对经管理器一致；结构签名比较器报告四个配对的标题、表格、列表、代码围栏与链接相等。工作目录配对使用锻造的 `source_sha` 格式，所以管理器的仓库范围清单按格式把这三个报告为不同步；`publish` 在落地前移除它们 |
| 工作树状态 | 本次提交前的 `git status --short` | 重设计文件是唯一的改动 |

上游语料是保真度证据：重设计后的门禁接受整个上游活跃树与归档，没有任何目标专属例外，且归档验证不需要伴随文件声明。82 个 fixture 逐一检验这套模型：树与格式；伴随文件配对与生命周期根伴随文件；畸形头部与围栏示例；被跟随和被破坏的符号链接，以及 checkout 之外或 Git 目录之内的条目；默认根与非默认根；Git 作为前提，bare 仓库作为交接；init 创建、幂等、空文件夹占位文件、通过符号链接的包含性、悬空链接与非目录障碍，以及预验证失败后不写入；六个必需的归档目录与可选策略文件；封印时归档元数据与围栏 status 示例；封印时伴随文件完整性与不向已封印单元相对可信基线添加产物；manifest schema、畸形哈希、已封印内容、未封印新增与仅追加基线；历史单元的仅 manifest 验证，不依赖声明；封印时被丢弃的 Markdown 与非 Markdown 后缀，包括在封印时拦下一件新的未声明非 Markdown 产物；manifest 受跟踪规则与未受跟踪的伪造视图；首次提交前缺失基线；包含性与 linked-worktree checkout；空树与失败写入；可信基线标志；最长后缀匹配与大小写敏感的 Markdown 元数据；不可读记录与产物；help 命令。四个配对在此快照中全部最新；最终门禁会在它们之上重跑。

## 评审

第 21 轮（快照 `36b8f1d`，重设计后的候选）由两名独立的只读评审者评审；两人都验证了快照并返回 *needs revision*。评审者 A（上游保真度）发现一个 BLOCKER——`init` 的包含性是词法的，所以一个符号链接的根会在 checkout 之外或项目 Git 目录内写入 48 项——以及若干 MAJOR：约定/记录声称类别定义未变，而其中两个已被改写；SKILL 命令表声称验证会检查归档元数据，而元数据只在封印时检查；还有两行处置仍在描述重设计之前的根与六目录决定。评审者 B（通用领域适配与门禁正确性）发现同一个 BLOCKER、同一个验证范围 MAJOR，以及关于手工编辑 manifest/新增伴随文件通过验证和锚点声明缺少自动化用例的 MAJOR。两人都列出次要问题：记录中陈旧的 `test` 归属与逐字节相同范围、陈旧的“两条命令”措辞、误导性的诊断、不可读文件系统条目导致崩溃、非空文件夹中的占位文件、没有提交的首次封印、逃出 checkout 的符号链接条目，以及缺失的 fixture。`e4befdf` 中的修复处理了阻断项与类别定义、验证范围和处置发现以及可操作的次要问题；测试套件从 49 个用例增长到 68 个。第 22 轮随后发现加强后的验证与“验证只比对 manifest”的人工决定冲突，所以那项改动被回退。

第 22 轮（快照 `8d6e18d`）由同样的两名独立评审者重新评审；快照通过验证。评审者 A 返回 *needs revision*：仍有一个 BLOCKER，因为 `init` 只解析根路径，仍会通过已有树内符号链接的生命周期、归档或类别文件夹写入；还有一个 MAJOR，因为记录仍把验证描述为仅 manifest，而代码重新检查元数据并需要封印时的声明，这与人工裁定相反。评审者 B 返回 *accept*，没有阻断项或主要问题，另有六个次要问题：同一类 init 写入穿透、围栏 `Status:` 示例在封印时被算作第二个 status、Markdown 伴随文件声明措辞、关于验证的记录精度、一条误导性的诊断路径，以及缺失的骨架符号链接 fixture。本次提交修复了 BLOCKER 与次要问题，恢复仅 manifest 验证以遵循人工决定（只在封印时检查元数据与完整性），对齐每一份约定、裁定、锚点与证据行，并把测试套件增长到 74 个用例。第 23 轮重新评审这个快照。

第 23 轮（快照 `11a16fc`）由同样的两名评审者重新评审。评审者 A 返回 *accept*，没有阻断项或主要问题，另有七个次要问题；评审者 B 返回 *needs revision*，带一个 MAJOR：`archive --write` 仍按当前声明分类每一件冻结产物，所以一个后缀被丢弃的历史非 Markdown 伴随文件会让之后每一次封印都失败（声明它，新单元就要求它；省略它，冻结历史就报错）。它的次要问题覆盖：init 只给一条诊断、Git 目录条目消息、通用领域示例硬编码本仓库的语言配对、USAGE 文本、风险清单漏掉元数据偏离、类别之外与生命周期/归档进入 Git 的 init 用例覆盖，以及矛盾的信任措辞。本次提交通过跳过后缀不再被声明的冻结产物、同时仍拦下新的未声明非 Markdown 产物来修复 MAJOR，补上缺失的 fixture，让 init 对每个障碍给一条诊断并拦下嵌套 Git checkout 内的记录根，区分 Git 目录条目消息，在示例中使用 `--companion <suffix>`，对齐 USAGE 与信任正文，记录元数据偏离与手工添加 manifest 的后果，并把测试套件增长到 81 个用例。第 24 轮重新评审这个快照。

第 24 轮（快照 `b5b9bfc`）由同样的两名评审者重新评审。两人都返回 *accept*，没有阻断项，也没有主要问题。评审者 A 列出次要的信任/证据措辞与种子期 fixture 清单；评审者 B 列出次要的信任文档、活跃条目 Git 目录措辞、陈旧的验证标题、约定与锚点中缺失的丢弃声明规则，以及两处证据描述。本次提交只把可操作的次要问题作为文档、约定与 fixture 改动来应用：约定陈述丢弃声明规则，信任措辞区分本地植入的 manifest 与通过评审提交的 manifest，验证标题与证据描述与已接受的快照一致，测试套件增长到 82 个用例。行为与已接受的 b5b9bfc 相同；最终中文配对在本次提交中重新生成，候选等待人工评审。

第 25 轮（快照 `67468f8`）评审了 description 触发改动：description 现在要求 agent 在非平凡变更前使用本技能，判断是否需要持久记录，并不再重复写入范围或豁免；正文保留上游范围句；R29、设置、验证指标与配对都已更新。两名评审者都返回 *accept*，没有阻断项或主要问题。他们的次要问题都是记录精度（交接部分的指标、记录格式行中陈旧的配对句、评审轮次与交接措辞），不改变行为；本次提交关闭这些问题。没有落地任何东西。

下面的评审日志覆盖重设计之前的候选，并作为历史保留。

第 1 轮（快照 `ac80c1c`）由两名独立的只读评审者按冻结哈希评审；两人都验证了快照并返回 *needs revision*。

- **评审者 A（上游保真度与覆盖）：** BLOCKER——归档验证器没有强制单元每一个 Markdown 侧都携带相同的 `Archived:` 日期（上游 `archived-agent-notes.ts:169–174` 是这么做的）。MAJOR——源侧用于语义分类的证据清单缺失（A3）；`rewrite stale facts in place; do not append change history` 缺失（N58）；四段候选文字是从采用方自己的笔记树逐字搬来的，而不是从上游重新推导（bug-fix 定义、格式理由、归档理由、INDEX 理由）；门禁新增了没有裁定的文件名日历校验与类别目录严格性。MINOR——命令路径、文档门禁条款（N24）、当前文档条款（N61）、A6 误分类示例、对被否决提案的显式报告（A18）、manifest 示例中的源语料路径、G16 依据、测试缺口，以及伴随文件完整性主张的范围。
- **评审者 B（通用领域适配与门禁正确性）：** MAJOR——同一个归档日期相等性（报告为 M1）。MINOR——记录的命令路径、没有裁定的 `--json` 接口、源侧遍历器接受的根级译文被拦下、一个路径包含前缀测试（`..notes`），以及一条省略封印命令的未封印产物消息。范围挑战：空语料行为、委托出去的伴随记录一致性、基线信任模型，以及全新归档的前提。

第 2 轮（快照 `a401946`）由两名独立的只读评审者评审；两人都验证了快照并返回 *needs revision*。第 1 轮的阻断项、A3、N58、M4 与点名的次要问题被确认关闭。两人都发现 M3 仍然开放：格式引言句、豁免句与引言三句组仍是仅采用方，且记录夸大了修正。评审者 A 补充了记录的 `Gate syntax` 工作目录、R20/不写入/未封印/`..notes` 的测试覆盖，以及 `<skill-dir>` 句子；评审者 B 补充了一个通过的生命周期根孤儿伴随文件（一次第 2 轮回归）、关于空未知类别目录与“有效日期”的约定夸大、一项没有裁定的归档根包含性检查，以及不准确的 R20 源侧一致性依据。

第 3 轮（快照 `62dbd27`）由两名独立的只读评审者评审；两人都验证了快照并返回 *needs revision*。评审者 A 确认点名的三处第 2 轮文字在 README 加十个文件的范围内关闭，随后发现记录更宽泛的“两棵树”来源主张为假：一个引言从句与一条采用方笔记共享一个 6-gram。评审者 B 确认第 2 轮发现除非 Markdown 生命周期根伴随文件外均已关闭，并发现一个 MAJOR：R22 的包含性是词法的，所以一个符号链接的根或归档目录可以在基线为空的情况下把 manifest 写到项目之外。两人都列出记录准确性的次要问题（G5、一个陈旧的评审请求、一处 R14 交叉引用、来源主张范围）和两处源保真度次要问题（simplification 定义丢了 `code`；否决删除规则丢了入站链接修复）。

第 4 轮（快照 `1cba965`）由两名独立的只读评审者评审；两人都验证了快照并返回 *needs revision*。第 3 轮点名的逃逸、伴随文件与源保真度修复、G5、陈旧的评审请求、R14 交叉引用、R22 测试以及两个 5/6 来源范围都被确认关闭。两人都发现同一类的新 MAJOR：项目内的符号链接归档根，或嵌套 Git 仓库中的记录根，通过了包含性检查，而项目的 Git 基线保持为空，于是一个被改写的已封印产物与 manifest 通过了验证。评审者 B 还发现活跃门禁的符号链接处理出现回归（一个符号链接的生命周期根以零记录误通过；一个符号链接的记录文件崩溃）。两人都列出记录残留：4-gram 主张、G5 的范围、A1/N12 处置，以及锚点 26 的哈希措辞。

第 5 轮（快照 `a0aa1f4`）由两名独立的只读评审者评审。评审者 B 验证了快照并返回 *accept*：第 4 轮全部七项发现关闭，没有阻断项或主要问题，另有四个次要问题（一个损坏的符号链接被静默跳过、扁平伴随文件的嵌套边界、一处停止条件文本不匹配，以及关于类别文件夹一致性与测试覆盖的记录主张）。评审者 A 验证了快照并返回 *needs revision*：第 4 轮的活跃符号链接 MAJOR 关闭，但归档基线 MAJOR 没有——嵌套或外部仓库可以设置 `core.worktree` 或 `--separate-git-dir`，使其 toplevel 报告项目根，从而通过 toplevel 身份检查，而基线却从项目自己的仓库读取（对该归档而言为空）。评审者 A 还列出：来源措辞、R23 的“任意深度”、N57a 未携带的根指令条款、两个不存在的章节归属、锚点 33 的证据范围、N24 缺失的 `update`，以及一处测试计数措辞残留。

第 6 轮（快照 `6d5f357`）由两名独立的只读评审者评审；两人都验证了快照，且都没发现阻断项。评审者 A 返回 *accept*：第 5 轮发现关闭，带三个次要问题（`AC § Verifying` 标签、两处损坏条目报告缺口，以及空来源门禁的措辞）。评审者 B 返回 *needs revision*：第 5 轮的身份修复对嵌套与外部仓库是正确的，但同一仓库在记录根处的 linked worktree 通过了共同目录检查，并验证了一个被篡改的封印；它还发现没有限定范围的伴随文件约定、一次与目录配对的伴随文件，以及陈旧的章节标签。两名评审者还都提出 R25 归档/单元范围的措辞。

第 7 轮（快照 `ce309c3`）由两名独立的只读评审者评审；两人都验证了快照，都没发现阻断项，且都针对同一个主要问题返回 *needs revision*：记录根处一个带 per-worktree `core.worktree` 的 linked worktree 会让 `--show-toplevel` 报告项目根，于是共同目录与 toplevel 检查都通过，而项目的基线保持为空，一个被篡改的封印通过验证（判别项是 Git 目录与整个 checkout 的基线）。两人还发现 linked-worktree 正文过宽（一个本身就是 linked worktree 的项目会被正确接受）、第 6 轮结论清单漏掉 R25 一项，以及更深伴随文件的措辞过宽（一个悬空的更深伴随文件会被报出）。

第 8 轮（快照 `4c6641f`）由两名独立的只读评审者评审；两人都验证了快照，并针对同一个主要问题返回 *needs revision*：同一仓库的另一个 worktree 视图（记录根处一个指向项目 Git 目录的 `.git` 文件或 `.git` 目录符号链接）共享项目的绝对 Git 目录，但有不同的 worktree toplevel，所以项目的基线保持为空，一个被篡改的封印通过验证。两人还发现更深非 Markdown 伴随文件的措辞过宽、记录中两行陈旧的机制（Git 共同目录，以及一句符号链接/worktree 交接）、以及稀疏克隆范围的措辞。

第 9 轮回应这些：身份要求归档根的绝对 Git 目录与其 worktree toplevel 都属于项目自己，所以嵌套 worktree 视图是一次交接，并带 `.git` 文件与 `.git` 符号链接的回归测试；更深伴随文件正文限定在配对深度；两行记录被更正；来源范围（b）点名稀疏克隆的 checkout；测试从 50 增长到 52。

第 9 轮（快照 `531b00b`）由两名独立的只读评审者评审。评审者 A 返回 *accept*：第 8 轮的嵌套视图 MAJOR 由代码、测试与一次复现的攻击关闭；仍有三处记录精度的次要问题（R23 的范围从句、验证来源的措辞，以及锚点 11 转述的测试名）。评审者 B 返回 *needs revision*：第 8 轮发现在项目根调用下关闭，但从嵌套 `.git` 视图内部运行的命令会让该视图成为检测到的项目根，于是双重身份检查通过，而基线相对外层仓库解析，一个被篡改的封印通过验证；R23 的范围从句是同一处记录次要问题。评审者 A 还记录工作树符号链接替换为一条受路径约束的基线限制，供记录陈述。

第 10 轮回应这些：检测到的项目根必须是已注册的 Git worktree，所以 cwd 捕获的 gitfile 视图是一次交接，并带回归测试；R23 的范围从句与约定和门禁一致；验证来源行点名稀疏克隆的 checkout；锚点 11 引用精确的测试名；工作树路径限制被记录为未验证；测试从 52 增长到 53。

第 10 轮（快照 `28be2fc`）由两名独立的只读评审者评审；两人都验证了快照并返回 *needs revision*，没有阻断项：cwd gitfile 视图攻击关闭，第 9 轮的记录次要问题关闭，但新的已注册 worktree 要求误拦了正当布局，因为对有分离 Git 目录的项目和 submodule checkout，`git worktree list` 报告的是 Git 目录而不是 checkout。评审者 A 还发现 SKILL 的句子夸大了两条命令都会拦下 gitfile 视图，两人都指出两处精度问题（身份证据行的消息与稀疏 checkout 的文件计数）。

第 11 轮（快照 `1017e43`）由两名独立的只读评审者评审；两人都验证了快照，并针对同一个主要问题返回 *needs revision*：项目根的 `.git` 是符号链接时会绕过 gitfile 检查，因为 `statSync` 跟随符号链接，所以另一个 worktree 的视图可以封印并验证一个被篡改的归档。两人还发现记录残留：§ 来源 的来源计数、验收测试计数（新增了两个，不是三个）与陈旧 fixture 计数；一名评审者还记录：笔记约定把归档日期行放在 status 上方，而门禁要求紧贴其下方，且评审日志没有记录该项。

第 12 轮回应这些：gitfile 判别器使用 `lstatSync`，所以指向另一个 worktree 的 Git 目录或指向 linked-worktree gitdir 的 `.git` 符号链接是一次交接，并带两个回归测试；笔记约定把归档日期行紧贴在 status 下方；记录计数被更正（5,047 个具名树文件加 46 个根文件；新增两个验收测试，加上原有的 linked-worktree 验收；57 个 fixture）；linked-worktree 验收测试也运行验证那一半。

第 12 轮（快照 `cf30e3b`）由两名独立的只读评审者评审；两人都验证了快照，并针对一种残留形态返回 *needs revision*：目标的 `.git` 符号链接是一个普通 gitfile 时仍会绕过判别器，因为 lstat 分支返回 gitfile 路径，而不是解析其 `gitdir:` 行；另一个 worktree 的视图封印并验证了一个被篡改的归档。两人还发现身份证据行的计数/清单与测试不匹配，以及评审日志中第 12 轮的句子过宽。

第 13 轮回应这些：目标的 `.git` 符号链接是普通文件时，在判别器之前通过其 `gitdir:` 行解析，并带一个回归测试（共 58 个）；身份证据行列出拦下的类别，不带陈旧计数，并正确点名两条消息；评审日志记录第 11 轮的归档日期项与本次修复。

第 13 轮（快照 `dd350e6`）由两名独立的只读评审者评审；两人都验证了起始快照，并在第 14 轮工作开始后报告漂移，所以他们的发现针对冻结快照：两人都返回 *needs revision*。一人发现，一个符号链接的 `.git` 指向 `gitdir:` 为相对路径的 gitfile 时仍会绕过判别器（Git 从项目根解析它，门禁却从 gitfile 的目录解析），且不可读的符号链接 gitfile 会抛出未捕获的读取错误；另一人发现，一个正当的 linked-worktree checkout 其 `.git` 符号链接到自己的 gitfile 时被误拦，另有一处评审日志措辞错误。两人都发现面向 agent 的正文夸大了在分离 Git 目录信任边界处的拦截范围，一人发现 Settings 行误述了第 12 轮评审者数量。

第 14 轮回应这些：相对的 `gitdir:` 值从项目根解析，完全像 Git 解析它们那样，并带一个在旧门禁上封印、在新门禁上拦下的回归测试；不可读 gitfile 作为违规报出，而不是堆栈跟踪；`.git` 符号链接到自己 gitfile 的 linked-worktree checkout 被接受（封印、验证、篡改被抓）；面向 agent 的正文点名手工构造的第二个 gitfile 信任边界；第 11 轮的评审日志条目记录约定缺陷本身；Settings 行与第 12 轮结论一致。测试从 58 增长到 60。

第 14 轮（快照 `0cce537`）由两名独立的只读评审者评审；两人都验证了快照并返回 *needs revision*。评审者 A 没有发现阻断项或主要问题：第 13 轮的机制发现关闭并验证，剩余项是正文限定（SKILL 仍点名 gitfile 视图却没有“另一个 worktree”）、信任边界句子的范围、Settings 行对第 12/13 轮的归属、评审日志缺失的第 13 轮结论，以及不可读 gitfile 的 fixture 主张。评审者 B 发现一个主要问题：bare 仓库，以及点名它的 `.git` 文件或符号链接，通过了 worktree 检查，因为项目与归档的 toplevel 都未定义，所以比较为空，归档封印并验证了一个被篡改的单元；它还报告了 Settings 行归属、不可读 gitfile 的测试缺口、缺失的第 13 轮结论，以及一个范围挑战：指向另一个 checkout、而该 checkout 自己的 `.git` 条目也是符号链接的 `.git` 符号链接仍然封印成功。

第 15 轮回应这些：当项目或归档根没有 worktree toplevel 时，归档身份检查失败关闭，所以 bare 仓库与点名它的 `.git` 都是交接；视图也可以从目标 Git 目录的父 checkout 条目以及点名它的同级 checkout 识别，所以另一个 checkout 的 Git 目录视图是一次交接，而记录下来的信任边界收窄为 checkout 条目在别处或已不存在的 Git 目录；SKILL 与约定正文点名“另一个 worktree”与收窄后的边界；Settings 行按评审日志归属第 12/13/14 轮的发现；第 13 轮结论被记录；不可读 gitfile 的行为限定在评审验证，而不是 fixture。测试从 60 增长到 64。

第 15 轮（快照 `ca0a1e0`）由两名独立的只读评审者评审；两人都验证了快照。评审者 B 返回 *needs revision*，带两个主要问题：同级扫描返回第一个匹配条目，所以目录名排在 checkout 之前的视图被接受，而正当的 checkout 被拦下，且 Git 目录父目录之外的 checkout 完全找不到；它还发现 Settings 行的第 13 轮归属，以及 checkout 扫描器没有解析符号链接的 gitfile。评审者 A 在第 16 轮工作开始后返回一次漂移停下；针对冻结快照，它报告同一判别类的两种形态（一个同级 checkout 的 `.git` 是指向 gitfile 的符号链接时未被识别，以及第一个匹配顺序让视图排在 checkout 之前）、Settings 行归属、过宽的 bare 仓库条款，以及上游来源路径与本仓库同路径安装副本之间的歧义。bare 仓库主要问题与链式符号链接形态关闭并验证，每一种普通且被接受的布局都封印、验证并抓住篡改。

第 16 轮回应这些：同级扫描收集每一个匹配条目，任何除项目根之外的匹配都会让布局成为一次交接，所以结果不再依赖目录名顺序；checkout 扫描器像 gitfile 检测器一样解析符号链接的 gitfile，这也关闭了评审者 A 报告的两种冻结快照形态；约定陈述实测的检测半径（目标 Git 目录的父目录与同级 checkout 条目，两个或更多条目被视为歧义布局）与收窄后的信任边界（checkout 条目在别处或已不存在）；Settings 行归属与评审日志一致。测试从 64 增长到 66，包括一个与顺序无关的视图、一个歧义布局，以及一个符号链接的 checkout gitfile。

第 16 轮（快照 `71a2d5d`）由两名独立的只读评审者评审；两人都验证了快照。评审者 A 只在次要问题上返回 *needs revision*：信任边界句子里仍点名 bare 仓库，尽管门禁拦下它；Settings 行混淆了第 14/15 轮的归属；上游来源路径与同路径的安装副本需要区分；评审者 B 也返回一次漂移停下；针对冻结快照，它没有发现阻断项或主要问题，确认第 15 轮发现关闭，并指出重复的 R22 陈述与漂移本身。

第 17 轮回应这些：SKILL 与归档约定说明，没有 worktree 的仓库（以及点名它的 gitfile）是一次交接，而不是信任边界；Settings 行按评审日志归属每一轮的发现；§ 来源 清单把这些路径标为上游 checkout 路径，以区别于本仓库的安装副本。

第 17 轮（快照 `0c9f906`）由两名独立的只读评审者评审；两人都验证了快照。评审者 A 返回 *needs revision*：项目把 `core.worktree` 设为项目根，让记录根处的嵌套 `.git` 视图通过双重身份检查，所以一个已封印单元可以被隐藏或改写，而归档仍然通过验证；它还发现 R22 两次陈述 bare 仓库规则、Settings 行与交接行同评审日志矛盾，以及第 16 轮机制改动其余部分通过。评审者 B 只在次要问题上返回 *needs revision*：没有阻断项或主要问题，第 16 轮机制改动通过了它的顺序、歧义与符号链接 fixture，但 Settings 行与交接行仍错误归属轮次，且重叠的伴随后缀依赖顺序，因为单元扫描使用声明清单的第一个匹配；它还发现点名 bare 仓库的 `.git` gitfile 在测试与身份行中缺失，以及风险行声称门禁只实现源侧的检查。

第 18 轮回应这些：归档检查遍历项目根与归档根之间的每一个目录并拦下嵌套 `.git` 条目，所以 `core.worktree` 欺骗不再到达身份比较，并带一个回归测试；重叠的已声明伴随后缀现在最长优先匹配，所以声明顺序不能改变单元，并带一个双顺序测试；R22 被改写为单条陈述，覆盖已注册 worktree、worktree-gitdir 反向链接、父与同级 checkout 条目、嵌套 `.git` 条目、bare 仓库、普通布局与记录下来的信任边界；Settings 行与交接行按评审日志归属每一轮；新增交换名称的同级测试；测试从 66 增长到 70。

第 18 轮（快照 `bde5148`）由两名独立的只读评审者评审；两人都验证了快照。评审者 B 返回 *accept*：第 17 轮每一项发现都以复现的证据关闭（嵌套 `.git` 遍历作为判别器、R22 作为单条陈述、Settings/交接对齐、两种声明顺序以及更深重叠下的最长后缀伴随文件匹配、bare-gitfile 测试与风险措辞），没有阻断项或主要问题，另有两处测试证据的次要问题（伴随文件测试的 `check` 那一半在没有活跃记录的树上运行，嵌套视图测试名说“archive root”，而其 `.git` 位于记录根）。评审者 A 针对一个新主要问题返回 *needs revision*：在项目设置 `core.worktree` 的情况下，`--root .git/notes` 把归档根放进项目自己的 Git 目录，在那里 manifest 无法提交，所以一个已封印单元可以被隐藏或改写，而 `archive` 仍然通过验证；它还发现 R25 丢了大小写不敏感 Markdown 条款并使用了“重叠作为前缀”的措辞，且第 17 轮评审条目漏掉 bare-gitfile 与风险发现。

第 19 轮回应这些：归档检查拦下解析到项目绝对 Git 目录内的根或归档根，并带一个回归测试；伴随文件测试在两种声明顺序下配对一条活跃树记录；嵌套视图测试以其构建的记录根命名；R25 恢复被丢弃的条款，并在不带前缀措辞的情况下陈述最长后缀规则；第 17 轮评审条目记录其余评审者 B 的发现。测试从 70 增长到 71。

第 19 轮（快照 `dca8649`）由两名独立的只读评审者评审；两人都验证了快照。评审者 B 返回 *accept*：归档根在 Git 目录内的主要问题关闭，第 18 轮的封印在第 18 轮门禁上复现；第 18 轮每一项次要问题都以复现的证据关闭，且没有阻断项或主要问题残留；五个残留项是正文/测试/记录精度——面向 agent 的约定缺少 Git 目录规则、检查的归档根那一半没有回归测试、证据行仍引用改名后的测试并漏掉新消息、诊断点名记录根而不是有问题的归档根，以及“已提交的移动是一次交接”的夸大。评审者 A 也返回 *accept*：第 18 轮每一项发现都以复现的证据关闭，没有阻断项或主要问题残留，四个残留项是记录/正文精度（锚点 31 陈旧的测试名、面向 agent 的约定缺少 Git 目录条款、身份行的消息清单，以及记录精度残留）。

第 20 轮回应这些：SKILL 与归档约定陈述 Git 目录排除；拆分后的诊断点名有问题的根或归档根；一个回归测试把归档根符号链接驱动进 Git 目录；锚点 31 点名改名后的嵌套视图测试与新的归档根测试；身份行列出 `inside the project's Git directory` 消息；受路径约束的条目把已提交的移动改写为一次带评审交接的首次封印。测试从 71 增长到 72。

第 20 轮是停下步骤：第 19 轮的两名评审者都返回 *accept*，没有阻断项或主要问题，所以循环的停止条件已满足；这个停下提交关闭残留的精度项，加入中文评审配对及其记录，并运行最终门禁。候选等待人工评审；没有任何东西被发布、刷新或落地。

## 未验证项

- Git 是前提（R11）：没有 Git 的项目会被告知安装 Git 并初始化/提交；没有非 Git 归档模式，所以活跃约定也在非 Git 目录处停下，而不是发明一个不受版本控制的根。
- 冻结保证信任基线：一次同时改写 manifest 的强推重写，在没有外部可信 `--base-ref` 的情况下无法检测；这与源侧机制一致（R11、R28）。
- 伴随文件一致性（译文或伴随记录内容）委托给项目自己的配对门禁；本技能绝不检查它。记录用英语为 agent 而写；译文是供人阅读的可选伴随文件（R2、R14）。
- 归档只在封印新单元时强制伴随文件完整性与归档元数据（R2、R23）。验证比对 manifest，所以后来新增的已声明后缀与历史元数据缺陷都不会被重放到冻结单元上。这是对上游验证器的有意偏离，后者每次运行都会重新检查其固定三件套与元数据；通过项目评审与 CI 提交的 manifest 是可信基线，而本地植入或未受跟踪的 manifest 在所述信任边界之外（R28）。
- 要求六个归档类别目录，`init` 用被忽略的 `.gitkeep` 占位文件创建它们；不要求 `archived/AGENTS.md`，因为归档规则归技能所有，不过允许并忽略一个同名的可选文件（R5、R6）。这去掉了上游前提，同时保留目录骨架，并让上游归档语料保持可加载。
- 分类是语义的：通用领域的 agent 把自己的工作映射到上游六个类别上，门禁无法检查这种映射是否有意义。对模型语义的依赖正是类别名称保持上游的原因（R18）。
- 当 manifest 列出产物时，验证要求它受 Git 跟踪（R27）。这是一项目标加固：本地首次封印必须在验证前暂存或提交，而 `--write` 与空 manifest 仍然豁免。它是对未受跟踪伪造视图的一项廉价防护；能暂存或提交 manifest 的本地行为者在信任模型之内（R28），这一限制被记录下来，而不是用布局检测来回答。
- 残留的本地布局信任边界是被陈述出来的，而不是检测出来的（R28）：能伪造 `.git` 布局、在正确的项目相对路径植入 manifest 而不通过评审提交、或重写历史的本地行为者在保证之外；一个评审/CI 已接受为基线的手工添加 manifest 条目是项目自己的决定。项目的 CI 与受保护历史是锚点，而仅 manifest 验证把封印时元数据与伴随文件检查留给 `--write`。受路径约束的基线来自同一边界：归档根的一次已提交移动是一次评审交接，而本地工作树移动在模型之外。
- 活跃检查像源侧 Markdown glob 一样跟随符号链接的生命周期文件夹与记录文件，作为目标扩展跟随符号链接的类别文件夹（R24），并报出损坏的 Markdown 条目（位于记录路径、更深处或未知类别文件夹下）或配对层级不可读的已声明伴随文件，而不是跳过它。
- 伴随后缀是扁平的（R25）：按译文各自的记录，或作为单元源的伴随文件，都不受支持；重叠声明由最长后缀解析，所以声明顺序不能改变结果。
- 来源修正在四轮中从上游文件重新推导了八段文字；两个限定范围的 5/6-gram 扫描都是干净的，但评审者仍会对照来源检查修正后的正文（锚点 30）。
- 上游模型行为一致性（agent 在非软件领域是否真的遵循分类与修剪判断）在这里无法机械测试；类别映射是一项假设，采用方自己的语料是证据。
- 请求排除把本仓库自己的笔记相关技能与更早的锻造记录读作来源。对 `.agents/dsh-spec/notes` 的文件名扫描会找到其他技能的更早锻造记录与抽取记录；它们的主体未被读取，所以本提案在语料层面的取代是维护者评审事项，而不是这里作出的主张。
- 中文评审配对在最终停下时是最新的；其保真度是人工评审事项，配对记录证明的是时效性，不是质量（R14）。工作目录中的配对不带语言切换行，因为 `publish` 会移除它们，且落地的技能不得链接到它们。
- TypeScript 包被打包成单个自包含、无运行时依赖的 ES module；打包产物的大小在停下时记录。仓库测试位于 `tests/` 下，不随技能发布（R12、R13）。

## 交接

- 已落地：`skills/dsh-spec-agent-notes/` 与 `.agents/skills/dsh-spec-agent-notes/`；工作目录已发布并移除，分支已压缩为一个中文提交，并 fast-forward 合并进 `refactor/dsh-skills`。
- 记录：本笔记，现在位于新记录根的 `implemented/process/` 下。
- 重设计（第 20 轮停下之后）：人工简化了设计——Git 作为前提、以技能命名的默认根且归档在其中、声明式的封印时伴随文件完整性与仅 manifest 验证、带被忽略占位文件的 `init` 命令、上游类别不变、轻量的锚定 checkout 的身份加 manifest 受跟踪检查，以及一个测试在本仓库的 TypeScript 包。P0 记录决定；P1/P2/P3 实现行为并重写测试（`569b536`），P4 把脚本移到它的包（`dec7d79`），P5 刷新本记录与证据（`36b8f1d`），随后在第 24 轮接受之后做一次最终的 description 触发改动。第 21 轮两名评审者都返回 *needs revision*；`e4befdf` 处理了阻断项、主要问题与可操作的次要问题。第 22 轮返回一个 *needs revision*（init 写入穿透与验证范围不匹配）和一个带次要问题的 *accept*；下一个提交预验证每一条 init 骨架路径，并恢复仅 manifest 验证以遵循人工决定。第 23 轮返回一个带次要问题的 *accept* 和一个针对封印时声明陷阱的 *needs revision*；`b5b9bfc` 修复了它和可操作的次要问题。第 24 轮两名评审者都返回 *accept*，没有阻断项，也没有主要问题。第 25 轮随后评审 description 触发改动，两人都返回 *accept*，没有阻断项或主要问题。本次提交带上 description 触发、R29、837 字符指标与重新记录后的配对，并等待人工评审。没有落地任何东西。
- 轮次：第 1 轮（`ac80c1c`，两者都是 *needs revision*）→ 第 2 轮（`a401946`，两者都是 *needs revision*：M3 残留加次要问题）→ 第 3 轮（`62dbd27`，两者都是 *needs revision*：M3 范围加一个包含性主要问题）→ 第 4 轮（`1cba965`，两者都是 *needs revision*：resolved-baseline 与 active-symlink 主要问题）→ 第 5 轮（`a0aa1f4`，一个 accept 带次要问题，一个 *needs revision*：repository-identity 绕过）→ 第 6 轮（`6d5f357`，一个 accept 带次要问题，一个 *needs revision*：linked-worktree 身份）→ 第 7 轮（`ce309c3`，两者都是 *needs revision*：per-worktree core.worktree 欺骗）→ 第 8 轮（`4c6641f`，两者都是 *needs revision*：嵌套 worktree 视图）→ 第 9 轮（`531b00b`，一个 accept 带记录次要问题，一个 *needs revision*：cwd gitfile 视图）→ 第 10 轮（`28be2fc`，两者都是 *needs revision*：registered-worktree 误拦）→ 第 11 轮（`1017e43`，两者都是 *needs revision*：.git 符号链接视图）→ 第 12 轮（`cf30e3b`，两者都是 *needs revision*：symlink-to-gitfile 残留）→ 第 13 轮（`dd350e6`，两者都是 *needs revision*：相对 gitdir 与符号链接的 linked-worktree checkout）→ 第 14 轮（`0cce537`，A 在文本/记录次要问题上 *needs revision*，B *needs revision*：bare 仓库与链式符号链接形态）→ 第 15 轮（`ca0a1e0`，A 因漂移停下：first-match 顺序与符号链接 gitfile 形态，B *needs revision*：同级顺序与父目录之外的 checkout）→ 第 16 轮（`71a2d5d`，A 在次要问题上 *needs revision*，B 对冻结快照没有阻断项或主要问题，但因漂移停下）→ 第 17 轮（`0c9f906`，A *needs revision*：嵌套 `.git` 加 `core.worktree` 冻结绕过与记录次要问题，B 在记录/伴随顺序次要问题上 *needs revision*）→ 第 18 轮（`bde5148`，A *needs revision*：归档根在项目 Git 目录内，加 R25/评审日志项，B *accept* 带两个测试次要问题）→ 第 19 轮（`dca8649`，两者都是 *accept*：B 带五个残留精度项，A 带四个）→ 第 20 轮（第一个停下提交：残留更正、中文评审配对与最终门禁）→ 人工评审要求简化 → 重设计 P0（`29193f6`）→ P1/P2/P3（`569b536`）→ P4（`dec7d79`）→ P5（`36b8f1d`：验证证据与记录刷新）→ 第 21 轮（`36b8f1d`，两者都是 *needs revision*：init 包含性阻断项、类别定义、验证范围主张、记录精度）→ 修复（`e4befdf`）→ 第 22 轮（`8d6e18d`，A *needs revision*：init 写入穿透与仅 manifest 不匹配；B *accept* 带次要问题）→ 修复（`11a16fc`）→ 第 23 轮（`11a16fc`，A *accept* 带次要问题，B *needs revision*：封印时声明陷阱）→ 修复（`b5b9bfc`）→ 第 24 轮（`b5b9bfc`，两者都是 *accept*：没有阻断项或主要问题）→ description 触发改动（`67468f8`）→ 第 25 轮（`67468f8`，两者都是 *accept*：没有阻断项或主要问题）→ 本次提交：已接受的次要问题与最终重新记录的配对；等待人工评审；没有落地。
- 落地：发布、刷新、笔记迁移、dsh 基线更新与 fast-forward 合并都已执行；旧笔记机制与归档技能安装已移除。
- 配对格式状态：最新。工作目录配对已被 `publish` 移除；本记录的配对与迁移后笔记的配对带管理器的章节哈希，且都是最新的，管理器检查通过（R14）。
- 重设计之前的检查：技能门禁 14/14（119 行，约 4310 tokens，description 674）；随附测试 72/72；上游语料 346 份记录、692 个伴随文件与 2,772 件产物；两个来源范围干净；记录及其伴随文件通过随附门禁；`forge.mjs review --check` 为绿；`pnpm test` 112/112；`pnpm run format:check` 为绿；DCO 尾注已验证。这些是历史；重设计后的候选在其停下时重新记录它们（P5）。
- 重设计之后的检查：§ 验证——技能门禁 14/14，123 行、约 4,973 tokens（description 837 个字符，compatibility 117）；82 个门禁测试与 194 个仓库测试通过；上游语料报告 346 份记录、692 个伴随文件与 2,772 件产物，在没有伴随文件声明的情况下通过验证；来源扫描报告 0 个仅采用方的 5/6-gram，上游根指令文件在范围内；模拟发布通过门禁，没有配对残留；记录格式门禁报告 30 份记录与 60 个伴随文件；`pnpm run format:check` 与 DCO 范围都为绿。按 R14，中文配对在此停下时是最新的并已检查。
- 中文评审配对：落地技能不携带配对；本记录的配对与迁移后笔记的中文伴随文件都是最新的并已检查。其保真度是人工评审事项；配对记录证明的是时效性，不是质量。

## 后果

- 技能现在从 `skills/dsh-spec-agent-notes/` 以及 `.agents/skills/` 下的安装副本发布；发布移除了工作目录，也从落地副本中移除了中文评审配对。
- 本仓库的决策记录连同中文伴随文件从 `.agents/dsh-spec/notes/` 移到 `.agents/dsh-spec-agent-notes/`，旧笔记机制与 `dsh-archive-agent-notes` 安装被移除。
- 迁移保留了既有笔记的正文与伴随文件；本锻造记录是唯一移动了生命周期的记录，从 `proposed/process` 移到 `implemented/process`。
- 子模块基线从 `dsh-v0.2.1-rc.2` 移到最新发布 tag `dsh-v0.2.1-rc.3`；技能的来源修订未变，因为两个修订之间的笔记配方文件相同。
- 延迟清理：notes 专属的 `scripts/dsh-spec-manager` 模块保留到旧 manager 整体删除时；旧归档技能卸载后它们没有消费者。
- description 现在要求 agent 在非平凡变更前使用本技能；正文承载写入范围与机械/局部豁免，因此加载技能是判断是否需要记录的一部分。
- 40 个提交的锻造分支被压缩为一个中文落地提交，并 fast-forward 合并进 `refactor/dsh-skills`；本记录中的轮次哈希指向压缩前的锻造分支。

## 曾考虑的替代方案

**逐字携带源侧的中文/英语/伴随记录三件套。** 它落败，因为目标受众是通用 agent 使用领域，在那里项目的翻译与一致性策略是它自己的；逐字三件套会强加源仓库的双语惯例，并让归档门禁依赖一种技能并不拥有的伴随记录格式。伴随后缀是等价手段：单元及其完整性保持机械，而一致性被委托出去。

**携带固定的格式采用日期与遗留标记。** 它们落败，因为它们点名源语料历史。通用采用方有自己的采用日期，所以日期变成一个输入，而目标中从未存在过的标记被丢弃；没有该标志，全新的采用没有逃生口。

**携带三个 Figma 封印例外。** 它们落败，因为它们授权对一件源产物做一次性改动；携带它们会凭空发明目标策略。目标不授予任何例外，并把需要的封印变更视为一次交接。

**携带一个更严格的、带 Git 历史取证的冻结门禁（仅合并删除、graft、replace ref、浅克隆检测、逐提交 blob 证明）。** 它落败，因为源机制把保证定义为相对可信基线的仅追加 manifest，而重写历史的信任属于项目的 CI 与受保护分支。加入历史取证会扩展一个上游并不存在的机制，把门禁扩大到超出技能受众所需，并让技能对采用普通 Git 工作流的采用方变得脆弱。

**只交付正文，把所有机械检查委托出去。** 它落败，因为机械检查是上游机制的一部分，而归档冻结只有在被封印并验证时才是证据；面向通用采用方的自包含技能不能假设项目已经有等价的门禁。

**把本仓库已安装的笔记技能保留为设计来源。** 它落败，因为请求排除本仓库的笔记相关技能及其设计，而上游修订才是点名的来源。

**使用 pin 的 `dsh-v0.2.1-rc.2` submodule，而不是抓取最新 tag。** 它落败，因为请求点名最新的上游版本；只读克隆证明约定相同，所以没有引入做法差异。

**去掉语义工作流，只保留门禁。** 它落败，因为机制的价值在于决策实践——何时需要一份记录、什么胜过另一个、何时修剪或归档——而门禁的存在是让这种实践保持诚实，不是取代它。

**保留文件名日历校验与类别目录严格性。** 它们落败，因为源侧遍历器只检查文件名形状，并忽略没有 Markdown 的目录；第 1 轮发现两者都没有裁定，于是移除并排除它们（R21），而不是记录为目标扩展。

**在活跃树中强制伴随文件完整性。** 它落败，因为项目可以选择性翻译；完整性必须成立的场所是归档单元，而活跃树保持宽松（R2）。

**携带采用方的笔记正文。** 它落败，因为请求排除那棵树作为来源；第 1、2 轮找到的七段文字从上游文件重新推导，记录陈述这次修正，而不是声称来源干净。

**从外部记录根自己的仓库读取归档基线。** 它落败，因为目标的基线是项目自己的 Git 历史，且没有指定第二重信任边界；根必须留在项目内，而把笔记放在别处的项目要交接（R22）。

**接受解析到别处的符号链接根或归档目录。** 它落败，因为那样 manifest 就没有可信基线，`--write` 会在项目之外产生效果；规范化包含性是 R22 的廉价实现，回归测试把它钉住。

**拦下每一个符号链接的归档根。** 它落败，因为项目内的符号链接是普通布局，失败的是词法基线路径，而不是符号链接；在同一仓库内按解析后的路径读取基线，保留布局同时恢复保证（R22）。仓库身份是绝对 Git 目录加 worktree toplevel，所以仅仅共享项目 Git 目录的 worktree 视图会被拦下。

**支持嵌套伴随记录。** 它落败，因为上游三件套是扁平的，嵌套会发明一个源侧并未定义的单元模型；门禁拦下作为单元源的伴随文件，而嵌套记录是项目偏离（R25）。

**保留重设计之前的身份层。** 它落败，因为它枚举 Git 布局（已注册 worktree、gitfile 视图、per-worktree `core.worktree`、父与同级 checkout 条目），并消耗了第一个评审循环的大部分；把笔记路径锚定到当前 checkout 再加 manifest 受跟踪检查，用少得多的机制把基线留在同一棵树里（R22、R27）。

**保留上游在每次验证时重放三件套完整性。** 它落败，因为已声明后缀集是目标新增，可能随时间增长；把当前集合重放到冻结历史上会让后来的翻译不编辑已封印单元就无法进行。完整性在封印时强制，验证比对 manifest（R2、R23）。

**在 `init` 中生成一个笔记树 `AGENTS.md` 模板。** 它落败，因为技能的 description 与正文已经带有触发与规则；生成的策略文件会重复它们、漂移，并在更新时被覆盖，违背本仓库的 create-vs-update 规范。

**把门禁测试留在随技能发布的技能里。** 它落败，因为本仓库拥有自己的测试套件，技能应随附它的门禁，而不是它的脚手架（R12）；测试留在 `tests/` 下，并检验工作目录或落地后的脚本。

**让首次停下时的候选保持不变。** 它落败，因为人工评审要求更简单的机制：Git 前提、以技能命名的根、带仅 manifest 验证的声明式伴随文件、已初始化的骨架、不变的类别与仓库原生的打包。重设计记录在上文，旧候选留在历史中。

## 完成

当以下全部成立并完成交接时，锻造就算完成：

1. § 约束处置 中列出的每一条来源约束都恰好有一行处置并带归属，且每一种处置都是 Keep、Adapt、Re-bind 或 Dissolve，并陈述依据。
2. 候选通过技能门禁，0 项检查失败；门禁的仓库测试通过；
3. 重设计之后的新一轮独立只读评审报告没有阻断项或主要问题
4. 通用领域适配被记录为裁定：Git 前提、带固定归档子目录的以技能命名的根、声明式伴随文件、封印时归档完整性、init 骨架、锚定 checkout 的身份加 manifest 受跟踪检查、不变的上游类别集合与 TypeScript 打包；没有裁定，不引入超出源侧的机制。
5. 记录带有读过的页面、命令与输出、未验证项、备选方案与交接；评审摘要是最新的。
6. 在重设计后的停下时，中文评审配对与记录配对是最新的，且 `review --check` 通过；在维护者验收之前，安装副本与 `skills/` 保持未动。
7. 人工评审决定落地；在该决定之前不发布或合并任何东西。
8. 候选的约定正文派生自上游文件：第 1–3 轮的来源发现被更正并记录，§ 验证 中的两个限定范围扫描（上游根指令文件作为来源纳入）在记录的归一化与范围下报告没有仅采用方的 5-gram 或 6-gram。4-gram 重叠是通用措辞或路径 token，其确切列表取决于语料与归一化；它们不被用作证据。

## 风险

- **过度机械化回归。** 重设计之前的门禁长出一层仓库身份，消耗了大部分评审轮次。重设计移除布局枚举：门禁保留规范化包含性、同一 Git 目录锚定与 manifest 受跟踪检查（R22、R27），约定陈述残留信任边界（R28）。要求新增布局检查的评审者在记录中得到回答，而不是靠扩大门禁。
- **归档语义在两处上游适配点和一处加固上偏离源侧。** 伴随文件完整性与归档元数据只在封印新单元时强制（R2、R23），所以验证绝不把它们重放到冻结历史上；`archived/AGENTS.md` 是可选的并被忽略（R6）；非空 manifest 必须受 Git 跟踪（R27）。更强的上游验证器每次运行都会重新检查其固定三件套与元数据，所以这被记录而不是隐藏。第二个后果：在仅 manifest 验证下，本地手工添加的 manifest 条目若给已封印单元一件新产物，会通过验证；封印命令与项目的评审/CI 才是执行点，本地植入的 manifest 在所述信任边界之外（R28）。每一处偏离都被记录并测试；评审者检查它们保护的是同一个冻结角色，而不是削弱它。
- **manifest 受跟踪检查可能制造一种虚假的本地安全感。** 它证明 manifest 在项目的 Git index 中，而不是工作树就是已提交的树；能在正确路径暂存 manifest 的本地行为者在信任模型之内，该模型把历史委托给 CI 与受保护分支（R28）。CI 仍然是锚点。
- **分类依赖模型语义。** 上游六个类别带有软件色彩；通用领域的 agent 必须把自己的决策映射到它们上面。这种映射是一项假设，记录为未验证（R18），采用方自己的语料是证据；无法完成映射的项目是范围挑战，不是机械门禁结果。
- **Git 现在是硬前提。** 没有 Git 的项目不能使用任何命令；缓解措施是清晰的安装/init 说明与约定的 compatibility 行（R11）。这缩小了采用方集合，且是有意为之。
- **对某些采用方而言是部分机制。** 活跃的那一半适用于任何决策领域；归档那一半仍然要求 Git，以及每个已封印单元完整的已声明伴随文件集（R2）。非 Git 项目，或选择性翻译的项目，保留活跃生命周期，但没有完整集合就无法封印单元。这一限制被记录下来，而不是用源侧没有的机制来回答。
- **译文配对在最终停下时是当前的。** 工作目录配对与记录配对在重设计停下时重新生成并检查（R14）；管理器的仓库范围清单仍按格式把工作目录配对报告为不同步，而 `publish` 在落地前移除它们。
- **打包迁移。** 把门禁移到 TypeScript、引入包构建并迁移测试，会改变构建产物，而机制保持不变；缓解措施是在打包提交前做构建一致性检查，并在工作目录与落地副本两边运行技能门禁。打包产物必须保持为单个自包含、无运行时依赖的 ES module。
- **语料漂移。** 上游语料验收是一次记录的运行，不是自动化测试；后来的源修订可能让某项格式假设失效。缓解措施是在未来的门禁改动之前，对 pin 的 submodule 重跑语料检查。
- **脚本维护。** 随附脚本及其仓库测试套件比正文更难维护；缓解措施是脚本只镜像一层小而具名的门禁表面，身份不变量很少，且测试位于仓库测试套件中，而不是随技能发布的技能里。
- **回滚点。** 没有落地任何东西：把分支重置到 `8921e45` 并移除工作目录，就能回滚分支提交与工作目录；`skills/`、`.agents/skills/` 与 `submodules/dsh` 未动，所以不需要修复安装状态或上游 pin。

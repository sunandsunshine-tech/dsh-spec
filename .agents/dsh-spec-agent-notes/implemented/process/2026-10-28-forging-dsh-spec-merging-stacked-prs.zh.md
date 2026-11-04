# Agent Note: 从上游 stacked-PR 落地技能锻造 dsh-spec-merging-stacked-prs

Status: implemented

[English](2026-10-28-forging-dsh-spec-merging-stacked-prs.md) | 中文

## 问题

本技能集合没有技能拥有落地一串相互依赖的 GitHub pull request 的工作。一个被要求落地 A ← B ← C（其中每个 pull request 都基于它下面那个）的 agent，必须在两种做法之间选择：靠手工合并并重定向各层来复现栈语义，或使用 GitHub 原生的 stacked-PR 特性——后者拥有栈级规则、CI、顺序、重定向与合并状态。上游 `dsh` 为这个选择携带了一个技能，`dsh-merging-stacked-prs`，但它是为那个仓库的约定写的：它指向上游根 `AGENTS.md` 以获取允许的历史，指向一张上游 cookbook 页面以获取评审修复的传播，并把合并方法固定为一个旗标。

来源边界是明确的：上游技能是唯一的内容来源，此外还有请求与目标领域的事实（GitHub pull request 操作与已安装的 `gh stack` 扩展）。本仓库现有的文档——它的 `AGENTS.md`、它的 norms 目录、它的决策记录及其约定——不是设计来源，因为它们是被移除或重写的仓库内容，而不是交付技能必须承载的行为。目标受众是操作 GitHub pull request 的 agent，交付物是一套通用的 GitHub PR（Pull Request）操作技能，而不是某个仓库落地策略的副本。

## 决策

`dsh-spec-merging-stacked-prs` 以上游的单文件形态从 `skills/dsh-spec-merging-stacked-prs/` 交付。它锻造自 `.agents/skills/dsh-merging-stacked-prs`，来源是 pin 的 `submodules/dsh` 基线。

落地的技能是 `skills/dsh-spec-merging-stacked-prs/`：`SKILL.md` 加技能根的 `THIRD_PARTY_NOTICES`，frontmatter 的 `license` 字段点名它，因为文本改编自上游技能。它在 `.agents/skills/dsh-spec-merging-stacked-prs/` 的安装副本与之逐字节一致。锻造工作目录已被发布并移除；停步的评审草稿由 `publish` 移除。该技能不随附脚本、包源或仓库测试文件：来源自己的只读 `gh` 与 GraphQL 命令按原样内联承载（R11）。

机制就是上游机制，未作改动：官方的 GitHub stack 对象是成员资格权威；一条符合条件的同作者链——未入栈，或某个既有栈中保序的子集——以增量方式被链接；原生级联 rebase 与增量 merge-forward 是两种刷新历史；合并通过 `gh stack merge` 进行，绝不通过逐个 pull request 的 `gh pr merge` 加重定向；选择整个栈或一个显式限定的前缀；每个选中的 pull request 必须在删除分支之前报告 `MERGED`，而删除是单独的最后一轮。改编如下：

1. **名称与触发语言。** 目标名是请求的 `dsh-spec-merging-stacked-prs`；description 保留来源的触发词汇与要求含义，并追加中文触发语言。来源固定的 `master` 在正文中变成仓库的默认分支（R4）。
2. **上游文档指针。** 根 `AGENTS.md` 指针与 cookbook 页面被处置而非承载：历史规则重绑到落地仓库自己的指令（R10），评审修复的传播被消解，因为它在技能范围之外，改写后重新审计的检查作为接管的规则保留。
3. **合并方法。** 来源固定的 `--merge` 被重绑：合并方法是落地仓库的策略（R5）。技能采用其指令规定或 GitHub 合并设置点名的那个方法，两者都没有时回退到 `merge`。
4. **没有合并授权门。** 来源没有把合并挡在人类回答之后，来源边界中也没有任何东西增加这样一道门；早先的逐 pull request 授权被消解（R8）。来源自己的询问保留：对冲突或意外栈条目的用户指示，作者不同或不可用时询问，以及在本地／远程分歧时取消。
5. **已核验的 CLI（命令行界面）表面。** 已安装的 `gh stack` 0.1.1 提供来源所假定的命令与旗标——`link --base`、`checkout`、`sync`、`rebase`、`push`、`merge --yes --merge/--squash/--rebase`——并且没有 `--delete-branch`。两个已核验的行为塑造了文本：`gh stack link` 的分支参数会被推送且可以创建 pull request，而一个匹配不到任何 pull request 的数字参数会被当作分支名，因此链接命令使用 pull request URL（R1）；并且落地的技能只链接开放的 pull request，遇到已关闭或已合并的条目时停下并询问（R9）。
6. **符合性证据。** 来源要求每个选中的 pull request 符合仓库的评审与检查要求。该证据从同一份元数据中读取：`mergeStateStatus` 不是 `CLEAN`（包括仍在计算的 `UNKNOWN`），或 `reviewDecision` 为 `CHANGES_REQUESTED`，都是阻塞项（R2）。
7. **部分落地。** 部分落地之后，技能重新查询官方栈，把已经报告 `MERGED` 的层视为已落地，并校验剩余 PR 仍按预期顺序链接、且目标为 trunk 或它下面的那一层（R3）。
8. **交付。** frontmatter 增加可选的 `compatibility` 字段，说明技能所需的运行时。中文评审草稿只在停步时创建并配对；本记录已带有中文对侧与一致性记录。

维护者评审了工作，并于 2026-10-28 授权落地。落地把工作目录发布进 `skills/`，刷新安装副本，增加技能根 `THIRD_PARTY_NOTICES` 与 `license` 字段，更新 `AGENTS.md` 与根 `THIRD_PARTY_NOTICES.md`，把本记录移到 `implemented/`，并把锻造分支 squash 合并到本地的 `refactor/dsh-skills` 上；没有推送。

### 首次停步后的范围修正

首次停步之后有两处修正，本记录是两者的解决：

1. **来源边界。** 第一版设计从本仓库的文档中取得了逐 pull request 的合并授权与合并方法／历史策略。请求随后把来源边界固定为仅上游技能，并排除仓库内容，因此授权被消解（R8），合并方法被重绑到落地仓库的策略（R5），历史规则被重绑，同时恢复来源的「评审后允许」从句（R10）。移交不再更新仓库文档，记录也不再引用任何仓库规范或决策记录作为设计来源。
2. **交付形态。** 修正后的设计仍随附一个只读审计脚本及其包源与离线测试。评审时驾驶员判定该形态对一个失败需要 agent 判断的流程来说太僵硬，于是改选上游的单文件形态。该脚本、`package/dsh-spec-merging-stacked-prs/` 与 `tests/merging-stacked-prs.test.ts` 被移除；来源的 GraphQL 查询、元数据命令与 `gh` 流程按来源所写的样子内联承载。这是一项刻意的交付裁决（R11），不是被丢弃的要求：确切的决定仍由 agent 运行的命令做出。

更早的审计与评审接受覆盖的是更早的形态；这个单文件版本在停步前被重新审计与重新评审。

### 设置

| 设置 | 值 | 依据 |
|---|---|---|
| 技能名 | `dsh-spec-merging-stacked-prs` | 请求 |
| 交付语言 | 英文 | 锻造默认值；请求的评审语言是中文 |
| 评审语言 | 中文；评审草稿只在停步时创建并配对，中文在前，交付语言作为它的附加触发语言 | 请求；R6 |
| 附加触发语言 | 中文，追加到交付 description | 评审语言不同于交付语言 |
| 目标受众与领域 | 操作 GitHub pull request 的 agent：落地一条依赖栈，或合并一个 base 是另一个开放 pull request 分支的 pull request | 请求 |
| description 触发 | 来源的：落地一串相互依赖的 GitHub pull request、base 是另一个开放 pull request 分支的 pull request、「stacked PRs」、「PR stack」、「dependent PRs」、按序合并若干相关 pull request；外加中文触发语言 | 来源 description |
| 合并方法 | 落地仓库的指令或 GitHub 合并设置所规定的方法；两者都没有时为 `merge` | 来源的固定值重绑到仓库策略；R5 |
| 运行时 | 带官方 `gh stack` 扩展并能访问 GitHub 的 GitHub CLI；每个 head 分支都在同一仓库 | 来源与目标领域 |
| 随附脚本 | 无；来源的 `gh` 与 GraphQL 命令内联承载 | R11 |
| 候选 | `.agents/dsh-spec-skill-forge/dsh-spec-merging-stacked-prs/` | 锻造流程 |
| 分支与基线 | `forge/dsh-spec-merging-stacked-prs`，rebase 到 `refactor/dsh-skills` 的 `f1a68d0` | 请求与 worktree |
| 需要评审 | 是，在停步时 | 请求 |
| 落地 | 于 2026-10-28 执行：发布到 `skills/`、刷新安装副本、记录移到 `implemented/`、分支在本地 squash 合并 | 请求与维护者的授权 |
| 记录 | 本文件位于 `.agents/dsh-spec-agent-notes/proposed/process/2026-10-28-forging-dsh-spec-merging-stacked-prs.md`；技能交付时，它随已实现的骨架一起移到 `implemented/` | 请求；R7 |

### 来源与修订

上游来源：本仓库 pin 的 `submodules/dsh`，提交 `1f81c047fc48fa190a683e469daa699857e9afe8`（`dsh-v0.2.1-rc.3`），文件 `.agents/skills/dsh-merging-stacked-prs/SKILL.md`，127 行，读取于 2026-10-28。该文件是技能唯一的内容来源。子模块未被 fetch、编辑或检出。

作为目标的交付机制、而非内容来源读取：当前的 `skills/dsh-spec-skill-forge/` 与 `skills/dsh-spec-agent-notes/`（结构与门禁）、锻造与笔记脚本、已安装的 `dsh-translate-docs` 技能（其整篇文档路径产出停步评审草稿），以及 `scripts/dsh-spec-manager/` 下的项目配对门禁。本仓库没有任何文档提供技能规则。

对目标环境的只读核验，2026-10-28：`gh --version` 报告 2.103.2；`gh stack --version` 报告 0.1.1；`gh auth status` 报告一个已登录账户；`gh stack <command> --help` 确认了 § 提案 中的命令与旗标；`gh pr view 73 --json` 返回来源的字段列表，包括 `statusCheckRollup`；对同一 pull request 的 GraphQL 查询返回 `stackEntry`/`stack` 形状（未入栈的探针为 null）；`gh pr list --state open --base <branch> --json number` 返回列表；`gh repo view --json nameWithOwner,defaultBranchRef` 可解析。没有改动任何远程 GitHub 状态。

2026-10-28 在线读取的 Agent Skills 页面，写技能之前：

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/using-scripts.md`

每一页都可读；未使用锻造技能的离线回退。

### 约束处置

处置使用锻造技能的取值：**保留（Keep）** 在语言与版式调整下承载原措辞与含义；**改编（Adapt）** 实例化一个目标值；**重绑（Re-bind）** 把已消失的指涉抽象到其目的并找到目标等价物；**消解（Dissolve）** 记录指涉已消失以及由什么检查接管。目标落点：`SK` = 工作目录的 `SKILL.md`。

| # | 来源 | 约束 | 处置 | 落点 | 依据 |
|---|---|---|---|---|---|
| S1 | frontmatter `name` | 技能按落地动作命名。 | 改编 | SK frontmatter | 请求命名 `dsh-spec-merging-stacked-prs` |
| S2 | frontmatter `description` | 在落地一串相互依赖的 PR（A ← B ← C）、合并一个 base 是另一个开放 PR 分支的 PR，或请求提到「stacked PRs」「PR stack」「dependent PRs」或按序合并相关 PR 时使用；每条同仓库链在落地前都必须使用 GitHub 官方的 stacked-PR 特性，好让 GitHub 拥有栈级规则、CI、顺序、重定向与合并状态；该链落地到 master。 | 改编 | SK frontmatter | 保留触发词汇与要求含义；来源的 `master` 变成仓库的默认分支（R4）；增加中文触发语言 |
| S3 | intro | 通过 GitHub 原生 stack 对象与 `gh stack merge` 落地相互依赖的 PR；不要靠合并并重定向单个 PR 来复现栈语义。 | 保留 | SK intro | 来源机制 |
| S4 | intro | 根 `AGENTS.md` 拥有允许的 merge-forward 与 rebase 历史。 | 重绑 | SK intro, § Refresh | 该指涉是上游仓库文档；目的是历史策略属于被落地的仓库，因此它变成落地仓库自己的指令（其 `AGENTS.md` 或等价物）（R10） |
| S5 | intro | 栈评审指南拥有评审修复的传播。 | 消解 | SK intro, § Refresh | 该指南不是目标的一部分；接管的检查是重新审计规则：任何 head 改写之后，重新获取 head 并重新审计讨论串、批准、可合并性与检查 |
| S6 | § Require native stack support | 在改动 GitHub 状态之前运行 `gh stack --version`；扩展或服务器端特性不可用时硬停车；不要回退到手工合并与重定向。 | 保留 | SK § Require native stack support | 已核验：`gh stack version 0.1.1` 存在 |
| S7 | § Require native stack support | GitHub 栈要求每个 head 分支都在同一仓库；跨 fork 的链硬停车。 | 保留 | SK § Require native stack support | 同一限制成立 |
| S8 | § Require native stack support | 使用干净的专用 worktree。 | 保留 | SK § Require native stack support | 未变 |
| S9 | § Require native stack support | 获取当前的 PR 元数据与确切的 head OID，而不是相信分支名或更早的报告；点名的 `gh pr view --json` 字段列表就是元数据集合。 | 保留 | SK § Require native stack support | 字段列表按来源点名的样子内联承载；实机 `gh pr view 73 --json` 确认了它 |
| S10 | § stack membership | 对每条看似成立的链中至少一个 PR 查询 `PullRequest.stack` 与 `stackEntry.position`；这个官方对象——而非仅靠 base 分支推断——才是栈成员资格的权威。 | 保留 | SK § Find the official stack | GraphQL 查询内联承载；实机内省确认了字段 |
| S11 | § stack membership | 对 `entries` 分页：当 `size` 超过返回页时。 | 保留 | SK § Find the official stack | 内联查询携带 `pageInfo`，文本点名 `after` 参数 |
| S12 | § stack membership | 从实机 PR 的 base 建立预期的自底向上顺序：最底层目标为 trunk，每个更高的 PR 目标为紧挨它下面的 head 分支。 | 保留 | SK § Find the official stack | 未变 |
| S13 | § Link missing stack members | 把既有条目与预期链比较；一个保序的子集可以被链接；多个栈、意外条目或冲突顺序需要用户指示，之后才能做任何变更。 | 保留 | SK § Link missing stack members | 未变 |
| S14 | § Link missing stack members | 逐一精确比较每个 `author.login`。 | 保留 | SK § Link missing stack members | 未变 |
| S15 | § Link missing stack members | 当所有作者一致时，按自底向上顺序用 `gh stack link --base <trunk> <bottom-pr> ... <top-pr>` 自动链接该链。 | 改编 | SK § Link missing stack members | 命令与 `--base` 已确认；命令使用 pull request URL，因为分支参数会被推送，而数字匹配不到时会被当作分支名（R1） |
| S16 | § Link missing stack members | 当作者不同或任一作者不可用时，在改动 GitHub 状态之前询问用户。 | 保留 | SK § Link missing stack members | 未变 |
| S17 | § Link missing stack members | 重新查询并要求一个栈编号、预期 trunk、完整 PR 集合，以及预期的位置与 base 链。 | 保留 | SK § Link missing stack members | 重新查询就是同一条内联 GraphQL 查询 |
| S18 | § Link missing stack members | 绝不自动解散、重排或重建既有栈；链接是增量的，而已合并或已排队的条目不能被解除栈。 | 改编 | SK § Link missing stack members | 增量的规则被保留；`gh stack unstack --help` 确认已排队／自动合并的条目保持入栈，而已合并条目的主张未验证，因此目标文本陈述停止规则而不是该主张 |
| S19 | § Refresh only when needed | 不要仅因为存在刷新机制就改写分支；当实机合并状态或仓库规则需要更新后的 trunk 时才刷新。 | 保留 | SK § Refresh only when needed | 未变 |
| S20 | § Refresh only when needed | 原生级联 rebase：当本地尚未跟踪时用 `gh stack checkout <pr-or-stack>` 检出远程栈，然后运行 `gh stack sync`；它可能在本地校验之前 rebase 并 lease 保护地 force-push 每一个活跃层；检查被改写的范围，为每个受影响层运行检查，并且在它们通过之前不要合并或声称就绪。 | 保留 | SK § Refresh only when needed | `gh stack sync --help` 确认 fetch、级联 rebase 与原子 force-with-lease push |
| S21 | § Refresh only when needed | 同步冲突时使用 `gh stack rebase`，解决并校验，然后用 `gh stack push` 发布。 | 保留 | SK § Refresh only when needed | 两条命令都确认 |
| S22 | § Refresh only when needed | 当本地与远程的栈组成分歧时，取消并询问，而不是删除或重建远程栈。 | 保留 | SK § Refresh only when needed | 非交互式分歧会中止而不推送 |
| S23 | § Refresh only when needed | 增量 merge-forward：把 trunk 合入受影响的底层分支，自底向上把每个更新后的父层传播进它的子层，正常推送；当 base 前进时保留进行中的检查点。 | 保留 | SK § Refresh only when needed | 未变 |
| S24 | § Refresh only when needed | 任何历史改写都在评审后允许，但它会使提交 OID 假设失效；推送后重新获取确切 head，并重新审计讨论串、批准、可合并性与检查；绝不使用原始 `--force`，也绝不覆盖一个并发前进的 head。 | 重绑 | SK § Refresh only when needed | 「允许」是目标仓库的策略：在落地仓库的指令允许处，改写可在评审后进行；OID、重新审计与 force 规则保留（R10） |
| S25 | § Preflight the merge range | 合并之前立即重新查询官方栈；要求每个选中的 PR 开放、非草稿、顺序正确，并符合仓库的评审与检查要求。 | 改编 | SK § Preflight the merge range | 符合性从同一份元数据中的 `mergeStateStatus` 与 `reviewDecision` 读取（R2） |
| S26 | § Preflight the merge range | 独立对待每个 PR 的状态。 | 保留 | SK § Preflight the merge range | 未变 |
| S27 | § Preflight the merge range | 「落地整个栈」选择整个栈；部分落地需要一个显式的边界 PR，并包含从底层到它的每一层。 | 保留 | SK § Preflight the merge range | 未变 |
| S28 | § Merge through the stack API | 用 `--merge` 按官方栈编号合并整个栈。 | 重绑 | SK § Merge | 方法属于仓库策略（R5）；栈编号形式保留 |
| S29 | § Merge through the stack API | 对显式的部分落地，通过边界 PR 用 `--merge` 合并。 | 重绑 | SK § Merge | 同 S28 |
| S30 | § Merge through the stack API | 不要传 `--delete-branch`、不要手工重定向依赖项、不要发出逐 PR 合并命令；GitHub 自底向上合并该范围并重定向／rebase 剩余上层；直接栈合并是全有或全无；合并队列可能把该范围分成若干组落地。 | 保留 | SK § Merge | `gh stack merge --help` 确认全有或全无的范围、队列行为与没有 `--delete-branch` |
| S31 | § Merge through the stack API | 不要绕过合并要求；阻塞项通过拥有它的 PR 解决或被报告；绝不回退到 `gh pr merge`。 | 保留 | SK § Merge | 未变 |
| S33 | § Verify the landed state | 等待每个选中的 PR 报告 `MERGED`；排队中的请求不是已完成的落地。 | 保留 | SK § Verify the landed state | 未变 |
| S34 | § Verify the landed state | 部分落地之后，重新查询官方栈，校验剩余 PR 仍按预期顺序链接并目标为 trunk 或下面那一层，并重新检查 head、评审状态与 CI。 | 改编 | SK § Verify the landed state | 已报告 `MERGED` 的层被视为已落地（R3） |
| S35 | § Verify the landed state | 只在 PR 报告 `MERGED` 之后单独的最后一遍删除分支；删除每个分支之前，要求没有开放 PR 把它当作 base（`gh pr list --state open --base <branch> --json number --jq length` 报告 0）；0 以外的任何值都阻止删除。 | 保留 | SK § Verify the landed state | 未变 |
| S36 | § Checklist | 清单覆盖原生支持、一个官方栈、被改写层的校验、通过 `gh stack merge` 提交、`MERGED` 校验与删除安全。 | 改编 | SK § Checklist | 同样的条目；增加合并方法策略，被移除的授权不被承载 |
| S37 | § stack membership and § Require native stack support | GraphQL 查询与 `gh pr view --json` 列表是 agent 执行的正文。 | 保留 | SK | 按来源所写内联承载，外加来源的分页指令所需的 `pageInfo`/`after`（S11）；没有随附脚本（R11） |
| S38 | § Preflight, § Verify | 成员资格、完整性、顺序、同仓库、开放、非草稿、已合并状态与分支 base 安全性，恰好可由来源点名的命令判定。 | 保留 | SK | agent 运行同样的命令；决定仍由 agent 作出，并遵循来源的停止规则 |
| S39 | § Preflight, § Merge, § Refresh | 评审与检查符合性的回应、历史选择、作者不同时的链接决定、冲突解决。 | 保留 | SK with one named authority each | 元数据提供符合性证据（R2）；回应与其余判断仍是正文 |

第一版设计的 S32 行（采用者授权的追加）随来源边界修正被移除；S31 与 S33 之间的编号空缺是刻意的（R8、§ 首次停步后的范围修正），不是被丢弃的来源约束。

### 裁决

| # | 裁决 | 依据 | 可逆方式 |
|---|---|---|---|
| R1 | 链接命令使用 pull request URL，而不是数字或分支名。 | `gh stack link --help`：分支参数会被推送且可以创建 pull request，而匹配不到任何 pull request 的数字参数会被当作分支名；URL 总能解析为 pull request | 改变命令形式；先解析数字 |
| R2 | 符合性证据是同一份元数据中的 `mergeStateStatus` 与 `reviewDecision`：不等于 `CLEAN`（包括 `UNKNOWN`）的值，或 `CHANGES_REQUESTED`，都是阻塞项。 | 来源要求符合仓库的评审与检查要求；GitHub 报告的状态就是该判定 | 改变证据字段或阻塞集合 |
| R3 | 部分落地之后，已经报告 `MERGED` 的层就是已落地；重新查询并按预期顺序校验剩余范围。 | GitHub 在部分落地之后重定向并 rebase 剩余层；来源要求重新查询并校验剩余层 | 调整规则 |
| R4 | 来源的 `master` 变成仓库的默认分支。 | 一个交付技能不能点名另一个仓库的默认分支 | 无需 |
| R5 | 合并方法是仓库策略；技能使用落地仓库的指令或 GitHub 合并设置所规定的方法，回退到 `merge`。 | 来源的固定值是某个仓库的策略；目标领域有规定 squash 或 rebase 的仓库，而 GitHub 会拒绝仓库不允许的方法 | 回到来源的固定值，或增加一个显式配置输入 |
| R6 | 评审草稿以中文在前，英文作为它的附加触发语言。 | 请求的评审语言与评审草稿规则 | 无需 |
| R7 | 技能交付时，记录随已实现的骨架移到 `implemented/`。 | 请求的记录位置与记录生命周期 | 无需 |
| R8 | 不携带任何合并授权门：技能在一次通过的预检之后运行合并，与来源相同。 | 来源没有这样的约束，而早先的门来自被排除出来源边界的仓库内容；预检与禁止绕过的规则就是守卫 | 增加一个确认步骤作为安全兜底 |
| R9 | 技能只链接开放的 pull request，遇到已关闭或已合并的条目时停下并询问。 | 来源说只有开放的 pull request 才能被链接或落地；只读探针确认一个已关闭的探针存在，但扩展对非开放条目的行为未验证，因此目标陈述安全的停止，而不是机制主张 | 如果支持的非开放路径被验证，修订该规则 |
| R10 | 在落地仓库的指令允许之处，评审后的历史改写是被允许的；它使提交 OID 假设失效，因此推送后重新获取 head 并重新审计讨论串、批准、可合并性与检查；绝不使用原始 `--force`，也绝不覆盖并发前进的远程 head。 | 来源的历史规则被重绑到目标仓库的策略；来源的重新审计与 force 规则被保留 | 让规则无条件，或去掉重新审计 |
| R11 | 不随附脚本：来源中恰好可判定的检查按其自己的 `gh` 与 GraphQL 命令内联承载，由 agent 运行它们。 | 锻造的脚本决定是一项裁决；用户选择了上游的单文件形态而非早先的只读审计脚本，重视 agent 的灵活性与更小的表面，而非脚本稳定的退出类别与离线测试 | 如果判定其一致性值得那些表面，重新引入只读审计脚本 |

### 不随附脚本

锻造技能的 Intent 小节询问被锻造的技能是否需要脚本。本次锻造回答否（R11）：来源是一份单一的正文文件，其要求由 agent 通过 `gh` 与 GraphQL 执行，而用户选择保留该形态。来源点名的恰好可判定的条件——栈成员资格、顺序、base 链、开放／非草稿／符合性、`MERGED`、分支 base 安全性——按其同样的内联命令承载，并在旁边陈述预期结果与停止规则。这放弃了脚本稳定的 JSON／退出契约及其离线测试；它让 agent 自由地重新推导、检查原始输出，并处理脚本没有建模的状态。后果记录在 § 风险。

#

## 验证

落地检查在 squash 提交之前与之后运行；检查日志记录命令与输出。设计审计与两次独立的实现评审在落地之前接受了单文件版本。

| 要求 | 锚点 | 证据 |
|---|---|---|
| `SKILL.md` 符合 Agent Skills 规范与仓库门禁 | 机械 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-merging-stacked-prs`——14 项检查，0 失败；132 行，约 2,804 个 token；description 675、compatibility 137、license 59 |
| 流程被限定在来源机制之内 | 判断 | 一次来源保真度评审把 127 行来源与处置表逐行对照，只发现可归因的差异 |
| 技能可被 agent 使用 | 判断 | 一位独立评审者按元数据／GraphQL 形状走了一遍流程，没有发现死路或缺失命令 |
| description 在正确的请求上触发 | 未验证 | 本次会话没有安装技能的触发 harness；description 复用来源词汇并追加中文 |
| 记录遵循笔记约定 | 机械 | `node skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml`——38 条笔记，76 个伴随文件 |
| 技能的安装副本镜像落地技能 | 机械 | `pnpm run skill:refresh`——`9 skill(s), 0 failed`，含 `dsh-spec-merging-stacked-prs — mirrored 2 file(s)`；`tests/repository-shape.test.ts` 在 `pnpm test` 中 |
| 格式化与仓库套件 | 机械 | `pnpm run format:check`——26 个文件；`pnpm test`——216 个测试，216 通过 |
| 提交范围携带 DCO 签署 | 机械 | `node scripts/verify-dco.ts --base=c61d49c --head=HEAD`——一个已签署提交（落地提交） |
| 落地是本地行为，未推送 | 机械 | `git ls-remote --heads origin refactor/dsh-skills` 仍报告 `609514c`；没有执行推送 |
| 共享树与子模块未被触碰 | 机械 | `git diff --stat c61d49c..HEAD` 只点名落地的文件；`git submodule status` 报告 `1f81c047` |
| 一个真实官方栈被端到端审计 | 未验证 | 创建或变更远程栈在本变更之外；首次真实落地以只读方式校验 |
| 设计审计与独立评审接受 | 判断 | § 设计审计 与 § 实现评审 中记录的裁定 |

### 检查日志

| 检查 | 命令 | 结果 |
|---|---|---|
| 发布 | `node skills/dsh-spec-skill-forge/scripts/forge.mjs publish dsh-spec-merging-stacked-prs --into skills/dsh-spec-merging-stacked-prs --companion .zh.md --companion .i18n.yaml` | 4 个动作，0 失败；工作目录与声明的评审草稿被移除 |
| 安装副本刷新 | `pnpm run skill:refresh` | 9 个技能被镜像，0 失败；`dsh-spec-merging-stacked-prs — mirrored 2 file(s)` |
| 落地技能门禁 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-merging-stacked-prs` | 14 项检查，0 失败；132 行，约 2,804 个 token；description 675、compatibility 137、license 59 |
| 笔记门禁 | `node skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml` | 38 条笔记与 76 个伴随文件已检查 |
| 格式化 | `pnpm run format:check` | 所有匹配文件使用正确格式（26 个文件） |
| 仓库套件 | `pnpm test` | 216 个测试，216 通过，0 失败 |
| 被移除的交付物 | `git ls-files -- package/dsh-spec-merging-stacked-prs tests/merging-stacked-prs.test.ts .agents/dsh-spec-skill-forge/dsh-spec-merging-stacked-prs/scripts` | 无输出；没有技能脚本或测试文件留存 |
| 落地文件 | `find skills/dsh-spec-merging-stacked-prs .agents/skills/dsh-spec-merging-stacked-prs -type f` | 两棵树中都有 `SKILL.md` 与 `THIRD_PARTY_NOTICES`，安装副本逐字节一致 |
| 停步评审草稿配对 | 停步提交上的 `translation-pair write`/`check` 与锻造 `pair` | `1 record(s) written`；`1 named pair(s) consistent`；2 个声明的配对；`publish` 移除了草稿 |
| 分支状态 | `git status --porcelain` | 干净；落地是本地 squash 提交，未推送 |
| 提交签署 | `node scripts/verify-dco.ts --base=c61d49c --head=HEAD` | 一个已签署提交（落地提交）；更早的停步提交也已签署 |

用技能携带的命令做只读探针，没有改动状态：

| 命令 | 观察结果 |
|---|---|
| `gh stack --version` | `gh stack version 0.1.1` |
| `gh pr view 73 --json number,author,baseRefName,baseRefOid,headRefName,headRefOid,isCrossRepository,state,isDraft,reviewDecision,mergeStateStatus,statusCheckRollup` | 来源的字段列表被返回；探针 pull request 是 `CLOSED`、草稿、`mergeStateStatus: BLOCKED` |
| 对 pull request 73 的内联 GraphQL 查询 | `stackEntry: null`、`stack: null`——流程所预期的未入栈形状 |
| `gh pr list --state open --base main --json number --jq length` | `0`；没有东西阻止删除该分支 |

### 设计审计

设计分三个阶段审计。第一版设计在五次修订后被接受；范围修正后的修订在 `15aa6bb` 返回**接受**（来源边界与处置）。单文件交付形态随后在 `1ff68e5` 作为设计－产物对审计：审计者对两项缺失的记录风险返回**需要修订**——流程所依赖的记录在案的编号规则，以及落地仓库的指令没有点名任何允许历史的情形——两者都在 `7f4bb91` 修复（风险条目、SKILL 的询问或停止规则、S37 的措辞、两种合并命令形式与 S32 空缺说明）。修复校验轮在 `2b3b6a8` 返回**接受**。审计以只读方式读取 pin 的上游技能，并确认单文件 `SKILL.md` 忠实于它。

### 实现评审

两位独立评审者评审了单文件版本。评审 B 在 `2b3b6a8` 接受，无发现。评审 A 对一个重大问题返回需要修订——分支删除命令丢掉了来源的 `--jq length`，因此交付形式对「0 以外的任何值」规则会打印 `[]`——外加五个记录／证据次要问题；全部在 `9cd40af` 修复（恢复 `--jq length`、增加 URL 查找从句、修正 R9 的依据、把已合并不受栈支持的说法恢复为未验证、让移除证据可复现，并更新措辞与审计历史），评审 A 接受该修复轮。评审 B 在修复后确认其接受仍然成立。更早的脚形态实现曾在两位评审者的各轮中获得接受；该形态及其接受被本次对单文件版本的评审取代。两次接受覆盖落地的单文件版本。

### 落地

落地在维护者评审与授权之后于 2026-10-28 执行：工作草稿源失去仅评审使用的切换行，`publish` 把技能复制进 `skills/dsh-spec-merging-stacked-prs/` 并移除工作目录与声明的草稿，`pnpm run skill:refresh` 把它镜像进 `.agents/skills/`，技能根 `THIRD_PARTY_NOTICES` 与 `license` 字段被加上，`AGENTS.md` 在其当前技能清单中增加该技能，根 `THIRD_PARTY_NOTICES.md` 增加被改编技能的条目，本记录移到 `implemented/process/`。锻造分支 rebase 到本地 `refactor/dsh-skills` 的 `c61d49c`，并作为一个提交 squash 合并；没有推送。本记录带有中文对侧与一致性记录，在最终评审时完成。

## 未验证项

- **不随附脚本意味着流程没有离线契约测试。** 检查是 agent 执行的正文；两个 agent 可能对同一状态读出不同结果，也没有东西锁定退出语义。这是单文件形态的已接受代价（R11）；来源本身也有同样的性质。
- **报告的合并状态可能过度阻塞。** `mergeStateStatus` 不等于 `CLEAN` 时，即使维护者可以用不同方式解决阻塞也会阻止，而状态的含义可能漂移。技能点名该判定与停止；agent 不得靠含糊其辞把状态读成就绪。
- **编号规则是记录在案的，不是被实践过的。** `gh stack merge` 先按栈解析一个裸数字，而扩展记录在案地说明栈编号与 pull request 编号从不重叠，因此边界 PR 的编号是无歧义的；单文件流程依赖该记录在案的规则，首次真实落地在任何合并之前以只读方式实践它。
- **落地仓库的指令可能没有点名任何允许的历史。** 来源的两种历史那时只是候选；技能不能替仓库选择其中一个，因此 agent 先读指令，在指令沉默时询问或停下，而不是按自己的解读改写分支。
- **已合并条目的解除栈行为未验证。** `gh stack unstack --help` 确认已排队与自动合并的条目保持入栈；来源关于已合并条目不能被解除栈的陈述未验证，因此落地技能指示停下，而不是断言该主张（S18、R9）。
- **合并方法可能是模糊的。** 当仓库没有规定方法时，使用来源的 `merge`；如果该方法不被允许，GitHub 会拒绝合并且 agent 通过仓库规则解决。
- **合并队列仓库中的部分落地只被部分建模。** 重新查询与剩余层检查遵循来源，但被拆进队列组的范围可能暴露正文没有一一列举的中间状态；首次真实部分落地是一项移交项。
- **GitHub 对仍列出已合并成员的栈的处理未验证。** 两种合并形式都包含边界之下已经合并的成员；未验证的行为被记录，而不是被假定。
- **没有审计过真实栈。** GraphQL 形状由只读探针与内省确认，但真实的官方栈可能暴露流程没有列举的状态。首次真实落地以只读方式确认它。
- **不携带任何合并授权门。** 技能在一次通过的预检之后合并，与来源相同；重新查询与禁止绕过的规则就是守卫，想要人类回答的采用项目在自己的层里加上它（R8）。
- **评审草稿与配对步骤。** 技能评审草稿在最后一次英文编辑之后的停步时创建；后来的编辑会重新打开它。本记录已带有中文对侧与一致性记录。
- **落地是本地提交，不是已推送的。** 远程跟踪分支仍指向落地前的头，由维护者决定何时推送。

## 移交

维护者评审了工作，并于 2026-10-28 授权落地。落地执行了以下动作：

- 从工作草稿源中移除仅评审草稿使用的英文切换行，然后把工作目录发布进 `skills/dsh-spec-merging-stacked-prs/` 并移除工作目录；`publish` 移除了声明的评审草稿。
- 增加技能根 `THIRD_PARTY_NOTICES` 与 `license` frontmatter 字段，并把该技能加入根 `THIRD_PARTY_NOTICES.md` 的被改编技能清单。
- 刷新安装副本，使 `.agents/skills/dsh-spec-merging-stacked-prs/SKILL.md` 与落地技能一致。
- 更新 `AGENTS.md` 中的技能清单。
- 把本记录移到 `implemented/process/`，并带有中文对侧与一致性记录。
- 把锻造分支 rebase 到 `refactor/dsh-skills` 的 `c61d49c`，并把它 squash 合并为一个提交；没有推送。

下面的动作与决定仍留给维护者：

- 当落地应当发布时推送 `refactor/dsh-skills`；远程跟踪分支仍指向落地前的头。
- 在首次真实落地之前以只读方式审计一个真实栈；未验证状态列在上面。
- 保留或删除锻造分支与 worktree；squash 提交就是落地状态。

## 考虑过的替代方案

**保留只读审计脚本。** 它给出稳定的 JSON／退出契约与 46 个离线测试，并被接受过两次。它落败，因为驾驶员评审了它的僵硬性与覆盖风险——未建模的状态或假阻塞可能挡住 agent，而脚本开始充当技能的闸门而不是辅助——并选择了上游的单文件形态，在那里 agent 运行来源自己的命令，可以重新推导、检查原始输出并适应。取舍记录在 R11 与 § 风险。

**原样复制上游技能。** 它是通往忠实机制的最短路径。它落败，因为上游文本指向目标不交付的文档（根 `AGENTS.md` 与 cookbook 页面），并固定了一个仓库的合并方法与历史策略；目标需要这些点被陈述或被处置。

**保留第一版设计中源自仓库的规则。** 逐 pull request 的授权与声明拥有的方法／历史策略曾被接受过一次。它落败，因为来源边界排除了本仓库的内容：那些规则既不是上游要求，也不是目标领域的事实。

**无条件把合并方法定为来源的 `--merge`。** 它少一个决定。它落败，因为目标是通用的 GitHub pull request 操作，规定 squash 或 rebase 的仓库要么会让合并失败，要么会被要求绕过自己的规则；仓库规定的方法加来源的兜底，把来源值保留为默认而不强制执行它。GitHub 仍会拒绝仓库不允许的方法，因此兜底是安全失败。

**在 verify 步骤保留 `mergedAt` 要求。** 它是额外的一次确认。它落败，因为来源只要求 `MERGED`；该字段作为证据被报告，而不是被设门。

## 后果

- 该技能集合交付 `dsh-spec-merging-stacked-prs`，位于 `skills/dsh-spec-merging-stacked-prs/`，为一份 `SKILL.md` 加其 `THIRD_PARTY_NOTICES`，带一份一致的安装副本，且 `AGENTS.md` 把它列入当前技能。
- 技能就是一个文件里的上游机制：官方 stack 对象作为成员资格权威、增量的同作者链接、两种刷新历史、只用 `gh stack merge`、整栈或受限前缀落地、删除之前 `MERGED`，以及来源命令的内联承载。
- 代价：不随附脚本意味着流程没有稳定的 JSON／退出契约，也没有离线契约测试；检查依赖 agent 对 GitHub 状态的解读。单文件形态也放弃了脚本形态的确定性预检与 46 个离线用例。
- 换来的：一个贴近上游单文件的技能，采用者没有包或测试表面需要维护，agent 可以自由地重新推导、检查原始输出并处理脚本没有建模的状态。
- 继续携带的风险：记录在案的编号规则、落地仓库没有点名任何允许历史、合并方法模糊、合并队列中间状态、GitHub 对仍列出已合并成员的栈的处理，以及缺少真实栈审计（全部列在 § 未验证项）。
- 回滚：回退 `refactor/dsh-skills` 上的 squash 提交并再次刷新安装副本；`submodules/dsh` 未被触碰，因此没有上游 pin 需要修复。

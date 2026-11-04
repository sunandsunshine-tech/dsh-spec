# Agent Note: 从上游 stacked-PR 落地技能锻造 dsh-spec-merging-stacked-prs

Status: implemented

[English](2026-10-28-forging-dsh-spec-merging-stacked-prs.md) | 中文

## 问题

本技能集合没有技能拥有落地一串相互依赖的 GitHub pull request 的工作。一个被要求落地 A ← B ← C（其中每个 pull request 都基于它下面那个）的 agent，必须在两种做法之间选择：靠手工合并并重定向各层来复现栈语义，或使用 GitHub 原生的 stacked-PR 特性——后者拥有栈级规则、CI、顺序、重定向与合并状态。上游 `dsh` 为这个选择携带了一个技能，`dsh-merging-stacked-prs`，但它是为那个仓库的约定写的：它指向上游根 `AGENTS.md` 以获取允许的历史，指向一张上游 cookbook 页面以获取评审修复的传播，并把合并方法固定为一个旗标。

来源边界是明确的：上游技能是唯一的内容来源，此外还有请求与目标领域的事实（GitHub pull request 操作与已安装的 `gh stack` 扩展）。本仓库现有的文档——它的 `AGENTS.md`、它的决策记录及其约定——不是设计来源，因为它们是被移除或重写的仓库内容，而不是交付技能必须承载的行为。目标受众是操作 GitHub pull request 的 agent，交付物是一套通用的 GitHub PR（Pull Request）操作技能，而不是某个仓库落地策略的副本。

## 决策

`dsh-spec-merging-stacked-prs` 以上游的单文件形态从 `skills/dsh-spec-merging-stacked-prs/` 交付。它锻造自 `.agents/skills/dsh-merging-stacked-prs`，来源是 pin 的 `submodules/dsh` 基线。

落地的技能是 `skills/dsh-spec-merging-stacked-prs/`：`SKILL.md` 加技能根的 `THIRD_PARTY_NOTICES`，frontmatter 的 `license` 字段点名它，因为文本改编自上游技能。它在 `.agents/skills/dsh-spec-merging-stacked-prs/` 的安装副本与之逐字节一致。该技能不随附脚本、包源或仓库测试文件：来源自己的只读 `gh` 与 GraphQL 命令按原样内联承载（R11）。

机制就是上游机制，未作改动：官方的 GitHub stack 对象是成员资格权威；一条符合条件的同作者链——未入栈，或某个既有栈中保序的子集——以增量方式被链接；原生级联 rebase 与增量 merge-forward 是两种刷新历史；合并通过 `gh stack merge` 进行，绝不通过逐个 pull request 的 `gh pr merge` 加重定向；选择整个栈或一个显式限定的前缀；每个选中的 pull request 必须在删除分支之前报告 `MERGED`，而删除是单独的最后一轮。改编如下：

1. **名称与触发语言。** 目标名是请求的 `dsh-spec-merging-stacked-prs`；description 保留来源的触发词汇与要求含义，并追加中文触发语言。来源固定的 `master` 在正文中变成仓库的默认分支（R4）。
2. **上游文档指针。** 根 `AGENTS.md` 指针与 cookbook 页面被处置而非承载：历史规则重绑到落地仓库自己的指令（R10），评审修复的传播被消解，因为它在技能范围之外，改写后重新审计的检查作为接管的规则保留。
3. **合并方法。** 来源固定的 `--merge` 被重绑：合并方法是落地仓库的策略（R5）。技能采用其指令规定或 GitHub 合并设置点名的那个方法，两者都没有时回退到 `merge`。
4. **没有合并授权门。** 来源没有把合并挡在人类回答之后，来源边界中也没有任何东西增加这样一道门；不携带逐 pull request 授权（R8）。来源自己的询问保留：对冲突或意外栈条目的用户指示，作者不同或不可用时询问，以及在本地／远程分歧时取消。
5. **已核验的 CLI（命令行界面）表面。** 已安装的 `gh stack` 0.1.1 提供来源所假定的命令与旗标——`link --base`、`checkout`、`sync`、`rebase`、`push`、`merge --yes --merge/--squash/--rebase`——并且没有 `--delete-branch`。两个已核验的行为塑造了文本：`gh stack link` 的分支参数会被推送且可以创建 pull request，而一个匹配不到任何 pull request 的数字参数会被当作分支名，因此链接命令使用 pull request URL（R1）；并且落地的技能只链接开放的 pull request，遇到已关闭或已合并的条目时停下并询问（R9）。
6. **符合性证据。** 来源要求每个选中的 pull request 符合仓库的评审与检查要求。该证据从同一份元数据中读取：`mergeStateStatus` 不是 `CLEAN`（包括仍在计算的 `UNKNOWN`），或 `reviewDecision` 为 `CHANGES_REQUESTED`，都是阻塞项（R2）。
7. **部分落地。** 部分落地之后，技能重新查询官方栈，把已经报告 `MERGED` 的层视为已落地，并校验剩余 PR 仍按预期顺序链接、且目标为 trunk 或它下面的那一层（R3）。
8. **交付。** frontmatter 增加可选的 `compatibility` 字段，说明技能所需的运行时；交付语言为英文并追加中文触发语言，中文评审草稿中文在前（R6）。本记录带有中文对侧与一致性记录。

- **运行时。** 技能假定带官方 `gh stack` 扩展、能访问 GitHub 的 GitHub CLI，且每个 head 分支都在同一仓库（R1、R9）。

### 来源与修订

上游来源：固定 `submodules/dsh` 基线的 `dsh-v0.2.2-alpha.2`（`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`），文件 `.agents/skills/dsh-merging-stacked-prs/SKILL.md`。该文件是技能唯一的内容来源。

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
| S36 | § Checklist | 清单覆盖原生支持、一个官方栈、被改写层的校验、通过 `gh stack merge` 提交、`MERGED` 校验与删除安全。 | 改编 | SK § Checklist | 同样的条目；增加合并方法策略，不携带授权门 |
| S37 | § stack membership and § Require native stack support | GraphQL 查询与 `gh pr view --json` 列表是 agent 执行的正文。 | 保留 | SK | 按来源所写内联承载，外加来源的分页指令所需的 `pageInfo`/`after`（S11）；没有随附脚本（R11） |
| S38 | § Preflight, § Verify | 成员资格、完整性、顺序、同仓库、开放、非草稿、已合并状态与分支 base 安全性，恰好可由来源点名的命令判定。 | 保留 | SK | agent 运行同样的命令；决定仍由 agent 作出，并遵循来源的停止规则 |
| S39 | § Preflight, § Merge, § Refresh | 评审与检查符合性的回应、历史选择、作者不同时的链接决定、冲突解决。 | 保留 | SK with one named authority each | 元数据提供符合性证据（R2）；回应与其余判断仍是正文 |

S31 与 S33 之间的编号空缺是刻意的（R8）：缺失的那一行本会加入一道采用者授权门，而来源边界排除它；这不是被丢弃的来源约束。

### 裁决

| # | 裁决 | 依据 | 可逆方式 |
|---|---|---|---|
| R1 | 链接命令使用 pull request URL，而不是数字或分支名。 | `gh stack link --help`：分支参数会被推送且可以创建 pull request，而匹配不到任何 pull request 的数字参数会被当作分支名；URL 总能解析为 pull request | 改变命令形式；先解析数字 |
| R2 | 符合性证据是同一份元数据中的 `mergeStateStatus` 与 `reviewDecision`：不等于 `CLEAN`（包括 `UNKNOWN`）的值，或 `CHANGES_REQUESTED`，都是阻塞项。 | 来源要求符合仓库的评审与检查要求；GitHub 报告的状态就是该判定 | 改变证据字段或阻塞集合 |
| R3 | 部分落地之后，已经报告 `MERGED` 的层就是已落地；重新查询并按预期顺序校验剩余范围。 | GitHub 在部分落地之后重定向并 rebase 剩余层；来源要求重新查询并校验剩余层 | 调整规则 |
| R4 | 来源的 `master` 变成仓库的默认分支。 | 一个交付技能不能点名另一个仓库的默认分支 | 无需 |
| R5 | 合并方法是仓库策略；技能使用落地仓库的指令或 GitHub 合并设置所规定的方法，回退到 `merge`。 | 来源的固定值是某个仓库的策略；目标领域有规定 squash 或 rebase 的仓库，而 GitHub 会拒绝仓库不允许的方法 | 回到来源的固定值，或增加一个显式配置输入 |
| R6 | 评审草稿以中文在前，英文作为它的附加触发语言。 | 请求的评审语言与评审草稿规则 | 无需 |
| R7 | 记录以已实现的骨架位于 `implemented/`。 | 请求的记录位置与记录生命周期 | 无需 |
| R8 | 不携带任何合并授权门：技能在一次通过的预检之后运行合并，与来源相同。 | 来源没有这样的约束，而仓库内容被排除在来源边界之外；预检与禁止绕过的规则就是守卫 | 增加一个确认步骤作为安全兜底 |
| R9 | 技能只链接开放的 pull request，遇到已关闭或已合并的条目时停下并询问。 | 来源说只有开放的 pull request 才能被链接或落地；只读探针确认一个已关闭的探针存在，但扩展对非开放条目的行为未验证，因此目标陈述安全的停止，而不是机制主张 | 如果支持的非开放路径被验证，修订该规则 |
| R10 | 在落地仓库的指令允许之处，评审后的历史改写是被允许的；它使提交 OID 假设失效，因此推送后重新获取 head 并重新审计讨论串、批准、可合并性与检查；绝不使用原始 `--force`，也绝不覆盖并发前进的远程 head。 | 来源的历史规则被重绑到目标仓库的策略；来源的重新审计与 force 规则被保留 | 让规则无条件，或去掉重新审计 |
| R11 | 不随附脚本：来源中恰好可判定的检查按其自己的 `gh` 与 GraphQL 命令内联承载，由 agent 运行它们。 | 锻造的脚本决定是一项裁决；上游单文件形态被选中而非只读审计脚本，重视 agent 的灵活性与更小的表面，而非脚本稳定的退出类别与离线测试 | 如果判定其一致性值得那些表面，重新引入只读审计脚本 |

### 不随附脚本

技能不随附脚本（R11）：来源是一份单一的正文文件，其要求由 agent 通过 `gh` 与 GraphQL 执行，单文件形态胜过了只读审计脚本。来源点名的恰好可判定的条件——栈成员资格、顺序、base 链、开放／非草稿／符合性、`MERGED`、分支 base 安全性——按其同样的内联命令承载，并在旁边陈述预期结果与停止规则。这放弃了脚本稳定的 JSON／退出契约及其离线测试；它让 agent 自由地重新推导、检查原始输出，并处理脚本没有建模的状态。后果记录在 § 后果。

## 考虑过的替代方案

**保留只读审计脚本。** 它给出稳定的 JSON／退出契约与 46 个离线测试。它落败，因为它的僵硬性与覆盖风险——未建模的状态或假阻塞可能挡住 agent——使它成为技能的闸门而不是辅助；上游单文件形态让 agent 运行来源自己的命令，可以重新推导、检查原始输出并适应。取舍记录在 R11 与 § 后果。

**原样复制上游技能。** 它是通往忠实机制的最短路径。它落败，因为上游文本指向目标不交付的文档（根 `AGENTS.md` 与 cookbook 页面），并固定了一个仓库的合并方法与历史策略；目标需要这些点被陈述或被处置。

**保留源自仓库的规则。** 它落败，因为来源边界排除了本仓库的内容：逐 pull request 授权与声明拥有的方法／历史策略既不是上游要求，也不是目标领域的事实。

**无条件把合并方法定为来源的 `--merge`。** 它少一个决定。它落败，因为目标是通用的 GitHub pull request 操作，规定 squash 或 rebase 的仓库要么会让合并失败，要么会被要求绕过自己的规则；仓库规定的方法加来源的兜底，把来源值保留为默认而不强制执行它。GitHub 仍会拒绝仓库不允许的方法，因此兜底是安全失败。

**在 verify 步骤保留 `mergedAt` 要求。** 它是额外的一次确认。它落败，因为来源只要求 `MERGED`；该字段作为证据被报告，而不是被设门。

## 后果

- 该技能集合交付 `dsh-spec-merging-stacked-prs`，位于 `skills/dsh-spec-merging-stacked-prs/`，为一份 `SKILL.md` 加其 `THIRD_PARTY_NOTICES`，带一份一致的安装副本，且根 `README.md` 的技能表列出它。
- 技能就是一个文件里的上游机制：官方 stack 对象作为成员资格权威、增量的同作者链接、两种刷新历史、只用 `gh stack merge`、整栈或受限前缀落地、删除之前 `MERGED`，以及来源命令的内联承载。
- 代价：不随附脚本意味着流程没有稳定的 JSON／退出契约，也没有离线契约测试；检查依赖 agent 对 GitHub 状态的解读。单文件形态也放弃了脚本形态的确定性预检与 46 个离线用例。
- 换来的：一个贴近上游单文件的技能，采用者没有包或测试表面需要维护，agent 可以自由地重新推导、检查原始输出并处理脚本没有建模的状态。
- 继续携带的风险：记录在案的编号规则、落地仓库没有点名任何允许历史、合并方法模糊、合并队列中间状态、GitHub 对仍列出已合并成员的栈的处理，以及缺少真实栈审计。
- 回滚：回退 `refactor/dsh-skills` 上的 squash 提交并再次刷新安装副本；`submodules/dsh` 未被触碰，因此没有上游 pin 需要修复。

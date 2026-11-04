# Agent Note: 从上游 error-handling 技能锻造 dsh-spec-error-handling

Status: implemented

[English](2026-10-28-forging-dsh-spec-error-handling.md) | 中文

## 问题

本技能集合把 DeepSeek Harness 的开发模式抽取为技能，而该模式中有一部分背后没有技能：系统如何声明失败、谁拥有恢复，以及如何让结果对受影响的人可见。上游 `dsh` 把这一部分放在一个文件里，即 `.agents/skills/dsh-error-handling/SKILL.md`，而它是为那个产品写的。它的标题点名 harness，它的示例引用该仓库的 `assertNever` 辅助函数，它的约定规则说复用「包错误约定」，它的汇报规则假定该产品的运行时：一个 UI、默认开启的日志、一种 API 文档实践、带 locale 机制的应用运行时，以及把异常当作失败模型。另一个软件项目中的读者会在那里遇到一个产品的词汇和读者项目可能没有的指涉：那个辅助函数、那些包约定、那个产品，以及它的汇报面。本技能集合需要这套机制，而不需要那套词汇或那些假设。

## 决策

`dsh-spec-error-handling` 从 `skills/dsh-spec-error-handling/` 交付，其在 `.agents/skills/dsh-spec-error-handling/` 的安装副本与之逐字节一致。锻造工作目录已被发布并移除。该技能是一份 `SKILL.md`，面向任何类型的软件工程项目——应用、库、命令行工具、服务、嵌入式与批处理系统。它的正文承载四个上游单元——类型化、结构化的失败；处理、恢复或停止；本地化、可操作、可见的报告；基础——在含义成立之处沿用上游措辞，并改编产品专用指涉与运行时假设；每一处改编都记录在下面的处置表与预设审计中。

该技能是纯行文的。来源中没有一条规则可由命令判定：失败是否拥有 API、遏制规则与保证，以及最终报告是否可操作，都是关于设计的判断。随附脚本将不得不发明来源并未陈述的检查。正文远在规范的规模预算之内，因此该技能也不交付参考文件。它没有环境要求，因此没有 `compatibility` 字段。

### 来源与修订

来源：`submodules/dsh/.agents/skills/dsh-error-handling/SKILL.md`——上游技能携带的唯一文件——位于 pin 的子模块修订 `1f81c047fc48fa190a683e469daa699857e9afe8`（`dsh-v0.2.1-rc.3`）。该文件为 30 行；其 SHA-256 是 `fcde7e278056263f7b93b6854fe05d0b492bdf09739f4f4f3537e8ffd30a1c2d`。

锻造 worktree 不会检出子模块，因此 `submodules/dsh` 在 worktree 内是空的；该文件在主检出 `/home/dreamstar/ideaProjects/dsh-spec/submodules/dsh/.agents/skills/dsh-error-handling/SKILL.md` 处读取，其 `git submodule status` 报告上面的 pin 修订与干净的工作树。子模块被读取，而非被 fetch 或编辑。

读取的采用者声明：`AGENTS.md`——其常驻指令、边界、约定与 norms 钩子——以及它引用的 norms，`.agents/dsh-spec/norms/norms.md`。

为仓库的流程与记录格式而读、而非作为设计来源：`CONTRIBUTING.md`（提交约定、DCO、双语配对）、`skills/dsh-spec-agent-notes/references/notes-contract.md`（本记录的格式）、`skills/dsh-spec-skill-forge/SKILL.md`（锻造流程），以及本仓库已落地的技能与更早的记录（仅取格式与先例；它们的措辞均未被带入技能）。`dsh-spec-agent-experience` 移植被读，是为了仓库在移植技能形态与出处处理上的先例。

未作为设计来源读取：任何其他会话的输出、任何并行锻造结果、本仓库树之外的任何技能，以及 `.agents/skills/` 下的安装副本。

2026-10-28 在线读取的页面，写本设计之前：

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/optimizing-descriptions.md`

每一页都可读；未使用锻造技能的离线回退。

### 取代检查

在活跃笔记树中搜索了拥有错误处理决定或本技能先前锻造的笔记：不存在。其他技能锻造的记录与抽取记录不覆盖此主题，因此本记录不取代任何东西，也没有更旧的笔记被更新。

### 首次停步后的修订

第 1 轮停步把设计交给维护者。维护者发现了请求的停步条件「适用于软件工程」所点名的通用性缺口：N23 被记录为保留，依据是「领域中立」，但该句假定一个带 UI 与默认开启日志的产品，而同一类假设也存在于文档从句（N12）、异常词汇（小节标题、N15 与 N27）以及「接收应用」从句（N21）中。所指示的修订是有针对性的，而不是重写：

- 只改编其运行时或产品假设不被目标范围共享的单元；其余单元照原样承载。
- 把目标范围视为任何类型的软件项目，因此文本不得假定 UI、默认开启的日志、API 文档实践、应用运行时，或把异常当作唯一的失败模型。
- 在标题与两个句子中把异常词汇改为失败／处理词汇。
- 保留包／模块／服务单元（N6）、`assertNever` 示例（N10）、基础（R6）与 description（R3）。
- 保留落地动作不动，并在落地时 rebase 到受维护的基线。
- 重跑设计循环：修订设计、再次审计、实现，然后做第二轮独立评审。
- 把预设结论记录在 § 预设审计；该审计是否成为后续锻造的常驻问题，是维护者的决定与一次共享文件变更，记录在移交中。

本次修订改动了六个来源单元——小节标题与 N12、N15、N21、N23、N27——并增加了预设审计；其他句子未变。第 1 轮的评审草稿及其语言切换行在修订前被撤回，并在停步时重建；发布步骤移除了它们。落地正文为 31 行，含六个改编单元与改编技能声明，SHA-256 为 `b5d1ab8a…`。

### 改编后的目标文本

六个改编单元，按已落地技能承载的确切文本，与它们各自取代的上游句子对照：

| 单元 | 上游 | 计划的目标文本 |
|---|---|---|
| N11a | `## Catch, recover, or stop` | `## Handle, recover, or stop` |
| N12 | 对每个失败，在拥有该失败的 API 的文档中定义处理与汇报的拥有者、遏制与保证：有效不变量，缺失／部分／已提交／未知的影响，以及清理责任。 | 对每个失败，在拥有该失败的 API 的文档或项目中等价的 API 契约记录里，定义处理与汇报的拥有者、遏制与保证：有效不变量，缺失／部分／已提交／未知的影响，以及清理责任。 |
| N15 | 捕获限制的是异常传播，而不是变更。 | 处理失败限制的是失败传播的距离，而不是已经做出的变更。 |
| N21 | 在存在 locale 机制时，通过接收应用的 locale 机制本地化；其他诊断信息使用其现有的输出语言。 | 在存在 locale 机制时，通过显示该文本的呈现面的 locale 机制本地化；其他诊断信息使用其现有的输出语言。 |
| N23 | 不可信状态或未知结果必须通过 UI 或默认开启、可访问的日志可见：报告影响、不确定性、系统处置与安全的下一步。 | 不可信状态或未知结果必须通过受影响的用户或系统实际使用的呈现面可见——UI、命令输出、默认开启的可访问日志，或调用方收到的错误：报告影响、不确定性、系统处置与安全的下一步。 |
| N27 | 校验结果状态与可见结果，而不只是异常被捕获。 | 校验结果状态与可见结果，而不只是失败被拦截。 |

### 预设审计

该表覆盖每个承载单元：31 个处置行，加上三个没有处置行的小节标题（`## Typed, structured failures`、`## Localized, actionable, visible reports`、`## Foundations`）。结论可以是**共享**（该假设在目标范围内成立）、**空真**（在假设失败之处，从句没有对象，因此它不是假的）、**无**（该单元不携带运行时假设，或被引用作品的运行时并不约束目标），或**已变**（**已改编**或**已重绑**；§ 约束处置记录是哪一种，§ 改编后的目标文本记录措辞）。一个条件单元，其假设只在特性存在时成立，记录为**共享或空真**。承载单元只在共享、空真、共享或空真或无之下保留。

| # | 单元 | 承载单元 | 预设 | 目标范围 | 结论 |
|---|---|---|---|---|---|
| P1 | N1 | 名称 `dsh-error-handling` | 除来源自身的名称外没有其他预设 | 技能名是项目元数据 | 无；作为 N1 下的改名保留 |
| P2 | N2 | description 句子 | 触发词汇点名失败、恢复、重试、后台工作与用户可见报告 | 这些术语命名主题，而不是运行时义务 | 无；保留——description 在 N2 下改动 |
| P3 | N3 | H1 `DeepSeek Harness Error Handling` | 来源产品 | 目标的主题是错误处理 | 无；作为 N3 下的指涉改动保留 |
| P4 | N4 | 引言 | 无——失败、拥有者与安全是模型中立的 | 任何软件项目 | 共享；保留 |
| P5 | N5h | 标题 `## Typed, structured failures` | 失败可以被声明并结构化 | 异常类、结果枚举与错误码都提供声明的结构 | 共享；保留 |
| P6 | N5 | 声明的类型、稳定的判别值、与处理相关的细节 | 带稳定判别值的声明失败分类法 | 每种失败模型都声明类别（类、错误码、枚举）并支持稳定判别值 | 共享；保留 |
| P7 | N6 | 包错误约定 | 一个打包单元拥有错误约定 | 包、模块与服务是常见的拥有单元 | 已变（N6 下重绑）；拥有单元保持具体 |
| P8 | N7 | 保留原因 | 失败可以携带其原因 | 原因链在某些模型中存在，在另一些模型中被近似 | 共享或空真；保留 |
| P9 | N8 | 机器标识与显示文本 | 失败同时携带标识与显示文本 | 不存在显示文本时，后半句没有命名任何东西 | 共享或空真；保留 |
| P10 | N9 | 绝不靠解析消息来路由处理 | 失败消息存在 | 消息不存在时该从句是空真的 | 共享或空真；保留 |
| P11 | N10 | `assertNever` 示例 | 源仓库的辅助函数 | 等价物是不可达分支或失败不变量的缺陷 | 已变（N10 下重绑） |
| P12 | N11 | 遏制绝不能把缺陷变成成功 | 无 | 任何失败模型 | 共享；保留 |
| P13 | N11a | 标题 `## Catch, recover, or stop` | 异常就是失败模型 | 结果值与错误码在没有异常的情况下传播失败 | 已变（N11a 下改编）；「Handle」是伞概念，「recover」与「stop」是它的结果，拦截含义留在 N15 |
| P14 | N12 | 拥有者 API 文档 | 一种 API 文档实践，以及一个其消费方与实现者依赖的记录 | 契约可以记录在 API 文档或项目中等价的记录中 | 已变（N12 下改编）；等价记录扮演 API 文档的角色，因此残余的记录前提是共享或空真 |
| P15 | N13 | 不变量、影响状态、清理责任 | 影响可以处于缺失、部分、已提交或未知状态 | 任何有状态操作；不存在影响时该从句是空真的 | 共享或空真；保留 |
| P16 | N14 | 后台任务保留这些义务 | 后台任务存在 | 不存在时该从句是空真的，而不是假的 | 共享或空真；保留 |
| P17 | N15 | 捕获限制异常传播 | 异常 | 结果值与错误码模型在没有异常的情况下传播失败 | 已变（N15 下改编） |
| P18 | N16 | 只有受影响状态的拥有者才能确立继续 | 受影响状态存在 | 没有状态时该从句是空真的 | 共享或空真；保留 |
| P19 | N17 | 停止依赖工作、丢弃状态或实例，或上报 | 依赖工作与状态或实例存在 | 不存在时该从句是空真的 | 共享或空真；保留 |
| P20 | N18 | 仅记录日志不是恢复 | 日志存在 | 不存在时该从句是空真的 | 共享或空真；保留 |
| P21 | N19 | 重试、预算、监督、可观察的降级 | 重试与长期监督存在 | 不存在时该从句是空真的；存在时，取消与可观察的降级就是义务 | 共享或空真；保留 |
| P22 | N20h | 标题 `## Localized, actionable, visible reports` | 报告存在以承载这些属性，且可能存在 locale 机制 | 每个失败最终都在某处浮现；本地化属性遵循 N21 | 共享或空真；保留 |
| P23 | N20 | 每份最终报告都有摘要、受影响操作与下一步行动 | 报告存在 | 规则点名其内容，而不是渠道 | 共享；保留 |
| P24 | N21 | 接收应用的 locale 机制 | 带 locale 机制的应用运行时，以及显示该文本的呈现面 | 库与服务可能没有 locale 机制，或由另一个呈现面拥有 | 已变（N21 下改编）；locale 机制存在处共享，不存在处空真 |
| P25 | N22 | 面向用户的文本 | 某些文本到达用户 | 没有文本到达用户时该从句是空真的 | 共享或空真；保留 |
| P26 | N23 | UI 或默认开启的日志 | 带 UI 与默认开启日志的产品 | 库、命令行工具、服务、嵌入式与批处理系统各自有不同的呈现面 | 已变（N23 下改编）；当它是唯一呈现面时，调用方收到的错误承载报告 |
| P27 | N24 | 持久的无效状态需要持久的可见性 | N23 下改编的呈现面 | 该规则给那个呈现面增加持久性；不存在此类状态时是空真的 | 共享或空真；保留——它继承 N23 的呈现面 |
| P28 | N25 | 没有保证时绝不声称成功、回滚或安全重试 | 所声称的结果存在 | 不存在回滚时该从句是空真的 | 共享或空真；保留 |
| P29 | N26 | 汇报失败需要一条独立兜底 | 汇报路径存在 | 每个失败报告都有一条路径；规则要求第二条 | 共享；保留 |
| P30 | N27 | 不只是异常被捕获 | 异常，以及可校验的可见结果 | 结果值与错误码模型在没有异常的情况下拦截失败；失败没有可见结果时，校验目标是结果状态 | 已变（N27 下改编）；可见结果存在处共享，失败没有可见结果处空真 |
| P31 | N28h | 标题 `## Foundations` | 无 | 该小节是文献 | 共享；保留 |
| P32 | N28 | Meyer：契约与不变量 | 文献的契约谱系 | 引用为机制提供依据；没有规则要求采用该运行时 | 无；保留——文献不约束目标 |
| P33 | N29 | Sutter：异常安全保证 | C++ 异常语义 | 引用点名该书的主题；没有规则要求 C++ 异常语义 | 无；保留——文献不约束目标 |
| P34 | N30 | Armstrong：隔离与监督 | Erlang 进程模型 | 引用为监督提供依据；没有规则要求 Erlang 运行时 | 无；保留——文献不约束目标 |

### 描述

该技能的 frontmatter description，逐字如下（299 个字符，低于规范的 1024 字符上限）：

> Apply error-handling principles when designing, implementing, or reviewing failures, recovery, retries, background tasks, and user-visible error reports in software projects. Not a general code-review, test-strategy, or debugging guide. 用于软件工程中的错误处理：设计、实现或审查失败、恢复、重试、后台任务与用户可见错误报告；不用于一般代码评审、测试策略或调试。

英文句子是交付语言，承载上游触发面外加「implementing」与软件领域。中文句子是附加触发语言。被排除的相邻任务是通用代码评审、测试策略，以及处理设计不受质疑的缺陷调试：这些任务在该技能的触发面之外，而在存在拥属技能之处，它是已安装的 `dsh-spec-code-review`，不是本技能。

### 设置

| 设置 | 值 | 依据 |
|---|---|---|
| 目标 | 为任何类型的软件工程项目锻造并落地 `dsh-spec-error-handling`，然后把结果交给维护者评审 | 请求 |
| 边界 | 基线 `refactor/dsh-skills`；一个独立 worktree；锻造期间不编辑 `submodules/dsh`、其他技能或共享辅助文件；落地更新 `AGENTS.md` 中的技能清单并刷新安装副本；不推送 | 请求与落地指令 |
| 技能名 | `dsh-spec-error-handling` | 请求 |
| 受众与领域 | 任何类型的软件工程项目——应用、库、命令行工具、服务、嵌入式与批处理系统；读者把规则应用到正在工作的项目 | 请求；维护者的范围裁决 |
| 改编策略 | 只有当来源句子的运行时或产品假设在目标范围内成立，或该从句在缺失时为空真，才逐字承载；否则用保留机制的、基于角色或条件的措辞改编，并把结论记录在 § 预设审计 | 维护者的裁决；预设审计 |
| 来源 | 上游 `dsh-error-handling`，`.agents/skills/dsh-error-handling/SKILL.md` | 请求 |
| 基线 | 锻造分支在落地前已 rebase 到 `refactor/dsh-skills` 的 `f1a68d0` 上，并作为一个提交 squash 合并进去 | 落地指令 |
| 落地目录 | `skills/dsh-spec-error-handling/`；安装副本是 `.agents/skills/dsh-spec-error-handling/` | 锻造生命周期 |
| 交付语言 | 英文 | 锻造默认值；该技能集合的技能为 agent 用英文书写 |
| 评审语言 | 中文；评审草稿只在停步时创建并配对，发布步骤移除了它们；本记录带有中文对侧与一致性记录（R8） | 请求 |
| 附加触发语言 | 中文，追加到 description | 评审语言不同于交付语言 |
| 脚本 | 无 | 来源中没有一条规则可由命令判定；脚本会发明机制 |
| 评审 | 一次设计审计、设计层修订后的一次针对性复审，以及两轮独立评审，每轮都被接受；修复确认记录在 § 评审 | 请求的停步条件与工作方式 |
| 落地动作 | 在落地时执行：发布进 `skills/`、刷新安装副本、把本记录移到 `implemented/process/`、squash 合并进 `refactor/dsh-skills`；不推送 | 落地指令 |

### 约束处置

处置使用锻造技能的取值：**保留（Keep）** 在语言与版式调整下承载原措辞与含义；**改编（Adapt）** 实例化一个目标值；**重绑（Re-bind）** 把已消失的指涉抽象到其目的，并让目标中的等价物具体化；**消解（Dissolve）** 记录指涉已消失以及由什么检查接管。落点 `SK` = 已落地的 `SKILL.md`。

| # | 来源 | 约束 | 处置 | 落点 | 依据 |
|---|---|---|---|---|---|
| N1 | frontmatter `name` | 技能名为 `dsh-error-handling`。 | 改编 | `SK` frontmatter `name` | 目标技能的名字是 `dsh-spec-error-handling`（P1） |
| N2 | frontmatter `description` | 「在设计与评审失败、恢复、重试、后台任务与用户可见错误报告时，应用错误处理原则。」 | 改编 | `SK` frontmatter `description` | 交付侧以英文开头并追加中文触发语言；「designing, implementing, or reviewing」点名目标读者的时刻，领域从句点名软件（P2） |
| N3 | H1 | 标题是 `DeepSeek Harness Error Handling`。 | 改编 | `SK` H1 | 目标的主题是错误处理；来源点名的产品不是目标的主题（P3） |
| N4 | intro | 定义失败、它们的拥有者，以及失败之后什么仍然安全。 | 保留 | `SK` intro | 领域中立；失败、拥有者与安全是模型中立的（P4） |
| N5 | § Typed, structured failures | 预期失败需要声明的类型、稳定的判别值以及与处理相关的细节。 | 保留 | `SK` § Typed, structured failures | 每种失败模型都声明类别（类、错误码、枚举）并支持稳定判别值；「声明的类型」点名声明，而不是某个语言家族（P6） |
| N6 | § Typed, structured failures | 复用包错误约定。 | 重绑 | `SK` § Typed, structured failures | 固定的打包单元作为确定指涉已消失；等价手段是拥有该失败的软件单元——它的包、模块或服务——目标让这个拥有单元保持具体（P7） |
| N7 | § Typed, structured failures | 保留原因。 | 保留 | `SK` § Typed, structured failures | 原因可携带处共享，模型没有原因概念处空真（P8） |
| N8 | § Typed, structured failures | 把机器标识与显示文本分开。 | 保留 | `SK` § Typed, structured failures | 共享或空真：不存在显示文本时，后半句没有命名任何东西（P9） |
| N9 | § Typed, structured failures | 绝不靠解析消息来路由处理。 | 保留 | `SK` § Typed, structured failures | 消息存在处共享，不存在处空真（P10） |
| N10 | § Typed, structured failures | 像 `assertNever` 这样的意外缺陷可以保持为普通 `Error`。 | 重绑 | `SK` § Typed, structured failures | `assertNever` 是源仓库的辅助函数；一般项目用不可达分支或失败不变量的缺陷达到同一目的，目标点名它，同时保留这类缺陷可以保持为普通错误的许可（P11） |
| N11 | § Typed, structured failures | 遏制绝不能把意外缺陷变成成功。 | 保留 | `SK` § Typed, structured failures | 领域中立；任何失败模型（P12） |
| N11a | `## Catch, recover, or stop`（标题） | 该小节标题是「Catch, recover, or stop」。 | 改编 | `SK` § Handle, recover, or stop | 「catch」点名来源书写所用的异常机制；目标范围包括结果值与其他显式失败模型，因此标题点名伞概念及其结果而不点名机制。「Handle」是伞概念；「recover」与「stop」是它的两个结果，拦截含义留在 N15（P13） |
| N12 | § Handle, recover, or stop | 对每个失败，在拥有该失败的 API 文档中定义处理与汇报的拥有者、遏制与保证。 | 改编 | `SK` § Handle, recover, or stop | 「拥有者 API 文档」假定一种目标范围并不共享的 API 文档实践；等价物是拥有该失败的 API 的文档，或项目中等价的 API 契约记录，而拥有关系规则不变（P14） |
| N13 | § Handle, recover, or stop | 保证覆盖有效不变量、缺失／部分／已提交／未知的影响，以及清理责任。 | 保留 | `SK` § Handle, recover, or stop | 影响存在处共享，不存在处空真（P15） |
| N14 | § Handle, recover, or stop | 后台任务保留这些义务。 | 保留 | `SK` § Handle, recover, or stop | 该从句以后台任务存在为条件；不存在时该句是空真的，而不是假的（P16） |
| N15 | § Handle, recover, or stop | 捕获限制的是异常传播，而不是变更。 | 改编 | `SK` § Handle, recover, or stop | 「捕获」与「异常」点名异常机制；等价物是处理失败限制的是失败传播的距离，而不是已经做出的变更，变更限制不变（P17） |
| N16 | § Handle, recover, or stop | 只有受影响状态的拥有者才能确立安全的继续。 | 保留 | `SK` § Handle, recover, or stop | 受影响状态存在处共享，不存在处空真（P18） |
| N17 | § Handle, recover, or stop | 否则停止依赖工作、丢弃无效状态或实例，或上报。 | 保留 | `SK` § Handle, recover, or stop | 依赖工作或状态存在处共享，两者都不存在处空真（P19） |
| N18 | § Handle, recover, or stop | 仅记录日志不是恢复。 | 保留 | `SK` § Handle, recover, or stop | 日志存在处共享，不存在处空真（P20） |
| N19 | § Handle, recover, or stop | 重试需要安全重复、取消与明确的拥有者；有限操作需要预算，而持续监督需要生命周期归属与可观察的降级。 | 保留 | `SK` § Handle, recover, or stop | 这些从句以重试与监督存在为条件；不存在时该句是空真的，而不是假的（P21） |
| N20 | § Localized, actionable, visible reports | 每份最终报告都需要可读的摘要、受影响操作与安全的下一步行动。 | 保留 | `SK` § Localized, actionable, visible reports | 领域中立；规则点名报告的内容，而不是渠道（P23） |
| N21 | § Localized, actionable, visible reports | 在存在 locale 机制时，通过接收应用的 locale 机制本地化；其他诊断信息使用其现有的输出语言。 | 改编 | `SK` § Localized, actionable, visible reports | 「接收应用」假定应用运行时；等价物是显示该文本的呈现面的 locale 机制（在存在时），条件与诊断信息规则保持不变（P24） |
| N22 | § Localized, actionable, visible reports | 把敏感内部细节挡在面向用户的文本之外。 | 保留 | `SK` § Localized, actionable, visible reports | 「面向用户的文本」在 N23 点名的各呈现面上都是通用的，而在没有文本到达用户处空真（P25） |
| N23 | § Localized, actionable, visible reports | 不可信状态或未知结果必须通过 UI 或默认开启、可访问的日志可见，并报告影响、不确定性、系统处置与安全的下一步。 | 改编 | `SK` § Localized, actionable, visible reports | UI 与默认开启的日志是来源产品的呈现面；目标点名受影响的用户或系统实际使用的呈现面，报告所需的四项内容不变（P26） |
| N24 | § Localized, actionable, visible reports | 持久的无效状态需要持久的可见性。 | 保留 | `SK` § Localized, actionable, visible reports | 一旦呈现面是 N23 点名的那个，就是领域中立的；不存在持久无效状态处空真（P27） |
| N25 | § Localized, actionable, visible reports | 没有保证时绝不声称成功、回滚或安全重试。 | 保留 | `SK` § Localized, actionable, visible reports | 该从句以所声称的结果存在为条件；不存在回滚时它是空真的，而不是假的（P28） |
| N26 | § Localized, actionable, visible reports | 汇报失败需要一条独立兜底。 | 保留 | `SK` § Localized, actionable, visible reports | 领域中立；规则点名兜底，而不是渠道（P29） |
| N27 | § Localized, actionable, visible reports | 校验结果状态与可见结果，而不只是异常被捕获。 | 改编 | `SK` § Localized, actionable, visible reports | 「异常」是来源的失败模型；等价物是校验结果状态与可见结果，而不是失败被拦截，校验职责不变（P30） |
| N28 | § Foundations | Meyer 的 *Object-Oriented Software Construction*（1997）：契约与不变量。 | 保留 | `SK` § Foundations | 为机制提供契约谱系的软件工程文献；没有规则要求采用该运行时（P32） |
| N29 | § Foundations | Sutter 的 *Exceptional C++*（1999）：异常安全保证。 | 保留 | `SK` § Foundations | 点名该书主题的软件工程文献；没有规则要求 C++ 异常语义（P33） |
| N30 | § Foundations | Armstrong 的论文（2003）：隔离与监督，附带其链接。 | 保留 | `SK` § Foundations | 为监督提供依据的软件工程文献；链接是外部的，因此不是相对路径依赖，也没有规则要求 Erlang 运行时（P34） |

### 目标裁决

| # | 裁决 | 理由 | 可逆方式 |
|---|---|---|---|
| R1 | 技能是一份纯行文的 `SKILL.md`：没有随附脚本、没有 `references/` 目录、没有 `compatibility` 字段。 | 来源中没有一条规则可由命令判定；正文远在规范的行数与 token 上限之内；技能没有环境要求。 | 增加脚本或参考会改动本记录与门禁运行。 |
| R2 | 产品名从 H1 中移除；引言句与四个小节标题中的三个及其顺序作为版式承载；「Catch, recover, or stop」标题在 N11a 下改编。 | 来源的产品不是目标的主题；来源唯一的载体身份文本就是 H1。 | 恢复产品名，这会重新引入来源的边界。 |
| R3 | description 保留上游触发面，点名 implementing 以及 designing 与 reviewing，点名软件，陈述被排除的相邻任务，并追加中文触发关键词；确切文本在 § 描述 中引用。 | 目标读者把规则带进代码；领域从句、排除项与中文关键词是目标的触发词汇，排除项使 description 不声称另一个技能的主题。 | 编辑 description 并重跑门禁。 |
| R4 | `assertNever` 重绑为不可达分支或失败不变量的缺陷；这类缺陷可以保持为普通错误，遏制仍然绝不把它变成成功。 | 该辅助函数是源仓库的约定；一般项目用自己的穷尽性或断言机制达到同一目的，而规则关乎缺陷的种类，不是辅助函数的名字。 | 恢复辅助函数的名字，这会把规则收窄到一个生态。 |
| R5 | 「包错误约定」变成拥有该失败的包、模块或服务的错误约定。 | 具体的拥有单元让规则可复用而不是口号；一般项目的单元可能是包、模块或服务，规则点名拥有该失败的单元。 | 把单元放宽到项目。 |
| R6 | 基础小节及其外部链接原样承载。 | 三部作品是软件工程文献；链接是外部的、绝对的，因此门禁不把它当作本地依赖。 | 移除该小节，这会丢掉来源为规则给出的理由。 |
| R7 | 落地技能从加载文本之外声明出处：其 frontmatter `license` 字段点名技能根 `THIRD_PARTY_NOTICES`，根 `THIRD_PARTY_NOTICES.md` 把它列入被改编技能。 | 仓库的改编技能约定要求安装副本可携带该声明；notice 携带上游路径、修订、关系与两份 MIT 通知，根 notice 登记该技能。 | 移除 notice 与根登记。 |
| R8 | 技能的中文评审草稿（`.zh.md`）及其配对记录（`.i18n.yaml`）只在停步时创建，由项目配对门禁检查，并由 publish 移除；本记录带有中文对侧与一致性记录。 | 请求把翻译配对限制在停步；笔记配对在最终评审时完成，并随记录移动。 | 移除笔记对侧及其一致性记录。 |
| R9 | 本记录随技能一起落在 `implemented/process/`。 | `AGENTS.md` 把锻造记录放在 `proposed/`，直到被锻造的技能交付后再移走。 | 若落地被回退，把它移回 `proposed/process/`。 |
| R10 | 目标范围是任何类型的软件项目：应用、库、命令行工具、服务、嵌入式与批处理系统。文本不假定 UI、默认开启的日志、API 文档实践、应用运行时或单一失败模型。 | 请求把软件工程点名为领域；只对产品形态应用成立的规则在那里不适用，而该技能集合的存在就是为了装进任意项目。 | 收窄范围，并在 description 中陈述呈现面假设。 |
| R11 | 只有当来源句子的运行时或产品假设在目标范围内成立，或该从句在缺失时为空真，才逐字承载；否则用基于角色或条件的措辞改编，并把结论记录为 § 预设审计 中的一行，在发生变化时还记录为 § 约束处置 中的一行改编。 | 首次停步把一句假定产品运行时的句子记录为「领域中立」；逐字忠实不是通用性。该审计让每个假设显式且可检查。 | 重写一行或该策略。 |
| R12 | 异常词汇在标题与点名它的两个句子（N11a、N15、N27）中变成处理／失败词汇；「失败」覆盖异常、结果值与其他显式失败模型。 | 来源是 TypeScript，但目标范围包括以值为失败的语言；拥有、遏制与校验规则在词汇变化后存活。 | 恢复异常词汇，这会把技能收窄到一个失败模型。 |
| R13 | 当来源点名某个汇报面或文档实践时，目标点名受影响的用户或系统实际使用的呈现面，契约记录可以是有该 API 的文档，也可以是项目中等价的记录（N12、N21、N23）。
| R14 | 落地把锻造分支 rebase 到 `refactor/dsh-skills` 的 `f1a68d0`，并把它 squash 合并为一个提交；没有推送。 | 维护中的技能集合在锻造等待期间已经前进，而 rebase 后的分支让落地变更成为当前头之上的单个提交。 | 回滚该 squash 提交。 | | 目标范围包括没有 UI 或默认日志、也没有 API 文档的项目；规则保留其必需内容与其条件句「在存在时」。 | 恢复固定的呈现面或文档实践。 |

### 要求锚点

每个处置行都是它所承载要求的一个锚点；§ 预设审计 覆盖每个承载单元——31 个处置行加上三个没有处置行的小节标题——每一行都是它所记录假设的锚点。N1 是机械的：技能门禁检查名称与目录一致。N2-N30 与 N11a 是判断：独立评审针对上游句子为每行记录一项结论，承载含义与来源不同的行就是发现。技能门禁是技能格式、规模与链接完整性的机械锚点；项目配对门禁是停步时评审草稿配对的机械锚点。触发行为没有精确锚点，记录为下面的未验证项。

### 完成

锻造的完成条件在落地之前已满足：每项上游要求都有一个带落点的处置行，每个承载单元都有一个预设结论，每个发生改动的行都陈述保留的部分与强制事实，每个保留行都陈述来源措辞为何成立；技能门禁、记录门禁、仓库套件与评审草稿配对都通过；设计审计及其针对性复审被接受，两轮独立评审也都被接受，修复确认记录在 § 评审；记录携带目标、设置、处置、预设审计、读取页面、检查日志、评审结论、裁决、未验证项、风险与移交；在维护者授权落地之前，没有发布、安装、合并或推送任何东西。

## 验证

每项要求都携带一个校验锚点：§ 约束处置 给每项要求其落点，§ 预设审计 给每个承载单元其假设结论，独立评审针对每个处置行记录一项结论。下面的检查在落地树上运行，并可从仓库根复现。

- **设计审计，锻造之前。** 一个拥有全新上下文的独立 agent 阅读了上游文件、采用者声明与本记录，并在锻造开始前解决了阻塞项、重大问题与次要问题；设计层修订在实现前再次审计。
- **技能门禁。** `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-error-handling` → `13 check(s), 0 failed`：31 行、约 753 个 token、description 299 个字符、license 59 个字符。门禁检查名称与目录是否一致、封闭的 frontmatter 字段集、链接与参考规则，以及行数与 token 预算。
- **独立评审，锻造之后。** 两位全新的评审者阅读了技能、上游文件与本记录；他们自己运行门禁，并逐行检查机制保真度、预设通用性、领域适配、触发表述、行文与记录的证据。这些轮次及其修复确认记录在 § 评审。
- **记录门禁。** `node .agents/skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml` → 当前树为 `ok   check — 38 note(s) and 76 companion(s) checked`。
- **仓库套件。** 当前树运行 `pnpm test` → 262 个测试，262 通过，0 失败。
- **DCO。** 本次锻造创建的每个提交都携带点名其作者的 `Signed-off-by`（`node scripts/verify-dco.ts --base=609514c --head=HEAD` 在 rebase 前的分支上通过），落地提交也通过同一检查：`node scripts/verify-dco.ts --base=f1a68d0 --head=HEAD` → `verify-dco: 1 commit(s) in f1a68d0..HEAD carry a Signed-off-by naming their author, and none claims a bot identity that had to be verified`（退出码 0）。
- **发布前的评审草稿配对。** `node .agents/skills/dsh-spec-skill-forge/scripts/forge.mjs pair dsh-spec-error-handling --companion .zh.md --companion .i18n.yaml` → `2 action(s), 0 failed`；删除工作草稿源的仅评审切换行后，`publish` 移除了两份声明的草稿。
- **落地与安装副本。** `sha256sum skills/dsh-spec-error-handling/SKILL.md .agents/skills/dsh-spec-error-handling/SKILL.md` → 两者均为 `b5d1ab8acfa5b925339105f6d7810db1a888d6b52173941d2ab9fd26e117ed1e`。
- **上游差异。** 用 `diff -u` 对比上游文件与落地 `SKILL.md` → 恰好名称、description、H1、N6/N10 的重绑以及六个改编单元不同；其余 20 行正文逐字节一致。
- **范围。** 落地及 provenance 修复新增了 `skills/dsh-spec-error-handling/SKILL.md`、其技能根 `THIRD_PARTY_NOTICES`、镜像的 `.agents/skills/dsh-spec-error-handling/` 副本，并在根 `THIRD_PARTY_NOTICES.md` 登记；`AGENTS.md` 已列出该技能，本记录在 `implemented/process/`，锻造工作目录已移除；`submodules/dsh/` 未被触碰。
- **格式化。** 没有 TypeScript 源码改动，因此 `pnpm run format:check` 没有新输入；技能门禁覆盖该变更引入的 Markdown 规范符合性。

### 检查日志

下面的轮次历史是锻造证据；其提交哈希点名落地 rebase 之前的锻造分支。落地检查也出现在 § 验证。

| 检查 | 命令或来源 | 结果 |
|---|---|---|
| 落地：技能门禁 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-error-handling` | `13 check(s), 0 failed`——31 行、约 753 个 token、description 299 个字符、license 59 个字符（退出码 0） |
| 落地：安装副本 | 对两份副本运行 `sha256sum` | 一致，SHA-256 `b5d1ab8a…` |
| 落地：记录门禁 | 上面的 notes 门禁 | `ok   check — 38 note(s) and 76 companion(s) checked`（退出码 0） |
| 落地：仓库套件 | `pnpm test` | 262 个测试，262 通过，0 失败（退出码 0） |
| 落地：DCO | `node scripts/verify-dco.ts --base=f1a68d0 --head=HEAD` | `verify-dco: 1 commit(s) in f1a68d0..HEAD carry a Signed-off-by naming their author, and none claims a bot identity that had to be verified`（退出码 0） |
| 落地：范围 | `git diff --name-status f1a68d0..HEAD` | `AGENTS.md`、记录移动、`skills/dsh-spec-error-handling/SKILL.md`、其 `THIRD_PARTY_NOTICES`、镜像的 `.agents/skills/dsh-spec-error-handling/` 副本与 `THIRD_PARTY_NOTICES.md` |
| 设计记录门禁 | `node .agents/skills/dsh-spec-agent-notes/scripts/notes.mjs check --root .agents/dsh-spec-agent-notes --companion .zh.md --companion .i18n.yaml` | `ok   check — 32 note(s) and 62 companion(s) checked`（退出码 0） |
| 设计审计第 1 轮（历史） | 独立审计者；报告在 `/tmp/dsh-forge/review/dsh-spec-error-handling-design-audit-round1.md` | `accept`——没有阻塞项，没有重大问题；19 个次要发现（A1–A4、B1、B2、D1、E1–E9、G1、G2、V1）已应用；审计报告的行文说「twenty」，而其发现表列出这 19 个，本记录遵循该表 |
| 设计审计第 2 轮（预设修订） | 独立审计者；报告在 `/tmp/dsh-forge/review/dsh-spec-error-handling-design-audit-round2.md` | `needs revision`——没有阻塞项；3 个重大问题（M1 六个计划句子未被记录；M2 审计只覆盖 34 个单元中的 13 个；M3 文献结论）与 18 个次要问题；全部在本次修订中应用 |
| 设计审计第 2 轮后续 | 独立审计者；报告在 `/tmp/dsh-forge/review/dsh-spec-error-handling-design-audit-round2-followup.md` | `accept`——没有阻塞项，没有重大问题；8 个残余次要问题（R1–R8，仅记录）在本次修订中应用 |
| 技能门禁第 1 轮（历史） | `node .agents/skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/dsh-spec-error-handling`；`sha256sum` | `12 check(s), 0 failed`；第 1 轮停步候选是带评审草稿切换行的 32 行（30 行交付正文，SHA-256 `032894e9…`） |
| 技能门禁第 2 轮 | `node .agents/skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/dsh-spec-error-handling`；`sha256sum` | `12 check(s), 0 failed`——停步时为 32 行、约 764 个 token，因为工作草稿源携带仅评审草稿使用的切换行；description 299 个字符（退出码 0）。工作草稿 `SKILL.md` SHA-256 `ffefc696964e96a0cdfee96ff4628fe1ee379e0b0ffb5132ffbd6318b0bdd6fc`；去掉切换行的交付正文是 30 行内容，SHA-256 `be26c7c60239286eac554a4a340481cfbc85e2463e241b81ed5b59bc4edcb55c` |
| 改编目标文本对落地技能 | 用 `diff -u` 对比上游文件与 `skills/dsh-spec-error-handling/SKILL.md` | 30 行正文中有 10 行不同——名称、description、H1、N6/N10 重绑与六个改编单元；其余 20 行与上游逐字节一致 |
| 独立评审第 1 轮（历史） | 两位独立评审者；报告在 `/tmp/dsh-forge/review/dsh-spec-error-handling-review-fidelity-round1.md` 与 `/tmp/dsh-forge/review/dsh-spec-error-handling-review-fit-round1.md` | 两者都 `accept`——没有阻塞项，没有重大问题；修复已应用并在 `2f677d6` 上确认 |
| 独立评审第 2 轮 | 两位独立评审者；报告在 `/tmp/dsh-forge/review/dsh-spec-error-handling-review-fidelity-round2.md` 与 `/tmp/dsh-forge/review/dsh-spec-error-handling-review-fit-round2.md` | 在 `8a7aa56` 上最终确认：两者都 `accept`，没有阻塞项，没有重大问题，没有新发现。历史：保真度评审接受，附 2 个只涉及记录的次要问题；适配评审接受候选，但记录需要修订（1 个重大问题、3 个次要问题）；随后修复确认发现修复提交中 `## Risks` 小节被截断，从 `8779b85` 逐字恢复，残余次要问题也应用 |
| 仓库套件（历史） | `node --test 'tests/**/*.test.ts'` | 第 2 轮停步时在 rebase 前基线上 206 个测试，206 通过，0 失败（退出码 0） |
| DCO 范围（历史） | 在 rebase 前第二次停步时 `node scripts/verify-dco.ts --base=609514c --head=HEAD` | `verify-dco: 10 commit(s) in 609514c..HEAD carry a Signed-off-by naming their author, and none claims a bot identity that had to be verified`（退出码 0） |
| 评审草稿配对第 1 轮（历史） | `forge.mjs pair`；`translation-pair check` | `2 action(s), 0 failed`；`check translation-pair: ok`；草稿为修订被撤回 |
| 评审草稿配对第 2 轮 | `node .agents/skills/dsh-spec-skill-forge/scripts/forge.mjs pair dsh-spec-error-handling --companion .zh.md --companion .i18n.yaml`；此后生效的项目配对门禁 | 锻造 `pair`：`2 action(s), 0 failed`；停步时项目门禁报告 `1 named pair(s) consistent` 与 `check translation-pair: ok`（退出码 0）；`publish` 移除了两份草稿 |

## 评审

本节中的提交哈希点名落地 rebase 之前的锻造分支；rebase 重写了它们，落地状态是 `refactor/dsh-skills` 上的 squash 提交。

设计审计第 1 轮（2026-10-28）：**接受**——没有阻塞项，没有重大问题；19 个次要发现，全部应用。报告：`/tmp/dsh-forge/review/dsh-spec-error-handling-design-audit-round1.md`。技能按修订后的设计写出，并通过技能门禁。

独立评审第 1 轮（2026-10-28）：**两位评审者都接受**，没有阻塞项，没有重大问题；1 个保真度次要发现与 6 个适配次要发现，全部应用，两位评审者在 `2f677d6` 上确认了修复。报告：上面的两条第 1 轮评审路径。

维护者评审（2026-10-28）：**在通用性上需要修订。** N23 被记录为保留，尽管该句假定一个带 UI 与默认开启日志的产品，而同一类假设也存在于 N12、N21、小节标题、N15 与 N27 中。维护者指示了记录在 § 首次停步后的修订 下的针对性修订；第 1 轮评审草稿被撤回，修订后的设计在实现前再次审计。

设计审计第 2 轮（2026-10-28）：**需要修订**——没有阻塞项；3 个重大问题与 18 个次要问题。重大问题是：六个计划的目标句子没有被逐字记录；预设审计覆盖了 34 个单元中的 13 个；文献结论断言被引用作品不假定项目运行时，这对 Sutter 的 C++ 与 Armstrong 的 Erlang 来源来说是假的。每个发现都在本次修订中应用，后续审计在实现前检查已应用的修订。报告：`/tmp/dsh-forge/review/dsh-spec-error-handling-design-audit-round2.md`。

实现（2026-10-28）：技能承载六个计划句子。技能门禁报告 `12 check(s), 0 failed`（30 行、约 753 个 token），对上游的落地差异恰好包含六个改编单元、名称、description、H1 与 N6/N10 重绑；其他每一行都逐字节一致。

设计审计第 2 轮后续（2026-10-28）：**接受**——没有阻塞项，没有重大问题；8 个残余次要问题（R1–R8），全部只涉及记录并已应用。后续审计校验了六个计划目标句子、34/34 单元覆盖与逐作品的文献结论，其自己的记录门禁运行报告 `ok   check — 32 note(s) and 62 companion(s) checked`。报告：`/tmp/dsh-forge/review/dsh-spec-error-handling-design-audit-round2-followup.md`。

独立评审第 2 轮（2026-10-28）：保真度评审者**接受**，没有阻塞项，没有重大问题（2 个只涉及记录的次要问题：过时的工作草稿哈希与审计的结论标签）；适配评审者接受技能，但发现记录**需要修订**，涉及一个重大问题——同一处过时的工作草稿陈述及其将来时——加上审计词汇与三个残余的目标侧前提。每个发现都在记录中应用；修复提交上请求确认。报告：上面的两条第 2 轮评审路径。

独立评审第 2 轮确认（2026-10-28）：保真度评审者在 `2fa7b01` 上确认了它的两个次要问题；随后两位评审者都发现修复提交截断了记录的 `## Risks` 小节，该小节从 `8779b85` 逐字恢复，残余次要问题也被应用。在 `8a7aa56` 上，两位评审者确认**接受**，没有阻塞项、没有重大问题、没有新发现。

停步状态（2026-10-28，第二次停步）：两位独立评审都接受；技能门禁带配对评审草稿通过（`12 check(s), 0 failed`；含切换行 32 行、约 764 个 token；交付正文 30 行，SHA-256 `be26c7c6…`）；记录门禁、仓库套件与项目配对门禁通过；评审草稿配对是最新的；没有发布、安装、合并或推送。工作随后等待维护者评审。

落地评审（2026-10-28）：维护者评审了技能、本记录与中文评审草稿，接受它们，并指示落地——检查基线、rebase、squash 合并。落地动作与检查记录在 § 移交 与 § 验证。

## 未验证项

- **触发评估。** Agent Skills 指南的触发测试——约 20 条带标签查询，每条跑三次——没有运行：此处的客户端没有暴露触发 harness。因此确切 description 的可发现性由评审判断，而不是测量，负边界是声明的设计选择，而不是测得的触发率。
- **执行者遵循。** agent 是否应用规则是判断；没有命令能判定它，因此技能的效果由评审与维护者评审判断。
- **来源读取路径。** 锻造 worktree 没有子模块检出；来源通过主检出在 pin 修订上读取，文件哈希已记录。后来的重读证明文件的身份，而不是证明 worktree 本身持有它。
- **预设分类。** 一个句子的运行时假设是共享、空真还是不共享，是判断；§ 预设审计 为每个句子记录一项结论，评审对照目标范围检查该分类。
- **没有其他会话内容。** 记录陈述了阅读范围；外部检查者无法校验一项否定的阅读声明。
- **机制对等。** 对上游机制的保真度由评审对照来源文本判断；它不能机械证明。

## 移交

维护者评审了工作，并于 2026-10-28 授权落地。落地执行了以下动作：

- 把工作目录发布到 `skills/dsh-spec-error-handling/` 并移除工作目录，此前已从工作草稿源中删除仅评审草稿使用的切换行；`publish` 移除了声明的草稿。
- provenance 修复增加技能根 `THIRD_PARTY_NOTICES` 与 frontmatter `license` 字段，并在根 `THIRD_PARTY_NOTICES.md` 登记该技能。
- 刷新安装副本，使 `.agents/skills/dsh-spec-error-handling/` 与落地技能一致，包括其 notice。
- 把本记录移到 `implemented/process/`，并带有中文对侧与一致性记录（R8）。
- 更新 `AGENTS.md` 中的技能清单。
- 把锻造分支 rebase 到 `refactor/dsh-skills` 的 `f1a68d0`，并把它 squash 合并为一个提交；没有推送。

下面的动作与决定仍留给维护者：

- 当落地应当发布时推送 `refactor/dsh-skills`；远程跟踪分支仍指向落地前的头。
- 决定 README 技能表或另一份共享文档是否增加一行；`AGENTS.md` 已经列出该技能。
- 决定预设审计是否成为锻造技能中的常驻问题；那是一次超出本次锻造范围的共享文件变更。
- 保留或删除锻造分支与 worktree；squash 提交就是落地状态。

## 考虑过的替代方案

**原样承载上游文件，只改名字。** 它落败，因为它的三个指涉在一般项目中不存在——标题里的产品、`assertNever` 辅助函数与包约定——而它的五个句子与一个小节标题假定来源产品的运行时。来源仓库之外的读者无法据此行动，而该技能集合的采用者声明要求改动可追溯至来源或被记录为刻意偏离；保留产品词汇的复制两者都没做到。

**从机制出发用全新措辞重写规则。** 它落败，因为上游文本已经是软件工程指引，其精确性——拥有者、遏制、影响与可见性的区分——正是目标需要保留的；整篇重写会丢弃它，并要求为每个句子重新论证保真度。只有带假设的单元被改编。

**保留承载文本并增加范围段落。** 它落败，因为对目标范围的大部分而言规则将不再是规则，而边界将不得不重新定义机制所依赖的汇报呈现面；在使用点改编呈现面能让规则对每个项目保持完整。

**改编每个提到渠道或机制的句子。** 它落败，因为目标范围共享其中一些：后台任务、重试、回滚与声明的失败种类在缺失时是条件性或空真的，而不是错的；改编它们会增加词语而不改变规则。

**把正文拆成 `references/` 文件。** 它落败，因为正文是三十行，且远在规模预算之内；参考文件会隐藏内容而省不下上下文，来源也没有可保留的参考结构。

**随附一个检查设计是否有错误处理小节的脚本。** 它落败，因为来源中没有一条规则是机械可判定的：命令可以 grep 标题，但无法判定拥有者、遏制规则、保证或恢复路径是否正确。这样的脚本会发明来源没有的机制。

**保留 `assertNever` 作为示例。** 它落败，因为它点名一个生态的辅助函数；规则关乎缺陷的种类以及遏制不得做什么，目标可以在没有辅助函数名字的情况下陈述两者。

**把小节命名为「Intercept, recover, or stop」。** 它落败，因为 `handle` 是覆盖各失败模型中拦截与失败后行动的伞概念，而来源的拦截含义在 N15 中明确陈述；`intercept` 会点名一个步骤，而不是该小节的选择。

**增加实现步骤或评审清单。** 它落败，因为来源是原则的陈述，不是流程；步骤清单会把机制扩展到来源所述之外，并给读者第二份可违反的契约。

**给技能增加按文件的出处头。** 它落败，因为要求头部的通知句被限定到带 SPDX 标识符的引擎文件；落地声明是由 `license` 字段点名的技能根 `THIRD_PARTY_NOTICES`，它随安装副本移动，而不进入加载文本（R7）。

## 后果

- 该技能集合交付 `dsh-spec-error-handling`，来自 `skills/dsh-spec-error-handling/`，带一份一致的安装副本，且 `AGENTS.md` 把它列入当前技能。
- 落地正文在 30 行中有 10 行与上游不同——名称、description、H1、两处重绑（N6 与 N10）以及六个改编单元（标题、N12、N15、N21、N23 与 N27）；其余 20 行逐字节一致，四个小节及其顺序被承载。
- 技能不假定 UI、默认开启的日志、API 文档实践、应用运行时或单一失败模型；项目把规则映射到它实际使用的呈现面，§ 预设审计 记录每个承载单元的分类。
- 代价：六个单元偏离来源措辞，泛化后的汇报与文档措辞（N12、N23）必然不如来源的产品示例具体；触发评估仍未测量；记录带有中文对侧。
- 风险：过度泛化可能丢掉来源的力量；审计之外的句子仍可能携带未记录的假设；改编可能漂移；description 可能与 code-review 技能竞争；落地是一个未推送的本地提交。
- 被放弃的东西：六个改编单元上的逐字忠实与按文件的出处头。
- 回滚：回退 `refactor/dsh-skills` 上的 squash 提交并再次刷新安装副本；`submodules/dsh` 未被触碰，因此没有上游 pin 需要修复。

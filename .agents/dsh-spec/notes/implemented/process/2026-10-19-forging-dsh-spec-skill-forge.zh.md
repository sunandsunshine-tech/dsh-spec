# Agent Note: Forging dsh-spec-skill-forge

Status: implemented

[English](2026-10-19-forging-dsh-spec-skill-forge.md) | 中文

## Problem

锻造技能把来源适配给目标受众，但适配在哪里被决定——哪条规则保留原义、哪条被重绑、哪条失去对应物——留给了执行者当时的判断。相同的资料与相同的决策，两次执行可以产出不同的技能，而文本里没有任何东西能判定其中一个是错的。同时，锻造保留了一套自己的决策记录，与项目的决策机制分离，于是决策落进第二本日志，下一次会话不会去读它。

## Decision

被锻造技能是一个五步流程——收敛、锚定、起草与处置、打包脚本、核验与路由——带四份 reference（被锻造技能规则、过程规则、处置、规范核验）与一个脚本，即机械门禁。

**自适应核心是约束、处置与依据。** 上游的约束性语句带位置被枚举。解构这一遍提取陈述做法的段落；其余每条约束取第一个成立的层级——保留、适配、重绑、消解。约束表记录上游条目、处置、在被锻造技能中的位置，以及依据：目标受众事实、目的、上游原文，或本次锻造作出的决策。覆盖、举证责任与诚实规则在 `skills/dsh-spec-skill-forge/references/dispositions.md`。写明上游自身的领域以「上游有领域」为条件，记下的差异进入步骤 2 的断言。

**目标受众是三样东西，不是一样。** 它的*领域*是所处的领域及其说法，决定术语含义与改写落到哪一级。它的*环境*是被锻造技能完成工作所需的运行时与工具：无论来自脚本，还是由指令调用；写进被锻造技能的 `compatibility`，有脚本时也写进脚本头部。它的*声明处*是它的 `AGENTS.md` 或它声明的文件；存在时，实例取值由它提供以定制被锻造技能的默认值；不存在时，使用默认值。*采用者环境*是另一回事：锻造发生之处、其决策机制、草稿与记录，以及编写与测试脚本可用的工具。把其中任意两个混为一谈，事实就会被放到错误的归属地。

**记录就是项目的决策机制。** 锻造把决策写进采用者的 notes 树、ADR 集或决策日志，绑定到该机制自身的形态；没有指明机制且没有驾驶员时，兜底为 `<草稿父目录>/forge-record/<name>.md`。本仓在 `AGENTS.md` 声明形态：`.agents/dsh-spec/notes/{proposed,implemented}/process/YYYY-MM-DD-forging-<skill-name>.md` 的 Agent Note，日期是锻造开始之日，被锻造技能上线时移入 `implemented/`。本 note 就是该形态下本次锻造的记录。

**预算估算对 tokenizer 兼容。** 门禁保留规范的 5000 tokens 上限，默认按 3.3 非 CJK 字符/token 估算——取 2026 年发布模型区间的低端，实测英文约 3.3–4.7 字符/token——CJK 表意文字按 1.1 tokens/字计、CJK 标点与全角形式按 1 tokens/字计，是观测到的 0.6–1.1 tokens/字的保守端。`--chars-per-token` 用于匹配非 CJK 文本的 tokenizer。过程规则放在 `skills/dsh-spec-skill-forge/references/process-rules.md`，使正文通过保守估算。来源：[DeepSeek token 用量](https://raw.githubusercontent.com/thevibeworks/deepseek-docs/refs/heads/main/content/en/quick_start/token_usage.md)、[tokenizer 效率基准](https://zenodo.org/records/19314968)、[Presenc AI 对比](https://presenc.ai/research/llm-tokenizer-efficiency-comparison-2026)、[字符/token 表](https://docs.rs/char-token-est/latest/src/char_token_est/lib.rs.html)。

**无歧义与单一源。** 每个术语只定义一次，并按唯一指称引用；一个定义、规则或事实只有一处归属。各 reference 承载查找表与判断类检查，门禁拥有其输出所列的机械检查。description 是技能的触发点，在接受前测试。

**低成本收敛，分阶段核验。** 每次改动后，驾驶员看到文件与 diff。门禁与判断类检查在驾驶员声明设计已定稿时运行，不在每次往返后运行；核验之后才接受。实跑、独立阅读与全量回归属于采用项目的发布流程。

**上一版 121 行技能是本次锻造自身的半成品，不是参考上游。** 它在原位保留并逐条重测；改动过的规则就是上面的决策，对「本次技能自己的早期版本」不需要源约束表。

### Forging settings

| 设置 | 取值 |
|---|---|
| 模式 | 迭代；技能作用于它自身 |
| 上游 | Agent Skills 规范与会话 `7e1b9dda` 的设计决策；上一版 121 行技能是本次锻造自身的早期状态，不是上游 |
| 草稿父目录 / 被锻造技能父目录 | `docs/skills-draft/` / `skills/`；草稿在落盘后移除 |
| 语言 | 草稿中文，目标英文，请求中文；英文落盘件是转写 |
| 记录 | 本 note |
| 验收 | 驾驶员于 2026-10-19 接受落盘件 |

### Anchor list

| 指称 | 含义 | 归属 |
|---|---|---|
| 驾驶员 (Driver) | 驱动 agent 的人类 | `skills/dsh-spec-skill-forge/SKILL.md`「术语」 |
| 采用者 (Adopter) | 使用本技能锻造技能的人 | 「术语」 |
| 采用者环境 | 锻造发生之处：项目、决策机制、草稿与记录、工具 | 「术语」 |
| 目标受众 | 使用被锻造技能的人或 agent，以及他们的项目 | 「术语」 |
| 目标受众领域 | 领域及其说法；决定含义与处置层级 | 「术语」 |
| 目标受众环境 | 被锻造技能所需的运行时与工具，无论脚本还是指令 | 「术语」 |
| 采用者声明处 | 采用者的 `AGENTS.md` 或声明文件；指明机制与草稿父目录 | 「术语」 |
| 目标受众声明处 | 目标受众的 `AGENTS.md` 或声明文件；提供实例取值 | 「术语」 |
| 参考上游 | 约束所来自的资料或已有技能 | 「术语」 |
| 锻造技能 (Forge skill) | 本技能 | 「术语」 |
| 被锻造技能 (Forged skill) | 本技能的产物 | 「术语」 |
| 记录 (Record) | 项目的决策机制或兜底文件 | 「术语」、`references/process-rules.md`「记录」 |
| 目标受众事实 | 关于领域、环境或声明处的可核查陈述 | 「术语」 |
| 裁决 (Ruling) | 判据留有选择时的决策 | 「术语」、`references/process-rules.md`「上升与裁决」 |
| 源约束 (Source constraint) | 上游中约束目标受众的语句 | 「术语」、步骤 1 |
| 处置 (Disposition) | 对一条源约束作出的决策 | 「术语」、`skills/dsh-spec-skill-forge/references/dispositions.md` |
| 归属 (Home) | 定义、规则或事实被写下的唯一位置 | 「术语」、`skills/dsh-spec-skill-forge/references/forged-skill-rules.md` |
| 门禁 (Gate) | `skills/dsh-spec-skill-forge/scripts/verify-skill-spec.ts` | 「术语」 |
| 落盘产物 (Landed artifact) | 草稿或转写，核验、接受并放好后的版本 | 「术语」 |
| 规范 (Specification) | Agent Skills 规范 | 「术语」 |

## Alternatives considered

**给目标受众分级。** 细分与分组没有自然终点，任何分级都在猜测一个不断增长的空间。约束随行的判据取代它：源约束与其处置在上游侧可数，这才是覆盖检查需要的。

**在项目决策机制之外另设工作记录。** 它复制了机制，并让下一次会话去读一本项目并不拥有的日志。项目的 notes、ADR 或决策日志本就承载决策、理由与被拒方向；锻造记录绑定进那个形态，只有没有指明机制且没有驾驶员的项目才用兜底文件。

**只用一个「目标受众环境」。** 它把三样东西藏在同一个名字下：决定含义的领域、脚本必须运行的运行时、提供实例取值的声明处。拆开多花两个指称，却能把每项事实放到可核查的归属地。

**兼容语言（compatibility language）指称。** 它与规范的 `compatibility` frontmatter 字段冲突，后者表示环境要求。*请求语言* 才能说清指称的用途。

**要求本技能的 description 与其他所有技能的 description 互斥。** 采用者装有哪些技能是开放的，要求不可执行；自足性取代它。

**以「义务」为单位。** 一条指令是否保护某项义务要从环境推断，而不是从文本读出，两次执行会枚举出不同集合。源约束与处置这一对是可数的。

**在被锻造技能内为可调值提供配置面。** 默认值住在技能里，实例取值属于声明处；第二套配置面只是复制了归属。

**给被锻造技能固定章节骨架。** 形式跟随内容；骨架会与资料相抗，在由范式派生的技能里还会与范式相抗。

**给采用者强加记录格式。** 记录绑定到项目本来就在读的机制；强加章节会侵入那个项目的空间。

**点名被锻造技能依赖的伴随技能。** 那是锻造无法维持的断言；具名例子是匹配提示，技能缺席时也不付出代价。

## Consequences

锻造换来一套可数、可核查的适配流程：每条上游约束都有处置与依据，门禁检查机械的那一半，记录住在项目读决策的地方。落盘件在保守估算下通过门禁，冷启动仅凭技能目录执行步骤 1–5。

代价是实打实的。以 notes 格式承载的记录比工作日志重，兜底只让最小的锻造保持低成本。语义判断被收窄，但没有被消除：覆盖、条目与指称身份可查，单一源归属与触发质量仍需要强模型或人。四个目标受众/采用者术语必须保持区分；悄悄改名其中一个，正是它们被引入时要防止的失败。预算仍是估算——保守端为 3.3 非 CJK 字符/token 与 1.1 tokens/字的 CJK 表意文字，`--chars-per-token` 只调非 CJK 一侧——正文任何新增都必须先把内容路由出去。假名与谚文按非 CJK 费率计。触发质量在本环境仍未核验。

## Verification

落盘件：`node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.ts skills/dsh-spec-skill-forge --strict-budget` → `11 check(s), 0 failed`，exit 0，161 行，约 4667 tokens at 3.3 chars/token。

功能测试套件：`node --test 'tests/**/*.test.ts'` → 39/39 通过，其中 25 条是门禁用例。

判断类检查：触发质量未核验——本环境没有位于目标受众环境、能加载被锻造技能的 agent harness；记录原因，而不记为通过。脚本设计检查通过：门禁非交互，`--help` 含示例与退出码，`--json` 输出结构化结果，stdout 与 stderr 分离，退出码 0/1/2 有意义。

记录与链接：`dsh-spec notes check --all` → 23 条记录，结构与格式一致；对本 note 的 `translation-pair check` → 一致；对改动文件的 `md-links check` → 链接全部解析。

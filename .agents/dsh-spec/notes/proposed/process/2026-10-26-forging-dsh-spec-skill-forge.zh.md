# Agent Note: 围绕精确锚点重铸锻造技能

Status: proposed

[English](2026-10-26-forging-dsh-spec-skill-forge.md) | 中文

## Problem

锻造技能是这个包的创作机制，而它自己的正文却带着它无法裁决的散文：25 个定义，没有任何检查消费它们；一套 Docs/SOP/Script 分类，没有任何步骤把它真正落成可执行的操作；五条硬红线，其中三条可逆、一条重复了四次；一个未定义的「需要评审」触发条件；一张复述 Agent Skills guides 的检查表；以及一个它自己的 CLI 从未构建过的评审投影。它还在正文里列出了脚本的命令与旗标——第二套接口权威，会与 `--help` 逐渐背离——而它的脚本目录是 `script/`，guides 用的却是 `scripts/`。一次共享设计对话（`https://chat.deepseek.com/share/sdjwwf4df33qd04z6c`）收敛出锻造采用的衡量方式：把每一条期望都变成精确、可裁决的锚点——想要什么（正向边界）、排除什么（负向边界）、以及如何判定（验证条件）——并把锚点数量和脚本承担的份额当作结果，而不是衡量标准。不精确的锚点是噪音；不精确的机械检查比没有检查更糟。

## Proposal

围绕这一原则重建锻造技能，同时保留它的过程决策。

- **正文（96 行）。** `## Guiding principle` 承载维护者的最终原则句，并译成交付语言。`## Tools` 把两个脚本及其 `--help` 暴露为发现路径；正文不列任何命令行或退出码表，`--help` 是唯一的接口引用。`## Limits` 保留 guides 没有规定的那部分过程：先 `### Stop`，然后 `### Intent`（含模式）、`### Source`（一条来源约束可以是任何要求、禁止、条件或固定选择，而不只是情态短语）、`### Disposition`、`### Script conversion`、`### Review`（只讲不变量）。`## Verification` 让每条要求落到三种锚点之一，并携带精确性检验。`## Record` 在唯一一份记录中持有处置表。`## Defaults` 持有语言默认值。
- **删除的内容**：`## Loop`（一张复述 `--help` 的命令清单，外加一个未定义的 `forge` 别名）、`## Deliverables`（处置表属于记录）、`### Skill content`（复述 guide；它唯一独有的规则移入 `### Script conversion`）、`## Conventions`（一条写给正在锻造的 agent 的指令，而不是技能内容）、`## Gotchas`（脚本的 `--help` 与报错已经会教的事实）、独立的 `## Modes`（并入 `### Intent`），以及展开后的指导原则（精确性检验移到 `## Verification`，其余不带入）。
- **目录结构。** `script/` 变成 `scripts/`，这是 specification 与 using-scripts 的约定。改名触及该技能、`package/README.md`、`package.json`、Vite 的 `outDir`、`forge.ts` 的复制与跳过逻辑（它仍然接受遗留的 `script/`）、测试、docs，以及落地时的安装副本。
- **定义与载体。** 25 个术语的清单被删除；术语在首次使用处陈述。Docs/SOP/Script 分类消解为 guides 的渐进披露加上 `Script conversion` 规则。`Format` 被删除：guides 拥有产品标准。
- **红线。** 只留两条：未授权覆盖或删除既有技能；环境禁止或无法逆转的操作。缺失运行时、声明位置变更以及来源/领域冲突改为错误退出与记录在案的裁定。
- **机械锚点。** `verify-skill-spec.mjs` 以词边界匹配 `script/` 与 `scripts/`，用 `path.relative` 解析链接，去除 BOM 与 CRLF，忽略围栏代码块内的链接，并对正文施加一条严格的「不超限」预算。`forge.mjs` 实现评审投影：`review/<name>/` 里每一份撰写出的 `.md` 都在 frontmatter 的 `metadata.forge-review` 中携带 `source=<path> source_sha=<hash> stale=<true|false>`，因此评审文件仍是可解析的 Markdown 文档；`review` 为缺失文件生成脚手架（标为 `stale=true`，直到被接受），并把来源已变的文件标为 stale，`review --accept` 清除 stale 并刷新哈希，`review --copy` 写出直抄的同语言副本，`land` 拦下缺失、stale 或不匹配的投影（可用 `--allow-stale` 覆盖）。`--from` 遇到既有草稿时 `draft` 报错；`scripts/` 与 `assets/` 逐字节复制，不带戳记。
- **Reference。** 离线 fallback 去掉两句本地策略句（目标运行时红线；把本仓库的门禁当成规范的校验器），去掉「所有 when-to-use 都放在 description 里」的越界说法，以及它对规则约束力的抹平。

### Settings

| 设置 | 值 |
|---|---|
| 模式 | iterate；已落地的锻造技能是工作草稿的来源 |
| 锻造目录 / 落地 | `.agents/dsh-spec-skill-forge/` / `skills/dsh-spec-skill-forge/` |
| 草稿 | 落地时删除工作草稿与评审草稿 |
| 语言 | 交付英文；评审中文；触发中文 |
| 记录 | 本笔记 |
| 回滚 | 把 `skills/dsh-spec-skill-forge/`、`package/dsh-spec-skill-forge/`、测试与本三元组恢复到落地前的状态 |

### Dispositions

| 原内容 | 处置 | 新家 |
|---|---|---|
| 25 个术语的 `Definitions` 清单 | dissolve | 术语在首次使用处陈述；不保留清单 |
| `Docs` / `SOP` / `Script` 分类 | dissolve | guides 的渐进披露；`Script conversion` 规则承担脚本决定 |
| 五条硬红线 | re-bind | `Stop`：两个条件；其余是裁定或错误退出 |
| 交互规则（红线之外不问） | keep | `Stop` |
| 语言矩阵 | keep | `Defaults` 加上 `Review` 触发条件 |
| 锻造目录默认值 | adapt | 脚本的默认值与 `--help`；`Record` 点名它 |
| 记录的三级 fallback 与强制标题 | re-bind | `Record`：默认位置与默认内容；既有机制拥有其正文 |
| 草稿规则 | re-bind | `Review` 加上投影约定 |
| 「评审草稿仅在……需要评审时才存在」 | re-bind | 触发条件：评审语言不同，或采用者要求 |
| `Format` 规则 | dissolve | Agent Skills guides 拥有格式；锻造技能引用它们 |
| SSOT / Unambiguity 的逐条列举 | dissolve | 写作经济性由 guides 拥有；正文不设第二权威规则 |
| 带每步 Complete/Check/Failure 的三步 SOP | dissolve | `Limits` + `Verification`；没有逐步仪式 |
| 命名规则 | dissolve | 门禁检查 guides 的规则 |
| 触发与 Scripts 检查行 | dissolve | guides 拥有那些标准；正文引用它们 |
| 「读……及其链接的全部内容」 | adapt | 「best practices 及其链接的内容」；不列举页面 |
| 离线 fallback | keep | 修正后的 reference，仍不是第二权威 |
| 创建 / 迭代模式 | keep | 并入 `Intent` |
| `## Loop` 命令清单 | dissolve | `## Tools` 点名脚本；`--help` 就是接口 |
| 正文中的旗标、退出码与 JSON 输出 | dissolve | `--help` 与调用结果携带它们 |
| `## Deliverables` | dissolve | description 携带目标；`Record` 携带处置表 |
| `### Skill content` | dissolve | 内容放置属于 guides；脚本规则移到 `### Script conversion` |
| `## Conventions` | dissolve | 一条写给正在锻造的 agent 的指令，而不是技能内容 |
| `## Gotchas` | dissolve | 脚本的 `--help` 与报错携带那些事实 |
| 展开后的指导原则 | re-bind | 精确性检验在 `Verification`；其余不带入 |
| `script/` 目录名 | adapt | `scripts/`，guides 的约定；`forge.mjs` 仍接受遗留的 `script/` |
| `review` 只镜像 `script/` | dissolve | `forge.mjs` 里的带戳记投影 |

### Exclusions

以下规则与机制没有消费者或指称不明，因此不带入：评审反馈文件（`feedback.md`）——对话中的提议，没有任何命令读取它，相关正文句、脚本排除逻辑与测试均已删除；「记录未收集的线索及其预期价值」——记录清单中没有它的归属处；「说明责任与尝试顺序」——指称对象从未定义；「用『例如』引出示例」——属于 guides 的写作风格；重复的「评审草稿永远不是第二权威」与重复的「指南不可读」失败行；「轮次文档」——未定义术语；单一归属规则与 description 定义——属于 guides 的写作经济性；`compatibility` 从句与机械行中的命令命名、参数与边界测试细节——属于 guides 的规范与脚本指导；`Script conversion` 中的脚本接口细节——属于 guides，只保留转换规则与「参数与安全默认值」的要求；含糊的「严格形式」——改写成门禁的失败条件。记录清单现在只点名一次处置表，而不是两次。

### Verification

工作草稿于 2026-10-26 通过门禁：

- `node scripts/verify-skill-spec.mjs <work-draft> --strict-budget` → 11 项检查，0 失败；96 行，约 2,290 tokens。
- `pnpm test` → 102 项测试，0 失败（39 个生命周期用例、41 个门禁用例，其余为仓库检查）。
- 对照 guides 的内容判断，每份一个结论：specification——目录、frontmatter、链接与体量规则由门禁实际执行，并引用该 guide，OK；best-practices——范围、上下文经济性、校准与模式留给 guides，锻造技能只添加过程，OK；optimizing-descriptions——触发评测参数被引用，而非复述，OK；using-scripts——脚本接口通过 `--help` 暴露，OK；evaluating-skills——判断类与未验证类锚点路由到那里，OK。
- 脚本探测：`forge.mjs --help` 与 `verify-skill-spec.mjs --help` 退出码 0；两个脚本都非交互，把诊断打到 stderr，写明退出码 0/1/2，并接受 `--json`；`forge` 接受 `--dry-run`。
- `pnpm run format:check`、`notes check --all`、`translation-pair check` 与 `md-links check` 通过。
- 改名检查在工作草稿、`package/README.md`、`package.json`、Vite 配置、测试与 docs 中没有发现残留的 `script/` 引用；`forge.mjs` 只为采用者接受遗留的 `script/`。
- 评审：`scripts/` 下的评审投影携带 `SKILL.md` 与 reference 的译文；维护者的验收仍待进行。

### Unverified

- 锻造技能自身的触发评测。本环境没有可用的观测客户端，因此查询集运行记为未验证；理由是缺少客户端，而不是决定跳过它。

## Alternatives considered

**保留三步 SOP，只修它的检查。** 它落败，因为不精确的正是结构：步骤带着没有执行者能裁决的仪式，而评审投影在任何步骤里都没有家。

**保留 25 个定义，只裁掉没人用的那些。** 它落败，因为大多数术语没有消费方，而一个术语的精确位置就在它首次使用处；一份清单给每个术语都添了第二个家。

**保留五条硬红线。** 它在精确性上落败：三条可逆，一条在四处重复，于是这套停止条件并没有决定何时停止。

**把命令清单留在正文里。** 它落败，因为脚本的 `--help` 是唯一的接口权威；第二份清单会与它背离，而调用结果已经会教旗标与退出码。

**保留 `script/` 而不是 `scripts/`。** 它落败，因为 specification 与 using-scripts 都用 `scripts/`，而只有这一个技能附带脚本，所以迁移只触及一个包、它的测试与它的 docs。

**让 `land` 调用门禁。** 它落败，因为这把两个脚本耦合起来，还藏起了证据路径；正文把门禁陈述为机械锚点，记录携带它的输出。

**把评审保留为手写的第二份正文。** 它落败，因为没有任何东西能发现它过期；戳记让新鲜度成为机械锚点。

## Acceptance criteria

- 落地的锻造技能带 `--strict-budget` 通过它自己的门禁，且 `pnpm test` 与 `pnpm run format:check` 通过。
- 评审投影被接受；记录的评审章节携带结论。
- 每条被取代的规则在上表都有一个处置；没有规则有两个家。
- 安装副本用 `pnpm run skill:refresh` 刷新；移植附录与 `package/README.md` 都写 `scripts/`。
- 正文不携带命令清单或退出码表；`--help` 就是接口。

## Risks

- [三步记录](../../implemented/process/2026-10-23-reforge-the-skill-forge-as-three-steps.zh.md) 被部分取代：它的三步决定与「脚本不变」这一事实不再成立。它保持活跃并互相链接；日后的合并可能移除它。
- 预算是严格且只计正文的 token 计数；依赖把整个文件都计入的估算的采用者会看到不同的数字。
- 同语言的 `--copy` 路径与 `--allow-stale` 已实现并有测试，但尚未在采用者项目中运行过。
- 脚本的 `--help` 是唯一的接口描述；不完整的 `--help` 会让采用者失去指引，因此用法文本是契约的一部分。
- 触发评测在客户端可用之前保持未验证。

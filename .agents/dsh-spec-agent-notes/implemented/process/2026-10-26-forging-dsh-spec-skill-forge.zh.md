# Agent Note: 围绕精准锚点重铸锻造技能

Status: implemented

[English](2026-10-26-forging-dsh-spec-skill-forge.md) | 中文

## Problem

锻造技能是这个包的制作机制，而它自己的正文带着无法判定的散文：没有消费检查的定义、没有任何步骤落实的分类、互相重叠的硬红线、未定义的评审触发、复述 Agent Skills guides 的检查表，以及一个它自己的 CLI 从未构建过的评审投影。它把完整选项集写进正文，形成第二接口权威；脚本目录用 `script/`，而 guides 用 `scripts/`。

## Decision

- **正文。** `## Guiding principles` 承载 context-not-control 与锚定方法，译成交付语言。`## Tools` 列出 draft、pair、publish 命令与只读门禁；每条命令的 `--help` 承载完整选项集。`## Limits` 先读 Agent Skills 索引、必须读它链接的最佳实践页，其他链接页面按需阅读，要求按其要求撰写，并保持离线回退无链接。过程保留：`### Stop`、`### Intent`（Stop 边界内设计开放）、`### Source`、`### Disposition`（条件互斥）、`### Script conversion`、`### Review`（译文配对）。`## Verification` 给每条要求三种锚点之一并承载精确性检验。`## Record` 放处置表。语言默认值放在各自使用处：交付语言在 `### Intent`，附加触发语言在 `### Review`，记录语言与翻译在 `## Record`；不再有单独的 defaults 表。
- **锚定。** 每个期望都变成精准、可判定的锚点，锚定形式根据目标与任务的确定程度选择：正向边界吸引、负向边界排斥、验证决定继续/调整/终止；锚定形式不要求全部机械化；高后果的模糊地带要有安全兜底、触发条件与阻断/移交；开放地带要说明允许发散的范围与不可越过的边界；不精准的锚点是噪音，不精准的机械检查比没有更糟。锻造出的技能塑造的是 agent 的上下文，不是它的路径；控制只保留给授权、不可逆动作、安全与必需验证。该立场的一般形式在项目的 prompt 要求中（可用时使用 `dsh-spec-agent-experience` 技能）；Agent Skills 最佳实践高于本技能的指导原则，这些要求拥有 prompt 与上下文结构的裁决。
- **一个工作目录。** 锻造位于 `.agents/dsh-spec-skill-forge/<name>/`；没有 `draft/` 或 `review/` 子树。`record/` 留在旁边。
- **审查草稿。** 锻造技能声明、报告并移除审查草稿伴随文件；配对是否最新由项目自己的配对门禁拥有，锻造技能不保存配对记录。[2026-10-27 记录](2026-10-27-forging-dsh-spec-skill-forge.zh.md) 取代了本记录的 review 命令与配对记录设计。
- **简单发布。** `publish` 先移除工作目录中的译文配对，再把工作目录复制到落地目录，最后移除工作目录。既有 target 被覆盖。脚本不跑 gate、不保留备份、不做 staging、不 canonical 化路径、不处理 symlink 与竞态。采用方的验收授权这次覆盖，VCS 是回滚；发布是普通复制，不是事务。
- **只读检查。** `verify-skill-spec.mjs` 检查 Agent Skills 规范；配对新鲜度由项目自己的配对门禁检查。两者都不是发布 gate。已知的只读限制（部分绝对链接形式、罕见 CJK 扩展区、script coverage 过严、standalone gate 的 symlink 范围）记录为限制，而不是扩大 publisher 的理由。
- **构建。** `build.ts` 对每个 entry 各跑一次自包含 `vp pack`；`yaml` 在两个脚本中解析 frontmatter。`THIRD_PARTY_NOTICES` 列出所有随附依赖并附全文许可证。
- **删除。** 评审投影与戳记、`stale`、`--accept`、`--copy`、`--remove`、`--allow-stale`、review 目录、`land`；以及 publisher 事务：`--force`、备份、staging、canonical/realpath 身份、symlink 策略、swap 前复核、publish 内 gate。发布就是复制。
- **记录语言与翻译。** 记录用英文撰写；翻译遵循采用者的声明，没有声明时译为采用者语言。两者都是英文时不产生独立翻译。采用者拥有翻译机制及其一致性记录；锻造技能不点名它们。
- 锻造技能位于 `skills/dsh-spec-skill-forge/`；交付语言为英文，评审语言与附加触发语言为中文。

### 处置

| 原内容 | 处置 | 归属 |
|---|---|---|
| 定义列表、Docs/SOP/Script 分类 | dissolve | 术语首次使用处说明；guides 的渐进披露 |
| 五条硬红线 | re-bind | `Stop`：两条；其余是裁定 |
| 评审投影与 frontmatter 戳记 | dissolve | 译文配对加配对记录 |
| `stale`、`--accept`、`--copy`、`--remove`、`--allow-stale` | dissolve | `review` 与 `review --check` |
| `review/` 目录、`land` | dissolve / re-bind | 配对在源文件旁；`publish` |
| 自定义 publisher 事务 | dissolve | 普通覆盖；验收与 VCS 授权并回滚 |
| `--force`、备份、staging、canonical 身份、symlink 策略 | dissolve | 不再属于技能 scope |
| body-content 规则 | dissolve | 规范的最小示例没有正文 |
| 行正则 frontmatter | re-bind | `yaml` 解析 |
| `<name>` 配对占位 | re-bind | `<source-basename>.<lang>.md`，附 `SKILL.md` 示例 |
| 一次构建两个 bundle | re-bind | `build.ts` 每个 entry 各自自包含 |

### 排除

以下不带入：评审反馈文件；未收集线索；未定义的责任/尝试顺序规则；guides 拥有的修复策略、触发测试写法、参数/默认值与脚本决策标准；创建/迭代模式分类；record 强制、review/audit 描述触发词、译文哈希/评审者与捆绑 trigger/output evals——这些保持自然语言锚点或委托判断；review/audit 模式——技能 scope 是锻造；以及 publisher 的事务保证——普通复制不承诺它们。

## Alternatives considered

**保留自定义 publisher 并继续加固。** 它输了，因为每个保护都产生新的文件系统/并发边角，surface 无界。普通覆盖 + Git 回滚是诚实的 scope。

**删掉 `publish`，把发布交给 shell。** 它输了，因为复制是技能的最后一步，一个小命令保留工作目录/配对约定可见；命令不携带事务保证。

**把 gate 放进 publish。** 它输了，因为这让 publish 看起来像安全 gate；gate 是独立的只读检查，由 agent 运行，采用方的验收授权覆盖。

**保留评审投影。** 它输了，因为工具无法验证译文，只产生戳记与 stale 状态；配对用更少状态记录同一事实。

**保留处置表的交叉条件。** 它输了，因为 Adapt/Re-bind 重叠且没有无等价手段的回退；条件互斥。

## Consequences

锻造技能以一个正文、一个一层 reference、两个自包含脚本、审查草稿约定与只读门禁的形式交付。`publish` 是四步普通复制：prepare、移除配对、复制并覆盖落地目录、移除工作目录。

买到的：一个小的过程技能、可机械检查的正文、可复现的门禁，以及没有第二套状态存储的审查草稿约定。付出的：`publish` 除 Git 外没有回滚，也不验证 target；门禁带有已知只读限制（部分绝对链接形式、罕见 CJK 区、script coverage 过严、standalone gate 的 symlink 范围）；记录完整性、译文忠实、触发评测与 audit-mode 判断仍由人负责。[三步 note](2026-10-23-reforge-the-skill-forge-as-three-steps.zh.md) 被本决定部分取代。[2026-10-27 记录](2026-10-27-forging-dsh-spec-skill-forge.zh.md) 部分取代本记录：审查草稿是声明式的，配对一致性由项目自己的配对门禁拥有。

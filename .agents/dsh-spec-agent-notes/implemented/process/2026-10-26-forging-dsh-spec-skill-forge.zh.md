# Agent Note: 围绕精准锚点重铸锻造技能

Status: implemented

[English](2026-10-26-forging-dsh-spec-skill-forge.md) | 中文

## Problem

锻造技能是这个包的制作机制，而它自己的正文带着无法判定的散文：没有消费检查的定义、没有任何步骤落实的分类、互相重叠的硬红线、未定义的评审触发、复述 Agent Skills guides 的检查表，以及一个它自己的 CLI 从未构建过的评审投影。它把命令与参数写进正文，形成第二接口权威；脚本目录用 `script/`，而 guides 用 `scripts/`。

一次共享设计评审提炼出度量：把每个期望变成精准、可判定的锚点，锚点数量与机械比例是结果。维护者随后把原则替换为按确定性匹配的原则：根据目标与任务的确定程度选择锚定形式；正向边界吸引、负向边界排斥、验证决定继续/调整/终止；锚定形式不要求全部机械化；高后果的模糊地带要有安全兜底、触发条件与阻断/移交；开放地带要说明允许发散的范围与不可越过的边界。不精准的锚点是噪音；不精准的机械检查比没有更糟。

随后进行了七次只读审计。它们确立了 guide 链接、声明定义、gate、译文配对与无 metadata 的配对记录；也显示：每给自定义 publisher 加一个保护，就多一个文件系统边角：投影状态、target 保护、备份、staging、symlink、canonical 路径、竞态。第七次审计仍在 `publish` 里找到数据丢失与竞态路径。维护者判断 publisher 本身就是错误的 scope：发布是普通覆盖，不是事务。gate 与配对检查是只读的；Git 是回滚。

## Decision

- **正文（93 行）。** `## Guiding principle` 承载按确定性匹配的原则，译成交付语言。`## Tools` 通过 `--help` 暴露两个只读检查与 draft/pair 命令。`## Limits` 先读 Agent Skills 索引、必须读它链接的最佳实践页，其他链接页面按需阅读，要求按其要求撰写，并保持离线回退无链接。过程保留：`### Stop`、`### Intent`（Stop 边界内设计开放）、`### Source`、`### Disposition`（条件互斥）、`### Script conversion`、`### Review`（译文配对）。`## Verification` 给每条要求三种锚点之一并承载精确性检验。`## Record` 放处置表。`## Defaults` 放语言默认值。
- **一个工作目录。** 锻造位于 `.agents/dsh-spec-skill-forge/<name>/`；没有 `draft/` 或 `review/` 子树。`record/` 留在旁边。
- **译文配对。** 评审副本是源 `.md` 旁的 `<source-basename>.<lang>.md`，加上只记录源哈希的 `<source-basename>.i18n.yaml`；`SKILL.md` 配对 `SKILL.<lang>.md` 与 `SKILL.i18n.yaml`。只有 `.md` 文件配对；脚本与资源不翻译。译文 frontmatter 不带 metadata。`review` 记录源哈希；`review --check` 列出缺失、过期、多个与无源配对。
- **简单发布。** `publish` 先移除工作目录中的译文配对，再把工作目录复制到落地目录，最后移除工作目录。既有 target 被覆盖。脚本不跑 gate、不保留备份、不做 staging、不 canonical 化路径、不处理 symlink 与竞态。采用方的验收与 VCS 是授权与回滚。
- **只读检查。** `verify-skill-spec.mjs` 检查 Agent Skills 规范；`review --check` 检查配对新鲜度。两者都不是发布 gate。已知的只读限制（部分绝对链接形式、罕见 CJK 扩展区、script coverage 过严、standalone gate 的 symlink 范围）记录为限制，而不是扩大 publisher 的理由。
- **构建。** `build.ts` 对每个 entry 各跑一次自包含 `vp pack`；`yaml` 在两个脚本中解析 frontmatter。`THIRD_PARTY_NOTICES` 列出所有随附依赖并附全文许可证。
- **删除。** 评审投影与戳记、`stale`、`--accept`、`--copy`、`--remove`、`--allow-stale`、review 目录、`land`；以及后来的 publisher 事务：`--force`、备份、staging、canonical/realpath 身份、symlink 策略、swap 前复核、publish 内 gate。发布就是复制。

### 设置

| 设置 | 值 |
|---|---|
| 锻造目录 / 落地 | `.agents/dsh-spec-skill-forge/` / `skills/dsh-spec-skill-forge/` |
| 工作目录 | `<forge>/<name>/`，发布时移除 |
| 评审副本 | 源文件旁的译文配对；发布时移除 |
| 发布 | 先移除配对，再复制工作目录，最后移除工作目录 |
| 语言 | 交付英语；评审中文；触发中文 |
| 记录 | 本 note |
| 回滚 | Git 与记录；发布不保留备份 |

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

以下不带入：评审反馈文件；未收集线索；未定义的责任/尝试顺序规则；guides 拥有的修复策略、触发测试写法、参数/默认值与脚本决策标准；创建/迭代模式分类；record 强制、review/audit 描述触发词、译文哈希/评审者与捆绑 trigger/output evals——这些按维护者决定保持自然语言锚点或委托判断；review/audit 模式——技能 scope 是锻造，审计只借其过程；以及 publisher 的事务保证——普通复制不承诺它们。

### 审计

七次在临时项目中对已安装技能的只读审计分别发现了 17、17、12、10、第五、第六与第七组缺口。早期审计确立了 guide URL、声明、落地保护、gate、记录字段与配对模型。第四到第六轮加固了 review、publish、路径、配对与 gate；第七轮仍在 publisher 里找到数据丢失与竞态路径。修复不是再加保护：publisher 缩为普通覆盖，gate 与配对检查保持只读，已知只读限制被记录。随后对最终 publish 的快速审查通过；维护者接受。不再计划第八轮审计。

### 验证

工作目录于 2026-10-26 通过检查并被发布：

- `node scripts/verify-skill-spec.mjs <work-directory>` → 14 项检查，0 失败；93 行，约 2,595 tokens；同一门禁在 `skills/dsh-spec-skill-forge` 与刷新后的安装副本上通过。
- `pnpm test` → 112 项测试，0 失败（27 个生命周期用例、63 个门禁用例，其余为仓库检查）。
- 发布前 `forge.mjs review --check` 报告两对译文配对最新；publish 随后随工作目录移除了配对。
- `forge.mjs publish --dry-run --into skills/dsh-spec-skill-forge` → 4 个动作，0 失败；计划为 prepare、pairs、copy、remove；真实发布执行了这四个动作。
- `pnpm run format:check`、`notes check --all`、`translation-pair check` 与 `md-links check` 通过。
- 评审：工作目录携带 `SKILL.zh.md` 与 reference 译文，各自带有最新的 `.i18n.yaml` 记录且 frontmatter 无 metadata；维护者接受了最终发布。

### 未验证

- 锻造技能自身的触发评测；此环境没有观察客户端。
- 译文忠实：配对记录证明源版本，不证明译文忠实。
- gate 的已知只读限制：部分绝对链接形式、罕见 CJK 扩展区、script coverage 过严与 standalone gate 的 symlink 范围。
- audit 模式与 evals 属于 out of scope；审计只借其过程当 rubric。

## Alternatives considered

**保留自定义 publisher 并继续加固。** 它输了七轮审计：每个保护都产生新的文件系统/并发边角，surface 无界。普通覆盖 + Git 回滚是诚实的 scope。

**删掉 `publish`，把发布交给 shell。** 它输了，因为复制是技能的最后一步，一个小命令保留工作目录/配对约定可见；命令不携带事务保证。

**把 gate 放进 publish。** 它输了，因为这让 publish 看起来像安全 gate；gate 是独立的只读检查，由 agent 运行，采用方的验收授权覆盖。

**保留评审投影。** 它输了，因为工具无法验证译文，只产生戳记与 stale 状态；配对用更少状态记录同一事实。

**保留处置表的交叉条件。** 它输了，因为 Adapt/Re-bind 重叠且没有无等价手段的回退；条件现在互斥。

## Consequences

锻造技能以 93 行正文、一个一层 reference、两个自包含脚本、译文配对记录与只读门禁的形式交付。`publish` 是四步普通复制：prepare、移除配对、复制并覆盖落地目录、移除工作目录。七轮审计加固循环最终收束到这个简单 scope，快速审查与维护者验收完成了收尾。

买到的：一个小的过程技能、可机械检查的正文、可复现的门禁，以及没有第二套状态存储的配对新鲜度记录。付出的：`publish` 除 Git 外没有回滚，也不验证 target；门禁带有已知只读限制（部分绝对链接形式、罕见 CJK 区、script coverage 过严、standalone gate 的 symlink 范围）；记录完整性、译文忠实、触发评测与 audit-mode 判断仍由人负责。[三步 note](2026-10-23-reforge-the-skill-forge-as-three-steps.zh.md) 被本决定部分取代。

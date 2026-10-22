# Agent Note：把 dsh-spec-skill-forge 锻造成组合优先的技能

Status: implemented

[English](2026-10-21-forging-dsh-spec-skill-forge.md) | 中文

## Problem

旧锻造技能是五步流程，带四份 reference 和一个自带门禁。它的适配和预算决定分散在流程阶段里，草稿、记录、description 和技能目录结构没有遵循同一条组成规则。锻造技能需要从 Docs、SOP 和 Script 推出目标技能，明确技能结构和嵌套步骤，并把最终断言变成带预算路由的规范检查。

## Decision

锻造技能是三步 SOP：意图识别、Docs/SOP/Script 的采集分析与处置、重组技能。重组有两个嵌套步骤——重组和完成 Script——各自有完成判断、检查方法和失败恢复。父步骤断言两个子步骤都完成。重组先给出技能结构，再生成完全内联的正文，抽取全局释义、全局准则和成果断言，最后整理。

技能结构有六层：触发条件、技能定义与边界、全局释义、全局准则、SOP 步骤和成果断言。层内行文形式不限。默认格式是并列词用顿号或逗号，条件和分支用列表或表格，结构化内容用表格。采用者的声明位置可以覆盖默认格式。

SOP 步骤可以嵌套。每一层都有自己的任务、所需 Docs 和 Script、完成判断、检查方法和失败恢复。子步骤使用下一级编号，父步骤的完成判断覆盖子步骤。

成果断言要求被锻造技能满足全局准则、全部 SOP 步骤的断言、[Agent Skills 规范](https://agentskills.io/specification)和[最佳实践](https://agentskills.io/skill-creation/best-practices)。可机械判断的检查用 `script/verify-skill-spec.mjs`，支持项见 `--help`。脚本不支持的检查用临时脚本判断，非机械部分直接判断。检查参数来自规范和最佳实践。

检查器用打包的 `yaml` 解析 frontmatter，验证语法和映射形状、必填与可选字段类型、metadata 字符串键值、重复键、`allowed-tools` 空格分隔、name 和 description 限制、目录和链接规则、reference 与 script 提及，以及行数和 token 预算。默认 token 估算是中文每字符 0.6，英文每字符 0.3。正文超预算时，先在不损失精度的前提下压缩，再只抽取真正可选的材料，最后把全部 SOP 步骤整体路由到 `references/<步骤>.md`。正文保留步骤顺序和每步引用，断言和依赖随步骤移动。每次调整后重跑检查器；由成果断言引起的调整重走技能 SOP。

默认锻造目录是 `.agents/dsh-spec-skill-forge/`，下面有 `record/<名称>.md`、`draft/<名称>/` 和 `review/<名称>/`。声明位置可以覆盖各项默认值。语言使用默认值：交付英语，审查采用者语言（这里是中文），附加触发语言是审查语言。工作草稿和落地产物是英文正文加中文触发。审查草稿是中文正文加英文触发。审查是投影，不是新判断。

技能脚本源码在 `package/<名称>/`。`vp run build:work` 打包到工作草稿的 `script/`，`vp run copy:review` 复制到审查草稿，`vp run land:skills` 在审查接受后把工作草稿复制到 `skills/<名称>/`。`vp run refresh:skills` 刷新已安装副本。锻造技能门禁源码是 `package/dsh-spec-skill-forge/verify-skill-spec.ts`，落地门禁是 `skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs`。

### Forging settings

| Setting | Value |
|---|---|
| Mode | 迭代；技能应用到自身 |
| Upstream | 旧五步技能及其 reference、已移除的 318 行中文备份、旧 implemented note，以及设计对话 |
| Draft parent / forged skill's parent | `.agents/dsh-spec-skill-forge/draft/` / `skills/dsh-spec-skill-forge/`；落地后草稿和审查草稿已删除 |
| Languages | 使用默认值：交付英语，审查中文（采用者语言），附加触发中文；落地产物英文正文加中文触发 |
| Description | 英文触发句加中文触发；不出现正文概念；不写“讲解/已完成” |
| Record | 本 note |
| Acceptance | 驾驶员于 2026-10-22 接受审查草稿并落地 |

### Dispositions

| Upstream item | Disposition | Location | Basis |
|---|---|---|---|
| 五步流程（收敛、锚定、起草与处置、脚本、核验与路由） | 重新绑定 | 三步 SOP；组成核心是第 3 步 | 技能身份是组成规则，不是旧流程阶段 |
| 四份 reference 与自带门禁 | 适配 | 规则内联；打包门禁；目标项目检查器 | 自包含技能与 SSOT |
| 草稿/驾驶员交互（展示 diff、逐次接受） | 重新绑定 | 工作草稿 + 审查草稿；只有硬红线和最终审查到达驾驶员；其余决定用裁定 | 硬红线与最终审查之外驾驶员注意力为零 |
| 草稿/目标/请求语言与转写 | 适配 | 交付语言、审查语言、附加触发语言；审查投影 | Agent Skills description 触发；工作/审查成对 |
| 步骤级核验与最终检查清单 | 重新绑定 | `成果断言` 中的技能规范断言与超标路由 | 最终成果是过程中唯一无法断言的对象 |
| 资源按需路由 | 重新绑定 | 三层落位；只有真正可选、可加载且内聚时才挂引用 | 必然被加载的引用只增加成本 |
| 脚本打包作为独立步骤 | 重新绑定 | 放在重组技能的 3.2；不单列顶层 SOP 步骤 | 组成步骤拥有被锻造技能的资源 |
| 分号串联与过度拆分的列表 | 适配 | 并列词用顿号；条件和分支用列表或表格 | 格式规则负责形式 |
| 记录即项目决策机制 | 保留 | 本 Agent Note | 仓库在 `AGENTS.md` 声明 notes 形态 |

### Verification

`node skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs skills/dsh-spec-skill-forge --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 11 checks, 0 failed, 181 lines, ~3,363 tokens，strict budget 通过。脚本默认值约 3,437 tokens，也通过。三个 SOP 步骤整体路由到 `references/`，使正文留在预算内。

检查器用打包的 `yaml` 解析 frontmatter；测试覆盖非法 YAML、非 mapping frontmatter、重复键、字段类型、metadata map、`allowed-tools` 空格和数值参数。`node --test 'tests/**/*.test.ts'` → 47 通过。`vp run build:work` 和 `vp run copy:review` 生成一致的工作/审查脚本。`dsh-spec notes check --all` → 24 条记录，具名 translation pair 和改动的 Markdown 链接检查通过。`dsh-spec check --all` 仍报一个既有的 `norm-reference` 失败，因为本分支没有 `.agents/skills/dsh-spec-manager/references/norms.json`；这是 installed-skills 状态，不是本技能的问题。

外部触发质量、冷启动和任务效用仍未验证：本环境没有位于目标受众环境、能加载被锻造技能的 agent harness。它们记录为缺口，不记为通过。

### Review and landing

审查草稿是中文正文加英文触发，生成在 `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`。驾驶员接受后，`vp run land:skills` 把工作草稿复制到 `skills/dsh-spec-skill-forge/`，`vp run refresh:skills` 刷新已安装副本，草稿和审查目录已删除。

## Alternatives considered

**保留五步流程并压缩。** 它落败，因为修正把技能身份移到 Docs/SOP/Script 组成规则和技能结构；压缩旧阶段会保留流程外壳，并继续把草稿/核验规则混进步骤。

**保留四份 reference 与自带门禁。** 它落败，因为技能是一个带打包检查器的自包含技能；第二个门禁会让同一套规则有两个权威。

**保留旧语言模型且不设审查草稿。** 它落败，因为落地前由驾驶员审查是明确修正：审查草稿是驾驶员看到结果的位置，工作草稿不能在未审查时落地。

**让成果断言复述全局准则和步骤断言。** 它落败，因为这些在过程中已经可检查；成果断言只判断过程无法判断的成果。

**保留自定义草稿家。** 它落败，因为仓库使用技能的默认锻造目录，记录必须是 Agent Note，不是草稿目录里的第二个文件。

**直接打包到 `skills/`。** 它落败，因为 `skills/` 是落地目标；直接构建可能与被审查的草稿不同。现在构建到工作草稿，审查草稿复制脚本，落地复制接受的草稿。

**为 `skills/` 再设一个独立打包。** 同样落败：两个打包目标可能分叉。落地复制接受的字节，不重新构建。

## Consequences

锻造技能在形状上更小，有一条组成规则、一个技能结构、嵌套步骤断言、带规范链接的成果断言和参数化检查器。YAML 解析器及其打包给落地脚本增加约 240 KB，但技能仍然自包含，不需要安装。

因为 SOP 步骤整体路由到三份 reference，正文是 181 行、约 3,363 tokens。正文保留步骤顺序和引用；加载一个步骤需要它的 reference。这是预算路由的代价。

工作/审查/落地流程保证 `skills/` 等于被接受的草稿。代价是测试在草稿存在时针对工作草稿，落地后回退到落地脚本。

剩下的证据缺口是外部的：触发质量、冷启动和代表性任务效用还没有在 agent harness 中运行。

## Related

- [锻造 dsh-spec-skill-forge（2026-10-19，已实现）](2026-10-19-forging-dsh-spec-skill-forge.zh.md) —— 本 note 取代的旧五步记录。

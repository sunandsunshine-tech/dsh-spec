# Agent Note: 以组成为核心锻造 dsh-spec-skill-forge

Status: proposed

[English](2026-10-21-forging-dsh-spec-skill-forge.md) | 中文

## Problem

已发布的锻造技能是五步流程，带四份 reference 和一个自带的门禁。当前分支上是一份英文工作草稿，中文触发，三份 reference，带打包的检查器：它围绕 Docs/SOP/Script 的组成规则和技能结构重构技能，并加入工作/审查草稿、技能规范断言与预算路由。在本提案之前，草稿放在 `docs/skill-draft/`，没有锻造记录，description 没有第二种触发语言，对照副本还留在草稿目录里；那个提交状态不符合技能自己对草稿、记录、description 和技能目录结构的要求。已发布技能及其[已实现记录](../../implemented/process/2026-10-19-forging-dsh-spec-skill-forge.zh.md)仍在原位。

## Proposal

围绕组成规则而不是五步流程重建锻造技能。SOP 是三步：意图识别、三要素采集分析与处置、重组技能。重组有两个子步骤——重组与完成 Script——各自有完成/检查/失败；大步骤断言两个子步骤是否完成。重组先给出技能结构——触发条件、技能定义与边界、全局释义、全局准则、SOP 步骤、成果断言——再从处置后的三要素分析中生成触发条件、技能定义与边界、全部 SOP 步骤及其内容，先完全内联。SOP 步骤可以嵌套，每层遵守同一结构，父步骤的完成判断覆盖其子步骤。然后按无歧义与 SSOT，从完全内联的 SOP 中抽取全局释义、全局准则和成果断言，最后整理技能结构。完成 Script 才按采用者环境工作：缺少运行时或工具是硬红线，锻造停止并等驾驶员决定，补完环境后再完成 Script。`成果断言` 要求最终技能满足全局准则、全部 SOP 步骤的断言、[Agent Skills 规范](https://agentskills.io/specification)和[最佳实践](https://agentskills.io/skill-creation/best-practices)。两页都直接链接；可机械判断的部分调用参数化脚本。它的实质内容是正文超标后的路由：先按不损失精度的措辞压缩，再按资源与归属只抽取真正可选的材料，最后把全部 SOP 步骤路由到 `references/<步骤>.md`；调整后重新走一遍技能。草稿移到 `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/`；记录就是本 Agent Note。

语言设置使用默认值。交付语言是英语，审查语言是采用者语言（这里是中文），附加触发语言是审查语言。工作草稿和落地产物是英文正文加中文触发；审查草稿生成时是中文正文加英文触发。审查草稿是投影，不是新判断。格式规则是默认值，声明位置可以覆盖。并列词在句内用顿号；条件和分支用列表或表格；结构化内容用表格；层内行文形式不限制；不再有分号串联。四种处置在步骤 2.5 中定义；第二层改名为 `技能定义与边界`；只有驾驶员接受审查草稿后，工作草稿才落地；要求修改或拒绝都不落地。落地后删除草稿目录（含 `review/`）。

默认锻造目录是项目根目录下的 `.agents/dsh-spec-skill-forge/`，其中放 `record/<名称>.md`、`draft/<名称>/` 和 `review/<名称>/`；声明位置可以覆盖各项默认值。本仓库使用默认值，所以当前草稿在 `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/`，审查草稿在 `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`。采用环境使用 Vite+ 与 Node：技能脚本源码在 `package/<技能名>/`。`vp run build:work` 打包到工作草稿的 `script/`，`vp run copy:review` 原样复制到审查草稿，`vp run land:skills` 在审查接受后把工作草稿复制到 `skills/<技能名>/`。仓库级 `scripts/` 直接运行，不打包。本技能门禁源码在 `package/dsh-spec-skill-forge/verify-skill-spec.ts`，工作草稿产物在 `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/verify-skill-spec.mjs`。资源分三层：步骤完成依赖的放步骤，整个技能依赖的放对应全局归属处，只有真正可选、能按需加载且内聚的材料才挂引用。未决事项用裁定并写进本 note。锻造期间只有硬红线与最终审查到达驾驶员：硬红线是无法在不改变环境或不动用不可逆操作的情况下继续的条件——未经授权覆盖或删除已有技能、写声明位置、环境不允许的文件/网络/Git 操作、缺少 Script 运行时或工具、源目的与领域红线冲突。停止时给出阻塞、已尝试的裁定和可逆选项。Script 完成覆盖运行时、依赖、输入/输出/退出码、测试或未验证、幂等与 `--dry-run`，以及放进 `script/`。

### Forging settings

| 设置 | 取值 |
|---|---|
| 模式 | 迭代；技能作用于自身 |
| 上游 | 已发布技能及其四份 reference、已移除的 318 行中文备份、此前的已实现记录，以及设计对话 |
| 草稿父目录 / 被锻造技能父目录 | `.agents/dsh-spec-skill-forge/draft/` / `skills/dsh-spec-skill-forge/` |
| 语言 | 使用默认值：交付英语；审查中文（采用者语言）；附加触发中文；工作草稿和落地产物为英文正文加中文触发；审查草稿生成时为中文正文加英文触发 |
| Description | 一句英文触发加中文触发；不出现正文概念；不写“讲解/已完成” |
| 记录 | 本 note |
| 验收 | 等待驾驶员审查 |

### Dispositions

| 上游项 | 处置 | 位置 | 依据 |
|---|---|---|---|
| 五步流程（收敛、锚定、起草与处置、脚本、核验与路由） | 重新绑定 | 三步 SOP；组成核心是第 3 步 | 技能的身份是组成规则，不是旧流程阶段 |
| 四份 reference 与自带门禁 | 适配 | 规则内联；使用目标项目的结构检查器；不设第二个门禁 | 自包含草稿与 SSOT |
| 草稿/驾驶员交互（展示 diff、逐次接受） | 重新绑定 | 工作草稿 + 审查草稿；只有硬红线与最终审查到达驾驶员；其余决定用裁定 | 硬红线与最终审查之外驾驶员注意力为零 |
| 草稿/目标/请求语言与转写 | 适配 | 交付语言、审查语言、附加触发语言；审查投影 | Agent Skills 的 description 触发；工作/审查成对 |
| 步骤级核验与最终检查清单 | 重新绑定 | `成果断言` 中的技能规范断言与超标路由；不复述前面检查 | 最终成果是过程中唯一无法断言的对象 |
| 资源按需路由 | 重新绑定 | 三层落位；只有真正可选、可加载且内聚时才挂引用 | 必然被加载的引用只增加成本，没有按需收益 |
| 脚本打包作为独立步骤 | 重新绑定 | 放在重组技能的 3.2；不单列顶层 SOP 步骤 | 组成步骤拥有被锻造技能的资源 |
| 分号串联与过度拆分的列表 | 适配 | 并列词用顿号；条件和分支用列表或表格 | 格式规则负责形式 |
| 记录即项目决策机制 | 保留 | 本 Agent Note | 仓库在 `AGENTS.md` 声明 notes 形态 |

### Verification

`node .agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/verify-skill-spec.mjs .agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 11 checks, 0 failed, 181 lines, ~3,363 tokens，strict budget 通过。脚本默认值约 3,437 tokens，也通过。三个 SOP 步骤已整体路由到 `references/`，使正文留在预算内。审查草稿已生成在 `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`，不再判断。检查器用打包的 `yaml` 解析 frontmatter：语法和映射形状、必填与可选字段类型、metadata 字符串键值、重复键和 `allowed-tools` 空格分隔。`vp run build:work` → 工作草稿 `script/verify-skill-spec.mjs` 可重复；`vp run copy:review` → 审查脚本与工作脚本一致；`node --test 'tests/**/*.test.ts'` → 47 通过；`notes check --all` → 24 条记录；具名 pair 与全部改动 Markdown 文件的链接检查通过。`dsh-spec check --all` 仍报一个既有的 `norm-reference` 失败：本分支没有 `.agents/skills/dsh-spec-manager/references/norms.json`；这是 installed-skills 的状态，不是本草稿的问题，且 `.agents/skills/` 未被修改。外部触发质量、冷启动与任务效用不属于技能规范断言；它们仍未验证。

### Review status

审查草稿已生成在 `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/`，等待驾驶员审查。工作草稿尚未落地。`skills/dsh-spec-skill-forge/` 下的已发布技能未动。它保留已落地的门禁，直到审查接受后执行 `vp run land:skills`。

## Alternatives considered

**保留五步流程并压缩。** 它落败，因为修正把技能的身份移到 Docs/SOP/Script 组成规则与技能结构；压缩旧阶段会保留流程外壳，并继续把草稿/核验规则混进步骤。

**保留四份 reference 与自带门禁。** 它落败，因为草稿是一个自包含技能，带自己的打包检查器；目标项目的结构检查器仍是唯一门禁，第二个门禁会让同一套规则有两个权威。

**保留旧语言模型（草稿/目标/请求）且不设审查草稿。** 它落败，因为“落地前由驾驶员审查”是明确修正：审查草稿是驾驶员看到结果的唯一位置，工作草稿不能在未审查时落地。

**让成果断言重复全局准则与步骤断言。** 它落败，因为这些在过程中已经可查；成果断言只负责没有步骤能判断的成果。

**保留自定义草稿家。** 它落败，因为仓库使用技能的默认锻造目录，而记录必须是 Agent Note，不是草稿目录里的第二个文件。

## Acceptance criteria

- 工作草稿位于 `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/SKILL.md`；审查草稿位于 `.agents/dsh-spec-skill-forge/review/dsh-spec-skill-forge/SKILL.md`。
- description 含一句英文触发和中文触发，不出现正文概念，也不写“讲解/已完成”。
- 并列词在句内用顿号；条件和分支用列表或表格；正文没有分号串联。
- 技能正文通过结构检查器：11 checks, 0 failed。
- 锻造记录是本 Agent Note，带中文对照与 sidecar；`notes check` 与 `translation-pair check` 通过。
- 驾驶员审查并接受审查草稿；只有此后工作草稿才替换 `skills/dsh-spec-skill-forge/`。
- `vp run build:work` 生成工作草稿脚本并打包 `yaml`。`vp run copy:review` 原样复制到审查草稿。测试针对工作草稿脚本运行。`vp run land:skills` 是审查接受后的落地步骤。
- frontmatter 的 YAML 语法、字段类型、metadata 字符串键值、重复键和 `allowed-tools` 空格分隔由脚本机械检查。
- 用当前规范参数运行 `--strict-budget` 通过：name 64、description 1024、compatibility 500、500 行、5,000 tokens（中文 0.6、英文 0.3 tokens/字符）。
- 外部触发质量、冷启动与任务效用不属于技能规范断言；它们仍未验证。

## Risks

当前正文 181 行、约 3,363 tokens，`--strict-budget` 通过；脚本默认值约 3,437 tokens，也通过。语言使用默认值：交付英语，审查中文，附加触发中文。正文保留步骤顺序和每步引用；三个 SOP 步骤已整体路由到 `references/`，断言和依赖随步骤移动。外部触发质量、冷启动与任务效用不属于技能规范断言，仍未验证；因此结构通过不能证明技能有效。本提案部分取代已发布五步技能；在该提案落地前，旧的已实现记录仍是当前记录。已发布技能未动，仍是回滚点。它的门禁只在审查接受后由 `vp run land:skills` 更新。提交路径正在移动并重新暂存。

## Related

- [锻造 dsh-spec-skill-forge（2026-10-19，已实现）](../../implemented/process/2026-10-19-forging-dsh-spec-skill-forge.zh.md) —— 本提案将替换的已发布五步技能的记录。

# Agent Note: 按 Agent Skills guides 把锻造技能重构成三步

Status: implemented

[English](2026-10-23-reforge-the-skill-forge-as-three-steps.md) | 中文

## Problem

锻造技能带着一个重组步骤和一条正文预算阶梯：它要求锻造者先全内联写正文，再抽取全局层与整步，直到正文符合 token 预算。在第一批锻造中，这个过程本身成了目标。每次修订都围绕可检查的指标重构（六个独立操作、模型加操作表、单用例、六步路由），每次重写都丢掉上游规则；维护者拒绝该结果，认为它比最初审查的版本还差。forge 自己的写作规则还与包当作规范的 Agent Skills guides 重复，并部分冲突。

## Decision

落地的 forge 是正文内三步，以 Agent Skills guides 为内容权威：

1. **意图识别**——目标、边界、交付物、模式、语言、forge 目录、落地与记录位置、forge 设置；目标受众（含其领域）；采用环境的 Script 决定（运行时、工具、测试方式、运行时缺失即硬红线）。
2. **收集、分析并处置**——收集 Docs、SOP 与 Script；列每条源约束；解构；执行 keep/adapt/re-bind/dissolve；校验覆盖与诚实。
3. **编写技能内容**——写之前必须读 [Agent Skills Best Practices](https://agentskills.io/skill-creation/best-practices) 以及它关联的全部内容，并按原文执行。`references/offline-skill-authoring.md` 是仅当这些来源读不到时才读的离线提炼版；它不是第二权威，在线原文可读时以原文为准。

三步与全局规则都在 `SKILL.md`；离线 fallback 是 forge 唯一随包的 reference 文件。过程规则保留：interaction、languages、forge directory、record、drafts、紧凑的 format 规则、SSOT、unambiguity 与 hard red lines。脚本不变：`forge.mjs` 保留 draft/review/land 生命周期，`verify-skill-spec.mjs` 保留机械可判检查并仍报告体量；超量正文是记录在案的裁决，不是路由阶梯。

### Settings

| 设置 | 值 |
|---|---|
| 模式 | iterate；已落地的 forge 技能是工作草稿的来源 |
| Forge 目录 / 落地 | `.agents/dsh-spec-skill-forge/` / `skills/dsh-spec-skill-forge/` |
| 草稿 | 落地时删除工作草稿与评审草稿 |
| 语言 | 交付英文；评审中文；触发中文 |
| 记录 | 本笔记 |
| 回滚 | 从上一提交恢复 `skills/dsh-spec-skill-forge/` 与本三元组 |

### Dispositions

| 原内容 | 处置 | 新家 |
|---|---|---|
| `references/3-recomposition.md`（3.1 结构、全内联再抽取、tidy） | dissolve | specification、best-practices 与渐进披露 guides 拥有结构与细节；步骤 3 只说明读什么、怎么检查 |
| Complete Script（3.2） | split | 环境决定 → 步骤 1；实现、接口与测试 → 步骤 3 的 scripts 义务 |
| 正文字数/ token 估算与超预算阶梯 | dissolve | guides 的渐进披露建议；`verify-skill-spec.mjs` 仍报告体量；超量记裁决 |
| 全局 `Format and description` 规则 | re-bind | 一条紧凑的全局 `Format` 规则，把格式细节交给 guides |
| 全局 `Resources and ownership` 规则 | dissolve | best-practices 与 using-scripts guides |
| 全局 `Outcome assertions` 小节 | dissolve | 步骤 3 的完成/检查/失败覆盖最终制品、草稿与记录 |
| 步骤 2 Anchor 中的受众/领域/环境 | move | 步骤 1 意图识别 |
| `references/1-intent.md`、`references/2-analyze-and-dispose.md`、`references/3-write.md` | dissolve | 内容内联进 `SKILL.md`；forge 不再携带其他 reference 文件 |
| SOP 步骤 1–3 | re-bind | 正文内三步：意图、收集处置、编写内容 |
| 离线 fallback | keep | `references/offline-skill-authoring.md`，仅当在线来源不可达时读 |
| 折叠的 `Docs / SOP / Script` 定义 | restore | 三条独立的全局定义 |
| `SSOT` / `Unambiguity` 规则 | keep | 不变的全局规则（裁决：forge 层面质量，与 guides 不冲突） |

### Verification

- 对落地技能跑 `verify-skill-spec.mjs --strict-budget` → 11 项检查，0 失败；174 行，按脚本默认估算约 4,214 tokens；点名 1 份 reference。
- 落地：工作草稿复制进 `skills/dsh-spec-skill-forge/`，草稿与评审目录被删除，`pnpm run skill:refresh` 使安装副本字节一致。
- 落地后 `pnpm test`（82 项）与 `pnpm run format:check` 通过；本变更的提交通过 DCO。
- 在线来源在 2026-10-23 可达；离线 fallback 于同日从 specification、best-practices、optimizing-descriptions、using-scripts 与 evaluating-skills 页面提炼。
- 移植附录中 `3-recomposition.md` 与预算路由的引用已更新为落地的三步结构。

## Alternatives considered

**保留重组步骤、只删 token 表。** 它落败，因为损害来自"抽取以适配"的过程，而不是算术；没有预算后该步骤没有剩余目的，其结构规则又与 guides 重复。

**保留全局 outcome assertions。** 它因 SSOT 落败：三步之后，最终检查属于步骤 3；第二份断言清单正是重复规则积累的地方。

**改用 Anthropic 的 `skill-creator` 技能替代 forge。** 它落败，因为那是通用的创作与评测方法论，不是抽取与受治理交付流程：没有源约束处置、决策记录、评审语言拆分、draft/review/land 生命周期、采用方声明或硬红线。它的评测闭环值得借鉴，步骤 3 已把 evaluating-skills guide 列为义务。

**把关联 guides 列为并列顶层来源。** 它按维护者决定落败：best-practices 已链接它们，一个入口 URL 加离线 fallback 是更小的无重复表述。

## Consequences

- forge 更小，且只有一个内容权威：在线 guides。正文 174 行（约 4,214 tokens）、1 份 reference，在脚本的 500 行/5,000 token 报告下仍有余量。
- 代价：旧的正文内联结构模板与预算驱动的抽取被移除；超量正文现在必须记裁决。离线 fallback 可能与在线 guides 漂移，已标为仅 fallback。
- 触发评测与脚本探测需要 agent 客户端与目标运行时；无法运行时记为 unverified。
- 本次重构通过 forge 自己的 draft/review/land 循环编辑落地技能；评审草稿就是维护者的评审制品。

# Agent Note: 从上游 agent-experience 技能锻造 dsh-spec-agent-experience

Status: implemented

[English](2026-10-23-forging-dsh-spec-agent-experience.md) | 中文

## Problem

重建后的包只交付一个技能——锻造技能；第一批锻造加入上游的 `agent-experience` 技能：一份关于"怎么写模型可见信息"的原则清单。这个技能没有产品专属的对象或产物，所以这次锻造只解决两个问题——上游文本能否作为一个技能携带，以及它的边界在哪里。驱动方决定按原文移植，不新增判据、参考文件或脚本。

## Decision

包交付 `dsh-spec-agent-experience`，它是上游技能的 create 模式移植。落地的 `SKILL.md` 携带上游的六条上下文原则与 `## Tool definitions` 的五条规则，只改 name、description 与中文触发词。没有参考文件、没有脚本、没有新增判据，也不作可验证性声明。

### Forging settings

| 设置 | 值 |
|---|---|
| 模式 | create；唯一来源是上游技能 |
| 上游 | `submodules/dsh` 的 `dsh-v0.2.1-rc.2`，`packages/preset/agent-preset/skills/agent-experience/SKILL.md` |
| 工作草稿 / 落地 | `.agents/dsh-spec-skill-forge/draft/dsh-spec-agent-experience/`（落地时删除）/ `skills/dsh-spec-agent-experience/` |
| 语言 | 交付英文；评审中文；附加触发词中文 |
| 记录 | 本笔记 |
| 回滚 | 同时删除 `skills/dsh-spec-agent-experience/`、其在 `.agents/skills/dsh-spec-agent-experience/` 下的安装副本与本三元组 |

### Dispositions

| 上游内容 | 处置 | 位置 | 依据 |
|---|---|---|---|
| description 的触发面 | adapt | `description` | 指称模型可见的工具定义与技能/上下文设计；按语言规则加中文触发词 |
| 六条上下文原则 | keep | 正文 | 携带上游原文；与领域无关 |
| `## Tool definitions` 五条规则 | keep | 正文 | 携带上游原文；与领域无关 |
| 上游项目名与示例 | keep | 正文 | 该上游文件不含项目名；thread-reply 示例通用，保留 |
| 符合性判据 | dissolve | — | 驱动方要求不携带原文之外的内容，因此本技能不新增判据 |

## Alternatives considered

**不移植。** 它落败，因为驱动方选择把它留作辅助收敛：原则的阅读成本低，即使没有验收测试，也可能影响模型可见信息。

**并入锻造技能。** 它落败，因为驱动方要求两者分开：锻造技能产出技能，而本技能陈述模型可见信息的原则；并入会改变锻造技能的边界。

**新增符合性判据或示例判例。** 它落败，因为驱动方要求不携带原文之外的内容；判例会形成一个开放式的校准面，有限集合无法把它闭合。

## Consequences

- 包交付一个只含原则的技能，其正文在前言之后与上游逐字节一致；移植成本是一次 description 适配与一条记录。
- 它的代价是可检查性：门禁只确认规范符合性，因此执行者是否遵循这些原则，无法由本仓库运行的检查来确认。
- 触发面与锻造技能的设计指导相邻：description 指称工具定义与技能/上下文设计，但无法强制读者在两个技能之间优先选一个。
- 如果它没有帮助，回滚会删除该技能而不影响其他技能。

## Testing

- 落地门禁：`node skills/dsh-spec-skill-forge/script/verify-skill-spec.mjs skills/dsh-spec-agent-experience --strict-budget --name-max 64 --description-max 1024 --compatibility-max 500 --max-lines 500 --max-tokens 5000 --cjk-tokens-per-char 0.6 --other-tokens-per-char 0.3` → 10 项检查，0 失败；19 行，约 675 tokens。
- 黑盒审查：第 1 轮（`/tmp/dsh-forge/review/dsh-spec-agent-experience-round1.md`）通过，四处记录类小项已修；第 2 轮（`…-round2.md`）通过且无发现。中文评审草稿在落地前提交，随后被落地步骤删除。
- 安装副本：`pnpm run skill:refresh` 同步 1 个文件；`pnpm test` → 82 个测试，82 通过，0 失败。
- 记录门禁：`notes check` → `check notes: ok`；`translation-pair check` → `check translation-pair: ok`。

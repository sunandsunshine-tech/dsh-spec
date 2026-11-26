# Agent Note: 从 dsh-speed-up-perf 重构性能技能

Status: proposed

[English](2026-11-25-reforge-performance-as-dsh-speed-up-perf.md) | 中文

## Problem

当前 `dsh-spec-performance-investigation` 技能保留了主要测量顺序，却压缩了若干会改变结果的上游责任：benchmark、gate、profiling 与 evidence 的边界；项目可选择哪些工具；测量语义；标识与隐私约束；ambient dependency；cold-start 与 process memory 处理；允许的行为差异；以及明确的证据限制。移除上游语义词干也削弱了来源可辨识性。

## Proposal

以 `dsh-v0.2.3-alpha.2`（`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`）中的 `.agents/skills/dsh-speed-up-perf/SKILL.md` 为来源，将技能重构为 `dsh-spec-speed-up-perf`。

重构把上游责任保留为通用要求，同时用采用项目声明的测量和评审机制替代 DSH 专属基础设施。它不复制 DSH benchmark 路径、固定预算、产品生命周期示例、机器校准或 CI lane。

### 需保留的边界

- benchmark、必需 gate、profiling、优化和已报告证据仍是不同决策。
- 执行模型和项目选择可用工具；技能既不假定存在 ambient tool，也不下载替代品绕过缺失能力。
- 测量保留 raw sample，并陈述 clock、warm/cold 状态、包含的 setup、完成条件、所选聚合值和排除的成本。
- 生成标识、私有数据和可辨识输入不进入 fixture 或保留证据。
- benchmark 使用经评审的常量，不依赖用户主目录、环境中的 repository、网络服务或私有语料。
- cold-start 运行使用新进程或子进程；process memory 区分可达的保留状态与瞬时压力。
- 稳定标识在等价更新后保持不变；更窄的 subscription 保留更新顺序与 immediate-event 行为。
- negative control 使目标成本在原实现或受控重新引入中重新出现。
- 有意的行为差异被点名、获授权并验证，同时普通行为与资源所有权保持不变。
- 证据限制随结果报告，不能藏在一个通用 threshold 后面。

当前[性能调查记录](../../implemented/feature/2026-11-24-forging-dsh-spec-performance-investigation.zh.md)在实现前仍是已发布技能的 owner。本提案准备其重构，并采用[单来源移植保留上游语义词干](../architecture/2026-11-25-single-source-ports-retain-upstream-semantic-stem.zh.md)中的命名规则。

跟踪：#135。#123 记录较早的评估，并通过 #129 合入。

## Alternatives considered

**几乎逐字复制上游技能。** 它保留每项上游责任，却把 DSH 路径、预算、校准与产品工作流带入无关项目。

**保留当前通用正文，只改名称。** 它修复可发现性，却保留促使本次重构的测量与证据边界问题。

**不建立责任映射就直接移除 DSH 基础设施。** 它避免生态系统专属假设，却可能悄悄丢掉每个 benchmark、gate、profile 或 evidence 步骤存在的原因。

## Acceptance criteria

- 技能命名为 `dsh-spec-speed-up-perf`，其锻造记录点名来源修订和语义词干关系。
- 每条列出的边界都有当前段落、reference 或明确处置；DSH 专属基础设施记录了替代或移除原因。
- 技能使用项目自有工具和证据；能力缺失时交接，而不是依赖 ambient dependency。
- cold-start、process memory、隐私、标识和有意的行为差异都有可评审验收用例。
- description 触发证据覆盖正例与近失例路由，并针对新正文重新运行行为证据。
- 同一实现变更取代或更新原 `dsh-spec-performance-investigation` 单元。

## Risks

- 通用化重构可能保留文字却失去上游边界的因果目的；责任映射必须评审含义，而不是复制结构。
- benchmark 昂贵且依赖环境，弱场景可能产生看似精确却不可迁移的证据。
- 重命名会使旧触发证据失效，而旧行为 trace 只能作为历史。
- 如果隔离基线表明新技能相对能力完整的无技能行为没有收益，该技能仍可能没有必要；该结果会收窄 ROI 主张，并可能导致重构被否决。

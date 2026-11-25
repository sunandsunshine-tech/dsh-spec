# Agent Note: 直接移植保留上游语义词干

Status: proposed

[English](2026-11-25-direct-ports-retain-upstream-semantic-stem.md) | 中文

## Problem

技能集合同时包含直接移植、通用化移植，以及由多个上游工作流组成的复合技能。如果每个移植都获得一个按目标意图命名的新名称，采用者就无法从目录识别它的上游来源，历史证据也难以映射到如今承载同一任务族（task family）的技能。当前性能技能是一个具体例子：它的行为来自 `dsh-speed-up-perf`，但名称不再保留这个语义词干。

## Proposal

直接承载一个上游工作流、或将其通用化移植的技能，在 `dsh-spec-` 命名空间下保留该工作流的语义词干。只有复合技能或确实合并后的范围可以采用新名称，并且其锻造记录必须点名所有上游输入，并说明为什么合并后的名称更准确。

### 已发布的命名选择

#126 中的直接移植重命名交付了本提案的两个应用：`dsh-ci-test-reliability` 安装为 `dsh-spec-ci-test-reliability`，`record-browser-gif` 安装为 `dsh-spec-record-browser-gif`。

`dsh-spec-agent-notes`、`dsh-spec-client-ui-ux` 和 `dsh-spec-prose-standard` 继续使用复合名称。它们的锻造记录点名各自纳入的上游工作流。[README.md](../../../../README.zh.md#choose-skills) 在面向采用者的目录中列出这些合并后的输入。

### 未决事项

当前 `dsh-spec-performance-investigation` 技能是单来源通用化移植，尚未满足这条命名规则。其真正的重构仍作为[从 dsh-speed-up-perf 重构性能技能](../feature/2026-11-25-reforge-performance-as-dsh-speed-up-perf.zh.md)中的提案保留，并由 #135 跟踪。在该重构落地前，已实现的[性能调查记录](../../implemented/feature/2026-11-24-forging-dsh-spec-performance-investigation.zh.md)仍是已发布技能的 owner。只改名称的别名不是迁移路径。

#144 质疑：在 `dsh-spec-ci-test-reliability` 中保留 `ci-`，是否仍能准确命名这个通用化技能的范围。其结论可能修订直接移植的名称映射，或为通用化移植定义一个记录在案的例外。在 #135 与 #144 确定当前名称与范围的规则之前，本命名提案保持未决。

### 迁移边界

重命名会同步更新当前技能目录、frontmatter、安装副本、package 与 bundle banner、测试、notices、文档以及当前 Agent Note 引用。历史模型运行保留它实际执行的名称和 hash；它们不会成为重命名后技能的证据。由重命名引起的 description 变更需要新的触发证据。

## Alternatives considered

**使用不带包前缀的上游原名。** 这样能最大化字面识别度，但会与上游安装冲突，而且只能靠来源记录区分当前加载的是哪个技能集合。

**给每个通用化移植都选择新的意图型名称。** 这样可以描述目标包的表述方式，但会破坏可辨识的来源，并使旧、新证据难以关联。

**保留当前名称，只在 README 记录映射。** 这避免迁移工作，但技能正文加载前的可发现性取决于目录名称；放在别处的来源表无法修复语义词干。

## Acceptance criteria

- 每个单来源直接移植或通用化移植都命名为 `dsh-spec-<upstream-semantic-stem>`。
- 每个复合或合并范围的名称都有记录的上游集合和明确的命名原因。
- 当前引用一致采用提案名称；历史证据保留其记录时的名称和 hash。
- #135 的性能重构与 #144 关于 CI test-reliability 名称范围的决策，将在不使用只改名称的别名的情况下确定其余直接移植的映射。
- 实现本提案时，双语配对记录与语料门禁通过。

## Risks

- 当两个来源覆盖同一工作流的不同部分时，相似的上游词干仍可能产生有歧义的名称。
- 重命名会使旧触发证据失效，并可能要求为安装过旧名称的采用者安排分阶段迁移。
- 过于字面的命名规则可能保留对通用采用者没有意义的上游品牌；语义词干判断只允许确实合并的范围记录例外。
- 语义词干可以仍然可辨认，但范围收窄后就会让目录产生误导，即使名称本来照搬自上游；#144 是当前例子。

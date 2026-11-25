# Agent Note: description 从真实触发条件派生

Status: implemented

[English](2026-11-25-description-is-derived-from-real-triggers.md) | 中文

## Problem

技能 description 在技能正文之前加载，是模型决定是否读取该技能时唯一可见的目录文本。列出有吸引力的关键词、重复一个开放式模板，或宣传正文没有提供的行为，会造成误报，并掩盖该技能真正服务的时刻。

## Decision

锻造技能把 description 视为四项事实在目录中的投影，并据此进行派生和评估：

- 技能的实际角色；
- 应触发它的任务时刻和对象；
- 它排除的相邻场景；
- 从上游来源保留的任务族。

对于每个来源任务族，description 要么保留当前能力，要么记录该任务族被排除的理由。它只宣传已加载技能实际提供的行为，不复制上游产品名称。它用正文自身的术语陈述角色、正向触发时刻和重要排除范围；执行流程和详细机制仍留在正文或其参考文档中。不要求固定的句式。字符上限是一项约束，不是目标，也不是增加主题的理由。

变更后的 description 附带应加载该技能的正例，以及不应加载该技能的近失例。这组示例必须区分边界，而不能只证明宽泛的领域语言会引起选中。当角色、激活条件或排除项发生变化时，应一并评估 description、正文边界和触发集。

锻造技能入口在意图、验证和评估覆盖范围中陈述这项要求。`tests/skill-evals/dsh-spec-skill-forge/evals/evals.json` 中的行为场景 `description-derived-from-role-triggers-and-exclusions` 让锻造技能在保留流程的同时，对齐 release-audit description 与正文边界。其触发语料 `tests/skill-evals/dsh-spec-skill-forge/trigger-evals.json` 包含六个正例请求和六个近失例请求，覆盖显式与隐式技能编写，并以安装、使用、提示词编辑、API 描述、运行时代码和工具定义作为近失例。

当前触发语料还包括 `tests/skill-evals/dsh-spec-ci-test-reliability/trigger-evals.json`、`tests/skill-evals/dsh-spec-client-ui-ux/trigger-evals.json`、`tests/skill-evals/dsh-spec-error-handling/trigger-evals.json`、`tests/skill-evals/dsh-spec-performance-investigation/trigger-evals.json`、`tests/skill-evals/dsh-spec-pr-description/trigger-evals.json` 和 `tests/skill-evals/dsh-spec-record-browser-gif/trigger-evals.json`。`tests/skill-scenarios.test.ts` 校验语料结构、当前触发面、该行为场景及其保留的模型证据；description 的质量仍由评审判断，而不是由正则语义门禁裁决。

跟踪：#132。

## Alternatives considered

**在目录上限内把 description 写得尽可能长。** 它能在加载前展示更多词语，但新增名词常常制造误触发，却没有更清楚地说明实际角色。

**复制上游 description，只替换产品名称。** 它保留来源出处，却携带产品专属表述，并可能声称通用化正文已不再支持的触发条件。

**为每个技能使用一个固定模板。** 它让评审形式统一，却迫使无关技能套入关键词清单，并鼓励复制目录文案，而不是如实陈述角色。

## Consequences

- 目录选择基于真实的角色和边界；正文加载后仍可获取执行细节。
- 来源任务族要么得到支持，要么被明确排除，因此通用化技能不会继承上游无法兑现的主张。
- 锻造技能入口和触发语料要求 description 变更接受选择结果评估。当前矩阵为正例 6/6、近失例 6/6（12/12），并且一次包含五项断言的行为运行保留在 `tests/skill-evals/evidence/2026-11-25-pr154/dsh-spec-skill-forge/`。
- 仓库的目录预算仍是上限。锻造技能的 description 为 363 个 BMP 字符，为后续修正留有空间，而不是鼓励堆砌清单。
- `dsh-spec-skill-forge` 只检查规范机制和预算。语义质量依据来源、正文以及正例／近失例判断。
- 代价和限制：小型触发集可能过拟合一种措辞；复合技能可能拥有宽泛但真实的角色；通过选定示例并不能证明通用路由准确。
- 验证：`node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-skill-forge --description-max 500`、`node --test --test-name-pattern='forge' tests/skill-scenarios.test.ts`、笔记检查与翻译配对检查以当前产物为准。模型运行使用 `tests/skill-evals/run-model-eval.mjs`；单独的触发探针保留了每个最终 `SELECT:` 标记和 12 行矩阵。

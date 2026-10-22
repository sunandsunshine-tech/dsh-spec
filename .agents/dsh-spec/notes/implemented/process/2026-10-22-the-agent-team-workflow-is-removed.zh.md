# Agent Note: agent team 工作流已移除

Status: implemented

[English](2026-10-22-the-agent-team-workflow-is-removed.md) | 中文

## Problem

仓库曾交付第二个技能 `dsh-spec-agent-team`,承载团队工作中面向使用者的那一半:Lead、Worker、Reviewer、Texter 四类角色,任务卡,激活时的自报,命名与亲和性规则,以及每一步从规范推导出的义务。技能集合正在围绕唯一交付物——锻造技能——重建。团队工作本身住在 harness 的团队工具与维护者的提示词里,因此仓库内的技能会重述一个它无法检查的机制,多出一份要维护的交付物,并让安装集合大于重建后的仓库实际发布的内容。

## Decision

仓库移除 `dsh-spec-agent-team` 及其安装副本。交付过它的两条笔记已归档:[团队工作流以一个技能的形式交付](../../archived/process/2026-10-02-the-agent-team-workflow-ships-as-a-skill.md)与[成员的复用与拆分亲和性](../../archived/process/2026-10-03-teammate-reuse-and-task-affinity.md)。[委派跟随 harness 与提示词](2026-09-23-delegation-follows-the-harness-and-the-prompt.zh.md)保持活跃;它的决定不变,其中把工作流放进技能的那一段由本笔记取代。

不添加替代技能。harness 的名册、任务板、mailbox 与团队工具,加上维护者的提示词,就是团队机制的全部。

### 放弃了什么

- Lead、Worker、Reviewer、Texter 的角色模型,以及单例与池的规模。
- 任务卡契约,以及激活时自报当前模式的声明。
- 命名规则(`role-index`,跨交付保留)与亲和性规则(一个池只在并发或上下文隔离需要时增加成员)。
- 每一步从仓库规范推导义务的做法。

### 重新引入的条件

未来的团队技能必须带一件本仓库能检查的闭合产物,并说明 harness 与提示词为什么承载不了这套方法。方便不算理由。

## Alternatives considered

**保留技能但不维护。** 它落败,因为不维护的技能仍会被安装、仍会表现为可用;移除才是诚实的状态。

**把它折进锻造技能。** 它落败,因为锻造技能生产技能,工作流不是可锻造的技能产物,锻造技能也检查不了它。

**把命名与亲和性规则留作文档。** 它们落败,因为规则描述的是被移除技能的池;没有池就没有可命名之物,而归档笔记保留了推理。

**只归档、不写移除笔记。** 它落败,因为归档笔记解释的是当初为什么交付,不是为什么移除;未来的会话会把冻结记录读成当前权威。

**不动委派笔记。** 它落败,因为那条笔记链接到被移除的技能,并声称技能持有工作流;它已更新到当前状态。

## Consequences

- 仓库只交付一个技能,即锻造技能;`README.md`、`AGENTS.md` 与安装副本都这样陈述。
- harness 与提示词就是团队机制的全部,仓库里没有文件复制它。
- 归档的三件套保持冻结历史;当前状态由本笔记承担。
- 委派笔记保留其决定,失去“技能承载工作流”的说法。
- 被移除的路径在工作树中不存在;笔记门禁与归档封存通过。

## Testing

- `git ls-files skills/dsh-spec-agent-team .agents/skills/dsh-spec-agent-team` → 无输出。
- `pnpm test` → 82 项测试,82 通过,0 失败。
- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts notes check --all --root .` → 检查 26 条 Agent Note,结构一致;格式一致。
- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts notes-archived check --all --root .` → 12 件冻结产物,跨 6 个类别。
- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check` 对改动过的配对 → 一致。
- `node scripts/dsh-spec-manager/scripts/dsh-spec.ts md-links check` 对改动过的文件 → 通过。

## Related

- [团队工作流以一个技能的形式交付(已归档)](../../archived/process/2026-10-02-the-agent-team-workflow-ships-as-a-skill.md) —— 当初为什么交付这个技能。
- [成员的复用与拆分亲和性(已归档)](../../archived/process/2026-10-03-teammate-reuse-and-task-affinity.md) —— 它承载的命名与亲和性规则。
- [委派跟随 harness 与提示词](2026-09-23-delegation-follows-the-harness-and-the-prompt.zh.md) —— 把委派留在 harness 与提示词上的决定。

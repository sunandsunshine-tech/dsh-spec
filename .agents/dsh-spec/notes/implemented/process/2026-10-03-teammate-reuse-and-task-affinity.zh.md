# Agent Note: 成员的复用与拆分亲和性

Status: implemented

[English](2026-10-03-teammate-reuse-and-task-affinity.md) | 中文

## Problem

团队工作流技能写明了角色与各自的载体,每个池都是 `1..N`,重叠路径用 `blocked_by` 排序,`write_scopes` 只诊断重叠而不拦下认领。有两件事它没说:一个成员实例怎么起名,以及一个角色池什么时候该加人。

两处留白都会落到实处。按当时计划给成员起的名,下一个交付复用不了,于是下个交付只能重建团队,而不是去寻址那个已经存在的人。一条本来已被 `blocked_by` 串行化的卡链,若拆给同一角色的两名成员,并发上毫无收益,后一张卡的 owner 还接不到前一张卡攒下的上下文。

## Decision

两条规则写进 `dsh-agent-team-workflow`:

- §2「Roles and carriers」:"A teammate's name is its role and an index (`worker-1`, `reviewer-2`); a member keeps that name when a later delivery reuses it."
- §6「Parallel work」:"A role gains an additional member only for concurrency or context isolation; dependent cards in one role stay with a single owner."

名字是成员跨交付的身份:角色定下工作的种类,序号区分实例,而「保住这个名字」才让下一个交付寻址到同一个人。亲和性规则约束的只是往既有角色池里加人,别无其它。用 `additional` 而不是 `second`,规则就落在 `1..N` 的池上,第三个 Worker 与第二个受同样的约束。§2 的 `Create all four roles at the start` 照旧:这条管的是往池里加人,不是开场那四个角色。跨角色流转也照旧:Reviewer 的卡依赖写卡、Texter 的卡依赖最后一次 review,这些依赖由 `blocked_by` 排序,不归这条规则。

## Scope against the withdrawn carrier ladder

[激活委派的是 harness 与提示词](2026-09-23-delegation-follows-the-harness-and-the-prompt.zh.md)把委派作为规则撤销,并封存了成本阶梯。它废黜的是**载体选择**:一件事到底委不委派、交给哪种载体——这个判断本来就由 harness 与提示词作出,答案还随部署设置而变。本篇两条规则都不决定要不要委派。提示词一旦激活了团队,剩下的问题只是依赖图怎么落到既有的成员槽位上;这是得到授权的团队内部的调度方法,不是载体政策。加人由并发或上下文隔离来证成,从不由载体的排序来证成,所以这条规则不是成本阶梯的复活。两篇笔记在委派与调度的交界上部分重叠;两篇都留在 active 树里并互链,谁也不取代谁。

## Alternatives considered

**把命名交给运行时 schema。** 落选:schema 只管唯一性与 kebab-case 语法,不管「角色 + 序号」这个形状;按计划拼出来的名字照样通过,下个交付还是得重建成员。

**要求每张任务卡填拆分理由。** 落选:那是给每张卡加一笔认知税,只为把一个属于 Lead 的权衡模板化;字段填满了,不等于权衡做过了。

**给加人设一个文件数阈值。** 落选:静态阈值换个名字还是成本阶梯,而且文件数看不出新加的人手上有没有独立的工作。

**两处都留白。** 落选:上面两处失误说明这段留白不是中性的。

## Consequences

- 命名的形式归技能所有,不归工具:运行时保证名字唯一,技能规定用哪个名字。
- 同一角色里的依赖链不换人,前一张卡攒下的上下文能交到后一张卡手上。
- 规则落在 §2 与 §6;没有新门禁、没有新工具,角色的职责也没有改动。
- 与[激活委派的是 harness 与提示词](2026-09-23-delegation-follows-the-harness-and-the-prompt.zh.md)的部分重叠继续存在,由这条互链记录,而不是靠归档任何一篇来消除。

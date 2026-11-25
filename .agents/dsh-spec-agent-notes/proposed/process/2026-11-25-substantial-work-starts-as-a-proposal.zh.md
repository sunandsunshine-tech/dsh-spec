# Agent Note: 实质工作从提案开始

Status: proposed

[English](2026-11-25-substantial-work-starts-as-a-proposal.md) | 中文

## Problem

issue 可以说明还剩哪些工作，却不适合保留设计理由、替代方案、验收条件与风险。单独的 work record 只会再增加一个状态源。缺少清晰分工时，agent 要么把设计埋进 issue 评论，要么把尚未合入的 draft 当作有效指导。

## Proposal

实质未来工作从 proposed Agent Note 开始。Agent Note 拥有问题、设计、替代方案、验收条件与风险。issue 跟踪执行、依赖、状态和证据，并链接该 Agent Note，而不是复制它的决策正文。

只存在于 Draft 分支上的提案不计入有效清单。提案保留后，以 `proposed/` 合入 `main`，并在那里可被发现。实现缺失或仅完成一部分时，提案保持 proposed；交付决定完整时，owning Agent Note 移动到 `implemented/`。

不引入 work-record 产物。不复制或新增常驻指令资产来重述本工作流。现有[移除 work record 的决定](../../implemented/process/2026-09-18-drop-the-work-record.zh.md)继续拥有该约束；本提案只分配设计与执行角色。

跟踪：#133。

## Alternatives considered

**把完整设计、替代方案和状态都放进 issue。** 这避免额外文件，却把易变执行视图与持久理由混在一起，并失去 Agent Note 生命周期和双语单元。

**重新引入 work-record 文件。** 它提供一个查看状态的位置，却复制 issue tracker 和提案验收条件，并要求每次变更维护另一个状态源。

**把分支上的 Draft Agent Note 当作有效指导。** 这避免合并，却让未提交清单取决于后续会话碰巧看到哪个分支。

## Acceptance criteria

- 每项实质未来变更都有一个 proposed Agent Note owner 和一个执行 issue。
- issue 链接 Agent Note 并记录状态、证据，不复制完整设计。
- 提案只有合入 `main` 后才进入有效清单。
- 生命周期迁移在同一变更中改写 Agent Note 格式和链接。
- 不创建 `work.md`、第二状态源或复制的常驻指令资产。

## Risks

- 小型变更可能承担不必要的 Agent Note 开销；现有“持久决策理由”触发条件仍决定是否需要记录。
- 如果实现落地却没有移动或更新 owner，issue 与提案会漂移。
- 工作停止后提案可能继续留在清单中；必须遵循 Agent Note 生命周期否决或删除，不能遗留未处理状态。

# Agent Note: 堆叠合并默认使用 squash

Status: implemented

[English](2026-11-18-stack-merge-defaults-to-squash.md) | 中文

## 问题

当落地仓库未指定合并方法时，`dsh-spec-merging-stacked-prs` 仍必须选择一种。此前的回退方案在仓库指令与 GitHub 设置都未选择方法时选用 `merge`。

## 决策

落地仓库的策略仍是权威。技能采用其指令规定的方法。当指令沉默且 GitHub 只允许一种合并方法时，技能采用该方法。若策略仍未选择方法，则使用 `squash`。依据技能的共享默认值约定，用户请求或显式参数可以一次性指定一种方法。

[锻造决策记录](2026-10-28-forging-dsh-spec-merging-stacked-prs.zh.md)仍拥有技能的机制、来源改编与其他裁决。本记录部分取代其中关于合并方法回退的事实。

## 验证

| 要求 | 证据 |
|---|---|
| 技能在使用位置陈述仓库策略的优先级与 `squash` 回退方案 | `node --test tests/skill-defaults.test.ts` |
| 改动后的技能在机械检查上仍然有效 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-merging-stacked-prs` |
| 语料、安装副本、决策记录与翻译记录保持一致 | `pnpm run check:corpus` |

## 曾考虑的替代方案

**继续以 `merge` 作为回退方案。** 它保留原有行为，但会让未选择方法的仓库默认产生合并提交。本次请求改为选择 squash。

**无条件使用 `squash`。** 它会让每次落地都产生一个 squash 提交，但会覆盖明确要求使用合并提交或 rebase 的仓库。仓库策略必须保持权威。

**策略沉默时等待显式方法。** 它避免了选择，但违反共享默认值约定，并让没有合并策略的仓库依赖一个不必要的问题。

## 后果

- 当仓库指令或 GitHub 设置只选定一种方法时，仓库继续采用该行为。
- 允许多种方法或未声明策略的仓库，默认每个 pull request 使用一个 squash 提交。
- 显式用户指示仍是一次性覆盖。
- 锻造记录、其中文对侧、安装副本与固定值测试随这项决策一起调整。

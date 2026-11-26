# Agent Note: 导出保留策略

Status: implemented

[English](2026-11-21-retention-policy.md) | 中文

## Problem

如果存储没有有界保留规则和清除操作，已保存的导出状态就会不断累积。

## Decision

已保存的导出默认保留七天，并且只清除超过该窗口的条目。

跟踪：[Issue #140，跟踪器条目“导出保留策略”](../../../../issue.md#tracker-item-export-retention-policy)。

## Alternatives considered

**无限期保留所有导出。** 这样可以避免过期判定，但存储会无界增长，过期状态也永远不会离开存储。

## Testing

- 已保存的导出默认在七天后过期。
- 清除会移除已过期的导出，同时保留窗口内的条目。

## Consequences

时钟变化可能使某个条目越过保留边界；非原子清除则可能暴露只被部分移除的条目。

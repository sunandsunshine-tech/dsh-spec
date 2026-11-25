# Agent Note: 普通安装跟随最新 release

Status: implemented

[English](2026-11-25-ordinary-installation-tracks-latest-release.md) | 中文

## Problem

安装指南可能让固定修订看起来是常规选择。被复制的示例随后会让采用者停留在旧技能集合，而更新似乎只对特殊标记的安装有效。把 `latest` 当作 pin 值也会造成误导，因为它表达的是意图，而非准确修订。

## Decision

普通安装路径省略 `--pin`，让 `gh skill install` 选择最新的 tagged release；当 repository 尚无 tagged release 时，适用 CLI 的默认分支行为。

只有 CI、审计、可复现构建、兼容性工作或其他固定版本要求需要时，才通过 `--pin <tag-or-commit>` 提供准确的 tag 或 commit。`--pin latest` 无效，不得作为文档化的简写出现。未 pin 的安装跟随 CLI 的更新路径；已 pin 的安装保持固定，直到被显式 unpin。

### 安装指南

[README.md](../../../../README.zh.md#install) 展示普通安装形式与固定修订形式，并从安装说明链接到本决策。[choosing-skills.md](../../../../docs/choosing-skills.zh.md#install-model) 在技能选择指南中作同样的区分。

### 范围

本策略只覆盖已安装技能。repository 工具链的 pin、依赖的 pin 与 GitHub Action 的 pin 各自遵循原有的固定版本规则。

## Alternatives considered

**把 `--pin latest` 作为普通安装形式。** 它看起来像版本选择 flag，但不是准确修订，把清晰的默认值变成了虚构的 pin。

**默认采用默认分支上的最新 commit。** 它会立即交付每项变更，但绕过 release tag，并意外降低常规安装的可复现性。

**始终 pin 一个已知 release。** 它能固定内容，但要求普通用户手动更新，并把最严格的复现边界当成了默认工作流。

## Consequences

- 自动更新可能引入行为回归；需要稳定性的采用者必须选择准确 pin。
- 默认分支回退只在项目还没有 release tag 时适用，因此首次发布可能让普通安装从分支内容转到 tagged 内容。
- 文档仍可能暗示 pin 每个运行时依赖等同于 pin 一个安装的技能；本决定只覆盖技能安装。
- 普通安装无需手工选择修订即可跟随更新；固定安装则保持隔离，直到显式执行 unpin。

### 验证

[repository-shape.test.ts](../../../../tests/repository-shape.test.ts) 会检查两个语言配对中的普通安装示例和固定修订示例，并拦下文档化命令示例中的 `--pin latest`。语料门禁与配对门禁会检查链接、生命周期骨架和翻译对侧文件。

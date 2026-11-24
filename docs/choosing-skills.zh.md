# 选择 dsh-spec 技能

[English](choosing-skills.md) | 中文

本指南把项目 README 中的分组转化为安装选择。下文的 `dsh` 指 DeepSeek Harness。每个技能都单独安装；推荐配套技能用于相关工作，不是必须安装的依赖。

## 安装模式

在项目范围安装并提交结果。若干 agent 宿主共用 `.agents/skills/`，其他宿主可能使用不同的项目目录。这样协作者、发现该目录的 agent 与 CI 共用一份经过评审的修订。

每个技能使用一次 `gh skill install` 调用。通常省略 `--pin`，让 CLI 安装最新的 tagged release；仓库没有 tagged release 时，则使用默认分支。一次安装需要为 CI、审计或可重复构建固定在同一个修订时，才把同一个 tag 或 commit 传给每个技能的 `--pin`。`gh skill update` 会刷新未 pin 的技能，并跳过已 pin 的技能，直到 `--unpin` 解除 pin。

示例使用 `--dir .agents/skills` 安装共享目录。若宿主有自己的项目级目录，使用 `--agent <host>` 并省略 `--dir`。

```sh
gh skill install sunandsunshine-tech/dsh-spec "<skill>" \
  --dir .agents/skills
```

需要固定修订时：

```sh
gh skill install sunandsunshine-tech/dsh-spec "<skill>" \
  --pin "<tag-or-commit>" --dir .agents/skills
```

`latest` 不是特殊的 pin 值。省略 `--pin` 才是选择最新 release 的方式。

起步时完整安装通用组。对于专项组，只安装项目当前工作会用到的技能。专项组是面向某类工作的精选技能集合，不是项目必须完整安装的运行时依赖包。

不要从 `--all` 开始。未使用的技能会增加选择成本和更新义务，却不增加项目实际使用的能力。通用组是有意保留的例外：它承载的五项职责会反复出现在项目指令、决策记录、持久性文字以及通常伴随笔记的文档配对中，因此作为一个较小的共同基线整体安装。

## 通用协作

项目开始使用编码 agent 时，安装全部五个技能。它们覆盖 agent 阅读的指令、持久性决定、文字质量和文档翻译。

| 技能 | 增加什么 | 推荐配套 |
|---|---|---|
| `dsh-spec-agent-experience` | 编写或修订提示词、工具定义、技能入口和多步工作流，使其中的信息可被发现，并高效使用上下文 | `dsh-spec-agents-md`、`dsh-spec-prose-standard` |
| `dsh-spec-agents-md` | 把常驻指令（standing instructions）放入 `AGENTS.md`，通过指针和更新边界让文件保持准确 | `dsh-spec-agent-experience`、`dsh-spec-prose-standard` |
| `dsh-spec-agent-notes` | 判断非平凡改动何时需要持久性决策记录，并维护其生命周期 | `dsh-spec-prose-standard`、`dsh-spec-translate-docs` |
| `dsh-spec-prose-standard` | 让持久性文档、注释、指令和可见文案保持完整，不含推理过程或装饰 | `dsh-spec-translate-docs` |
| `dsh-spec-translate-docs` | 通过最小更新、整篇翻译和配对检查，让 Markdown 配对文档保持同步 | `dsh-spec-prose-standard`、`dsh-spec-agent-notes` |

`dsh-spec-agent-experience` 提供提示词发现规则，`dsh-spec-agents-md` 把这些规则用于常驻指令。`dsh-spec-agent-notes` 让决定有持久归属；`dsh-spec-prose-standard` 让这个归属读得清楚；`dsh-spec-translate-docs` 则让配对文档中的对应归属保持同步。这五项职责会汇入日常 agent 工作，因此本组整体安装。

这五个技能中，除在本包锻造的 `dsh-spec-agents-md` 外，其余都移植自 dsh。

## 软件变更与质量

项目修改代码并需要可重复的评审、证据和失败处理时，增加本组。

| 技能 | 增加什么 | 推荐配套 |
|---|---|---|
| `dsh-spec-find-simplifications` | 在代码、API、测试、文字和维护机制中寻找有证据支撑的简化 | `dsh-spec-code-review`、`dsh-spec-agent-notes` |
| `dsh-spec-code-review` | 按项目声明的标准和仅看代码无法获得的证据评审一个改动 | `dsh-spec-pre-push-checks`、`dsh-spec-agent-notes` |
| `dsh-spec-pre-push-checks` | 在推送或评审前，为待推送 diff 选出最小充分的检查 | `dsh-spec-code-review`、`dsh-spec-ci-test-reliability` |
| `dsh-spec-error-handling` | 为跨越机器边界的失败、恢复、重试、后台任务和用户可见报告设计错误处理 | `dsh-spec-ci-test-reliability`、`dsh-spec-code-review` |
| `dsh-spec-ci-test-reliability` | 围绕隔离、共享资源、进程和清理，设计、评审、诊断并重新设计过慢、范围过大或不稳定的测试 | `dsh-spec-pre-push-checks`、`dsh-spec-error-handling` |

`dsh-spec-code-review` 判断改动；`dsh-spec-pre-push-checks` 证明本地检查能够证明的范围；`dsh-spec-ci-test-reliability` 负责过慢或不稳定测试背后的执行拓扑。`dsh-spec-error-handling` 覆盖这些检查所经过的失败路径。`dsh-spec-find-simplifications` 提出简化方案，`dsh-spec-agent-notes` 保存需要超出 diff 范围的决定。

这五个技能都移植自 dsh。

## 变更说明与落地

工作需要在评审前形成说明，或通过相互依赖的 GitHub PR（Pull Request）落地时，增加本组。`dsh-spec-pr-description` 适用于普通变更请求；`dsh-spec-merging-stacked-prs` 只适用于 GitHub 官方 stacked PR 能力。

| 技能 | 增加什么 | 推荐配套 |
|---|---|---|
| `dsh-spec-pr-description` | 撰写变更请求的动机、改动、测试证据、披露与 AI（人工智能）Usage | `dsh-spec-code-review`、`dsh-spec-pre-push-checks` |
| `dsh-spec-merging-stacked-prs` | 把 GitHub 官方 PR stack 作为一条依赖链落地 | `dsh-spec-pr-description`、`dsh-spec-pre-push-checks` |

`dsh-spec-code-review` 提供评审发现，`dsh-spec-pre-push-checks` 提供说明必须报告的本地证据边界。对于 stack，`dsh-spec-pr-description` 描述每一层，`dsh-spec-merging-stacked-prs` 则让落地操作始终走 GitHub 官方 stack 机制。

这两个技能都移植自 dsh。

## 浏览器 UI 证据

项目渲染浏览器 UI，且会出现用户可见改动时，增加本组。

| 技能 | 增加什么 | 推荐配套 |
|---|---|---|
| `dsh-spec-client-ui-ux` | 界定受影响的消费方和状态，检查真实渲染结果并报告证据缺口 | `dsh-spec-record-browser-gif`、`dsh-spec-code-review`、`dsh-spec-pre-push-checks` |
| `dsh-spec-record-browser-gif` | 从一次隔离运行的真实构建中捕获、编码、校验并按需发布 GIF 证据 | `dsh-spec-client-ui-ux` |

`dsh-spec-client-ui-ux` 判断渲染后的改动必须证明什么；`dsh-spec-record-browser-gif` 把用户可见的浏览器交互转化为经过校验的证据。`dsh-spec-code-review` 和 `dsh-spec-pre-push-checks` 仍分别负责实现评审与本地证据层。每个技能只报告阻碍自己产出证据的能力，不声称视觉验证已经完成；编码 GIF 所需的媒体工具不会妨碍项目已声明的截图评审。

这两个技能都移植自 dsh。

## Agent 技能制作

项目创建、改写、迁移或检查 Agent 技能时，安装这个技能。

| 技能 | 增加什么 | 推荐配套 |
|---|---|---|
| `dsh-spec-skill-forge` | 从构想、资料或已有技能锻造或修订 Agent 技能，并记录背后的决定 | `dsh-spec-agent-experience`、`dsh-spec-prose-standard`、`dsh-spec-agent-notes`、`dsh-spec-translate-docs` |

`dsh-spec-agent-experience` 塑造提示词层面的设计；`dsh-spec-prose-standard` 控制持久性文字；`dsh-spec-agent-notes` 记录锻造决定；`dsh-spec-translate-docs` 让相关配对文档保持同步。锻造技能负责协调这些能力的编写流程。

`dsh-spec-skill-forge` 是在本包锻造的。

## 常用组合

| 工作 | 基线 | 工作专属组 |
|---|---|---|
| Agent 辅助的项目工作 | 通用协作 | 工作改动代码时增加软件变更与质量 |
| 带 PR 的普通软件变更 | 通用协作 | `dsh-spec-pr-description`，并为实现增加软件变更与质量。除非工作使用 GitHub 官方 stacked PR 工作流，否则不要增加 `dsh-spec-merging-stacked-prs` |
| 官方 stacked PR 链 | 通用协作 | `dsh-spec-pr-description` 和 `dsh-spec-merging-stacked-prs`，并为每一层的证据增加软件变更与质量 |
| 浏览器 UI 变更 | 通用协作 | 浏览器 UI 证据，并为实现评审增加软件变更与质量 |
| Agent 技能制作 | 通用协作 | Agent 技能制作 |

## 能力要求

以下要求补充项目 README 中的全局先决条件。

- `dsh-spec-merging-stacked-prs` 需要 GitHub 官方 stacked PR 能力、`gh stack`，并且 head 分支位于同一个仓库。用 `gh extension install github/gh-stack` 安装扩展。
- `dsh-spec-client-ui-ux` 需要能够运行并检查受影响的 UI，或者明确交接缺失的场景或能力。
- `dsh-spec-record-browser-gif` 需要 Node.js 24.11+（24 系列）或 26+、Git、`ffmpeg`、`ffprobe`、可运行构建，以及浏览器控制能力或项目声明的 Playwright 设置。在 GitHub 上附带证据还需要 `gh` 能在 `github.com` 上写入。
- `dsh-spec-translate-docs` 使用随附的 Node 脚本执行配对检查。安装它不要求每份文档都有对侧文件。

## 跳过规则

| 情况 | 不要安装 |
|---|---|
| 项目没有浏览器 UI | `dsh-spec-client-ui-ux`、`dsh-spec-record-browser-gif` |
| 项目不使用 GitHub stacked PR | `dsh-spec-merging-stacked-prs` |
| 项目不制作 Agent 技能 | `dsh-spec-skill-forge` |
| 项目没有需要设计或评审的预期失败行为 | `dsh-spec-error-handling` |

推荐配套技能缺席时，技能仍然可用；它要么通过项目已有的等价机制完成工作，要么记录缺失的能力。

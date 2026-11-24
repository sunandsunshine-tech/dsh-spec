# Agent Note: 技能默认值无需项目指令也能完成

Status: implemented

[English](2026-11-17-skill-defaults-complete-without-project-instructions.md) | 中文

## 问题

在使用位置声明默认值，能让该值紧邻使用它的行为。一个技能即使还会读取项目的常驻指令（standing instructions），仍可能让没有指令的状态含糊不清：执行者可能把沉默视为缺少配置、让用户选择默认值、新增 `AGENTS.md` 来记录默认值，或再建一张默认值表。这些应对方式会让临时项目依赖它并不需要的配置，并重新引入就地声明本可避免的漂移。

当有效调用未指定某个默认值、且现有项目指令未作规定时，有十一个技能会依据该具体默认值选择行为。它们是 `dsh-spec-agent-notes`、`dsh-spec-record-browser-gif`、`dsh-spec-client-ui-ux`、`dsh-spec-error-handling`、`dsh-spec-merging-stacked-prs`、`dsh-spec-pre-push-checks`、`dsh-spec-pr-description`、`dsh-spec-prose-standard`、`dsh-spec-skill-forge`、`dsh-spec-ci-test-reliability` 和 `dsh-spec-translate-docs`。它们的具体值早已位于各自的使用位置，但共享的执行规则并非如此。

## 决策

具体默认值仍保留在各自现有的使用位置。没有集中的默认值表。

每个带默认值的技能都携带一个 `## Defaults` 段落，并表达同一项约定：只有当请求和现有项目指令都未选择某一行为时，才应用该技能在使用处声明的默认值；现有指令是权威的只读输入；不得仅为选择默认值而询问、新增、修改或复制指令。

该规则不移动也不重复任何具体值。笔记根仍位于笔记位置约定中，翻译默认值与数据根仍位于配对约定中，变更描述的结构与语言阶梯仍位于该技能中，行文模式与文风指引仍位于各自的使用位置，堆叠合并的回退方案仍位于合并流程中，由 rerere 支撑的 rebase 选择仍位于推送前检查中，锻造技能的语言与记录默认值仍位于锻造技能使用它们的位置，只约束结果、不规定实现或表示形式的兜底判别值要求仍位于错误处理约定中，渲染证据的默认值仍位于 Web UI 评审流程中。

技能锻造的完成条件现在要求：未来每个声明默认值的锻造技能，只有当请求和现有项目指令都未选择某一行为时才应用默认值；现有指令是权威的只读输入；不得仅为选择默认值而询问、新增、修改或复制指令。这样，该规则成为未来技能验收的一部分，而不只是现有技能恰好遵循的一项惯例。

随附脚本仍由参数驱动。它们不解析项目指令，不写入 `AGENTS.md`，也不把项目指令复制到仓库；agent 读取现有的持久覆盖，并把其中的事实作为调用参数传入。

## 验证

| 要求 | 证据 |
|---|---|
| 每个带默认值的技能都携带同一个共享约定段落，具体值仍留在各自的使用位置，锻造技能携带未来技能的验收条款 | `node --test tests/skill-defaults.test.ts` |
| 一个没有 `AGENTS.md` 的 Git 项目会初始化默认笔记根，且不创建 `AGENTS.md` | `node --test tests/agent-notes.test.ts` case `init creates the default notes skeleton idempotently` |
| 笔记根覆盖不会改动现有项目指令 | `node --test tests/agent-notes.test.ts` case `--root overrides one invocation without rewriting existing project instructions` |
| 干净上下文调用会读取持久的笔记根覆盖 | 2026-11-18 的干净上下文运行读取 `AGENTS.md`，初始化 `.project-notes`，没有创建默认根，也没有改动 `AGENTS.md`；`notes.mjs check --root .project-notes --json` 通过 |
| 一个没有 `AGENTS.md` 的 Git 项目会初始化默认翻译目标，且不创建 `AGENTS.md` | `node --test tests/translation-docs.test.ts` case `init uses the default target without project instructions` |
| 术语覆盖不会改动现有项目指令，也不会创建默认副本 | `node --test tests/translation-docs.test.ts` case `a terminology override leaves existing project instructions unchanged` |
| 新增该节后，技能正文仍机械有效 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs <skill-dir>`（每个改动技能一次） |

## 曾考虑的替代方案

**创建一张集中的默认值表。** 它能让每个值都在一个地方可发现，但这张表会与使用各值的行为竞争，并在某一使用位置改变时发生漂移。本决策让每个值继续保持就地，只把共享的覆盖行为安放在每个可独立安装的技能中。

**要求 `AGENTS.md` 在技能运行前声明默认值。** 它会让选定的值变得明确，但缺少该文件并不是错误，临时项目也不需要为了使用工具而取得常驻指令。当有效调用未指定该选择、且现有指令未作规定时，默认值仍然生效。

**只把共享规则放在锻造技能中。** 未来的锻造技能会继承它，但现有的带默认值技能仍会处于含糊状态，也无法按相同条件工作。每个可独立安装的技能都需要在自己的正文中携带这项约定。

**让脚本读取 `AGENTS.md`。** 它会把覆盖的发现集中到代码中，但每个脚本都会多出一个指令解析器，并依赖一种文件格式。agent 读取现有项目指令，把得到的参数传入；脚本仍对显式输入保持确定性。

## 后果

- 一个没有 `AGENTS.md` 的项目，无需先创建项目配置，就能初始化笔记、选择默认翻译目标、写入变更描述、应用默认行文模式、落地堆叠 PR（Pull Request），或锻造技能。
- 十一个相互独立的技能有意携带同一段简短段落。每个安装仍保持自包含；`tests/skill-defaults.test.ts` 中的内容约定会检出共享约定段落缺失或重复，并防止任何具体值进入共享段落。
- 一次性覆盖不会重写项目指令。持久覆盖仍留在已经拥有它的项目文档中；命令把其路径或值作为参数接收，不会创建第二份副本。
- 这份清单不包含 `dsh-spec-agents-md`，其默认目录位置仅在获得授权的 AGENTS 写入任务开始后才适用；也不包含 pre-push 报告的 `HEAD` 等参数默认值：两者都不会依据缺失的项目指令选择 agent 行为。
- [锻造决策记录](2026-10-27-forging-dsh-spec-skill-forge.zh.md) 拥有未来技能验收条款，[翻译决策记录](2026-10-28-forging-dsh-spec-translate-docs.zh.md) 拥有翻译默认值当前的放置位置。两者都受本记录部分约束，并继续有效。
- 行文与锻造规则作为内容约定接受检查，而不是由可重复的 agent 行为 harness 执行。脚本的无指令与覆盖路径已有 fixture（测试前置数据）覆盖，一次干净上下文运行确认执行者会读取现有项目指令；在这些路径之外执行行文约定时，仍依靠评审背书，而非机械证明。

---
description: "校验决策记录树，按每份笔记理由所剩的价值作出判断，并封存已经发布的内容。"
---
# dsh-archive-agent-notes

[English](README.md) | 中文

## Summary

一棵决策记录树只有在它的笔记仍能指导工作时才值得保留，而活跃语料里的大部分内容终将不再如此。本技能从两个方向让它保持诚实：对照它自己的约定校验这棵树，并按每份笔记的理由所剩的价值作出判断，以此缩减活跃语料。篇幅与时间只是发现线索，从来不是封存标准。

## 何时加载它

在采纳了这套模式的项目里审计、校验、精简或评审 Agent Note 时加载它；一份新笔记触发取代关系检查时加载它；一次改动触及 `.agents/dsh-spec/notes/` 时也加载它。它假定这棵树已经存在：创建生命周期、类别与约定是 [`dsh-spec-manager`](../dsh-spec-manager/references/manager-init.md) 的职责，因此当目录树缺失或只建了一半时，应当去那里，而不是在这里修补。

## 它做什么

它先校验，后判断。校验会针对目录树运行下面三道门禁，并连同路径和所违反的规则逐条报告违规，而不是悄悄修复，因为一份笔记该放在哪里通常是一个决定。判断则按每份笔记理由的未来价值分类：

| 笔记的状态 | 处理结果 |
|---|---|
| 已实现，且其理由、替代方案、保证或归属边界仍能指导工作 | 保持活跃 |
| 已实现、已经完整，但不太可能指导未来的工作 | 封存完整的三份文件 |
| 提案，且仍在推进 | 保留；若不再值得推进，则以诚实的理由否决它 |
| 已否决，且那个落败的想法仍是一个诱人的错误 | 作为护栏保留 |
| 已否决，且已经过时、已被取代或不再可信 | 删除这三份文件 |

封存是机械且单向的：把 `foo.md`、`foo.zh.md` 和 `foo.i18n.yaml` 这三份文件一起移到 `archived/<kind>/`，在两种语言的正文里各插入一行 `Archived:` 日期，重新记录配对哈希，再由门禁为它加上封印。来自活跃散文的入站链接，是加封之前活跃目录树要处理的问题，加封之后永远不再处理。

## 它拒绝做什么

- **它不会手工创建或修补一棵目录树。** 目录树是被初始化出来的，不是靠打补丁变出来的。
- **它不会为凑配额而封存。** 范围内的每一份笔记都会被检查，同类情形按同一条原则分类，难以判断的情形连同理由一起报告，而不是被强行归类。
- **它不会在封存时改动笔记。** 这三份文件里不做翻译、不重排版、不更新事实、不修链接；唯一变化的是那行封存日期。
- **已经加上封印的三份文件，它永不再次触碰**，并把已封存的笔记当作历史快照，而不是当前行为的权威。
- **它不会声称已封存笔记的出站链接有效**——封存门禁有意从不检查它们，因此那样报告等于断言一次并不存在的检查。

## 它的检查如何运行

门禁是代码，位于整个集合唯一的代码归属 `../dsh-spec-manager/scripts/`，并按名称通过它旁边的分发器 `run.ts` 寻址，从不按路径。本技能只交付散文，不含任何代码。

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-classification --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-archived-agent-notes --root .
```

封存新的一组文件是唯一的写操作：`verify-archived-agent-notes --write` 先证明每一道已有的封印仍然吻合，然后只追加新的哈希，并且它拒绝为空无一物的封存清单留下记录。其余证据通过 [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md) 选择。

## 接着读

- [`SKILL.md`](SKILL.md) —— agent（智能体）遵循的工作流：分类标准、经过校准的示例，以及封存步骤。
- [`notes-README.md.template`](../dsh-spec-manager/templates/notes-README.md.template) —— 本技能用来校验项目笔记树的约定。
- [`notes-archived-AGENTS.md.template`](../dsh-spec-manager/templates/notes-archived-AGENTS.md.template) —— 项目随附的冻结封存区规则。
- [`dsh-find-simplifications`](../dsh-find-simplifications/SKILL.md) —— 把保留判断与封存机制交给本技能的工作流。

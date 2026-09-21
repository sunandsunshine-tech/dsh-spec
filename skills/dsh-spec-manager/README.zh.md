---
description: "安装一棵决策记录树，以及让它保持诚实的门禁。"
kind: "module-contract-composition"
---
# dsh-spec-manager

[English](README.md) | 中文

## Summary

手动安装这一个技能，它带来另外七个：一棵决策记录树、一条聚合检查，以及让它们保持诚实的门禁。决策以笔记形式落地并附上被否决的替代方案，译文配对以内容 hash 记录，因此陈旧的译文会让检查失败而不是被发布；集合自己的文档直接陈述它的行为，而不再另立一套机制来陈述。代价是 `.agents/dsh-spec/` 下的一个目录，以及整个集合共同移动的同一个固定版本。

让 agent（智能体）团队的决策可留存、证据可校验：一个手动安装的技能，经由它带来另外七个，以及让两者都成立的各项门禁。

这是集合自己的文档——它会往项目里写什么、如何运行它的检查、以及如何改变它们的行为。

## 你可以用它做什么

- **记录「为什么」。** 每次非平凡变更都留下一份笔记，包含决策、被否决的替代方案和必须验证的内容，下一个 agent 不必重新争论一个已经定下的问题。
- **不再在评审里争论散文。** 门禁会拒绝不符合契约的笔记和未记录的译文，于是这些不会到达评审者面前。
- **翻译而不丢线索。** 配对会被检查结构是否一致，并以内容 hash 记录；陈旧的译文会让检查失败，而不是被发布出去。
- **问门禁，而不是读门禁。** 当一份文档被意外翻译、或意外没有被翻译时，一条命令就能指出它去找的是哪个对侧文件。
- **在既有项目中采纳。** 一个初始化器创建目录树、扩展而不重写你的指令文件，并列出它无法回答的每一个问题。

代价是 `.agents/dsh-spec/` 下一个目录的占用，以及八个由 agent 按需选择性加载（而非一次全加载）的技能。

## 环境要求

Node ≥ 22.19 或 ≥ 24、pnpm ≥ 10，以及带 `skill` 命令的 `gh`。没有 `package.json`、没有安装步骤、没有构建。

## 安装

手动安装这一个技能；它是项目自己添加的唯一入口：

```sh
gh skill install <owner>/<repo> dsh-spec-manager@<revision> --dir .agents/skills
```

以**项目作用域**安装并提交这个安装目录。此后 agent 加载的那份副本就是每位协作者运行的那份，而更新经由同一条路径到达所有人。

然后初始化项目。初始化器在没有 `--write` 时不写任何东西：

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts init --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts init --root . --write
```

它扩展而不是替换既有的 `AGENTS.md`，只创建一次决策记录树与文档目录下的两个路径，并列出只有你能提供的事实。接着让 manager 安装集合的其余部分：

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

`install` 为 manifest 的每个条目运行一次 `gh skill install`，全部取自 manifest 固定的同一个版本；记录这个版本的是安装器注入的元数据，除此之外不写任何东西。`update` 以同一个版本重新安装整个集合，`status` 报告与 manifest 或与某个已安装条目自身所载版本不一致的任何东西，`uninstall` 移除整个集合。绝不就地编辑安装副本，因为下一次安装会覆盖它。

一次安装有两半。第二半会进入**你的**目录树：`install` 与 `update` 还会运行初始化器的 `sync` 模式，把文本属于集合的那些文件——笔记约定及其三个 `AGENTS.md`、文档目录的常设指令、`.rgignore`，以及常设指令里被标记的小节——更新到同一个修订，因此每个项目的机制文本完全一致。有两样属于你的东西按规则保留：`docs/terminology.md` 的行，以及 `AGENTS.md` 中标记小节之外的全部内容。`sync` 单独执行这一半；不带 `--write` 时它只报告将会发生什么。

## 它会往你的项目里写什么

这些路径属于项目；其中的机制文本由 `sync` 保持与安装修订完全一致：笔记文件与文档指令会被替换，而术语表的行与标记小节之外的常设指令属于你，会被保留。

| 路径 | 保存什么 |
|---|---|
| `.agents/dsh-spec/notes/` | 决策记录、管束其布局与文件内格式的契约，以及它们所在的生命周期与分类目录 |
| `docs/terminology.md` | 每一对双语文档共同遵守的词汇表，且刻意以空表发布：一行就是一个决定，所以初始化器绝不写任何一行 |
| `docs/AGENTS.md` | 该目录的常设指令，包括谁可以向表中加行，以及这张表本身不声明配对 |

整个集合只有一个代码归属：`.agents/skills/dsh-spec-manager/scripts/` 承载每一道门禁、按名称解析门禁的分发器，以及它们共享的模块。这个目录是**集合的引擎，而不是本技能的私有资源**——其余技能只交付散文与参考文档，不含任何代码，因此门禁的缺陷属于集合，而不属于某一个工作流。

## 用法

门禁按名称通过分发器寻址，从不按路径：它是一条记录在 manifest 里的名字，由分发器旁的一个脚本支撑，两者必须一致——分发器在解析任何名称之前先核对它们，因此某道已记录门禁的脚本不见了，或出现一个不在记录里的 `verify-*.ts` 文件，会中止这次运行，而不是悄悄改变它：

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-classification --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-archived-agent-notes --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
```

每道门禁都从项目根目录运行，不需要任何依赖，且在找不到可检查内容时以非零退出。聚合命令运行记录中的每一道门禁，并在某道门禁失败**或**记录里一道门禁都没有时以非零退出；由于记录与目录在任何东西启动之前先被核对，某道已记录门禁的脚本不见了、或出现一个没人记录的 `verify-*.ts` 文件时，得到的是一份两侧都点名清楚的拒绝，而不是一次静默通过。正是这一点让每一道检查都不可选。

想只问一个文件，而不必读门禁：

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --root . --explain docs/guide.md
```

## 改变门禁的行为

门禁既不接受配置，也不接受修改。门禁读取的每个事实在文件树里都有唯一归属；当两件产物必须一致时——一条已记录的门禁与它的脚本——分发器会在运行任何东西之前核对它们是否一致：

| 事实 | 它在哪里 |
|---|---|
| 有哪些门禁 | `.agents/skills/dsh-spec-manager/references/manifest.json` 里的 `gates` 记录，每个名称都由分发器旁的一个 `verify-*.ts` 脚本支撑——两者在门禁运行时被核对 |
| 集合安装在哪个修订上 | 同一个文件里的 `revision` 字段 |
| 某个已安装技能实际处于哪个修订 | `gh skill install` 注入其 `SKILL.md` 的 `metadata` 块 |
| 哪些文档是配对的 | 文件树本身：`.md` 旁边有 `.zh.md` 对侧或 `.i18n.yaml` 记录 |
| 决策记录在哪里 | `.agents/dsh-spec/notes/`，`notes-root.ts` 里的一个字面量 |
| 术语表在哪里 | `docs/terminology.md`，`i18n-scope.ts` 里的一个字面量 |

把每条路径从唯一归属推导出来，正是取代本集合过去那份配置文件的东西：一条路径有两个字面量，就会发生改了一个、另一个继续悄悄生效，直到有人读到它。

## 已知限制

- `gh skill` 是预览功能，且它从仓库默认分支解析技能：每次安装都显式点名修订，因此项目拿到的是 manifest 固定的那一个。
- 没有门禁会自行运行：采纳它的项目在把自己的检查接进去之前，没有构建步骤、没有测试套件、也没有 CI。
- 留存的散文门禁覆盖链接目标、链接语法和 frontmatter 形态；文档长度与模块契约类型由评审负责，而不是由命令负责。
- 配对由文件树声明，因此删掉一个 `.zh.md` 就会悄悄解除配对；门禁报告「什么没有声明配对」，而这是否出于本意由评审判断。

## 里面有什么

八个技能，一个工作流一个。发现这个集合的 provider 会看到八个目录条目；manager 按名称从 manifest 安装另外七个，因此项目运行的就是那份文件列出的集合。

| 技能 | 回答什么 |
|---|---|
| [`dsh-spec-manager`](SKILL.md) | 拥有整个集合：初始化、安装、更新、移除、状态，以及聚合检查 |
| [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md) | 校验笔记树、检查取代关系、封存已发布的记录 |
| [`dsh-translate-docs`](../dsh-translate-docs/SKILL.md) | 让文档与译文保持同步，并记录配对 |
| [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md) | 覆盖一次外发改动的最小证据 |
| [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) | 每个位置各欠什么样的散文——API 文档、注释、测试、README、诊断信息、用户可见字符串 |
| [`dsh-trim-cot-leakage`](../dsh-trim-cot-leakage/SKILL.md) | 删除视角在撰写会话而非仓库的散文 |
| [`dsh-code-review`](../dsh-code-review/SKILL.md) | 评审者穿过一次改动的路径 |
| [`dsh-find-simplifications`](../dsh-find-simplifications/SKILL.md) | 把「找些可简化的东西」变成有证据的提案 |

## 接着读

- [`SKILL.md`](SKILL.md) —— agent 加载的入口，以及通往各个工作流技能的路由。
- [`references/manager-init.md`](references/manager-init.md) —— 初始化器，逐步说明。
- [`references/manager-lifecycle.md`](references/manager-lifecycle.md) —— manifest、安装、更新、状态、卸载、每道门禁所在的引擎目录，以及刷新集合的那条命令。
- [`scripts/README.md`](scripts/README.md) —— 门禁解析 Markdown 所用的内置 bundle，以及如何重新生成它。

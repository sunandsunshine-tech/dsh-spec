---
description: "散文在哪些位置是必需的、一次编辑必须保留什么，以及针对 Markdown 的三道机械检查。"
---
# dsh-prose-standard

[English](README.md) | 中文

## Summary

写到足以保住约定，然后删掉围绕它的推理过程、重复和装饰。本技能负责读者会遇到的每一处表面的编辑判断——README、公开 API 文档、代码与测试注释、实操手册（cookbook）、决策记录、提示词、诊断信息，以及命令行或界面字符串——也负责「哪些位置需要散文」这个独立问题。它是指导，不是脚本：它说明一段文字里哪些命题必须存活，而从不说一个句子该怎么写。

## 何时加载它

在撰写、评审、恢复、修剪或审计散文时加载它，也在一次改动新增、移动或删除注释、文档、诊断信息或用户可见字符串时加载它。它要求显式的 `scope`；范围缺失时，它报告缺少的输入并停下，而不是推断出一次仓库级通读。`mode` 在自动与交互之间选择，控制的是提问而不是写入权限——评审或审计只报告发现，只有被要求写入或修复的任务才应用改动。

## 它覆盖什么

统领规则是让每一条相关命题在编辑后存活：行为者与动作，条件、时机与顺序，must 或 never 这类情态，否定式保证与例外，归属、副作用、失败模式与后果。覆盖范围取决于位置而不是模板：调用方可见的区别属于 API 文档，不变量或竞态顺序属于注释，前置条件及其可观察的验证属于实操手册，消费方约定及其限制属于 README，不明显的测试设计属于测试，纠正办法属于诊断信息。把 `contract`、`boundary`、`shape`、`seam` 及其近亲当作使用前要核对的词，而不是禁用词。

## 包 README 欠什么

在面向 agent（智能体）的入口旁边，README 就是人的入口：一页说明这个包是做什么的、何时加载它，以及它的机制整体上是什么。它是为两分钟内作决定的人写的，因此保持文档的语体，而不是 agent 指令的语体，并把步骤、参数顺序和清单留给入口；只有读过入口才看得懂的小节一律删掉。它以配对形式交付——`README.md`、它的 `.zh.md` 对侧文件和 `.i18n.yaml` 伴随记录（sidecar）——因为入口只有英文，而 README 是任何一种语言的读者遇见这个包的地方。

## 它在哪里止步

- **它不会读取或编辑 `vendor/`**，即使请求的范围是整个仓库，也不会跟随符号链接进入其中。
- **它不会去现代化已冻结的封存区。** `.agents/dsh-spec/notes/archived/` 保存的是快照；为了理解一处历史引用可以查看确切目标，但绝不编辑。
- **它把生成的目录、快照和 fixture（测试前置数据）当作派生物。** 追踪每一个消费方，先改归属的源文件或场景，再重新生成。
- **它不会为了满足删除指标而制造编辑**，字数变少本身也不是改进。
- **它不会把模型可见字符串的改动塞进一次纯散文编辑。** 那里的措辞就是行为；授权范围内没有归属场景时，它保持措辞不变并报告这次推迟。

## 它的检查如何运行

三道门禁检查 Markdown 的机械形态，而不是它的编辑内容；本技能只交付散文，不含任何代码：这些门禁位于整个集合唯一的代码归属 `../dsh-spec-manager/scripts/`，并按名称通过它们旁边的分发器 `run.ts` 寻址。

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-md-links --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-md-link-syntax --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-md-metadata --root .
```

`verify-md-links` 拒绝目标不存在的相对链接、图片或定义，也拒绝落在 Markdown 文件上却对不上标题 slug 或显式 `<a id>` 的 `#fragment`。`verify-md-link-syntax` 拒绝被一次批量改写变成散文的链接——方括号标签后面跟着括号引用，或者链接套链接——因为两者都解析不出链接，于是解析器什么也不会报告。`verify-md-metadata` 拒绝被并进一行的 frontmatter 块、永不闭合的块，以及不是 `key: value` 映射的块。语料是本仓库撰写的每一个 Markdown 文件——包含 `.zh.md` 对侧文件——减去 [`md-scope.ts`](../dsh-spec-manager/scripts/md-scope.ts) 点名的目录树：冻结封存区、安装副本、`submodules/`，以及依赖或构建产物。文档长度与模块契约类型没有门禁，因此由评审负责。

## 接着读

- [`SKILL.md`](SKILL.md) —— agent 遵循的工作流：输入、按位置要求的覆盖、难以判断的情形，以及它该交出的报告。
- [`examples.md`](references/examples.md) —— 提炼过的前后对照示例，用来识别统领原则，而不是当作文字模板。
- [`dsh-trim-cot-leakage`](../dsh-trim-cot-leakage/SKILL.md) —— 处理视角在撰写会话而非仓库的散文的工作流。
- [`dsh-translate-docs`](../dsh-translate-docs/SKILL.md) —— 双语工作流，以及本技能编辑撰写侧时必须重新记录的配对。
- [`dsh-code-review`](../dsh-code-review/SKILL.md) —— 要求新散文接受语义判断、而不是凭一道通过的门禁放行的评审。

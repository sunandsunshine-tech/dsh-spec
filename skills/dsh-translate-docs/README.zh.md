---
description: "扩展的双语文档工作流：简报驱动的更新、整篇翻译，以及配对记录。"
---
# dsh-translate-docs

[English](README.md) | 中文

## Summary

在配对文档里，两种语言拥有同等权威，而一组配对是三份相邻的文件：`foo.md`、`foo.zh.md`，以及在两侧最近一次被确认一致时把双方哈希记录下来的 `foo.i18n.yaml`。这是改动这样一组配对中某一侧的昂贵路径——为已经漂移的配对生成简报，把整份新对侧文件委派给译者，以及在确认两侧说的是同一件事之后记录该配对的命令。

## 何时加载它

只在有决定时加载，绝不因为巧合而加载。用户要求时运行它；当你判断它确有必要时——某个配对漂移了、某个新页面需要一份对侧文件、评审人要求另一种语言——先停下来询问用户，说明要翻译什么、涉及哪些配对、会写入什么。没有人要求时不要运行它：一次仅仅触及配对文档的文档任务不是翻译任务，而 `verify-translation-pairing` 会在缺少对侧文件时告诉你。门禁要求的那一行对侧更新，按项目自己的轻量规则处理，属于日常工作，不属于本工作流。

## 三条路径

| 改动 | 路径 |
|---|---|
| 既有配对的一侧被编辑 | 简报驱动的更新。`gen-translation-brief.ts` 在最窄且可安全对齐的粒度上映射改动——先 Markdown 单元，再小节，最后整篇文档——并携带改动单元、它们触及的术语行，以及一份更新规则摘要。只落在双方共享代码围栏内的差异用 `--apply` 拼接；散文差异委派给一个 subagent，简报就是它的全部工作素材。绝不为应用一次更新而重译整篇文档。 |
| 还不存在对侧文件 | 整篇路径。由 subagent 先读下面这些事实来源，再逐节翻译，边译边把结构锁定到源文档；发起编排的 agent 不做翻译。 |
| 文档被删除或改名 | 连同 `.i18n.yaml` 一起删除或改名对侧文件，否则门禁会报告配对不完整。 |

## 它拒绝做什么

- **它绝不作为副作用运行。** 既不因另一个任务而运行，也不因为出现了一份双语文件就运行。
- **它绝不翻译已冻结的 Agent Note。** `.agents/dsh-spec/notes/archived/` 下的三份文件由封存门禁加封，不属于翻译工作。
- **它绝不臆造译法。** `docs/terminology.md` 里的术语严格按表中规定渲染；未列出的术语需要有可引用的先例，否则保留英文并列入「待定术语」。
- **它绝不记录尚未确认的配对。** `--write` 只点名你已验证的配对，并且拒绝不带参数运行，因此批量重录永远是显式的 `--all`。
- **它把通过的配对哈希当作结构，而不是质量。** 门禁比较标题层级、围栏、表格与列表结构、链接语言与语义目标；含义、术语和语气要在差异上读出来。

## 它的检查如何运行

简报生成器和配对门禁是命令，位于整个集合唯一的代码归属 `../dsh-spec-manager/scripts/`；本技能只交付散文，不含任何代码。`<pair>` 指配对中的任意一份文件。

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --write <pair>
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --explain <path>
```

语料级检查在推送前运行一次，经由 [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md) 选择，而不是每次更新都运行。新的对侧文件也是一页新散文，因此要对它运行 [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) 点名的三道 Markdown 门禁。

## 接着读

- [`SKILL.md`](SKILL.md) —— agent（智能体）遵循的工作流：审批关口、更新路径、整篇路径，以及收尾配对。
- [`i18n-contract.md`](references/i18n-contract.zh.md) —— 配对约定：三份文件构成的一组、一致性记录、语言切换行、范围与排除项。
- [`translation-rules.md`](references/translation-rules.zh.md) —— 如何翻译：忠实性、结构、术语纪律与排版，按 MUST/SHOULD 分级。
- [`style-samples.md`](references/style-samples.md) —— 语体的校准锚点，与本项目自己的金标译文对照。
- [`translation-prompt.md`](references/translation-prompt.md) —— 自动流水线使用的机器消费模板，agent 不渲染它。

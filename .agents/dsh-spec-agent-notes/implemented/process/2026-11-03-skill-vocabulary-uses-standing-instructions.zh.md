# Agent Note: 技能集把项目指令来源称为 standing instructions

Status: implemented

[English](2026-11-03-skill-vocabulary-uses-standing-instructions.md) | 中文

## 问题

有六个技能把项目的指令来源——`AGENTS.md` 或它引用的文件——称为 declaration。该词陈述的是一份文档的形式，而不是遵守它的义务；在 `dsh-spec-pr-description` 中它还会与 AI-DECLARATION 块冲突，而那里的 declaration 是固定的格式名。`dsh-spec-agents-md` 与 `dsh-spec-code-review` 的触发描述、以及 `dsh-spec-prose-standard` 的正文已经使用 standing instructions，于是阅读多个技能的 agent 会为同一个指涉遇到两个名字。没有现行笔记拥有这套词汇；术语记录管理的是翻译表，不是技能指令。

## 决策

在技能指令中，项目的指令来源称为 the project's standing instructions（`AGENTS.md` 或它引用的文件）。原先使用 declaration 的六个技能改用该说法，包括 `dsh-spec-translate-docs` 的双语 description。这些技能加载的参考文档——笔记契约、配对契约、翻译规则与文风样例——也使用该说法。`dsh-spec-pr-description` 的默认约定参考把另一个条件（已声明的结构）从 declaration 改成 declared structure，其技能正文原本就叫 standing instructions。描述动作的动词 declare、declared 与 AI-DECLARATION / `ai-declaration:*` 标识保持不变。记录保留原措辞：它们保存的是当时记录的决策。仓库文档、技能根 notices 与 translate 包的注释也使用 standing instructions；根 `AGENTS.md` 本身就是本仓库的 standing instructions。除历史记录外，该词现覆盖读者会遇到的文档表面。

## 备选方案

- **保留 declaration。** 它更短、原本占多数；落败，因为它命名的是形式而不是义务，并让 AI Usage 词汇过载。
- **两个词并存。** 可以省去散文改动；落败，因为独立加载的技能会为同一个指涉保留两套触发与正文词汇。
- **把该词也应用到记录与仓库文档。** 落败，因为 implemented 笔记保存的是它记录的决策；改写其措辞会模糊变更，而不是统一指令。

## 后果

- 六个技能正文现使用 standing instructions；它们加载的四份参考文档同样使用，pr-description 默认约定参考则按另一个条件改为 declared structure。仓库文档、技能根 notices 与 translate 包注释也使用该词，记录保留历史措辞。安装副本逐字镜像；token 变化很小，十二个技能门禁全部通过。
- 触发词汇、行为、schema 与 description 的范围不变；该术语是行文，由评审执行。
- 加载的指令与参考文档中剩余的 declaration 归类为 AI Usage 名称、companion 声明、代码或类型声明、动词，或保留原措辞的仓库文档；没有任何一处技能指令或参考文档指称项目指令来源。

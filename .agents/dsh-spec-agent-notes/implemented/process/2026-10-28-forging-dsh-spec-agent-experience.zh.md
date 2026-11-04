# Agent Note: 为提示词编写锻造 dsh-spec-agent-experience

Status: implemented

[English](2026-10-28-forging-dsh-spec-agent-experience.md) | 中文

## 问题

包里的 `dsh-spec-agent-experience` 条目原先是一个 create 模式的移植：它的 `SKILL.md` 逐字携带上游 `agent-experience` 文本，只有 frontmatter 不同。产生本次改动的请求把它替换为面向提示词编写的锻造：技能只能从上游技能推导，以提示词为对象，旧版本只是替换目标。两件事实使这次重铸成为必要，而不只是外观调整。上游正文从未把提示词点名为它所约束的对象；它的描述点名模型可见的工具定义与技能设计，规则谈的是“模型”看到什么，所以提示词编写者没有点名这一行为的触发词，正文也没有一行把六条原则绑定到正在编写的产物上。并且请求把领域收窄为提示词编写——任何主要提供给 agent 阅读的文本——同时保留上游机制，于是移植时“不新增”的裁决被适配裁决取代。

旧版本与其记录不是设计来源；上游文件是来源，请求提供了受众、领域、交付形态与停止条件。[第一份锻造记录](../../archived/process/2026-10-23-forging-dsh-spec-agent-experience.zh.md) 随本次改动归档。

## 决策

包交付 `dsh-spec-agent-experience`，它是从上游 `agent-experience` 技能为提示词编写锻造的技能。落地的 `skills/dsh-spec-agent-experience/` 包含：

- `SKILL.md`：标题 `# Writing prompts`；六条上下文原则以提示词为对象（S3–S6 改写措辞，S7 与 S8 逐字保留）；`## Tool definitions` 及其五条规则逐字保留，一处印刷撇号规范化；描述按请求适配——英文在前，点名写作行为与提示词产物，保留上游触发面，把“designing skills”收窄为“a skill's instructions”，并追加中文触发语。
- `THIRD_PARTY_NOTICES`：技能文本的来源声明——上游仓库、固定修订、上游路径、关系，以及上游与仓库的两份 MIT 通知——由 frontmatter 的 `license` 字段点名。
- 没有脚本、没有参考文件，模型可见正文里没有来源行。

旧 create 模式移植的内容被替换，`pnpm run skill:refresh` 把技能镜像到安装副本；上游命名的旧安装副本 `dsh-agent-experience` 连同其在旧 manager manifest 中的条目一并移除；第一份记录移入冻结归档。中文审查草稿与其配对记录在停下时配对，随后由 `publish` 删除；交付侧的语言切换行在发布前删除。

### 意图

| 字段 | 值 |
|---|---|
| 名称 | `dsh-spec-agent-experience`（由请求固定；与目录名一致） |
| 目标 | agent 在编写或修改提示词时使用的技能，使模型可见信息可发现并高效花费上下文 |
| 边界 | 编写或修改提示词：system prompt、工具定义、技能指令、上下文加载指令，或多步工作流的步骤。范围之外：锻造技能（归锻造技能）、写决策记录（归笔记技能）、安装、加载或使用技能 |
| 受众与领域 | 提示词编写者；任何主要提供给 agent 阅读的文本——提示词与上下文工程 |
| 语言 | 交付英文。评审语言与附加触发语中文 |
| 基线 | 分支 `forge/dsh-spec-agent-experience`，来自 `refactor/dsh-skills` 的 `609514c`，位于独立 worktree；主工作树保持在 `refactor/dsh-skills` |

### 锻造设置

| 设置 | 值 |
|---|---|
| 模式 | 从来源锻造，替换已落地的同名技能；旧技能只是替换目标 |
| 来源 | 下文点名的上游 `SKILL.md`；其约束是 S1–S14 |
| 工作目录 / 落地 | `.agents/dsh-spec-skill-forge/dsh-spec-agent-experience/`（由 publish 删除）/ `skills/dsh-spec-agent-experience/` |
| 审查草稿 | 声明后缀 `.zh.md` 与 `.i18n.yaml`；只在停下时写入并配对，随后由 `publish` 删除 |
| 记录 | 本记录，随已落地内容保持最新 |
| 回滚 | 回退 `refactor/dsh-skills` 上的 squash commit；旧移植、其安装副本与第一份记录随回退回到树中 |

### 来源约束

上游文件里的每项要求、禁止、条件或固定选择都是来源约束：

| Id | 位置 | 约束 |
|---|---|---|
| S1 | L2 | 技能名为 `agent-experience`；目标技能使用自己的名字 |
| S2 | L3 | 描述点名产物（模型可见的工具定义：名称、描述、参数 schema、system-prompt 段落）与相邻的设计任务（技能、上下文加载、多步工作流），并说明目的：使信息可发现并高效使用上下文 |
| S3 | L6 | 从最小上下文开始：先给出目的、可用动作与约束；需要时再加载详细指令 |
| S4 | L7 | 让发现是显式的：每一项被推迟的资源都需要清晰的描述与可靠的获取方式 |
| S5 | L8 | 让关键约束保持可见：权限、破坏性影响与必需的校验出现在相关动作之前 |
| S6 | L9 | 偏好有界输出：结果简洁，并给出用于取回细节的标识符或路径；不要倾倒整个日志或文档 |
| S7 | L10 | 使用局部性：在某个操作的结果旁附带一小段很可能会用到的相邻上下文，例如交付一条线程回复时带上前面几条消息；显式标注省略与截断；给出取回更多内容的方式 |
| S8 | L11 | 评估总工作量：节省上下文只有在不导致更多搜索、重复读取或错误时才有用 |
| S9 | L13 | `## Tool definitions` 一节承载适用于工具定义的规则 |
| S10 | L15 | 删除显而易见的约束：省略模型能从调用结果里学到的规则，例如文件不存在时读取会失败、发送失败时不会送达 |
| S11 | L16 | 描述行为，而不是实现：说明工具做什么、返回什么；省略内部机制、模型在结果里看到的输出标记，以及执行细节 |
| S12 | L17 | 把参数规则放在参数上：默认值、范围、配对关系与何时设置的规则属于该参数的描述或 schema；一段随配置变化的描述，通常意味着变化的部分属于某个参数 |
| S13 | L18 | 每个事实只说一次：不要在 system-prompt 段落里重复工具定义，不要在工具描述里重复参数描述，也不要在一个工具里重复另一个工具的规则 |
| S14 | L19 | 度量变化：在修改工具定义前后，比较首轮提示词的 token 数 |

### 设计

一个 `SKILL.md`，没有 `references/` 也没有 `scripts/`。正文以标题 `# Writing prompts` 开头，在加载文本开头点名领域；上游正文没有标题，所以这是排版新增，不是规则。随后是六条上下文原则，以提示词为对象：S3、S4、S5 与 S6 只改措辞（目的、被推迟的资源、被约束的动作与被请求的结果都以提示词为主语陈述）；S7、S8 与五条工具定义规则逐字保留，只有上游 “operation’s” 中的印刷撇号规范化为 ASCII。`## Tool definitions` 保留其五条规则：工具定义是提示词的一种，而上游规则本就是关于这种提示词产物的。描述以写作行为与提示词产物开头，保留上游触发面——工具定义细节、上下文加载指令与多步工作流的步骤——并把“designing skills”收窄为“a skill's instructions”，因为技能创建是锻造技能的边界；中文触发语追加在后。

`SKILL.md` 旁，技能目录携带一个 `THIRD_PARTY_NOTICES` 文件：它给出上游仓库、固定修订、上游路径与关系，并复现上游与仓库的两份 MIT 通知；frontmatter 的 `license` 字段点名它。该文件不属于加载的指令，模型可见正文里也没有来源行，因此来源声明不改变技能。

有三样来源没有的东西被刻意不加：参考文件（正文只有一屏；渐进披露会新增一个文件与一条取回规则，却没有内容可推迟）、脚本（没有任何来源约束能由命令判定；S14 需要客户端的 token 计数，捆绑一个启发式会是新机制与错误度量）、以及描述里的显式排除句（产物与行为已经限定触发范围；上游文件没有排除句）。它们的缺席记在裁定里，而不是隐藏。

### 来源约束与处置

| Id | 处置 | 目标位置 | 依据 |
|---|---|---|---|
| S1 | 适配 | `frontmatter.name` = `dsh-spec-agent-experience` | 请求固定目标名称；目录名必须与之一致 |
| S2 | 适配 | `frontmatter.description` | 请求的提示词编写领域；上游触发面保留——工具定义细节（名称、描述、参数 schema、system-prompt 段落）、上下文加载（作为上下文加载指令）与多步工作流的步骤——而“designing skills”变为“a skill's instructions”（R9）；追加中文触发语 |
| S3 | 适配 | 正文，第一条原则 | 提示词是对象；目的、可用动作与约束仍在最前，详细指令推迟到任务需要时 |
| S4 | 适配 | 正文，第二条原则 | 被推迟的资源就是提示词推迟的资源；规则含义不变 |
| S5 | 适配 | 正文，第三条原则 | 提示词把约束放在它所约束的动作之前；只改措辞 |
| S6 | 适配 | 正文，第四条原则 | 提示词请求结果，而不是返回结果；标识符、路径与不倾倒规则保留 |
| S7 | 保留 | 正文，第五条原则 | 规则谈的是某个操作的结果与一条线程回复；其措辞没有点名提示词，按原样保留而不改编例子。印刷撇号规范化为 ASCII |
| S8 | 保留 | 正文，第六条原则 | 与领域无关；按原样保留 |
| S9 | 保留 | 小节标题 `## Tool definitions` | 工具定义是提示词的一种；标题点名五条规则所约束的产物 |
| S10 | 保留 | 工具定义，第一条规则 | 上游措辞与含义成立 |
| S11 | 保留 | 工具定义，第二条规则 | 上游措辞与含义成立 |
| S12 | 保留 | 工具定义，第三条规则 | 上游措辞与含义成立 |
| S13 | 保留 | 工具定义，第四条规则 | 上游措辞与含义成立 |
| S14 | 保留 | 工具定义，第五条规则 | 上游措辞与含义成立；度量依赖客户端的 token 计数，所以技能陈述比较，而不捆绑度量 |

覆盖：S1–S14 各有一行处置与一个位置；没有约束缺少位置，也没有处置重复或冲突。请求与仓库语言规则强制的增补记在裁定 R4（标题）、R6（中文触发语）与 R9（“designing skills”收窄）下。

### 裁定

| Id | 裁定 | 依据 | 可逆方式 |
|---|---|---|---|
| R1 | 这里的提示词编写指编写或修改任何主要提供给 agent 阅读的文本——提示词与上下文工程。清单是举例，不是封闭边界：system prompt、工具定义、技能指令、上下文加载指令或工作流的步骤。工具定义保留独立小节，因为它是提示词产物且有自己的规则 | 请求方的澄清与上游描述的产物清单 | 收窄描述 |
| R2 | 不捆绑脚本 | 没有任何来源约束能由命令判定；S14 需要客户端的 token 数，不是启发式；锻造技能的脚本转换检验不成立，缺席是记录在案的裁定而非停下 | 只有在有真实 tokenizer 接口时才加脚本 |
| R3 | 不提供参考文件 | 正文只有一屏；参考文件没有可推迟的东西。渐进披露用于 agent 不是每次运行都需要的内容 | 当正文超出一屏时拆分内容 |
| R4 | 正文以标题 `# Writing prompts` 开头 | 提示词是请求点名的对象；加载文本应在规则之前点名它；上游没有标题是排版事实，不是规则 | 删除标题 |
| R5 | 描述不带显式排除句 | 上游描述没有；产物与行为限定了触发范围。“a skill's instructions”可能与锻造技能的触发重叠，第一份锻造记录已指出；这一重叠被接受，而不是用来源没有的排除机制化解 | 若触发评估显示误触发则添加 |
| R6 | 中文触发语追加在交付语言描述之后 | 仓库的技能描述追加评审语言；锻造技能的交付/评审语言规则；描述保持在 1024 字符限制内 | 若描述超限则裁剪 |
| R7 | 本记录自己的翻译与配对记录在落地时写入，最终人工评审之后 | 请求把笔记配对留到那次评审；仓库的活跃笔记都有对侧文件，落地改动让本单元完整 | 若项目停止翻译笔记则删除对侧文件 |
| R8 | 被携带文本的来源声明在技能边缘，而不在正文。frontmatter 的 `license` 字段点名技能根 `THIRD_PARTY_NOTICES`；该文件给出上游仓库、固定修订、上游路径与关系，并复现上游与仓库的两份 MIT 通知。模型可见正文里没有来源行 | 技能正文是 agent 加载的内容，正文里的行会改变技能。Agent Skills 规范的 `license` 可选字段是技能层面的位置，用于许可名或指向随附文件；而随附通知是唯一能随安装副本走的形态。仓库通知现在陈述这一位置，且仓库自己的锻造技能已为其打包代码携带技能根 `THIRD_PARTY_NOTICES` | 改变位置（例如仅许可字段，或正文行） |
| R9 | 上游触发“designing skills”作为“a skill's instructions”携带 | 技能创建是锻造技能的边界；本技能约束的是这种设计留给 agent 的指令文本。上游触发面的其余部分（工具定义细节、上下文加载指令与多步工作流的步骤）保留 | 恢复“designing skills” |

### 来源考据

R8 的位置是在停下之后按请求方的指示确定的。证据于 2026-10-28 读取：

- [Agent Skills 规范](https://agentskills.io/specification.md)把 `license` 设为可选 frontmatter 字段：许可名，或指向技能目录内随附许可文件的引用。
- 仓库的 `THIRD_PARTY_NOTICES.md` 点名上游仓库与固定修订，其文件头句子描述的是从上游源码树搬运的文件；`scripts/dsh-spec-manager/scripts/` 下 17 个文件带 SPDX 行，其中 16 个还给出上游来源。`skills/` 与 `.agents/skills/` 下没有任何 Markdown 在本次改动前带这种头。
- 锻造技能自己的 [THIRD_PARTY_NOTICES](../../../skills/dsh-spec-skill-forge/THIRD_PARTY_NOTICES) 是仓库对技能第三方材料的既有位置：文件放在技能旁边，而不是放进技能内容。
- 上游 checkout 在仓库根只有一个 MIT `LICENSE` 与一个 `THIRD_PARTY_NOTICES.md`，没有按技能分放的许可或通知，因为其技能在那里是第一方。
- 上游与仓库的 MIT 许可要求副本包含版权与许可声明；安装的技能副本是技能目录，所以仓库级通知到不了它。
- 请求方授权完成仓库级 `THIRD_PARTY_NOTICES.md` 的处理。该通知现在区分被搬运的源文件（SPDX 行旁的 header）与被搬运或改编的技能文本（frontmatter `license` 点名技能根 `THIRD_PARTY_NOTICES`），点名两项被改编技能的声明，并说明锻造技能为其打包代码携带技能根通知。笔记技能的声明在此次落地之后以同样方式补充，记录在[其锻造记录](2026-10-27-forging-dsh-spec-agent-notes.zh.md)中。锻造技能的文本是本仓库自己的作品——其锻造记录点名 Agent Skills 规范与本仓库更早的技能，而不是上游文本——所以它不需要被携带文本声明。

结论：这份被改编的文本需要声明，而非侵入、与规范一致的位置是 `license` 字段加技能根通知。frontmatter 字段不改变任何被加载的正文；通知文件从不作为指令被读取。仓库级通知陈述了规则与剩下的迁移。

### 验证

| # | 要求 | 锚点 | 证据 |
|---|---|---|---|
| 1 | 落地技能符合 Agent Skills 规范：frontmatter 字段封闭、名称与目录一致、描述在限制内、链接解析、预算 | 机械 | 对落地目录运行门禁 → `13 check(s), 0 failed`；22 行，约 569 tokens；描述 422 字符；license 59 字符 |
| 2 | 每条来源约束 S1–S14 有一行处置与一个位置 | 判断；处置表是被点名的参照 | § 来源约束与处置 中每行一个结论 |
| 3a | 落地正文携带全部十一条上游规则引导语 | 机械 | 引导语检查 → `11/11 rule lead-ins present` |
| 3b | 七条逐字规则（S7、S8、S10–S14）就是上游规则文本，撇号规范化 | 机械 | 与上游逐字 diff → 无输出，退出 0 |
| 3c | 四条适配规则（S3–S6）保留上游裁决 | 判断；上游文件是被点名的参照 | 每条规则一个结论：S3 保留目的、动作与约束在前；S4 为每一项被推迟的资源保留描述与取回路径；S5 保留约束先于动作；S6 保留标识符、路径与不倾倒规则，由提示词请求结果 |
| 4 | 描述以交付语言开头、追加中文触发语、点名写作行为与产物，并在 R9 收窄下保留上游触发面 | 判断；规范 § description、锻造技能的评审语言规则、S2 | 一个结论：落地描述英文在前，追加中文从句，点名写作行为与提示词产物，并保留上游触发面 |
| 5 | 技能适用于提示词编写：标题、描述与四条适配原则以提示词为对象；S7 与 S8 保持与领域无关；不声称边界之外的任务 | 判断；请求的受众与领域 | 每个元素一个结论：标题点名写作行为；描述点名提示词及其产物；S3–S6 各自陈述关于提示词的规则；S7 与 S8 携带与领域无关的规则且不点名提示词；边界排除技能锻造、决策记录与安装，技能也不声称它们 |
| 6 | 技能不提供脚本或参考机制 | 机械 | 门禁的 `script coverage` 与 `reference mentions` 报告 none；落地目录只有 `SKILL.md` 与 `THIRD_PARTY_NOTICES` |
| 7 | 审查草稿在停下时配对，项目配对门禁报告它是最新的 | 机械 | 停下时：锻造 `pair` 报告 `SKILL.zh.md` 与 `SKILL.i18n.yaml` → `SKILL.md`（2 actions, 0 failed）且 `check translation-pair: ok`；随后 `publish` 删除两者 |
| 8 | 笔记树符合其约定，归档单元已封印 | 机械 | 活跃检查 → `31 note(s) and 62 companion(s) checked`；归档检查 → 15 个冻结产物通过检查，3 个新产物已封印 |
| 9 | 仓库测试套件、格式与 DCO 通过 | 机械 | `pnpm test` → 206 tests, 206 pass, 0 fail；`pnpm run format:check` → all matched files use the correct format；每个分支 commit 都带匹配的 Signed-off-by，落地 commit 重复同一 trailer |
| 10 | 落地替换了旧移植、镜像了安装副本、归档了第一份记录 | 机械 | `pnpm run skill:refresh` 镜像 2 个文件；`skills/` 与 `.agents/skills/` 之间的 `diff -r` 为空；第一份记录及其对侧文件位于 `archived/process/` 并已封印 |
| 11 | 描述在真实提示词编写请求上触发，并在相邻任务上保持安静 | 未验证 | 没有运行 agent harness 或触发评估；请求方确认该检查在这里本质不是机械的，由人工评审决定。方法是 optimizing-descriptions 页面里的 eval 循环 |
| 12 | 这些原则能改进编写者产出的提示词 | 未验证 | 没有运行干净上下文评估；请求方确认该效果在这里无法机械验证，而 best-practices 页面的 refine-with-real-execution 循环需要评估 harness 与模型 |
| 13 | 被携带文本的来源声明不进入模型可见正文，且仓库通知陈述该声明的位置 | 判断；Agent Skills 规范的 `license` 字段、仓库的 `THIRD_PARTY_NOTICES.md` 与锻造技能的技能根通知是被点名的参照 | 一个结论：frontmatter 的 `license` 点名技能根 `THIRD_PARTY_NOTICES`，后者给出上游仓库、固定修订、上游路径与关系，并复现上游与仓库的两份 MIT 通知；`SKILL.md` 不带来源行；仓库通知的 DeepSeek Harness 一节陈述两项被改编技能共用的技能文本位置 |

落地时使用的验证命令：

```bash
node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-agent-experience
node -e 'const fs = require("node:fs"); const leads = ["Start with minimal context", "Make discovery explicit", "Keep critical constraints visible", "Prefer bounded outputs", "Use locality", "Evaluate total work", "Delete obvious constraints", "Describe behavior, not implementation", "Put parameter rules on the parameter", "Say each fact once", "Measure the change"]; const text = fs.readFileSync("skills/dsh-spec-agent-experience/SKILL.md", "utf8"); const missing = leads.filter((lead) => !text.includes("**" + lead)); console.log(missing.length === 0 ? leads.length + "/" + leads.length + " rule lead-ins present" : "missing: " + missing.join("; ")); process.exit(missing.length === 0 ? 0 : 1)'
diff <(sed -n '10,11p;15,19p' submodules/dsh/packages/preset/agent-preset/skills/agent-experience/SKILL.md | sed "s/’/'/") <(grep -E '^- \*\*(Use locality|Evaluate total work|Delete obvious constraints|Describe behavior, not implementation|Put parameter rules on the parameter|Say each fact once|Measure the change)' skills/dsh-spec-agent-experience/SKILL.md)
node skills/dsh-spec-agent-notes/scripts/notes.mjs check --companion .zh.md --companion .i18n.yaml
node skills/dsh-spec-agent-notes/scripts/notes.mjs archive --companion .zh.md --companion .i18n.yaml
pnpm test
pnpm run format:check
```

#### 验证门禁参数

门禁使用其默认值：当前规范限制（名称 64、描述 1024、兼容性 500、正文低于 500 行与 5,000 tokens）。没有覆盖任何选项。

### 评审

一名与工作无关的只读设计审计员在 commit `7c58fef` 审阅设计，返回 **needs revision**（两个 major、六个 minor）；`9dae252` 的修订返回 **accept with minors**，minor 在候选写入前于 `16b1e05` 应用。候选写于 `2656b7e`；随后两名独立只读评审**带着 minor 接受**，在 `bdc0d31` 应用，二人确认修复关闭。之后请求方在停下后指示两项跟进——被携带文本的来源声明与仓库级通知处理——后来又要求为笔记技能补同样的声明；这些都在上文记录，每次修订由一名只读评审检查。请求方的最终评审接受结果，并授权落地与向 `refactor/dsh-skills` 的 squash 合并。

### 阅读页面

| 页面 | 日期 | 提供的内容 |
|---|---|---|
| [Agent Skills index](https://agentskills.io/llms.txt) | 2026-10-28 | 链接页面集合；锻造技能要求的规范页与最佳实践页 |
| [Specification](https://agentskills.io/specification.md) | 2026-10-28 | 必需 frontmatter 及其约束、正文自由度、渐进披露、文件引用、可选的 `license` 字段 |
| [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices.md) | 2026-10-28 | 明智花费上下文、连贯单元、适度细节、渐进披露、默认值、校准 |
| [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions.md) | 2026-10-28 | 描述承担全部触发负担；祈使式措辞；触发评估方法 |

index 还链接快速开始、客户端实现、脚本与评估输出等页面。它们没有按需阅读：技能不带脚本、不实现客户端，也不运行本记录声称的评估。离线兜底未被使用，因为每个必需页面都可读。

## 待办

- 基线分支尚未 push。squash 合并是局部的；转评审与 push 是维护者的后续行为。
- 锻造 worktree 及其分支在 squash 合并后仍在本地；删除它们是收尾工作。

## 曾考虑的替代方案

**保留移植，只改描述。** 它失败，因为请求替换了旧技能并给出提示词编写作为领域；只改描述会让正文对提示词只字不提，也不构成一次锻造。

**逐字携带上游正文，不加标题、不改措辞。** 它失败，因为正文会让提示词保持隐含，而请求的领域是提示词编写；四条适配原则陈述的是同一批关于正在编写的产物的规则。适配的代价记录在处置表里，而七条规则仍逐字保留。

**加一个带提示词编写示例或检查清单的参考文件。** 它失败，因为正文只有一屏，示例会制造无法收敛的校准面；锻造记录将不得不携带来源没有的内容，而请求要求的是适配，不是新机制。

**捆绑一个提示词 token 度量脚本。** 它失败，因为技能没有可用的 tokenizer，字符启发式会得到与 S14 要求编写者比较的数字不同的结果；没有客户端 token 计数就不可能精确，错误度量比指令更糟。

**在 `evals/` 下提供提示词触发评估。** 它们失败，因为本次工作没有 agent harness 运行来产出真实触发率，一份从未运行过的评估集会成为未经验证的主张。

**把技能并入锻造技能或笔记技能。** 三者拥有不同的决策：锻造技能产出技能目录，笔记技能拥有决策记录，而本技能陈述提示词怎么写。合并会模糊仓库已声明的边界。

**把来源放进 `SKILL.md` 内的 HTML 注释。** 它失败，因为正文是模型加载的内容，而请求方要求技能本身不受影响；正文注释也不是规范的许可面。

**只依赖仓库级的 `THIRD_PARTY_NOTICES.md`。** 它失败，因为安装的技能副本是技能目录；仓库级通知不会随它走，而 MIT 通知必须包含在副本中。

**只用 frontmatter 的 `license` 字段。** 它失败，因为署名文本与两份完整 MIT 通知需要一个文件；该字段只能点名一个。

**用普通 `LICENSE` 文件代替通知。** 它失败，因为许可文件陈述条款，却不说明这份副本来自哪个上游修订与路径，也不会命名改编；通知文件可以同时携带两份通知与来源事实。

## 后果

- 包交付一个提示词编写技能，保留上游机制：六条上下文原则与五条工具定义规则，以提示词为对象，带提示词编写触发词与中文触发语。
- 旧 create 模式移植的内容被替换，安装副本镜像落地技能，第一份锻造记录连同其对侧文件被归档并封印。仓库级 `THIRD_PARTY_NOTICES.md` 的改动（技能文本位置规则）随同一落地 commit 进入。
- 技能让出的是可检查性：门禁建立规范符合性与机械保真检查，但触发准确性与提示词质量未验证（锚点 11 与 12）。技能按设计保持贴近上游；请求要求的是适配，不是重写。
- 来源声明现在覆盖两项从上游改编的技能——`dsh-spec-agent-experience` 与 `dsh-spec-agent-notes`；锻造技能的文本是本仓库自己的作品，其通知覆盖打包代码。
- 回滚：落地是 `refactor/dsh-skills` 上的一个 squash commit；回退它恢复旧移植、其安装副本、未归档的第一份记录与先前的仓库通知措辞，并让本记录回到落地前的树中。

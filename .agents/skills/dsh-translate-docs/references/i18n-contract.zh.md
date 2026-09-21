# 双语文档

[English](i18n-contract.md) | 中文

本项目的文档会被团队内外的人和 agent（智能体）阅读，因此范围内的每篇文档都以英文和简体中文维护。本页定义配对约定、检查、范围与排除规则；[translation-rules.md](translation-rules.zh.md) 定义如何翻译；`docs/terminology.md` 是术语真源。agent 的日常工作遵循 `AGENTS.md` 中的轻量路径；扩展版 [.agents/skills/dsh-translate-docs](../SKILL.md) 工作流仅在用户显式调用时可用。

<a id="the-pairing-contract"></a>

## 配对约定

- **两种语言同权。** 一篇文档可以先用任一语言撰写和评审（先写中文的 Agent Note 与先写英文的一样正当），另一侧由它翻译而来。两个文件谁也不高于谁；约束它们的是二者必须说同样的话。
- **一对文档是三个同目录文件。** 英文 `foo.md`、中文 `foo.zh.md`，加一份一致性记录 `foo.i18n.yaml`，都在同一目录。不用语言目录，不用独立翻译仓库，不用中英混排的单文件。配对必须整体合并：PR（Pull Request）永远不会只带一种语言而缺其余两个文件。
- **一致性记录。**`foo.i18n.yaml` 保存两侧文件在上一次被确认「说同样的话」时各自的完整 Git blob hash：

  ```yaml
  foo.md: 3f786850e387550fdab836ed7e6dc881de23001b
  foo.zh.md: 89e6c98d92887913cadf06b2adb97f26cde4849b
  ```

  用 blob hash 而不是 commit hash，这样同一个 PR 里改动的文件也能算出记录（`git hash-object foo.md`），一致性是纯内容比较。`translation-pair write` 会先把这些快照存入本地 Git 对象库再写下记录，未提交的 worktree 内容也不例外；它还会在内容寻址的 `refs/dsh/translation-pairing/snapshots/` ref 下固定每个不同的已存 blob，使垃圾回收无法让已记录的恢复指针失效。记录的 hash 能还原任一侧上次确认时的确切文本，所以失去同步的配对是「按被改一侧的 diff 最小化地修补另一侧」，从不整篇重译。日常工作会直接完成这份修补；用户显式调用扩展工作流时，可改由 `node <manager>/scripts/dsh-spec.ts translation-pair brief <pair>` 以能安全对齐的最窄粒度汇集这次更新，并由 `--apply` 在结构校验后拼接仅涉及围栏代码块的改动。两侧对齐后，`node <manager>/scripts/dsh-spec.ts translation-pair write <pair>` 重新记录两个 hash；那份 YAML diff 就是「确认一致」这个动作本身，可以被评审，也正因如此，`translation-pair write` 要求点名你确认过的配对（`translation-pair write --all` 是显式的全语料形式）。

- **语言切换行。** 中文文件一律在 H1 标题后立即以 `[English](foo.md) | 中文` 链回英文，英文文件也在同一位置以 `English | [中文](foo.zh.md)` 互链。没有例外：生成器无法带上这一行的文档就不该声明配对。
- **结构与另一侧一一对应。** 标题深度与顺序、列表类型、有序列表起始编号、列表项数量、表格行列数、保留原样 query/fragment 后缀的语义链接目标，以及逐字节一致的代码块在配对两侧一一对应。相对文档链接的目标属于活跃双语语料时，英文侧使用其 `.md` 路径，中文侧使用其 `.zh.md` 路径。范围外的目标保留原路径。完整保持规则见 [translation-rules.md](translation-rules.zh.md)。

## 门禁：verify-translation-pairing

`node <manager>/scripts/dsh-spec.ts translation-pair check <pair...>` 对它被交来的那些配对机械地强制执行这份约定：

1. 文档自己声明是否配对：`.md` 旁边有 `.zh.md` 对侧或 `.i18n.yaml` 记录，它就属于配对的一侧；两者都没有的文档不受约束。没有任何清单列出必须配对的文档，因此也没有清单会与文件树脱节。
2. 任何已存在的配对产物都完整且一致：三个文件齐全、每一侧的当前 blob hash 等于记录值（改了任一侧而没重新确认配对就变红）、两侧都带语言切换行、每条普通相对文档链接都使用源文件一侧对应的目标 locale，且结构签名按序一致：标题深度、逐字节一致的代码块（信息字符串与内容）、表格行列数、列表类型、有序列表起始编号、列表项数量，以及除切换行之外保留原样 query/fragment 后缀的语义链接目标。
3. 依赖、构建与嵌套仓库目录树在语料之外；`.agents/dsh-spec/notes/archived/` 下冻结的 Agent Note 也不受这个持续演进的门禁约束，专用校验器会要求其现有的三个配对文件完整并将其封存。那里的 `.zh.md` 或 `.i18n.yaml` 永远不会被读取。

面向源码的代码门禁会把精确的 `.zh.md` 围栏序列视为其无后缀兄弟文件的派生内容，而不会再次编译相同代码或在 manifest（元数据清单）中重复登记。该序列必须在长度、顺序、围栏类型和按字节精确的正文上一致；否则两份副本仍会独立受检，配对门禁也会报告结构不匹配。

`node <manager>/scripts/dsh-spec.ts translation-pair list` 打印范围内每篇文档的当前配对状态（missing、out-of-sync 或 ok）。它从不失败；其中 missing 与 out-of-sync 行指出普通检查会拒绝的违规。

`node <manager>/scripts/dsh-spec.ts translation-pair <pair...>` 只检查被点名的配对——配对的三个文件中的任意一个（或其裸词干）都能点名它——因此更新循环几秒内就能验证自己的配对，而不必重新扫描全语料。`translation-pair list` 报告范围内每一篇文档，它那些非 `ok` 的行就是推送前全语料一遍时找出该交给检查的配对的方式；语料其余部分没读过的限定范围绿灯不是那一遍。

这个门禁带来的实际规则是：**当一个 PR 修改了已配对文档的任一侧时，同一个 PR 在术语指导下直接一次完成对侧文件的更新，并用 `translation-pair write <pair>` 重新记录配对**。让配对保持失去同步的改动会让门禁失败。

门禁的限制很明确：**门禁通过意味着这组文档在当前内容上的一致性得到了确认，不代表确认本身正确可靠。** 它检查记录的 hash 与 Markdown 结构；它无法判断两侧是否在说同样的话，也无法判断措辞是否准确、术语是否得当、行文是否自然；这部分约定由评审者把关，见 [translation-rules.md](translation-rules.zh.md)。重新记录了 hash 但另一侧翻得潦草的配对能通过门禁；它不得通过评审。

## 范围与排除

**范围**：由文件树自己声明。任何位置的一篇文档，只要旁边有对侧或记录，就属于范围；两者都没有的就不属于。不需要任何登记，因此新配对一出现就可翻译，未被触及的文档也不会被打扰。

同时产出两侧的生成器靠产出 `.zh.md` 来声明配对。它的输出就是两侧的真源；重新生成导致英文变化后，配对会保持失去同步，直至对侧重生成或更新并重新记录。

**语料之外**——无论那里有什么，门禁都不读取：

- 依赖、构建与 vendor 目录树，以及嵌套仓库：其中的 Markdown 属于别的所有者。
- `.agents/dsh-spec/notes/archived/`：冻结的历史三文件配对。`verify-archived-agent-notes` 校验其完整性和内容封存记录；翻译维护绝不能重写这些文件。
- 项目希望保持英文的其他任何文档：不写对侧文件，这本身就是全部声明。

**统一要求**：配对必须整体合并。两种语言加记录，在同一次改动里完成，否则门禁会报告配对不完整。

## 分工

日常更新对侧文件时，负责处理的 agent 会先加载 `docs/terminology.md`，再直接一次性更新；它不会调用翻译 skill（技能）、生成简报、执行单独的翻译评审轮次，也不会委派给 subagent。扩展版 [dsh-translate-docs](../SKILL.md) 工作流保留这些较重的机制，仅供用户显式调用。门禁负责检查配对是否完整、记录的 hash、两侧的切换行，以及本文列出的结构签名；翻译质量、术语和签名未涵盖的结构要求仍由评审把关。

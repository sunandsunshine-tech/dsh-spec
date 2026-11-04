# Style examples

Default voice-calibration guidance and reviewed English-to-Chinese passages. A project may replace
this whole file through its declaration; when it does, read the declared style file instead. The
binding priority is in [translation rules](translation-rules.md).

## How to use these samples

Read the nearest sample's target-language side before producing or updating a counterpart. A
sample calibrates sentence rhythm, how a passive construction becomes active, and how an idiom is
replaced; it refines wording only. Do not copy a sample's subject matter into an unrelated
document, and never invent a sample to justify a phrasing choice.

Match the document's register to the nearest group: architecture narrative, reference material,
procedure, policy or release note. One register does not fit every document. Read the completed
target side alone once and rewrite phrasing whose awkwardness only appears in isolation.

## Default file and project replacement

This is the skill's default style file. The project's declaration may name its own style file in
any location or format; that file replaces this one wholesale. When the declaration names none,
this default is used. The script never reads style files; only the agent does.

## What a sample is

A sample is a reviewed pair: one source-language passage beside the target-language rendering a
human editor approved. Samples are reference material, not rules; the binding priority is in
[translation rules](translation-rules.md).

## Calibration points

- Default voice is technical documentation: complete, direct sentences; not chatty, not academic.
  Match the closest sample group; when none fits, follow the project's existing translated documents.
- Keep terse prose terse: do not expand for elegance or compress for brevity.
- Give sentences the actor the source implies; English passive or abstract subjects become the
  actual actor in Chinese (for example 系统／门禁／工具／评审人).
- Replace literal renderings with established engineering usage: false positive/negative → 误报／
  漏检, ratchet → 只向前收紧不倒退放宽, reviewable act → 评审凭证.
- Localize metaphors rather than transplanting them: bilingual from birth → 从创建起就要求双语
  齐备, grandfathered → 历史存量遗留.
- Name categories in Chinese with a first-mention English gloss (实操手册（cookbook）,
  事故复盘（postmortem）); keep directory, path, command, flag and code identifiers in code-form
  English.
- Split long paragraphs by semantic unit: one paragraph, one point; expand noun phrases into verb
  sentences where the target grammar needs it.
- Rewriting natively is not deletion: every source proposition must land in the counterpart.
- Terminology precedence is a mechanism rule in [translation rules](translation-rules.md), not a
  style choice.

## Samples

## Architecture narrative

> This document describes the architecture of the DeepSeek Harness — the foundation of **DeepSeek Code**. The governing principle, from the microkernel design discussion: **everything is a plugin**. The core is deliberately tiny — a handful of abstract services plus one concrete loop plugin — and every product feature is a plugin against the extension API described here, without modifying the loop.

本文介绍 DeepSeek Harness 整体架构，它是 **DeepSeek Code** 的底层基座。微内核设计讨论中确立了核心设计准则：**一切皆插件**。内核刻意做得极精简，仅包含少量抽象服务，外加一个实体循环插件。所有产品功能均基于本文定义的扩展接口开发为独立插件，无需改动主循环逻辑。

> Dependency rule: extension plugins depend on interfaces, never on the concrete loop (the loop is swappable); composition bundles may assemble the concrete loop.

依赖约束规范：各类扩展插件仅依赖抽象接口，严禁直接依赖具体主循环（该主循环支持替换实现）；组合包可以组装具体循环。

## Mechanism description

> Blob hashes, not commit hashes, so the record is computable for files edited in the same change and consistency is a pure content comparison. The recorded hash also recovers the exact last-confirmed text of either side, so an out-of-sync pair is updated by diffing the edited side against its last-confirmed state and patching the counterpart minimally — never by re-translating whole files.

系统采用文件 blob hash 而非 commit hash 记录状态。同一变更内修改文件时，可直接算出对应 blob hash，仅对比文件内容即可判断双语文档是否同步。通过记录的 blob hash，可还原上次确认对齐时两侧的原文。当双语文档不一致时，只需对比修改版本与上次确认版本的差异，最小幅度同步修改另一侧译文，无需全文重新翻译。

## Policy statement

> The gate's limit, stated plainly: a green gate means the pair was confirmed consistent at these exact contents, not that the confirmation was sound. It checks hashes and Markdown structure; it cannot judge whether the two sides actually say the same thing — that is the reviewer's half of the contract. A re-recorded pair with a sloppy counterpart passes the gate; it must not pass review.

门禁的限制很明确：通过门禁只说明两侧文件当前的内容与伴随记录吻合，并且 Markdown 结构签名一致，也就是说，这组内容曾被确认一致；它不代表这次确认可靠。评审人必须检查两种语言是否真正表达了相同的意思。即使译文粗糙、表意有误，重新记录配对后仍能通过门禁，但绝不能通过人工评审。

## Argument in a decision record

> Comparing git timestamps of the pair (no record) — rejected: formatting-only edits would false-positive, and a counterpart committed after an unrelated edit would false-negative; content identity is the only signal that means what the gate claims.

对比双语文件的 git 时间戳（无记录方案）——不予采纳：仅调整格式的改动会触发误报，无关修改后再提交译文又会造成漏检。只有基于内容本身的标识（每侧文件的 blob hash 与伴随记录比对），才能承载门禁所声称的语义。

## Defensive pattern rules

> Hard-won bug-class rules: each pattern below is a class of defect that actually shipped or nearly shipped here, stated as the rule that prevents its recurrence. Read this before writing lifecycle, concurrency, subprocess, or teardown code.

这些都是踩坑总结得出的缺陷分类规范：下文每种范式都对应一类曾上线、或险些流入线上的问题，每条规范旨在杜绝同类问题复现。编写生命周期、并发、子进程、资源销毁相关代码前，请务必阅读本文档。

> **Dispose must reach quiescence, not just request it** — Await child exit after killing or aborting. Optional notifications may stop early; resources and listeners needed for completion or final persistence must survive until consumers settle.

**dispose（资源释放）必须等待所有任务完全停稳，不能仅下发终止指令就返回**：发出终止或中止信号后，等待子进程退出。可选通知可以提前停止；完成操作或最终持久化所需的资源与监听器，必须保持可用直到消费者结束。

## Testing policy

> **Coverage gate**: the gating run requires per-file 100% coverage on the source tree. An uncovered line is often dead code the gate is correctly flagging for deletion, not a missing test to bolt on.

覆盖率门禁：作为合入门禁校验，要求源码目录下每个文件行覆盖率达到 100%。未覆盖代码行大多是无用死代码，门禁标记这类代码是提示删除，而非单纯补充测试。

> We are DeepSeek — do not ration real-API tests. A no-key test proves the plumbing; only a with-key run proves the agent works against a real model. Prefer the real implementation over a mock; mock only genuinely expensive or non-deterministic dependencies.

我们是 DeepSeek：真实接口相关测试不得刻意缩减用例数量。无密钥测试仅能验证底层通路；只有携带有效密钥执行的用例，才能确认 agent 可正常对接真实模型。优先使用真实实现，而非 mock 替身；仅对开销极大、结果不确定的依赖做 mock。

## Long-paragraph split

> **Universal requirement**: when a pair is maintained, both sides are updated in the same change. Pairing is a continuing obligation: every later edit to either side updates the counterpart and consistency record in the same change.

**统一要求**：维护一个配对时，两侧必须在同一变更中一起更新。配对是一项持续义务：后续修改任一侧时，都必须在同一变更中同步更新对侧文件和一致性记录。

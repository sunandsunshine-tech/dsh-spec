# 移植分析的完整工作档案

这三份文件是 [dsh 基线 0.2.1 移植说明](../porting-dsh-baseline-0.2.1.md) 背后的逐项分析档案。主报告给出结论；这里保留每个技能的完整证据（结构、0.2.0→0.2.1 差异、dsh 绑定清单、通用内核、成本），供核对与锻造时查阅。

| 文件 | 覆盖 | 内容 |
|---|---|---|
| [`skills-core.md`](skills-core.md) | 9 个流程/规范类技能 | agent-experience、dsh-archive-agent-notes、dsh-code-review、dsh-doc、dsh-find-simplifications、dsh-pre-push-checks、dsh-prose-standard、dsh-trim-cot-leakage、dsh-translate-docs |
| [`skills-product.md`](skills-product.md) | 10 个产品/角色类技能 | cordis-styling-nitpicking、dsh-ci-test-reliability、dsh-client-ui-ux、dsh-create-upgrade-guide、dsh-error-handling、dsh-merging-stacked-prs、dsh-official-plugin-artwork、dsh-responsive-ui、dsh-speed-up-perf、record-browser-gif |
| [`notes.md`](notes.md) | 上游 Agent Notes 体系 | 契约解剖、全量统计（1267 个三元组）、335 条 active 主题清单、30 条可移植知识点候选、契约差异 16 条、移植建议与成本 |

口径：三份档案都针对基线 `dsh-v0.2.1-rc.2`（`687f282e86`），对比修订 `dsh-v0.2.0-rc.2`；行号与字节数取自该基线，路径相对 `submodules/dsh/`。这些是分析工作稿，不是决策记录；取舍结论以主报告与随后的 Agent Note 为准。

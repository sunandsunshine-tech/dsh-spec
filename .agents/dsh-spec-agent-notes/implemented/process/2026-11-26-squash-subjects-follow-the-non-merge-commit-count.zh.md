# Agent Note: squash 提交主题由非合并提交数量决定

Status: implemented

[English](2026-11-26-squash-subjects-follow-the-non-merge-commit-count.md) | 中文

## 问题

仓库采用约定式 squash 提交主题和四块式 PR（Pull Request）描述。没有明确的主题规则时，分支输入中手工写入的 `(#136)` 会在 GitHub 添加 PR 后缀后变成重复后缀，主题也可能描述评审或 rebase 机制，而不是最终产生的改动。AI（人工智能）协助的提交还要求在人工 DCO 之外附带机器 trailer。Issue #167 跟踪主题与披露边界。

## 决策

GitHub 当前生效的 squash 标题设置为 `COMMIT_OR_PR_TITLE`。恰好包含一个非合并提交的 PR 从该提交取得预期的 squash 主题；其他任何 PR 都从 PR 标题取得。合并提交不决定来源。两种来源都采用 `type(scope): imperative summary`：约定的 `type` 和 `scope` 标记保持不变，摘要则用本次改动的工作语言陈述最终产生的改动。仓库不要求使用英语，这种形式也不强制摘要使用英语。[当前用户语言选择](2026-11-27-human-language-follows-current-user-preference.zh.md)的决策取代本记录关于语言的结论；本记录的主题与 trailer 规则仍然有效。

跟踪器和评审引用应放在 PR 正文中。标题和每条分支提交主题都不得包含手工 `(#N)` 后缀，包括一条后缀，以及前面没有空白的后缀。GitHub 在创建 squash 提交时会用 PR 编号提供恰好一个后缀。主题检查读取 Git 的 `%s` 呈现结果，而不是提交消息的第一条物理行，因此开头的空行无法隐藏后缀。规范后缀还必须位于主题的真正末尾：其编号是一个正整数，采用不补零的十进制写法，而且末尾空白，包括不换行空格，不会被裁掉。

提交主题描述最终产生的改动，而不是评审、rebase 或会话机制。AI 披露与 DCO 的决定仍归[把仓库公开](2026-09-24-opening-this-repository.zh.md)所有。在这个提交主题的应用点上，每条 AI 协助的提交都在 `Assisted-by:` trailer 中写明每台参与的机器，并且仍携带 DCO 的 `Signed-off-by:`；两个 trailer 互不替代，本记录也不建立第二套 AI 或 DCO 策略。

贡献者规则和示例位于 [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md)。根目录的 [`AGENTS.md`](../../../../AGENTS.md) 向 agent 给出操作规则，并提供回链。[四块式描述所有者](../../../../skills/dsh-spec-pr-description/SKILL.md)及其 [AI Usage 参考](../../../../skills/dsh-spec-pr-description/references/ai-usage.md)仍是 PR 正文的唯一所有者；本记录不重复这些约定。

PR 的 DCO 步骤强制执行可机械判定的边界。在默认 PR 模式下，`scripts/verify-dco.ts` 通过 `DCO_PR_TITLE` 接收当前生效的标题，拦下该标题和所有分支提交主题中的每个手工跟踪器后缀，并报告预期主题来自唯一的非合并提交，还是来自标题。`--mode=squash-commit` 是针对恰好一个已经落地且只有一个父提交的提交的单独检查，并要求恰好一个位于主题真正末尾、规范的、前面带空格的 GitHub 后缀。其编号匹配 `[1-9][0-9]*`；`#0`、补零编号和末尾带 NBSP 的形式都会失败。门禁会检查整个末尾连续后缀序列，因此相邻、以空格分隔或混用间隔的重复后缀组都会失败。默认 PR 模式从不把分支后缀当作已落地证据。

DCO 这一半先把 CRLF 和 CR 行尾统一为 LF，再通过 `git interpret-trailers --parse` 读取 trailer，因此最终 trailer 块在每种平台上都遵循 Git 的续行折叠规则。每条展开后的 `Signed-off-by:` 都必须恰好写出一项身份，即提交的作者或 committer；折叠值包含多项身份时无效。现有的固定 Dependabot trailer 仍只在 GitHub 将该提交的 committer 解析为那个机器人，并核验其签名时才被接受。

只要提交的作者地址或任一条签署指向列入白名单的机器人，该提交就会触发 GitHub 核验，包括 Dependabot 以 noreply 形式进行的自我签署。一项由人创作的提交即使显示名称匹配，也不能仅凭使用该机器人的显示名通过核验。门禁不判断某段文字属于评审、rebase 还是会话过程；这项判断仍归评审。

## 验证

| 要求 | 证据 |
|---|---|
| 标题不含后缀、提交带后缀的单提交 PR 会失败 | `node --test tests/dco.test.ts` |
| 提交消息开头的空行不会隐藏 Git 主题中的后缀 | `node --test tests/dco.test.ts` |
| 普通的不带后缀分支提交会通过 | `node --test tests/dco.test.ts` |
| 后缀前没有空白时会失败 | `node --test tests/dco.test.ts` |
| 相邻、以空格分隔和混用间隔的重复分支后缀都会失败 | `node --test tests/dco.test.ts` |
| 零和补零的分支后缀仍会被识别并失败 | `node --test tests/dco.test.ts` |
| 单提交与多提交 PR 会报告正确的预期主题来源 | `node --test tests/dco.test.ts` |
| 已落地后缀仅在显式 `squash-commit` 模式下通过 | `node --test tests/dco.test.ts` |
| 一个功能提交加上一次同步基线的合并后，仍以唯一的非合并提交作为预期主题 | `node --test tests/dco.test.ts` |
| squash 后模式要求一个父提交、一个位于真正末尾的正整数且不补零后缀，并拦下重复后缀组 | `node --test tests/dco.test.ts` |
| 后缀后的不换行空格会阻止规范形式通过 | `node --test tests/dco.test.ts` |
| 作者与 committer 身份不同时，仅由作者签署和仅由 committer 签署均能通过 | `node --test tests/dco.test.ts` |
| 最终 trailer 块中的每条展开签署都必须与提交身份一致 | `node --test tests/dco.test.ts` |
| LF 与 CRLF 的折叠身份都会通过，而包含多个身份的折叠签署会失败 | `node --test tests/dco.test.ts` |
| Dependabot 作为作者或进行自我签署时，要求由 GitHub 解析 committer 并核验签名 | `node --test tests/dco.test.ts` |
| Dependabot 作者配人类 committer 时，即使签名已验证也会失败 | `node --test tests/dco.test.ts` |
| 多提交核验使用每个请求 SHA 各自的 committer 事实 | `node --test tests/dco.test.ts` |
| PR CI 提供准确的当前生效标题，在标题编辑时重跑，并保留其机器人核验 token | `node --test tests/dco.test.ts` |

仓库没有针对根目录 Markdown 的链接门禁。`CONTRIBUTING.md`、`AGENTS.md` 和本记录中的链接由评审负责；语料门禁并不声称会校验它们。

## 曾考虑的替代方案

**要求英文摘要。** 这会让某一历史惯例显得具有普遍性，但本仓库的提交历史同时使用英文和中文摘要。改动使用何种语言仍由作者选择。

**用正则表达式匹配每个主题中的评审、rebase 与会话词汇。** 它易于实现，但普通技术文字也会合理地使用这些词，而 Issue 自身的边界也排除了这项判断。主题是否描述了改动，仍由评审负责。

**在选择预期主题来源时把合并提交计算在内。** 一次同步基线的合并并不代表 PR 中还有另一项由人创作的改动。尽管 `COMMIT_OR_PR_TITLE` 仍然只看到一个非合并提交，这样做却会把只包含一项功能改动的 PR 变成从标题取得主题的 PR。

**因为 GitHub 也会创建一个后缀，就接受分支提交上的一个后缀。** 这会把 squash 后的提交误当成 squash 前的分支输入。在 `COMMIT_OR_PR_TITLE` 下，只有一个提交的 PR 会因此在 GitHub 再添加一个后缀之前，先把手工后缀放进预期的 squash 主题。默认 PR 模式会拦下每个分支后缀。

**把提交消息的第一条物理行当作主题。** Git 实际采用的主题会忽略开头的空行，因此，以空行开头的提交消息可能对门禁隐藏后缀，而 GitHub 仍会使用该后缀。门禁读取 `%s`，也就是 Git 与 GitHub 呈现的主题。

**把折叠后的签署视为若干可接受的身份。** Git 会把续行展开成一个 trailer 值。如果该值包含不止一项身份，就没有指明任何单一的人，因此 DCO 无法判断是谁认证了该提交。

**在 squash 后模式中接受任意单个提交。** 根提交或合并提交都不是 squash PR 后产生的单父提交。该模式会先要求恰好一个父提交，再校验已落地后缀。

**仅凭存在一个后缀就推断已落地提交模式。** 这会让手工添加的分支后缀自行获得授权，包括不符合规范的形式。squash 后的提交只在显式的 `squash-commit` 模式下有效，并且该模式要求恰好一个前面带空格的后缀。

**把规则留给评审，不设门禁。** 主题和 trailer 的形状可以机械识别，而在不应用 squash 设置的情况下，评审无法可靠推断 GitHub 会采用哪个标题来源。现有 DCO 步骤是唯一的提交准入所有者。

## 后果

- 贡献者得到一条明确的主题规则，同时适用于 PR 标题和提交，而摘要语言仍不受限制。
- `scripts/verify-dco.ts` 会为预期主题统计非合并提交，读取 Git 实际采用的主题，把这一输入与另行检查的已落地 squash 提交区分开来，并且不接受任何分支后缀作为已落地证据。
- squash 后模式要求一个父提交和一个位于主题真正末尾、规范的正整数且不补零后缀；根提交、合并提交、`#0`、补零编号、末尾 NBSP，以及相邻、以空格分隔或混用间隔的重复组都会失败。
- Git 原生 trailer 解析先执行 CRLF 归一化，再展开合法续行；每条展开后的签署都必须写明一项身份，即作者或 committer，而包含多项身份的折叠值会失败。
- 只要作者地址或任一条签署指向机器人身份，就会触发 GitHub 核验，包括该机器人以 noreply 地址进行的自我签署；API committer 账号必须与该机器人一致，而且每个提交都有自己的事实。
- PR 描述技能和 AI Usage 参考保留正文约定；`CONTRIBUTING.md`、`AGENTS.md`、DCO 步骤及其测试只承载主题与 trailer 事实。

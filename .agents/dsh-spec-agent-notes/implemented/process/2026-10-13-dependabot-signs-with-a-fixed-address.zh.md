# Agent Note: Dependabot 的签名地址是固定的，DCO 门禁因此接受那一个

Status: implemented

[English](2026-10-13-dependabot-signs-with-a-fixed-address.md) | 中文

## 问题

每一次 Dependabot 的 action 版本更新都过不了 DCO 门禁，所以每一次都只能人工落地。

Dependabot 会把提交的作者地址设为 `<installation-id>+dependabot[bot]@users.noreply.github.com>`，并且总是携带 `Signed-off-by: dependabot[bot] <support@github.com>`。这个 trailer 地址由 GitHub 固定，且刻意不同于每个机器人各自的作者地址；而 `verify-dco.ts` 从提交本身读取作者身份，不信任 trailer，因此报出 `signs dependabot[bot] <support@github.com>, but the commit's author is dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>` 并以状态码 1 退出。

这种拦下是设计所致，不是缺陷：这项比较正是为了抓出签署者并非提交作者，或者地址拼写有误的情况。但它同时也意味着，本仓库配置的唯一一条自动化依赖通道永远无法满足它，于是每周的版本更新都带着一个红色检查到达。

## 决策

对于作者地址属于 Dependabot 自己的提交，`verify-dco.ts` 接受其固定的 trailer 地址。只要提交的作者地址或最终块中的任一条签署指向列入白名单的机器人，它就会向 GitHub 核验该提交，Dependabot 以 noreply 形式进行的自我签署也包括在内。

trailer 检查与机器人检查位于同一道提交准入门禁中：人类提交在本地判定，机器人身份则需要 GitHub 将其与本地写入的声称区分开。

门禁先把 CRLF 与 CR 行尾统一为 LF，再使用 `git interpret-trailers --parse` 解析最终 trailer 块，因此续行会根据 Git 的 trailer 规则展开。每条展开后的 `Signed-off-by:` 都必须恰好写出一项身份，即提交的作者或 committer。折叠值写出多项身份时会失败。

只有当作者地址匹配 `^\d+\+dependabot\[bot\]@users\.noreply\.github\.com$`，且签署恰好是 `dependabot[bot] <support@github.com>` 时，才接受 Dependabot 的固定 trailer。其余每条签署仍保留精确的作者或 committer 比较，因此指向第三方的签署仍会失败。

仅凭显示名无法取得这项豁免。显示名若指向列入白名单的机器人，确实会触发核验：GitHub 必须把该提交的 committer 解析为该机器人，而不是解析为人工账号。因此，使用人类地址的人即使写入 `git -c user.name="dependabot[bot]"`，也会失败。

对于每条写明列入白名单机器人的提交，门禁要求三项 GitHub 侧事实：`committer.type === 'Bot'`、预期的机器人登录名，以及 `commit.verification.verified`。GitHub 的[提交 API](https://docs.github.com/en/rest/commits/commits#get-a-commit)会分别给出作者与 committer 的账号归属，而[签名核验](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)会把已验证签名绑定到 committer 邮箱。因此，仅凭作者归属加一个 `verified` 布尔值，并不能证明该机器人签署了提交。

这保住了什么：贡献者的检出仅凭 `git log` 就能判定只含人类提交的区间，并且不会要求任何提交提供签名——DCO 本不需要签名，要求签名会把本仓库的偏好强加给每位贡献者。代价是什么：门禁不再在所有情况下都只是一次纯 `git log` 读取。区间中若有机器人提交，就需要已认证的 `gh`；贡献者在本地创作了这样一条提交，却在离线环境运行门禁，得到的是拦下而非通过，这正是诚实的答案，因为只有 GitHub 能把该提交与伪造区分开。

凭据由 CI 步骤负责提供。它像 vendored 包的 workflow 给自身步骤提供凭据那样携带 `GITHUB_TOKEN`：`gh` 既读取该变量，也读取 `GH_TOKEN`，两者都不存在时便不会继续；因此，不提供任何凭据的步骤会让检查失败，而不是跳过这个问题。这次查询只需要 `contents: read` 这一权限范围。

## 曾考虑的替代方案

**撤掉 Dependabot，在出现 release 时手工更新 `pin`。** 这是最小的改动，并且让门禁保持不变。它落选，是因为 `pin` 是两份 workflow 文件中的一行，而每周由机器人处理正是值得免去的人工杂务：`actions/setup-node` 从 7.0.0 移到 7.1.0 只产生两行差异，让人每周手工重复这件事，正是自动化通道之所以存在要消除的人工维护。

**跳过所有作者名以 `[bot]` 结尾的提交。** 只需一行，还能覆盖 release-please 和未来任何机器人。它落选，是因为作者名由贡献者控制：`git -c user.name="some[bot]"` 会让普通贡献者跳过门禁。有两个采用这种形状的仓库此后已不再使用它，其中一个把这条绕过路径本身记作原因。

**把整个豁免放进本地门禁，信任这两项可写事实。** 这是最早写出的改动。它落选，是因为贡献者能同时写入 `user.email` 和 trailer，于是豁免便建立在 GitHub 一无所知的内容上。

**向 GitHub 查询每条提交，从而也要求人类提供签名。** 它落选，是因为 DCO 本不需要签名：要求签名会给每位贡献者的设置加一把密钥，去满足这张证书并不作出的检查；而这道门禁的整个设计前提是仅凭 `git` 就能运行。

**信任 API 给出的作者归属与 `verified` 布尔值。** 它落选，是因为 GitHub 的 author 账号标识的是提交作者，而不是签名所核验的邮箱和 committer。否则，一个由 Dependabot 担任作者、由人类担任 committer 的提交，就会同时满足两项可在本地写入的字段和远端布尔值。

**豁免机器人，并把这项豁免记录在 PR（Pull Request）中，而不是门禁里。** 完全不动门禁。它落选，是因为必须变绿的 CI 从 `main` 运行门禁，所以豁免必须先落在 `main` 上，Dependabot 的 PR 才能通过。

## 后果

每周的版本更新都以通过状态到达，并携带门禁仍然要求人类提供的那份签署完成合并。`support@github.com` 只对一个作者地址被接受，所以这不是通用的后门。

代价是：另一个注入自身签署的机器人会以同样方式失败，直到把它的作者模式、登录名与可接受的 trailer 加入 `BOT_AUTHORS`。这是刻意的——对其余所有人，比较仍保持精确；放宽它需要一次改动和一份记录，而不是一条关于机器人的通用规则。

只有当 GitHub 将提交的 committer 解析为该机器人，并报告签名已由 GitHub 核验后，门禁才接受携带 Dependabot 作者地址和 trailer 的提交。作者、committer 与 trailer 字符串仍可由贡献者写入；外部 committer 解析和签名才是把机器人提交与本地声称区分开的检查。

剩下的人类控制是评审：DCO 步骤在 PR 上运行，落到 `main` 上的内容就是评审人放行的内容。

## 测试

`tests/dco.test.ts` 使用 fixture（测试前置数据）仓库运行门禁。它 pin 住以下情形：合法的 LF 与 CRLF 折叠签署、对折叠多身份的拦下、仅作者和仅 committer 的身份、Dependabot 的固定 trailer 及其 noreply 自我签署、Dependabot 作者配人类 committer、跨多个提交的逐 SHA 事实、带人类地址的机器人名称、未签名和失败的 GitHub 查询、无关机器人、缺少最终块签署，以及空区间。

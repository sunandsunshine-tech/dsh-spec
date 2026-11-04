# Agent Note: Dependabot 的签名地址是固定的，DCO 门禁因此接受那一个

Status: implemented

[English](2026-10-13-dependabot-signs-with-a-fixed-address.md) | 中文

## Problem

每一次 Dependabot 的 action 升级都过不了 DCO 门禁，于是每一次都得人工落地。

Dependabot 提交时作者是 `<安装 id>+dependabot[bot]@users.noreply.github.com`，而提交信息里总是带着 `Signed-off-by: dependabot[bot] <support@github.com>`。这个 trailer 地址由 GitHub 固定，且**刻意与每个机器人各自的 noreply 作者地址不同**；而 `verify-dco.ts` 是从提交本身读作者身份、不信任 trailer，于是它报出 `signs dependabot[bot] <support@github.com>, but the commit's author is dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>` 并以 1 退出。

这个拒绝是设计如此，不是缺陷：那道比较正是为了抓出"签名的人不是作者"或"邮箱写错"。但它同时意味着：本仓库配置的唯一自动化依赖通道**永远无法满足它**，于是每周的升级都带着一个红色检查到达。

## Decision

`verify-dco.ts` 对作者地址是 Dependabot 自己的提交，接受它那个固定的 trailer 地址；并且对声称机器人身份的提交，去 GitHub 核实而不是采信。

这两个决定落在同一个门禁里，因为第二个只对第一个豁免的那些提交生效：正是豁免造出了一个值得核实的身份，所以全是人类提交的区间仅凭 `git log` 就能判定，而带有机器人提交的区间只就那几条去问 GitHub。

豁免**锚在作者地址上，而不是作者名**：只有 `git log` 报出的作者邮箱匹配 `^\d+\+dependabot\[bot\]@users\.noreply\.github\.com$`，**且** trailer 恰好是 `dependabot[bot] <support@github.com>` 时，该提交才通过。其余所有提交仍然对作者与提交者做精确比较，所以"签名写成了别人"照样失败。

显示名换不来这个豁免。GitHub 是按作者地址解析账号的，所以那个模式里的地址属于机器人，而 `user.name` 是提交者自己设的任何值——`git -c user.name="dependabot[bot]"` 会用人类地址签名，并被拒绝。

对每一条豁免生效的提交，门禁随后要求三项 GitHub 侧的事实：`author.type === 'Bot'`、login 在它的白名单内、以及 `commit.verification.verified`。一个人本地写出来的提交能满足前两项可写的事实，却满足不了签名——于是这个豁免既接受了 Dependabot 的升级，也拒绝了它本来分辨不出的伪造。

这保住了什么：贡献者的检出对纯人类提交的区间仅凭 `git log` 就能判定，且任何提交都不被要求签名——DCO 本不需要签名，要求它等于把本仓库的偏好强加给每位贡献者。代价是什么：门禁不再在所有情况下都是一次纯 `git log` 读取。区间里出现机器人提交就需要 `gh`，且要已认证；一个本地写了这种提交、又在离线环境跑门禁的贡献者，得到的是拒绝而不是通过——这是诚实的答案，因为只有 GitHub 能把那条提交与伪造区分开。

凭据由 CI 那一步提供：它像 vendored 包那个 workflow 一样，把 `GITHUB_TOKEN` 交给这一步——`gh` 认这个变量，也认 `GH_TOKEN`，两者都没有就拒绝，于是一个不提供凭据的步骤会让检查**失败**而不是跳过这个问题。这次查询只需要 `contents: read` 这一个权限范围。

## Alternatives considered

**撤掉 Dependabot，有新版本时手工改 pin。** 改动最小，门禁一动不动。它输了，因为那个 pin 是两个 workflow 文件里的一行，而每周的机器人正是最不值得人工去做的那件杂事：`actions/setup-node` 从 7.0.0 到 7.1.0 只差两行，让人每周重复这两行，等于把自动化通道存在的理由取消掉。

**跳过所有作者名以 `[bot]` 结尾的提交。** 一行代码，还顺带覆盖 release-please 与将来任何机器人。它输了，因为作者名是贡献者可控的：`git -c user.name="some[bot]"` 就能让一个普通贡献者跳过门禁。已经有仓库采用过这个形状，其中一处后来把它当作绕过漏洞移除了。

**对每条提交都去问 GitHub，从而也对人类要求签名。** 它输了，因为 DCO 本不需要签名：强加一个签名，等于为每位贡献者加一把密钥去应付一项该证书并不作出的检查，而这道门禁的整个设计前提是仅凭 `git` 就能跑。

**不动门禁，把豁免记在 PR 里。** 完全不改门禁。它输了，因为必须变绿的那套 CI 是从 `main` 上取门禁来跑的，所以豁免必须先落在 `main` 上，Dependabot 的 PR 才可能过。

## Consequences

每周的升级带着绿色到达，且携带的仍是门禁照样要求人类提供的那份签名。`support@github.com` 只对一个作者地址被接受，所以这不是一个通用的后门。

代价：另一个注入自家签名地址的机器人会以同样方式失败，直到有人把它的 trailer 连同它的作者模式一起加进 `DEPENDABOT_TRAILER`。这是刻意的——对其他人比较仍然精确，而放宽它需要一次改动加一份记录，而不是一条"关于机器人"的通用规则。

它挡不住的伪造，以及它并不新引入的伪造。一个确实由机器人创作并签名的提交，与一个本地提交、只是带着这两个字符串的提交，无法从提交本身分辨——因为这两项事实都来自提交自身：`git log` 读到的是贡献者自己设的作者记录，而 trailer 也是他写下的。所以一个把 `user.email` 设成 `49699333+dependabot[bot]@users.noreply.github.com` 并写下那个 trailer 的贡献者，能过这道门禁。

**这不是本次改动开出的口子。** 一道拿 trailer 去比作者记录的门禁，比的就是两项贡献者可控的事实；改动前那条规则同样如此，只是偏了一步——把提交的作者设成 trailer 里那个地址，`named === author` 从来就能满足。真正拿作者身份去比**外部记录**、而不是比提交自身的，是签名校验（GitHub 的签名验证、GPG、Sigstore），而这道门禁从未做过这一点，上面的备选条目里已经就这个取舍做过决定。

这次改动**新**允许的是：一个披着机器人身份的提交，在 PR 列表里读起来像可信的自动化。防线与从前同一条——PR 在合并前经过评审，而 DCO 这一步只在 PR 上跑，所以落到 `main` 上的就是评审人放行过的东西。

## Testing

`tests/dco.test.ts` 用 fixture 仓库跑这道门禁，把两半都钉住：Dependabot 的固定 trailer 对 Dependabot 的作者地址被接受，对其它任何情况都不被接受——机器人的名字配人类地址、机器人的提交配人类 trailer、以及另一个机器人的固定 trailer，全部照样失败；此外还有"整条没有 trailer"与"空区间"两个用例。

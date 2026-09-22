# Agent Note: Pull Request 生命周期：从 WIP 到合并

Status: implemented

[English](2026-09-21-the-pull-request-lifecycle.md) | 中文

## Problem

本仓库里没有任何东西拥有这样一个问题：一个改动如何从一个工作分支走到 `main`。答案的碎片散在其它主题下——评审技能描述了评审者走的路径，常驻指令说了改动欠什么——但没有一份文档讲清这五个阶段、每个阶段允许什么、提交信息长什么样、PR 描述要带什么、以及哪一类 PR 用哪种合并。

由此有两个失败。贡献者只能从 git 历史里猜约定，而历史只显示活下来的那些提交；一个 agent 想开 PR 时，除了「上一个 PR 碰巧长什么样」之外没有规则可依。活在历史里的约定，在下一个作者猜得不一样的那一刻就开始漂移。

合并这件事让这个空洞变得刺眼。GitHub 提供三种合并；其中两种在这里无法支撑一次发布，而错的那种在发布 tag不再指向发布线上的提交之前，一直看不出来。

## Decision

一个 PR 按顺序走过五个阶段——WIP、开发、收尾、评审与合并前收尾、合并——每个阶段有一条规则。

**WIP 期是自由的，标题要写明。** 在做的工作是草稿 PR，**并且**标题带 `WIP:` 前缀：草稿是机制，前缀让扫列表的人一眼看到（[kubernetes/community：pull-requests.md](https://github.com/kubernetes/community/blob/main/contributors/guide/pull-requests.md)会往标题加上或去掉 `WIP` 或 `[WIP]` 前缀；[GitLab 的 draft merge requests](https://docs.gitlab.com/user/project/merge_requests/drafts/)只认前缀，而且必须在标题开头）。wrap-up 时这个前缀要删掉，因为标题会变成 squash 提交的 subject。这个阶段的提交就是工作态：rebase、改写、丢弃、强推分支。还没有任何东西依赖它们的形式。

**开发在收尾结束。** 进入评审之前，分支被交互式rebase 成里程碑——一个连贯的工作单元一个提交，顺序让评审者能读下去——并且留下的每个提交都是自己就能构建、能通过检查的状态，于是没有评审者会落到一个坏掉的中间态上。

**评审只追加。** PR 一旦进入待评审，收到的就是 fixup：新提交叠在上面，绝不重写历史——「Make the fixups, and don't squash yet… your reviewer can look at the new commit on its own」（[kubernetes/community：pull-requests.md](https://github.com/kubernetes/community/blob/main/contributors/guide/pull-requests.md)）。评审者读的是上一轮之后的增量，而在他们脚下重写，会毁掉他们唯一能用来比较的东西。只有基线前进时才rebase，以保持可合并。

**合并前收尾在评审之后。** 「After a review, prepare your PR for merging by squashing your commits. All commits left on your branch after a review should represent meaningful milestones or units of work」（[kubernetes/community：github-workflow.md](https://github.com/kubernetes/community/blob/main/contributors/guide/github-workflow.md)）。在这里，这次 squash 由rebase 完成：每个 fixup、错字修正、与基线的合并都被压进它所属的那个里程碑，于是留下的每个提交只代表一个里程碑或一个工作单元，别无其它。结果仍然是一个每个提交都是完整状态的分支。

**提交信息用 Conventional Commits。** `type(scope): 一句话`：一个类型、一个可选范围、一个标题，以及一段说清改了什么、为什么的正文。标题行不超过 70 个字符。参与改动的机器只写在 `Assisted-by:` 尾注里；信息本身只讲这个改动。

**PR 描述分五节。** `## What this PR does`、`## Why`、`## How`、`## Reviewer notes`、`## Verification`。它只讲维护者评审和合并需要的东西，不讲别的。

**默认用 squash 合并。** 所有非发布 PR 都在 GitHub 侧用 squash 合并，快进，于是一条发布线每个 PR 只多出一个干净的提交。

**发布 PR 是唯一的例外，它在本地合并。** 维护者评审之后，它的头部提交用 `git merge --ff-only` 合入并推送。GitHub 随后把这个 PR 报成已合并——一次间接合并，[GitHub 的合并参考](https://docs.github.com/en/pull-requests/reference/pull-request-merges)把它定义为一个头部分支的提交在该 PR 之外变得可从基分支到达的 PR——而发布 tag指向一个在发布线上的提交。GitHub 的另外两种合并在本仓库关闭：Rebase and merge 会重写每一条提交的 SHA，而合并提交不是一条由 squash 构成的发布线想要的东西。

**间接合并的两条代价被接受。** 分支保护挡不住它：GitHub 的参考说，间接合并的 PR 会被标记为已合并，「even if branch protection rules … were not satisfied」，所以平时守住 PR 的那道保护在这里不是关卡——维护者的评审才是。而且 GitHub 不会删除被合并的头部分支，因为合并是在本地做的，所以那条分支要在推送后手动删掉。

**规则先于它约束的改动落地。** 一条规则所约束的改动，在规则进入 `main` 之后再开 PR，这样它能指向一条读者已经可以打开的规则。

## Alternatives considered

**GitHub 三种合并全开，让作者自己挑。** 这是默认做法，政策最少。它落选是因为分支的含义从此取决于按了哪个按钮：合并提交让 `fix typo` 成为历史里永久的一行，而 rebase 合并「Always updates the committer information and creates new commit SHAs」（[GitHub 的合并参考](https://docs.github.com/en/pull-requests/reference/pull-request-merges)），于是从这样一条分支打的发布 tag会指向一个发布线上并不存在的提交。发布能依赖的版本只有一个：一类 PR 一种合并。

**用 `gh stack` 管理并行分支。** 它跟踪一串改动，让每一层始终rebase 在下一层之上；对一个分层改动来说，这确实比手工做得好。它落选是因为堆叠和它的规则一样窄：只有当一个改动叠在另一个改动上时才需要它。彼此独立的改动不需要它——一条规则可以没有笔记就落地，一条笔记也可以没有规则就落地——所以普通分支加 fixup 加一次 squash 就是全部机制。

**去掉评审门禁，检查全绿就合并。** 这里的每一道门禁都能在本地跑，所以一次全绿本来就已经是合并想要的证据，而只有一个维护者时，他可以立刻合掉自己的改动。它落选是因为检查证明的是「有人跑过它们」，不是「这个改动该落地」：它们说不出一个决定是否正确、一份文档是否说了它想说的、一个主题是否属于本仓库。那些判断都是维护者的，而一个把发布决定留给维护者的仓库，没有理由让普通改动绕过同一个人。

**只把提交规范放进 PR 模板。** 这样贡献者在开 PR 时，在一个文件里就能读到它。它落选是因为提交规范约束的是历史，而模板不属于历史：描述可以在第六个 fixup 之后被改，而 squash 带进发布线的是提交。模板因此指向这条笔记，而不是复述它。

## Consequences

改动在每个阶段都是可读的：一个工作单元一个提交被合入，PR 是它怎么走到那里的记录，发布 tag指向发布线上的一个提交。作者知道什么时候可以重写、什么时候不能，评审者知道待评审之后追加的提交就是要读的东西。代价是没有哪道门禁强制的纪律：fixup 的习惯得靠自觉，而这条笔记得活过下一个有理由偏爱合并按钮的作者。

一次 squash 会丢掉通向最终提交的那些工作提交——失败的尝试、被回退的实验——而那段历史在一个改动还是提案时是有价值的，那正是 WIP 和开发这两个阶段的用途。这个取舍是刻意的：发布线被读的次数远多过一条分支。

生命周期只写在这里一处。其它文档——PR 模板、常驻指令——指向这条笔记，而不重复它的规则；间接合并的两条代价被记下来，是因为它们由人在发布时支付，而不是由某道门禁支付。

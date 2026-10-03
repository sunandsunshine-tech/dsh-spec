# Agent Note: 安装副本的冲突与它的门禁

Status: implemented

[English](2026-10-03-the-install-copy-conflict-and-its-gate.md) | 中文

## Problem

每次改到 `skills/` 的变更都必须顺手在同一 change 里刷新 `.agents/skills/**`,因为[在 git 中跟踪已安装的技能副本](2026-09-18-track-the-installed-skill-copy.zh.md)把副本定成了 agent 真正加载的规则。安装器往十个已安装的 `SKILL.md` 里各写一段 `metadata:`,其中的 `github-ref` 记的是这次安装所依据的分支。这个值逐分支不同,于是两个都改 `skills/` 的 PR 会在同样那十行上撞车——同一行、不同值,而不是不同的改动:#57 的 rebase 手工解掉了这处冲突,#60 还欠一次。

仓库同时没有一条门禁比较副本与源——这正是[在 git 中跟踪已安装的技能副本](2026-09-18-track-the-installed-skill-copy.zh.md)在 Consequences 里点名的覆盖缺口。改了包却忘了刷新的变更会让本仓库保持绿色,而加载的技能已经陈旧,评审里也看不出来。

## Decision

**冲突本身接受。** 副本与源留在同一个 change 里。把刷新挪到发布时,中间每个 PR 都会加载源已不再声明的规则,而那正是跟踪副本要防的静默分叉。注入块上的撞车是机械的——一行、一个值——不值得为它放弃 same-change 保证。

**解决走一条固定配方。** 先把分支 rebase 到新的基上,副本冲突行取任意一边,重跑 `upgrade --revision <current-branch>` 让整份副本从源重新生成,跑 `node scripts/verify-installed-copy.ts`,再用 `--force-with-lease` 发布重写后的分支。

**门禁既是安全网,也补上那条缺口。** `scripts/verify-installed-copy.ts` 逐技能比较两棵树:文件集合必须相同,除 `SKILL.md` 外逐字节相等,`SKILL.md` 则把注入的 `metadata:` 块从两侧都去掉后再比;每份副本的 `github-tree-sha` 必须等于 `git rev-parse HEAD:skills/<name>`;空语料即失败。它**绝不比较 `github-ref` 的值**:在 main 上该值指向一个已合并并被删除的工作分支,而副本仍是最新的——这个字段是历史指针,不是这棵树能检查的声明。[发布提交自带它发布的那份副本](2026-09-23-the-release-commit-carries-its-own-copy.zh.md)拥有「为什么悬空的 ref 可以接受、以及为什么注入的 tree sha 才是副本给出的声明」。门禁抓两类错误:忘了刷新,以及冲突解错了边;`AGENTS.md` 的配方里点的就是它。

## Alternatives considered

**用 `.gitattributes` 合并驱动自动取一边。** 落选:副本里的引擎就是 CI 执行的代码;当一边改了引擎、另一边只改了技能时,自动取一边会把引擎的改动静默丢掉。

**把 `github-ref` 只留在 manager 的 `SKILL.md` 里。** 暂缓,不采纳:冲突面能从十行降到一行,但它改的是这个包对 adopters 的安装语义,需要单独决定并经外部评审。这件事保持开放,「并行改 `skills/` 成为常态」是重新打开它的触发条件。

**把 ref 记成解析后的 commit sha。** 落选:两个分支的 HEAD 不同,字段照样逐文件不同,冲突面一点没减。

**规定同一时刻只能有一个改 `skills/` 的 PR。** 落选:这是把并行度当规则付出去,而冲突只在两个改动重叠时发生,解起来又便宜。

**把副本移出 git,或只在发布时刷新。** 落选:那会退回两个协作者加载不同规则的状态——正是[在 git 中跟踪已安装的技能副本](2026-09-18-track-the-installed-skill-copy.zh.md)当初否掉「不跟踪副本」的理由。

## Consequences

- 冲突还在,但它变得机械,而且有了安全网:不论是忘了刷新,还是冲突解错了边,门禁都会点名那份与源不一致的副本。
- 门禁是仓库自己的工具,不是随包发布的检查:它读 `skills/`,adopter 没有这棵树;CI 在 port provenance 之后跑它。
- 配方落在 `AGENTS.md` 里,一次 rebase 因此只有一个已记录的答案,不必逐分支重新判断。
- 缩小元数据面这件事连同它的触发条件保持开放;在那之前,十个注入的 `github-ref` 行就是 same-change 保证的代价。

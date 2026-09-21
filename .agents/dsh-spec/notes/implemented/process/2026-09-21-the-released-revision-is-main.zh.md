# Agent Note: 发布的修订是 main 分支

Status: implemented

[English](2026-09-21-the-released-revision-is-main.md) | 中文

## Problem

manifest 钉住一个修订,而每一次安装、刷新与 `status` 比对都读它:`gh skill install` 按该修订取技能,安装器把解析出的 ref 写进每个已安装的 `SKILL.md`,安装的 ref 一旦不等于 manifest 里的值,`status` 就报漂移。本项目一直钉在 `extract` 上,因为工作都在那条分支上,于是这个钉子命名的是一条只承载未发布工作的分支。

发布 0.1.0 把这个钉子一直推迟的问题摆上来:发布线该由标记发布的那条 tag 命名,还是由承载它的那条分支命名?

## Decision

**manifest 钉 `main`。** `"revision": "main"` 就是项目安装的来源、刷新拉取的对象,也是 `status` 拿已安装的 `refs/heads/main` 去比对的基准。

**tag 是给人看的标记,不是钉子。** `v0.1.0` 命名这次发布——tag、它的说明与草稿 release——而安装跟随发布线。两者回答不同的问题:tag 说发布的是哪个提交,分支说发布线在哪里。

**两个修订只差一个 ref。** 合并之前 `extract` 与 `main` 携带同一棵树;合并是 squash,所以之后两者内容相同、ref 不同。从任一侧安装解析出的文件一致,区分它们的是 `status`——那正是它存在要报告的漂移。

## Alternatives considered

**钉 tag `v0.1.0`,即 dsh 钉 `dsh-v0.1.6-alpha.2` 的做法。** 抽取的基线本身就这么做,而且不可变的钉子保证更强:tag 不会在安装器脚下移动。它落选是因为它把每次发布都变成一次 manifest 改动加每个项目的一次重装,而这套集合还年轻,发布线就是主干。tag 作为发布标记保留,日后要把钉子移到它上面,是一行改动加一次刷新。

**钉这次发布指向的提交。** 三者里最可复现,也是 dsh 记在 `targetCommitish` 里的东西。它落选的理由与 tag 相同,并且多付一份可读性:项目读自己的指令文件时看不出一个裸 sha 命名的是什么,而 `main` 说明了它跟随哪条线。

**钉子留在 `extract`。** 什么都不用改,分支继续接收工作。它落选是因为发布线必须是读者眼中当前的那条分支;把发布建在一条工作分支上,会让每次安装都依赖一条没人被告知的分支。

## Consequences

**换来了什么。** 一个名字回答"安装来自哪里",而它就是读者本就当作当前的那条分支。发布成为标记而不是一次迁移,所以打 0.1.0 不改变任何安装。

**代价是什么。** 钉子会移动:未发布改动落到 `main` 之后,刷新的项目就会拿到它,而钉 tag 不会。这是这套集合年轻时有意做的取舍,上面的替代方案就是退路。

**要求了什么。** 本仓库里安装副本必须在合并之后从 `main` 刷新,因为它的注入 `github-ref` 仍命名 `extract`。在那次刷新落地之前,`status` 会报告它本来就设计来报告的漂移。

## Testing

`node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts status --root .` 在安装副本从这条修订命名的分支刷新之后,以 `8 skill(s) at main, each revision read from its installed metadata` 结束;发布 tag 指向草稿 release 所指向的那个提交。

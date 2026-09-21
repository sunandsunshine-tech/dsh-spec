# Agent Note: 空归档无法交付它的类别目录

Status: implemented

[English](2026-09-21-an-empty-archive-cannot-ship-its-kind-directories.md) | 中文

## Problem

归档门禁无条件要求 `archived/<kind>/` 六个目录全部存在。在一条笔记都还没归档的项目里,这些目录是空的,而 Git 不携带空目录:那六个目录只存在于初始化器创建它们的那个工作区里。于是本仓库在跑过初始化器的那台机器上 `run.ts --all --root .` 通过,而同一修订在全新的 `git clone` 里失败:

```
verify-archived-agent-notes: archive rules violated:
  archived/feature/: required kind directory is missing
  archived/bug-fix/: required kind directory is missing
  archived/simplification/: required kind directory is missing
  archived/architecture/: required kind directory is missing
  archived/process/: required kind directory is missing
  archived/testing/: required kind directory is missing
run: 7 gate(s), 1 failed
```

这道门禁自己的空归档报告说的与它的检查相反:只要那些目录恰好存在,它就打印 `the archive is empty — 0 frozen artifact(s) to check ... no seal recorded yet` 并以 0 退出,于是它描述为一致的那个状态,恰恰是克隆无法复现的状态。这个缺口没有任何项目可提交的绕法——`git add` 记录不了缺失的目录——所以每一次全新检出,也就是每一位协作者和每一个 CI 任务,都会撞上一次失败的聚合,直到有人重新跑一遍初始化器。

dsh 带着同一个无条件循环。dsh 的归档里有封存好的笔记,因此那里没有任何类别目录是空的,这个缺陷从未浮现;本集合是第一个带着空归档采用该机制的项目,这正是它暴露出来的原因。

## Decision

**这六个类别目录在归档至少持有一件产物之后才被要求,在此之前不要求。** 该要求以门禁已经收集到的产物计数为条件,所以检查会在笔记归档的那一刻自动生效,没有什么能躲过封存:归到拼错的类别目录下的笔记仍然作为未知类别失败,而有东西可归档时缺失的类别目录会立刻被报出。**`archived/` 下出现未知目录无条件视为错误**——那条规则从不依赖内容,保持不变。

**空归档报告改为陈述规则,不再统计目录数量。** 它现在读作 `the archive is empty — 0 frozen artifact(s) to check and no seal recorded yet; all 6 kind directories are required once a note is archived`,这正是全新克隆的读者了解"为什么什么都不缺"的地方。

## Alternatives considered

**在每个类别目录里跟踪一个占位文件,并让门禁忽略它。** 目录就能活过一次克隆,而 `.gitkeep` 是这种意图的惯用写法。它落选是因为门禁把类别目录里的每个常规文件都当作归档产物读取,于是这个占位符需要在产物读取器里有一条点名豁免、在封存里再有一条,还要在归档契约里有一句说明——为的是一个空着时不携带任何信息的目录,却要在三个地方保持一致。

**让初始化器的 `sync` 模式补建缺失的目录。** 已经有一个命令知道那六个名字,克隆之后跑一次就能恢复它们。它落选是因为它把失败挪了位置而没有消除它:聚合在有人跑管理器之前仍然会在全新克隆上失败,而文档给出的承诺是一个克隆可以就这么跑 `--all`。它还会把门禁所需的目录挂到一个契约是"同步集合拥有的文本"的模式名下。

**删掉这条要求,接受任何存在的类别目录。** 这是最小的门禁,空归档永不失败。它落选是因为这条要求正是抓住把类别写成 `bugfix/` 而非 `bug-fix/` 的那种拼写:一旦有了笔记,落在未列出目录里的笔记对封存就是不可见的,而 manifest 会记录一份把它遗漏掉的归档。

**与 dsh 保持一致,把这个失败记为已知状况。** 本集合的规则是:一项改动要么镜像 dsh,要么被记录为有意的偏离。它落选是因为这个状况是缺陷而不是意见分歧:它让每一个尚未归档任何东西的项目在每次全新克隆时都失败,而复现一个 bug 不叫保持一致。本笔记就是那条被记录的偏离。

## Required verification

一个不含任何类别目录的仓库临时克隆必须通过聚合:`run.ts --all --root .` 报告 `7 gate(s), 0 failed`。同一棵树上放一件归档产物、并让五个类别目录缺席时,那五行 `required kind directory is missing` 必须重新出现,以证明这条规则是重新生效而不是被删除。本仓库里的安装副本在两种情形下都保持绿色。

## Consequences

全新克隆的聚合无需任何预备命令即为绿色,所以归档门禁的结论可以仅从修订本身复现。这条规则现在跟随内容而不是目录树,这正是它可移植的原因:任何采用该机制、尚未归档任何东西的项目都天然一致,而这条要求在第一次归档笔记时自行收紧。

对 dsh 的偏离是有意的,并留在这份笔记里。如果 dsh 修好了它自己那份,两边形态就重新一致,本笔记应当说明这一点;在那之前,差异只是一道判断条件,而不是归档含义上的分歧。

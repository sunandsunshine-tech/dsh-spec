# Agent Note: manager 自己的安装就是那颗钉子

Status: implemented

[English](2026-09-21-the-manager-s-own-install-is-the-pin.md) | 中文

## Problem

manifest 声明了每个技能来自哪个修订,而项目改不了它:`manifest.json` 随已安装的 manager 一起发布,所以这份声明由技能集合写下、又由同一次安装放进去的那个 manager 读回。需要某条分支或某个旧版本的项目没有任何受支持的方式表达这件事,而唯一命名那颗钉子的文件,恰恰是项目不可以编辑的那个文件。

这份声明背后也没有任何检查。`status` 拿每个已安装的 ref 与 manifest 里的字面值比对,于是只要各安装副本彼此一致,一份命名了没人安装过的修订的 manifest 就能通过——技能集合无法察觉自己声明的钉子和自己的安装已经各走各的。[发布的修订是 main 分支](2026-09-21-the-released-revision-is-main.zh.md)保留了这个形状,只改了它的值。

## Decision

**manifest 不再声明任何修订。** `revision` 从 `manifest.json` 中删除;该文件仍持有仓库、要安装的技能、本技能集合发布的门禁以及每道门禁的范围。安装器早已把它解析出的 ref 以 `metadata.github-ref` 记进每个已安装的 `SKILL.md`,那条记录就是钉子:一次安装交付了什么,项目就跑什么。

**必须命名目标的命令按两级解析目标。** 显式的 `--revision <ref>` 优先。没有该旗标时,解析器从仓库读取最新的**已发布** release——草稿 release 不算 release,它的 `tag_name` 不会被拿来用——既没有旗标也没有已发布 release 时,以退出码 2 拒绝,并在信息里点名 `--revision`。只有两个自更新动作会解析目标:`install` 与 `upgrade --only-skill-set` 改为从 manager 取修订。

**技能集合按 manager 自己的 ref 安装。** `install` 与 `upgrade --only-skill-set` 从已安装的 `dsh-spec-manager/SKILL.md` 读出 `metadata.github-ref`,按它安装其余技能,并把 `refs/heads/` 或 `refs/tags/` 前缀去掉作为短名。这就是一次安装已经交付的那个 ref。从未安装过的源码树没有这份元数据,在那里这一对动作回退到上面的两级解析。

**`upgrade` 是一次自更新,后面接技能集合。** 它先解析目标;manager 当前的 ref 与目标不同时,用 `gh skill install <repo> dsh-spec-manager@<target> --dir <skillsDir> --force` 自更新 manager;然后以 `upgrade --only-skill-set --revision <target> --root <root>` 重新执行刚安装好的分发器;退出码用的是那次重新执行的退出码,所以旧代码不会把新 manager 该做的活干完。比 `--only-skill-set` 更老的替换副本没法被指定目标——它自己跑就会按它 pin 的 ref 装技能集合,那不是本次解析出的修订——所以不跑它:改由被调用的这份副本装技能集合,技能清单取自替换副本随包发布的 manifest,两半都不会落空。

**`--only-skill-set` 是不带自更新的那一半。** 它按 manager 当前注入的 ref 安装技能集合,不为 manager 自身跑 `gh skill install`。

**`status` 拿每个技能与 manager 比。** 每个已安装技能的注入 ref 都必须等于 manager 自己的注入 ref——这是一次纯本地比对,不读网络。`SKILL.md` 里没有该块的技能会被点名报告为不是一次安装;manager 自己没有元数据本身就是一条 finding,因为那时技能集合没有可比的钉子。

**干跑会读远端索引,并展示三层。** `install` 与 `upgrade` 在 `--dry-run` 下联网解析 ref,所以 `already at <ref>` 是事实而不是计划;它们把目标修订携带的每个文件分为 `+ 新增`、`~ 修改` 或 `- 删除`,`SKILL.md` 不参与内容比较,单独一行说明注入元数据从哪个 ref 变成哪个;对技能集合拥有的文本,它们渲染出新文本、与磁盘上的文件做 diff,打印 `would update <path>` 加这段 diff,截断到约 40 行。什么都不会写盘,技能正文也不做 diff。

## Alternatives considered

**保留 manifest 里的 `revision`,另加 `--revision` 作为覆盖。** 这个旗标能照顾到需要某条分支的项目,manifest 则继续命名默认值。它落选是因为一个事实有两个名字就会漂移:旗标要么覆盖一份写下来的声明,要么与它矛盾,而"项目实际装了什么"的记录——`metadata.github-ref`——会与两者都不一致。manager 只能钉住它自己被安装时的那个值。

**钉住最新 tag,并要求每次移动都显式升级。** tag 不会在安装器脚下移动,是不用提交号的最强钉子,dsh 自己也钉 `dsh-v0.1.6-alpha.2`。它落选是因为它把每次发布都变成一次 manifest 改动加每个项目的一次重装,而这套技能集合还年轻,发布线就是主干;发布的修订那条笔记出于同样的理由做了同样的取舍。

**每次升级都读远端 manifest 来获知新修订。** 这样技能集合就仍是"已发布修订是什么"的权威,不必信任任何本地记录。它落选是因为它把网络放上了一条本来纯本地的命令的路径,换来的答案与最新已发布 release 给出的完全相同,还让 `status`——项目推送前会跑的那道检查——无法离线复现。

## Consequences

**换来了什么。** 一个名字回答修订来自哪里,而它是安装真正写下的那条记录,不是技能集合手工维护的字面值。开发分支不必发布就能通过 `--revision <branch>` 到达项目,tag 不必改 manifest 就能通过 `--revision <tag>` 到达项目。`status` 再也不可能与它所检查的东西不一致,因为两侧读的是同一份已安装元数据。

**代价是什么。** 没有任何东西拿已安装技能集合与一个项目从未安装过的修订比对,所以想试某条分支的项目必须先取回该分支上的 manager,然后才能装其余技能——原来的 manifest 钉子可以一次指向一条分支并刷新到位。manager 在 `upgrade` 里多了自己的一步,而重新执行正是让这两半不会把旧代码和新 ref 混在一起的原因。

**要求了什么。** 不带 manager 元数据的源码树没有本地钉子,所以 `install` 与 `upgrade` 在那里回退到最新已发布 release,并在仓库没有已发布 release、又没给旗标时被拒绝。在本仓库里,安装副本的 ref 因此是唯一告诉刷新从哪里取的东西。[在 git 中跟踪已安装的技能副本](2026-09-18-track-the-installed-skill-copy.zh.md)拥有随之而来的常驻指令,而[拉取请求生命周期](2026-09-21-the-pull-request-lifecycle.zh.md)里的发布 PR 正是发布这个回退所解析的那个修订的地方。

**留给读者什么。** 安装路径是一次安装加一次刷新:`status` 确认技能集合,`upgrade` 把它追到 manager 自己携带的那个 ref。需要特定修订的项目显式传入它,而既然没有文件再声明钉子,这个旗标就是钉住的全部表面。

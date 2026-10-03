# Agent Note: 在 git 中跟踪已安装的技能副本

Status: implemented

[English](2026-09-18-track-the-installed-skill-copy.md) | 中文

## 问题

`skills/` 是交付物，但 agent 实际加载的技能是安装在 `.agents/skills/` 下的副本。当该副本被 git 忽略时，本仓库陈述的规则在工作树中没有任何东西来保证：从未安装过该包的协作者会在没有技能的情况下运行，而安装了较早修订版的协作者会遵循本仓库不再陈述的规则。这两种状态都不会出现在 diff 中，因此都不会在评审中被发现，遵循错误规则的 agent 也看不到它。

## 决策

该包以**项目级**安装到 `.agents/skills/`，并且该副本纳入 git 跟踪：

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts upgrade --root .
```

由此产生三条规则，`AGENTS.md` 承载它们：

- **绝不手工编辑该副本。** 它会被下一次安装覆盖。修改 `skills/`，然后在同一次变更中刷新副本。
- **通过 manager 刷新，绝不靠复制文件。** 一条命令按 manifest 所列、在 manager 自己那份已安装元数据所携带的修订上安装每一个技能，[`manager-lifecycle.md`](../../../../../skills/dsh-spec-manager/references/manager-lifecycle.md) 把该命令原样写出。安装解析的是远端 ref，因此它跟在推送之后，而 manager 的 `status` 把安装器注入每个已安装 `SKILL.md` 的 ref 与 manager 自己的那份比对——不再有 manifest 字段声明这个 pin，这件事由[manager 自己的安装就是那个 pin](2026-09-21-the-manager-s-own-install-is-the-pin.zh.md)拥有。
- **该副本是部署产物，不是第二个来源。** 两者不一致时，以 `skills/` 为准，副本才是缺陷。

### 副本与源文件并非逐字节相同

`gh skill install` 会向已安装的 `SKILL.md` frontmatter 注入 `metadata:` 块 —— `github-repo`、`github-ref`、`github-path` 和 `github-tree-sha` —— 并围绕它重排 frontmatter 的键。它还会去掉源文件在结束 `---` 之后保留的空行。该块正是 `gh skill update` 得以工作的依据，因此它出现在副本的每一次 diff 中是预期行为，且必须在评审中原样保留。

### 刷新发生在推送之后

安装解析的是远端 ref，因此源文件的修改只有在推送之后才能到达副本。所以一次涉及该包的变更会落在两个提交里：先是源文件，然后是刷新后的副本。[四个机制，而非十二个](2026-09-18-four-mechanisms-instead-of-twelve.zh.md)保留本决策并加以收窄：八个技能按显式名称安装、全都在 manager 自己的 ref 上，安装、更新与移除由 manager 拥有。

## 曾考虑的替代方案

**继续忽略该副本，让每位协作者自行安装。** 这是 `gh skill` 在项目级安装下的默认结果，也不给仓库增加任何体积或评审噪音。它落选是因为本仓库自身的正确性依赖该副本：`AGENTS.md` 把 `.agents/skills/SKILL.md` 指为 agent 加载的文件，于是在不同时间安装的两位协作者会遵循不同规则，而没有任何 diff 能显示这一点。这种失败是静默的，正是本仓库旨在防止的那一类失败。

**安装到用户级 `~/.agents/skills/`。** 一次安装即可服务机器上的所有项目，任何仓库都不必背负 62 个重复文件。它落选是因为该包与本仓库一同版本化：用户级副本无法固定到某个检出所需的修订版，因此安装另一个无关项目的技能会静默改变本仓库遵循的规则。

**把 `.agents/skills/skills` 符号链接到 `skills/`。** 符号链接不会漂移，不需要刷新步骤，还能把文件数减半。它落选是因为副本从此有两个归属者：刷新时 `gh skill` 写入的内容，以及该链接。git 存储的也是链接目标而非内容，因此浏览仓库的读者看到的是一个路径，而不是这个包。

## 后果

副本的 62 个文件现在要被评审两次 —— 一次作为源文件，一次作为部署产物。这就是该保证的代价，也是该副本绝不可就地编辑的原因：在那里做的修复既不被计量，也会在下一次刷新时丢失。

每次源文件变更现在都伴随一次刷新，又因为刷新发生在推送之后，还伴随第二个提交。一次编辑了该包却忘记刷新的变更会让本仓库保持绿色，而加载的技能却是陈旧的。`scripts/verify-installed-copy.ts` 补上了这个缺口：它逐技能比较副本与源，忘了刷新、或冲突解错了边，都会让它失败。[安装副本的冲突与它的门禁](2026-10-03-the-install-copy-conflict-and-its-gate.zh.md) 拥有这套比较的契约与解决配方。

对消费该包的项目而言，采纳方式没有变化：以项目级安装、跟踪副本、绝不编辑它。本决策中没有任何部分依赖于本仓库是该包的家。

# dsh-spec

[English](README.md) | 中文

dsh 开发范式,抽取为八个由 agent 加载的技能。

范式本身很小:决定在动手之前先写下来,散文写给真正会读它的人,一次改动携带它应负的证据,而一条命令判定以上是否全部成立。本仓库是交付这些技能的包、本项目正在运行的安装副本,以及这个包自身如何被设计出来的记录。

## 这里有什么

| 表面 | 持有 |
|---|---|
| `skills/` | 交付物:八个技能,一个工作流一个,每个都有 `SKILL.md` 目录条目以及它需要的 `references/` 与 `templates/`。检查这些技能的门禁是代码,全部住在 `dsh-spec-manager/scripts/`。这里没有任何东西是别处的副本。 |
| `.agents/skills/` | 安装集,纳入 git 跟踪,使每个协作者加载同一修订。agent 读它们;没有人手改它们。 |
| `.agents/dsh-spec/notes/` | 决策记录:决定了什么、什么落选了、放弃了什么。布局与文件内格式见 [`notes/README.md`](.agents/dsh-spec/notes/README.zh.md)。 |
| `docs/` | 给人读的页面。没有任何东西管理这个目录:没有层级、没有上限、没有检查,也没有它自己的指令文件。这里不要求有任何内容。 |
| `scripts/` | 属于本仓库而非属于包的那一道检查:[`verify-skill-structure.ts`](scripts/verify-skill-structure.ts)。 |
| `submodules/dsh/` | 范式抽取自的那个项目,钉住作为 diff 基线。可以读,永不编辑。 |

## 谁拥有什么

- **技能拥有这个范式。** 每个 `skills/<name>/SKILL.md` 是一个工作流的入口,它旁边的技能携带该工作流的契约。交付物是这些技能在安装它们的项目里所做的事,因此本仓库不持有它的第二份陈述。
- **笔记拥有"为什么"。** 一个决定的理由、它击败的替代方案、它要求的验证,都住在做出该决定的那条笔记里,位于 `proposed`、`implemented`、`rejected` 或冻结的归档树中。代码与散文陈述什么是真的;笔记陈述为什么,而这是两者都承载不了的部分。
- **`AGENTS.md` 拥有常驻指令。** 根文件携带 agent 每次会话都需要的规则,并路由到其它一切:上面的 `docs/` 与 `submodules/`,笔记树自己的 [`AGENTS.md`](.agents/dsh-spec/notes/AGENTS.md),以及每个技能的入口。
- **manager 拥有这个集合。** [`skills/dsh-spec-manager/`](skills/dsh-spec-manager/SKILL.md) 携带列出每个技能并记录每道门禁的 manifest、按该记录解析门禁名并与旁边脚本相核对的调度器、每道门禁的代码,以及刷新整个集合的命令。
- **`docs/` 不拥有任何你必须读的东西。** 它持有双语配对共享的术语表,位于 [`docs/terminology.md`](docs/terminology.md),以及任何由人写给人的页面。

## 一次改动如何流动

1. **在笔记里决定。** 非平凡的改动从 `.agents/dsh-spec/notes/proposed/` 下的一条 Agent Note 开始,携带问题、落选的替代方案,以及将要验证什么。在对话中达成的结论以同样方式记录,因为只活在对话记录里的决定,对下一个会话不可见。
2. **改技能,不改安装副本。** 工作在 `skills/` 里落地。`.agents/skills/` 会在下次安装时被覆盖,因此在那里编辑会丢失;两棵树的差别只有安装注入的 metadata 块。
3. **用聚合检查验证。** 调度器运行记录中的每一道门禁,并在任何一道失败、记录里一道门禁都没有、或该记录与紧邻它的 `verify-*.ts` 脚本不一致时失败。它就是整个检查:[`AGENTS.md`](AGENTS.md#commands) 携带命令,而各工作流技能选出一次给定 diff 应负的最小证据子集。
4. **移动笔记并刷新副本。** 已交付的决定移入 `implemented/` 并陈述交付了什么;改动被推送,安装集从该修订刷新,两者落在同一次变更里。

## 刷新安装集

manifest 的 `revision` 字段是钉住这个集合的唯一东西,而安装读的是该修订而不是工作树——所以先推送源码改动:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 \
  .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

该命令对每个技能做了什么,以及 `update`、`status` 与 `uninstall` 各自补上什么,由 [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md) 拥有。

## 接下来读

- [`AGENTS.md`](AGENTS.md) —— 常驻指令,以及本仓库运行的命令。
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) —— 集合的入口;另外七个技能坐在它旁边。
- [`skills/dsh-spec-manager/README.md`](skills/dsh-spec-manager/README.zh.md) —— 集合自身的介绍:它安装什么、往项目里写入什么,以及如何改变它的门禁行为。
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.zh.md) —— 决策记录契约,也就是这个范式对自身的描述。

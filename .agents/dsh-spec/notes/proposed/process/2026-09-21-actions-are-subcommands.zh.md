# Agent Note: 动作是子命令,默认走便宜的那个范围

Status: proposed

[English](2026-09-21-actions-are-subcommands.md) | 中文

## Problem

入口现在先取一个主语,再把操作写成旗标:`notes --check`、`notes-archived --write --all`、`translation-pair --list`、`translation-pair --explain`、`md-links --check`、`commit --check`、`all --check`。这个形状是一袋开关,而不是读者日常工具呈现的两级命令行——`kubectl config set-context`、`helm repo add`、`mise use`——而且这些开关彼此也不一致:`commit --check` 与 `all --check` 不接受路径,`md-links --check` 必须有路径,`notes --check` 取 `--all` 或路径清单,`translation-pair` 把五个操作摊在五个旗标上,而其中只允许出现一个。

由此有两项代价。读者无法从一个主语的形状猜出旁边那个的形状,于是每个问题都要从 `--help` 开始;而且没有任何形式的默认是小范围。光写主语会失败(`notes needs --check`),所以读者能问的最小问题也得是"一个操作加一个他本来就得知晓的范围"——而读取整棵树的 `--all` 看上去和只读一条笔记的旗标一样便宜。

## Proposal

**操作就是子命令。** 动词直接执行:`install`、`upgrade`、`uninstall`、`status`,以及新的聚合动词 `check`。名词后面跟动词:`notes check`、`notes-archived check|write`、`translation-pair check|list|explain|write|brief`、`md-links check`。同一个动词出现在两层是寻常事——`helm list` 与 `helm repo list` 并存——所以 `check` 既可以指聚合动词,也可以指某个名词的操作。

**旗标仍然是修饰语。** `--all`、`--files-from`、`--base`、`--head`、`--cached`、`--apply`、`--dry-run`、`--reinstall`、`--jobs`、`--root` 与 `--help[ zh|en]` 保持拼写,不再充当操作。每个动词在自己的帮助里点名自己的旗标。

**默认是便宜的那个范围。**

| 调用 | 读取什么 |
|---|---|
| `notes check <note...>` | 点名笔记的正文格式与分类 |
| `notes check --all` | 活跃笔记树 |
| `notes-archived check --all` | 冻结的封存树 |
| `translation-pair check <pair...>` | 点名的配对 |
| `translation-pair list` | 整个配对语料,只报告不判定 |
| `translation-pair explain <path>` | 一个路径的对侧 |
| `translation-pair write <pair...>` | 重记已确认的配对(`--all` 为全语料) |
| `translation-pair brief [--apply] <pair...>` | 点名配对的更新简报 |
| `md-links check <markdown...>` | 点名文件里的链接 |
| `check <path...>` | 认领这些路径的检查 |
| `check --base <ref>` | 这次改动按种类欠下的检查 |
| `check --all` | 两道整树检查 |

**路径清单是窄形式,整棵树才是旗标。** `check` 带路径时只跑认领这些路径的检查,用的是分派已有的归属判定;`check --base <ref>` 把那份路径清单换成 diff 产出的清单;`check --all` 是显式的整树形式。`md-links check` 不设 `--all`,因为一条链接是由提问的那个文件判定的,所以全语料形式是报告状态的 `translation-pair list` 与读取计算清单的 `--files-from`。

**参数缺失时打印提示,什么也不做。** `check` 既没有路径,也没有 `--base`,也没有 `--all` 时,打印一行点名这三种形式并指向 `check --help`,然后以 2 退出。它绝不回退到全语料。这正是 `kubectl get` 的做法(`error: Required resource not specified.` 加 `See 'kubectl get -h' for help and examples`),也是 `helm install` 的做法(`Error: "helm install" requires at least 1 argument` 加用法行)。

## Migration

| 现在 | 之后 |
|---|---|
| `notes --check [--all\|<note...>]` | `notes check [--all\|<note...>]` |
| `notes-archived --check --all` | `notes-archived check --all` |
| `notes-archived --write --all` | `notes-archived write --all` |
| `translation-pair --check <pair...>` | `translation-pair check <pair...>` |
| `translation-pair --list` | `translation-pair list` |
| `translation-pair --explain <path>` | `translation-pair explain <path>` |
| `translation-pair --write <pair...>` | `translation-pair write <pair...>` |
| `translation-pair --brief [--apply] <pair...>` | `translation-pair brief [--apply] <pair...>` |
| `md-links --check <markdown...>` | `md-links check <markdown...>` |
| `commit --check --base <ref>` | `check --base <ref>` |
| `all --check` | `check --all` |

`install`、`upgrade`、`uninstall`、`status` 不动。操作旗标是直接拒绝而不是留作别名,因为同一个操作两种写法正是这次改动要拿掉的重影。

## Alternatives considered

**保留旗标式操作,只把每个主语的文档写好。** 改动最小,而且已经在位的帮助工作([CLI 自己讲清楚用法](../../implemented/process/2026-09-21-the-cli-explains-itself.md))足以承载。它落选是因为缺陷在形状而不在文档:`--write --all` 仍然读作两个平等的开关,再多的散文也给不了读者一个可以放心跑的默认。

**光写名词就等于它最常见的那个动作**(`translation-pair` = check,`md-links` = check)。高频场景少打一个词。它落选是因为每个名词的常见动作并不相同(`translation-pair --list` 与它的检查一样常用),而且一个会悄悄执行动作的名词,正是这条笔记要处理的那个失败——读者要靠运行来得知一个工具的开销。

**把聚合保留为名词,写成 `all check`,于是每次调用都是两个词。** 形状统一,也去掉了唯一的例外。它落选是因为聚合是动词的活——它执行检查——而且 `check --all` 正好把"all"放在旗标位,那里才是它点的那个范围该在的地方。

**让不带参数的 `check` 默认等于 `--all`。** 这是顺手的读法,也是读者对"没有参数可给的工具"可能抱的期待。它落选是因为那会让整棵树的昂贵读取成为一个裸命令的沉默行为,而 `--all` 存在的意义恰恰是让人自己说出口。

## Acceptance criteria

- 迁移表里的每个调用都能跑,而它所取代的每个旗标写法都以 2 退出并给出提示,而不是去执行那件事。
- `check` 既无路径、也无 `--base`、也无 `--all` 时以 2 退出,打印提示与 `check --help` 指引,并且什么也不读。
- `check <path...>` 恰好运行认领这些路径的检查,并打印每一个跳过及原因;`check --base <ref>` 从 diff 推出同一批检查。
- `--help` 与 `--help zh` 点名每个主语及其动词、每个动词及其自己的旗标,并且 `references/cli.md` 仍等于 `--help en --markdown`。
- 功能套件改用新写法,某个动词里的缺陷仍然能通过它被抓到。

## Risks

- 两级文法比平铺的旗标清单需要更多解析。它由"运行任何东西之前先把动词与 manifest 记录对照"来覆盖,正如今天对主语所做的那样。
- 每一处引用命令的文档会同时变动:笔记树、随包技能、`AGENTS.md`、初始化器的模板以及配对记录。扫到一半的树比两种写法中的任何一种都糟,所以文本清扫与重记配对是同一次改动。
- `check --all` 读的是两道整树门禁,而不是四个主语;期待它等于"全部"的读者会拿到一个子集。它的帮助会点名它运行什么,而按文件的检查保留各自的形式。

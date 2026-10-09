# Agent Note: 技能可以是可选的

Status: proposed

[English](2026-10-10-a-skill-can-be-optional.md) | 中文

## Problem

manifest 原本只有一份名单，安装就把它整份落下：项目没有办法声明某个技能是有条件的。团队工作流正是这种情况 —— 不组建团队的交付，没有加载它的理由，而这个技能占着一块工作面，也就是交付计划树，项目未必想要。装完再删掉来表示「不要」并不成立，因为下一次 `install` 会把它装回来；而把它写进那份唯一的名单，等于把它变成必装，没有别的说法。

## Proposal

`manifest.json` 增加 `optional`：`skills` 的一个子集；必装集是两者的差，派生出来而不是再写一份，于是两份名单不会互相矛盾。这个字段只做加法：在它出现之前写下的 manifest 不含任何可选技能，全部照装；比这个字段老的 manager 忽略它，也会把可选技能装上 —— 多装一次，从不失败。

`install` 会问，从不自行假定。终端下逐个列出可选技能，附上它 `description` 的第一句（从正在安装的那个修订读取），默认答案是否；非终端的 shell 无人可问，一个都不装，打印 `optional not installed: <name> — pass --with <name> to add it`；`--with <name>` 可重复，不提问直接装；`--dry-run` 打印问题与它会采纳的答案，且不读输入。

`upgrade` 从不询问。项目已经持有的可选技能跟着集合走，从没要过的不装：持有这个技能本身就是选择。项目自己的选择从不写进安装好的 `manifest.json`，因为 `gh skill install --force` 会覆盖那份文件、prune 会清掉它 —— 选择就是盘上那个存在的目录。

可选技能是 `dsh-agent-team-workflow`，它拥有交付计划面：选中它，才创建并保有计划树、它的配对和 `dsh-spec:plans` 钩子；不选它，这些一个都没有。[交付由计划与工作副本承载](../process/2026-10-10-a-delivery-records-a-plan-and-a-working-copy.zh.md) 拥有那块工作面本身；这个字段拥有的是它为什么有条件。

## Alternatives considered

**把 manifest 拆成 `required` 与 `optional` 两份名单。** 它落败，因为它落地当天就会打断更新：比这次拆分老的 manager 读它认得的那份 manifest，找不到 `skills`，于是失败而不是装点什么。增加一个字段，老 manager 读成没有，整套照装。

**默认装上可选技能，再让项目自己删。** 它落败，因为每次装完都得删一遍的技能不叫可选，而且 `upgrade` 会把它装回来。

**把项目的选择写进安装好的 `manifest.json`。** 它落败，因为安装器会用修订里的那份覆盖这个文件，prune 也会清掉别的，写在那里的选择活不过下一次安装。项目持有的目录已经说明了同一件事，而且不可能和自己不一致。

**把每个可选技能的描述放进 manifest、写在名字旁边。** 它落败，因为那句话属于技能自己的 `SKILL.md`，manifest 里的副本是它会出错的第二个地方；提问从正在安装的修订读取它，读不到时只显示名字。

## Acceptance criteria

- `manifest.json` 带 `optional: ["dsh-agent-team-workflow"]`，必装集由 `skills` 减去 `optional` 派生。
- 终端安装逐个列出可选技能、附描述首句，默认答案为否。
- 非终端的 shell 不装任何可选技能，并打印能把它加进来的 `--with` 行。
- `--with <name>` 不提问直接装、可重复；给出的名字不是本集合的可选技能时以退出码 2 拒绝。
- `--dry-run` 打印问题与它会采纳的答案，且不读输入。
- `upgrade` 什么都不问：项目持有的可选技能跟着集合走，从没要过的不装。
- 采用时选中 workflow 技能，会创建计划树、它的配对与钩子；不选则既不建计划树，也不注入钩子。
- 以上每种安装场景都由功能套件离线覆盖，走 `gh` 替身。

## Risks

- 持有即选择，所以升级跟着它走、绝不替它改主意；一个项目若用删除可选目录来表示不要，也就删掉了「曾经想要过」的记录。
- `install` 不跟随项目已经持有的技能：它装必装集加上本轮答案，已持有的可选留在原地；非终端下即使技能就在盘上、只是本轮没被选中，也会打印 `optional not installed: <name> — pass --with <name> to add it`。这行字比状态窄；漂移由 `status` 报出，由 `upgrade` 收敛。
- 比这个字段老的 manager 会不询问就装上可选技能，于是引入 `optional` 的那个修订可能让项目持有一个没人答过的技能；下一次升级会保留它，因为持有就是选择。

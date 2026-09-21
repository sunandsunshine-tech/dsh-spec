# dsh-spec

[English](README.md) | 中文

把 dsh 的开发方式抽出来,做成八个技能,由 agent 按需加载。

它管的是团队里最容易散掉的那部分:一个决定当初为什么这么定、别的选择为什么没选、这次改动该拿出什么证据、中英文两份文档怎么不走丢。这些都写下来、放在该在的地方,并且有一条命令能查出有没有漏。

## 安装

人只手工装一个技能,其余的交给 agent。

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills
```

然后告诉你的 agent 去完成后续安装:

> /dsh-spec-manager 完成初始化

剩下的事归 manager:它按同一个修订把整套技能装齐、更新,给项目做初始化(项目自己已经写过的内容不动),并让项目里的机制文本始终跟这个修订一致。

## 装上以后有什么用

- **决定留得下来。** 每个不平凡的改动都写清做了什么、放弃了什么、将来靠什么验证,下一个人不必把同一件事再争一遍。
- **收口只有一条命令。** 它跑完记录在案的全部检查;少跑一道,或者记录和旁边的脚本对不上,当场就失败,不会给你一个假绿。
- **两种语言不会走散。** 每一对文档都带英文侧、中文侧和一份"上次确认一致"的记录,谁被改了却没同步,检查会直接报出来。
- **评审和推送各有依据。** 评审照一份清单去看代码本身看不出的东西;推送前只跑真正覆盖这次改动的最小证据,不必把整个测试套件搬出来。

## 一次改动怎么走

1. **先在笔记里定下来。** 够分量的改动从 `proposed/` 下的一条记录开始,写清问题、落选的方案、打算怎么验证;对话里谈成的结论也照此记录,否则它只活在那次对话里。
2. **改技能,别改安装副本。** 工作都落在 `skills/`。`.agents/skills/` 下次安装就会被覆盖,在那里改等于白改。
3. **一条命令收口。** 命令见 [`AGENTS.md`](AGENTS.md#commands):它跑的是全部检查;具体某次改动该跑哪一小部分,由对应的工作流技能挑出来。
4. **笔记跟着交付走,副本跟着修订刷新。** 决定交付之后,笔记移进 `implemented/` 并改成现在时;改动推上去,安装集从那个修订刷新,两件事在同一次变更里完成。

## 这个仓库里有什么

| 谁 | 职责 |
|---|---|
| `skills/` | 交付物:八个技能,一个工作流一个;所有检查的代码集中在 `dsh-spec-manager/scripts/` |
| `.agents/skills/` | 本项目正在用的那一份,随 git 一起走,保证每个人加载同一个修订;只有安装命令会写这里 |
| `.agents/dsh-spec/notes/` | 决策记录:决定了什么、什么落选、放弃了什么。格式见 [`notes/README.md`](.agents/dsh-spec/notes/README.zh.md) |
| `docs/` | 写给人看的页面,包括两种语言共用的术语表;这个目录不受任何机制管辖 |
| `scripts/` | 只属于本仓库、不随包发布的那道检查:[`verify-skill-structure.ts`](scripts/verify-skill-structure.ts) |
| `submodules/dsh/` | 这套做法的来源,钉住作为对照基线:可以读,不要改 |

## 刷新安装集

集合钉在 manifest 的 `revision` 上,而安装读的是那个修订、不是工作树,所以先把源码推上去:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 \
  .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

这条命令对每个技能做了什么,`update`、`status`、`uninstall` 又各管什么,见 [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md)。

## 接下来读

- [`AGENTS.md`](AGENTS.md) —— 每次会话都要遵守的规则,以及本仓库真正跑的命令。
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) —— 集合的入口,另外七个技能就在它旁边。
- [`skills/dsh-spec-manager/README.md`](skills/dsh-spec-manager/README.zh.md) —— 这个包自己的介绍:装什么、往项目里写什么、检查的行为怎么改。
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.zh.md) —— 决策记录的约定,也是这套做法对自己的说明。

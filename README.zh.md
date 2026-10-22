# dsh-spec

[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.19-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

给项目一个固定的地方,存放每次改动都得交代的东西:当初为什么这么定、放弃了什么、拿什么来证明。本仓库把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 团队日常遵循的这套做法抽取出来,做成一个技能,由项目装进自己的树里。

一个技能把构想、资料或已有技能锻造成新技能;另一个把宽跨度的交付交给一支 agent 团队来完成。

## 先决条件

| 需要 | 用来做什么 |
|---|---|
| [Node.js](https://nodejs.org/) 22.19 或更新 | 运行测试套件和各项检查 |
| [Git](https://git-scm.com/) | 克隆仓库;需要读提交的那道检查 |
| [GitHub CLI](https://github.com/cli/cli)(`gh`,含 `skill` 命令) | 安装和更新技能 |

GitHub CLI 也自带 agent 技能,去[它的仓库](https://github.com/cli/cli)装一个即可。

## 安装

装到项目里,不要装到家目录,并把结果提交进 git。装在项目里,于是每个协作者、每个 agent、CI 都停在你所安装的那个修订上;装到用户级则只存在于各自机器上,下一次 `gh skill update` 就各走各的。首次安装后请提交 `.agents/skills/`。

每个技能各自安装,修订由你指定。

### 手动安装

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-skill-forge@latest --dir .agents/skills
```

每条命令按你给的修订 —— `latest`、某条分支或某个 tag —— 取回一个技能,写进 `.agents/skills/`。

### 让 agent 安装

把下面这段交给你的 agent:

> 用 GitHub CLI 从 `sunandsunshine-tech/dsh-spec` 装上 `dsh-spec-skill-forge` 技能,然后照本 README 的「手动安装」一节操作。动手前先确认上面列的依赖都已就绪,缺哪一样就问我。

## 装上以后有什么用

- **决定留得下来。** 每个不平凡的改动都写清做了什么、放弃了什么、将来靠什么验证,下一个人不必把同一件事再争一遍。
- **技能是锻造出来的,不是随手写的。** `dsh-spec-skill-forge` 把一个构想、一份资料或一个已有技能,经过领域锚定、单文件雏形和一路维护的决策记录,锻造成新技能。
- **两种语言不会走散。** 每一对文档都带英文侧、中文侧和一份「上次确认一致」的记录;让两侧保持一致是写作者的责任。

## 技能

| 技能 | 它管什么 |
|---|---|
| `dsh-spec-skill-forge` | 从构想、资料或已有技能锻造技能:锁定问题与形态、锚定领域、做出雏形,并维护决策记录 |

## 更新技能集合

每个技能都按你指定的修订安装,`gh skill update` 把安装副本刷新到该修订。

## 在一个已经装好的项目里工作

1. **先在笔记里定下来。** 够分量的改动从 `proposed/` 下的一条记录开始,写清问题、落选的方案、打算怎么验证;对话里谈成的结论也照此记录,否则它只活在那次对话里。
2. **用改动该跑的检查收口。** 本仓库真正跑的命令见 [`AGENTS.md`](AGENTS.md#commands)。

## 在本仓库上工作

- **改技能,别改安装副本。** 工作都落在 `skills/`。`.agents/skills/` 下次安装就会被覆盖,在那里改等于白改。
- **笔记跟着交付走。** 决定交付之后,笔记移进 `implemented/` 并改成现在时,和工作落在同一次变更里。

| 谁 | 职责 |
|---|---|
| `skills/` | 交付物:技能,各有自己的入口 |
| `.agents/skills/` | agent 加载的安装副本,随 git 一起走;只有安装命令会写这里,在那里的手改会丢 |
| `.agents/dsh-spec/notes/` | 决策记录:决定了什么、什么落选、放弃了什么。格式见 [`notes/README.md`](.agents/dsh-spec/notes/README.zh.md) |
| `docs/` | 写给人看的页面,包括两种语言共用的术语表;这个目录不受任何机制管辖 |
| `scripts/` | 只属于本仓库、不随包发布的东西:[`verify-dco.ts`](scripts/verify-dco.ts) 和 [`submit-vendored.ts`](scripts/submit-vendored.ts) |
| `tests/` | 检验这些检查的功能套件 —— `node --test 'tests/**/*.test.ts'` |
| `submodules/dsh/` | 这套做法的来源,pin 作为对照基线:可以读,不要改 |

## 接下来读

- [`AGENTS.md`](AGENTS.md) —— 每次会话都要遵守的规则,以及本仓库真正跑的命令。
- [`skills/dsh-spec-skill-forge/SKILL.md`](skills/dsh-spec-skill-forge/SKILL.md) —— 锻造技能的入口。
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.zh.md) —— 决策记录的约定,也是这套做法对自己的说明。

## 许可证

本项目以 MIT 发布。全文与版权行见 [`LICENSE`](LICENSE);上游 DeepSeek Harness 的通知、移植文件清单与随技能集合内联的 npm 包清单见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

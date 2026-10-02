# dsh-spec

[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.19-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

给项目一个固定的地方,存放每次改动都得交代的东西:当初为什么这么定、放弃了什么、拿什么来证明。本仓库把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 团队日常遵循的这套做法抽取出来,做成九个技能加一个引擎:项目装上它,从同一个修订运行它、更新它。

其中两个技能会伸进项目自己的树里:一份决策记录的约定,和一份由项目挑着用的开发规范目录。其余几个是改动要经过的工作流:散文、评审、推送前检查、翻译。

## 先决条件

| 需要 | 用来做什么 |
|---|---|
| [Node.js](https://nodejs.org/) 22.19 或更新 | 运行检查脚本 |
| [Git](https://git-scm.com/) | 管理技能;需要读提交的检查 |
| [GitHub CLI](https://github.com/cli/cli)(`gh`,含 `skill` 命令) | 安装和更新技能 |

GitHub CLI 也自带 agent 技能,去[它的仓库](https://github.com/cli/cli)装一个即可。

## 安装

装到项目里,不要装到家目录,并把结果提交进 git。你装 manager 用的那个 ref,就是其余每个技能的 pin;装在项目里,于是每个协作者、每个 agent、CI 都停在那同一个修订上;装到用户级则只存在于各自机器上,下一次 `gh skill update` 就各走各的。首次安装后请提交 `AGENTS.md`、`.agents/`、`docs/` 和 `.rgignore`。

manager 需要你亲手装,其余八个由它装。想装某条分支或某个旧版本、而不是最新已发布的那个,给 `gh skill install` 传 `--revision <ref>`。

### 手动安装

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root .
```

第一条命令按你给的修订取回 manager —— `latest`、某条分支或某个 tag。第二条按 manager 被安装时所用的 ref 装上其余技能,并在项目里建起需要的文件:常驻指令、决策记录树、术语表。想先看计划就加 `--dry-run`,它会列出哪些文件会新增、修改或删除;装完用 `status` 确认一下。

### 让 agent 安装

把下面这段交给你的 agent:

> 用 GitHub CLI 从 `sunandsunshine-tech/dsh-spec` 装上 `dsh-spec-manager` 技能,然后照本 README 的「手动安装」一节操作。动手前先确认上面列的依赖都已就绪,缺哪一样就问我。

## 装上以后有什么用

- **决定留得下来。** 每个不平凡的改动都写清做了什么、放弃了什么、将来靠什么验证,下一个人不必把同一件事再争一遍。
- **规范由你挑。** 技能集合还附带它积累下来的开发规范:每条有 id、有分组,还有一段正文说清规范本身、为什么算规范、怎么察觉自己违反了它。`norms install` 把你挑的那些写进 `.agents/dsh-spec/norms/`,`norms update` 把它们带到已安装的修订上,而且不会覆盖你改过的内容。
- **收口只有一条命令。** 它跑完记录在案的全部检查;少跑一道,或者记录和旁边的脚本对不上,当场失败,不会给你一个假绿。
- **两种语言不会走散。** 每一对文档都带英文侧、中文侧和一份「上次确认一致」的记录;谁改了却没同步,检查直接报出来。
- **评审和推送各有依据。** 评审照一份清单去看代码本身看不出的东西;推送前只跑真正覆盖这次改动的最小证据,不必把整个测试套件搬出来。

## 九个技能

| 技能 | 它管什么 |
|---|---|
| `dsh-spec-manager` | 管这一整套:初始化项目、按同一个修订安装与更新技能、应用项目挑的规范、让机制文本保持一致、跑聚合检查 |
| `dsh-archive-agent-notes` | 管决策记录的成色:校验笔记树、检查取代关系、把已经完成使命的记录冻结 |
| `dsh-translate-docs` | 让一份文档和它的译文保持同步,并记录这对配对 |
| `dsh-prose-standard` | 各个位置该写什么——API 文档、注释、测试、README、诊断信息、用户可见文案 |
| `dsh-trim-cot-leakage` | 删掉从写作会话视角写出来的散文 |
| `dsh-code-review` | 评审一次改动的路径,以及代码本身看不出、需要人去问的东西 |
| `dsh-pre-push-checks` | 覆盖一次外发改动的最小证据 |
| `dsh-find-simplifications` | 把「找找能简化什么」变成有证据可依的提案 |
| `dsh-agent-experience` | agent 自己的上下文欠什么:先给最小上下文、发现要显式、约束先于动作、输出宁可有界 |

## 应用它附带的规范

目录本身是数据:每条规范都有稳定的 id、项目挑它时用的分组,以及一段说清规范、理由、自查的正文。项目按分组或按 id 挑自己要的那些:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts norms list
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts norms install --group prose --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts norms update --root .
```

它们落在 `.agents/dsh-spec/norms/norms.md`,旁边的 `applied.yaml` 记着项目应用了哪些 id,以及每个块上次由技能集合写入时的哈希。这份文件由目录生成:更新会把每个块覆盖成集合的正文;某个块的文本与哈希对不上,说明有人手改过 —— 更新会报出来并拒绝写,直到加上 `--force`。集合不再发布的规范,会从两份文件里一起清掉。只要项目还应用着规范,它的 `AGENTS.md` 里就有一节列出这些红线。

`install` 和 `upgrade` 从不写这些文件:它们只报告这次修订会移动哪几条,就像 `apt update` 报告哪些包可以升级;真正动手写的是 `norms update`。

## 更新技能集合

技能集合跟着 manager 走:每个技能都带着 manager 自己被安装时所用的 ref,而安装读的是远端 ref、不是工作树,所以先把源码推上去。`upgrade` 先解析目标修订;目标与 manager 当前的 ref 不同时,它把 manager 换成目标那份;然后重新运行刚装好的副本,把技能集合装到该修订上:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts upgrade --root .
```

`upgrade --only-skill-set` 是不带自更新的那一半:它按 manager 当前的 ref 安装技能集合。在源码树里(比如本仓库)要跑 `upgrade --revision <当前分支>`:那里跑裸 `upgrade` 没有可读的 manager 已安装 ref,会退而解析最新已发布的 release。

这条命令对每个技能做了什么,`install`、`status`、`uninstall` 又各管什么,见 [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md)。

## 在一个已经装好的项目里工作

1. **先在笔记里定下来。** 够分量的改动从 `proposed/` 下的一条记录开始,写清问题、落选的方案、打算怎么验证;对话里谈成的结论也照此记录,否则它只活在那次对话里。
2. **一条命令收口。** 命令见 [`AGENTS.md`](AGENTS.md#commands):它跑的是全部检查;具体某次改动该跑哪一小部分,由对应的工作流技能挑出来。

## 在本仓库上工作

- **改技能,别改安装副本。** 工作都落在 `skills/`。`.agents/skills/` 下次安装就会被覆盖,在那里改等于白改。
- **笔记跟着交付走,副本跟着修订更新。** 决定交付之后,笔记移进 `implemented/` 并改成现在时;改动推上去,安装副本从那个修订更新,两件事在同一次变更里完成。

| 谁 | 职责 |
|---|---|
| `skills/` | 交付物:九个技能,一个工作流一个;所有检查的代码集中在 `dsh-spec-manager/scripts/` |
| `.agents/skills/` | 本项目正在用的那一份,随 git 一起走,保证每个人加载同一个修订;只有安装命令会写这里 |
| `.agents/dsh-spec/notes/` | 决策记录:决定了什么、什么落选、放弃了什么。格式见 [`notes/README.md`](.agents/dsh-spec/notes/README.zh.md) |
| `docs/` | 写给人看的页面,包括两种语言共用的术语表;这个目录不受任何机制管辖 |
| `scripts/` | 只属于本仓库、不随包发布的东西:[`verify-skill-structure.ts`](scripts/verify-skill-structure.ts)、出处登记表与出处门禁,以及 `ports` 对照命令 |
| `tests/` | 检验这些检查自身的功能套件 —— `node --test 'tests/**/*.test.ts'` |
| `submodules/dsh/` | 这套做法的来源,pin 作为对照基线:可以读,不要改 |

## 接下来读

- [`AGENTS.md`](AGENTS.md) —— 每次会话都要遵守的规则,以及本仓库真正跑的命令。
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) —— 技能集合的入口,另外八个技能就在它旁边。
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.zh.md) —— 决策记录的约定,也是这套做法对自己的说明。

## 许可证

本项目以 MIT 发布。全文与版权行见 [`LICENSE`](LICENSE);上游 DeepSeek Harness 的通知、移植文件清单与随技能集合内联的 npm 包清单见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

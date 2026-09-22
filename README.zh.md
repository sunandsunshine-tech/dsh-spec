# dsh-spec

[English](README.md) | 中文

让项目里每个重要的改动都留下决策记录,漏了会被检查出来,中英文文档不会走散。

它管的是团队里最容易散掉的那部分:一个决定当初为什么这么定、别的选择为什么没选、这次改动该拿出什么证据、中英文两份文档怎么不走丢。这些都写下来、放在该在的地方,并且有一条命令能查出有没有漏。

## 先决条件

| 需要 | 用来做什么 |
|---|---|
| [Node.js](https://nodejs.org/) 22.19 或更新 | 运行检查脚本 |
| [Git](https://git-scm.com/) | 管理技能;需要读提交的检查 |
| [GitHub CLI](https://github.com/cli/cli)(`gh`,含 `skill` 命令) | 安装和更新技能 |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | `dsh-trim-cot-leakage` 的检索探针 |

GitHub CLI 也自带 agent 技能,去[它的仓库](https://github.com/cli/cli)装一个即可。

## 安装

装到项目里,不要装到家目录,并把结果提交进 git。装在项目里,技能集由项目的 manifest 钉住修订,每个协作者、每个 agent、CI 用的都是同一套;装到用户级则只存在于各自机器上,下一次 `gh skill update` 就各走各的。首次安装后请提交 `AGENTS.md`、`.agents/`、`docs/` 和 `.rgignore`。

manager 需要你亲手装,其余七个由它装。

### 手动安装

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root .
```

第一条命令取回 manager;第二条按同一个修订装上其余技能,并在项目里建起需要的文件——常设指令、决策记录树、术语表。想先看计划就加 `--dry-run`;装完可以用 `status` 确认。

### 让 agent 安装

把下面这段交给你的 agent:

> 用 GitHub CLI 从 `sunandsunshine-tech/dsh-spec` 装上 `dsh-spec-manager` 技能,然后按本 README 的「手动安装」一节操作。动手前先确认上面列的依赖都已就绪,缺哪一样就问我。

## 装上以后有什么用

- **决定留得下来。** 每个不平凡的改动都写清做了什么、放弃了什么、将来靠什么验证,下一个人不必把同一件事再争一遍。
- **收口只有一条命令。** 它跑完记录在案的全部检查;少跑一道,或者记录和旁边的脚本对不上,当场就失败,不会给你一个假绿。
- **两种语言不会走散。** 每一对文档都带英文侧、中文侧和一份"上次确认一致"的记录,谁被改了却没同步,检查会直接报出来。
- **评审和推送各有依据。** 评审照一份清单去看代码本身看不出的东西;推送前只跑真正覆盖这次改动的最小证据,不必把整个测试套件搬出来。

## 八个技能

| 技能 | 它管什么 |
|---|---|
| `dsh-spec-manager` | 管这一整套:初始化项目、按同一个修订安装与更新技能、让机制文本保持一致、跑聚合检查 |
| `dsh-archive-agent-notes` | 管决策记录的成色:校验笔记树、检查取代关系、把已经完成使命的记录冻结 |
| `dsh-translate-docs` | 让一份文档和它的译文保持同步,并记录这对配对 |
| `dsh-prose-standard` | 各个位置该写什么——API 文档、注释、测试、README、诊断信息、用户可见文案 |
| `dsh-trim-cot-leakage` | 删掉从写作会话视角写出来的散文 |
| `dsh-code-review` | 评审一次改动的路径,以及代码本身看不出、需要人去问的东西 |
| `dsh-pre-push-checks` | 覆盖一次外发改动的最小证据 |
| `dsh-find-simplifications` | 把"找找能简化什么"变成有证据可依的提案 |

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
| `scripts/` | 只属于本仓库、不随包发布的东西:[`verify-skill-structure.ts`](scripts/verify-skill-structure.ts)、出处登记表与出处门禁,以及 `ports` 对照命令 |
| `tests/` | 检验这些检查自身的功能套件 —— `node --test 'tests/**/*.test.ts'` |
| `submodules/dsh/` | 这套做法的来源,钉住作为对照基线:可以读,不要改 |

## 刷新安装集

技能集合钉在 manifest 的 `revision` 上,而安装读的是那个修订、不是工作树,所以先把源码推上去:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts upgrade --root .
```

这条命令对每个技能做了什么,`install`、`status`、`uninstall` 又各管什么,见 [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md)。

## 接下来读

- [`AGENTS.md`](AGENTS.md) —— 每次会话都要遵守的规则,以及本仓库真正跑的命令。
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) —— 技能集合的入口,另外七个技能就在它旁边。
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.zh.md) —— 决策记录的约定,也是这套做法对自己的说明。

## 许可证

本项目以 MIT 发布。全文与版权行见 [`LICENSE`](LICENSE);上游 DeepSeek Harness 的通知、移植文件清单与随技能集合内联的 npm 包清单见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

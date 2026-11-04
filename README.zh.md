# dsh-spec

[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.19-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

`dsh-spec` 是一套 Agent 技能，承载 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 团队日常遵循的开发做法：把决定写下来，让文字经得起推敲，技能则由它们自己记载的同一套流程锻造而成。项目把用得到的技能装进自己的树里。

技能要么移植自 DeepSeek Harness 项目，要么是为本包锻造的。[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 记录了来源、改编文件以及随包携带的 npm 包。

## 先决条件

| 需要 | 用来做什么 |
|---|---|
| [Node.js](https://nodejs.org/) 22.19+（22 系列），或 24+ | 运行测试套件与各项检查 |
| [Git](https://git-scm.com/) | 克隆仓库，以及读取提交的那道检查 |
| [GitHub CLI](https://github.com/cli/cli)（命令行界面，`gh`），自带 `skill` 命令 | 安装与更新技能 |

GitHub CLI 自己也带一个 agent 技能，去[它的仓库](https://github.com/cli/cli)装一个即可。

## 安装

把技能装进项目里，不要装到家目录，然后提交结果。装在项目级的那份副本，让每个协作者、每个 agent 和每次 CI 运行都落在你安装时选定的修订上；装在用户级的那份每台机器各一份，只在运行 `gh skill update` 时变化。首次安装后请提交 `.agents/skills/`。

每个技能各自安装。在 `@` 后面写出 tag 或 commit SHA 来指定版本，就能把它 pin 住；不指定版本时，CLI 取最新的带 tag 的 release，仓库没有带 tag 的 release 时则取默认分支。

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-agent-notes --dir .agents/skills
```

用 `--all` 安装仓库里的全部技能：

```sh
gh skill install sunandsunshine-tech/dsh-spec --all --dir .agents/skills
```

`gh skill update` 刷新未 pin 的安装；已 pin 的技能会被跳过，直到解除 pin。

### 让 agent 安装

把下面这段交给你的 agent：

> 用 GitHub CLI 把 `sunandsunshine-tech/dsh-spec` 里的 `dsh-spec` 技能装进 `.agents/skills/`。动手前先核对上面的先决条件，缺了哪一样就来问我。

## 技能

每个技能都自成一体、单独安装；一个技能提到另一个技能时，只把它当作一个以对方可用为前提的示例。

### 记录决策

| 技能 | 它管什么 | 来源 |
|---|---|---|
| `dsh-spec-agent-notes` | 决策记录：一次改动何时需要一条、它记录什么，以及 Agent Note 如何在 `proposed/`、`implemented/` 与 `rejected/` 之间流转 | dsh |

### 打磨指令与文字

| 技能 | 它管什么 | 来源 |
|---|---|---|
| `dsh-spec-agent-experience` | 编写提示词——system prompt、工具定义、技能指令与多步工作流——让其中的信息可被发现、上下文用得高效 | dsh |
| `dsh-spec-agents-md` | 编写 `AGENTS.md`：哪些内容该写进去、哪些应成为指向其归属文档的指针，以及范围与更新如何裁定 | 本包自创 |
| `dsh-spec-prose-standard` | 持久性文本：哪里需要文字、如何在删去推理过程的同时保全完整命题，以及审计泄漏 | dsh |
| `dsh-spec-translate-docs` | 让配对文档的两侧保持一致：最小更新、整篇翻译，以及配对记录与检查 | dsh |

### 评审与交付改动

| 技能 | 它管什么 | 来源 |
|---|---|---|
| `dsh-spec-code-review` | 按项目自己声明的标准评审一个改动，外加仅看代码看不出的检查 | dsh |
| `dsh-spec-error-handling` | 错误处理：失败、恢复、重试、后台任务与用户可见的错误报告 | dsh |
| `dsh-spec-find-simplifications` | 找出有证据支撑的简化，并撰写或合并相应的提案 | dsh |
| `dsh-spec-merging-stacked-prs` | 把相互依赖的 GitHub PR（Pull Request）作为一条堆叠 PR 链落地 | dsh |
| `dsh-spec-pr-description` | 撰写变更请求描述：改动为何存在、改了什么、由什么证明，以及 AI Usage 声明 | dsh |
| `dsh-spec-pre-push-checks` | 推送或声称检查通过之前，选出覆盖待推送 diff 的最小测试与检查 | dsh |

### 构建技能集合

| 技能 | 它管什么 | 来源 |
|---|---|---|
| `dsh-spec-skill-forge` | 从构想、资料或已有技能锻造技能：锁定问题与形态、锚定领域、做出雏形，并维护决策记录 | 本包自创 |

## 技能之间如何衔接

改动从一条决策记录开始：这条 Agent Note 写明决定了什么、什么落选、由什么证明。行文技能与翻译技能让承载这些决定的文字保持可读，让各语言配对保持同步。锻造（forge）是本包自带的编写机制：它把构想、资料或已有技能变成新技能，并记录背后的决定。评审与交付类技能覆盖改动从 worktree 到落地分支所走的全程。每个技能都单独安装；一个技能提到另一个技能时，那个名字只是可选示例。

## 在装有这些技能的项目里工作

1. **先在 Agent Note 里作出决定。** 值得记录的改动，从 `proposed/` 下的一条记录开始，写清问题、落选的方案以及打算怎么验证；对话里谈成的结论也照此记录。
2. **用这次改动该跑的检查收口。** 命令是各项目自己的；本仓库的命令列在 [AGENTS.md](AGENTS.md#commands)。

## 在本仓库上工作

- **改技能，别改安装副本。** 工作都落在 `skills/`；`.agents/skills/` 由 `pnpm run skill:refresh` 刷新，所以在那里改会丢。
- **决定交付时，同步移动那条 Agent Note。** 决定一旦落地，它的 Agent Note 就在同一次改动里移进 `implemented/`，并改用现在时叙述。

| 路径 | 职责 |
|---|---|
| `skills/` | 交付物：各个技能，各有自己的入口 |
| `package/` | 技能脚本源码，落地前打包进工作目录 |
| `scripts/` | 不对外发布的仓库工具：DCO、随包依赖通知、技能的构建与刷新 |
| `tests/` | 检验这些工具的功能套件 |
| `.agents/skills/` | agent 加载的安装副本：由 `gh skill install` 或 `pnpm run skill:refresh` 写入，在那里的手改会丢 |
| `.agents/dsh-spec-agent-notes/` | 决策记录 |
| `.agents/dsh-spec-agents-md/` | 根 `AGENTS.md` 链接的、面向 agent 的细节 |
| `.agents/dsh-spec-translate-docs/` | 成对文档共享的术语表 |
| `.github/` | issue 模板、CI 工作流与 Dependabot 配置 |
| `submodules/dsh/` | pin 住的抽取基线：可以读，不要改 |

本仓库用来格式化、测试和检查一次改动的命令，见 [AGENTS.md](AGENTS.md#commands)。

## 接下来读

- [AGENTS.md](AGENTS.md) —— 每次会话都要遵守的规则，以及本仓库运行的那些命令。
- [`skills/dsh-spec-skill-forge/SKILL.md`](skills/dsh-spec-skill-forge/SKILL.md) —— 编写技能的入口。
- [`dsh-spec-agent-notes` 技能](skills/dsh-spec-agent-notes/SKILL.md) —— 决策记录的约定与生命周期。

## 许可证

本项目以 MIT License 发布。全文与版权行见 [LICENSE](LICENSE)；上游通知、改编文件以及随包携带的 npm 包见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

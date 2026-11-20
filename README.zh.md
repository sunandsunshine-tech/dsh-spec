# dsh-spec

[English](README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-24.11%2B%20%7C%2026%2B-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

`dsh-spec` 是一套 Agent 技能，承载 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）团队日常遵循的开发做法：把决定写下来，让文字经得起推敲，技能则由它们自己记载的同一套流程锻造而成。项目把用得到的技能装进自己的树里。

技能要么移植自 DeepSeek Harness 项目，要么是为本包锻造的。[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 记录了来源、改编文件以及随包携带的 npm 包。

## 先决条件

| 需要 | 用来做什么 |
|---|---|
| [Node.js](https://nodejs.org/) 24.11+（24 系列），或 26+ | 运行测试套件与各项检查 |
| [Git](https://git-scm.com/) | 克隆仓库，以及读取提交的那道检查 |
| [GitHub CLI](https://github.com/cli/cli)（命令行界面，`gh`），自带 `skill` 命令 | 安装与更新技能 |

GitHub CLI 自己也带一个 agent 技能，去[它的仓库](https://github.com/cli/cli)装一个即可。

## 安装

把技能装进项目里，不要装到家目录，然后提交结果。装在项目级的那份副本，让每个协作者、每个 agent 和每次 CI 运行都落在你安装时选定的修订上；装在用户级的那份每台机器各一份，只在运行 `gh skill update` 时变化。首次安装后请提交 `.agents/skills/`。

每个技能使用各自的 `gh skill install` 调用安装。传入 `--pin <tag-or-commit>` 就能把它 pin 住；不指定 pin 时，CLI 取最新的带 tag 的 release，仓库没有带 tag 的 release 时则取默认分支。把下一条命令里的占位符替换成项目将要共用的 tag 或 commit。

### 从通用组开始

通用协作组覆盖项目指令、决策记录、持久性文字以及文档翻译与配对：

```sh
PIN="<tag-or-commit>"
for skill in \
  dsh-spec-agent-experience \
  dsh-spec-agents-md \
  dsh-spec-agent-notes \
  dsh-spec-prose-standard \
  dsh-spec-translate-docs
do
  gh skill install sunandsunshine-tech/dsh-spec "$skill" --pin "$PIN" --dir .agents/skills
done
```

当项目开始承担其他组对应的工作时，再增加相应技能。[技能选择指南](docs/choosing-skills.zh.md)说明每个技能增加什么、推荐配套技能为什么有帮助，以及哪些组合适合常见工作。

`--all` 仍然可用，但不是默认采用路径。无关技能会增加选择成本和更新义务，却不增加项目实际使用的能力。

`gh skill update` 刷新未 pin 的安装；已 pin 的技能会被跳过，直到解除 pin。

### 让 agent 安装

把下面这段交给你的 agent：

> 用 GitHub CLI 把 `dsh-spec-agent-experience`、`dsh-spec-agents-md`、`dsh-spec-agent-notes`、`dsh-spec-prose-standard` 和 `dsh-spec-translate-docs` 从 `sunandsunshine-tech/dsh-spec` 装进 `.agents/skills/`。每个技能运行一条 `gh skill install` 命令，并在每条命令中把同一个 tag 或 commit 传给 `--pin`。如果我未提供该 tag 或 commit，请先询问我，不要自行选择。动手前先核对上面的先决条件，缺了哪一样就来问我。

## 选择技能

每个技能都自成一体、单独安装。推荐配套技能只是可选补充，不是依赖。

| 采用者需求 | 技能 | 来源 |
|---|---|---|
| **通用协作——从这里开始** | `dsh-spec-agent-experience`、`dsh-spec-agents-md`、`dsh-spec-agent-notes`、`dsh-spec-prose-standard`、`dsh-spec-translate-docs` | DeepSeek Harness；`dsh-spec-agents-md` 在本包锻造 |
| **软件变更与质量** | `dsh-spec-find-simplifications`、`dsh-spec-code-review`、`dsh-spec-pre-push-checks`、`dsh-spec-error-handling`、`dsh-spec-test-reliability` | DeepSeek Harness |
| **变更说明与落地** | `dsh-spec-pr-description`、`dsh-spec-merging-stacked-prs` | DeepSeek Harness |
| **浏览器 UI 证据** | `dsh-spec-client-ui-ux`、`dsh-spec-browser-gif-evidence` | DeepSeek Harness |
| **Agent 技能制作** | `dsh-spec-skill-forge` | 在本包锻造 |

增加专项组之前，先读[选择 dsh-spec 技能](docs/choosing-skills.zh.md)。分组细节、推荐配套技能说明、常用组合与能力要求由该指南维护。

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
| `docs/` | 面向采用方的双语安装与技能选择指南 |
| `scripts/` | 不对外发布的仓库工具：DCO、语料门禁、随包依赖通知、bundle 构建/校验与刷新 |
| `tests/` | 仓库工具与已发布脚本契约的功能套件 |
| `.agents/skills/` | agent 加载的安装副本：由 `gh skill install` 或 `pnpm run skill:refresh` 写入，在那里的手改会丢 |
| `.agents/dsh-spec-agent-notes/` | 决策记录 |
| `.agents/dsh-spec-agents-md/` | 根 `AGENTS.md` 链接的、面向 agent 的细节 |
| `.agents/dsh-spec-translate-docs/` | 成对文档共享的术语表 |
| `.github/` | issue 模板、CI 工作流与 Dependabot 配置 |
| `submodules/dsh/` | pin 住的抽取基线：可以读，不要改 |

本仓库用来格式化、测试和检查一次改动的命令，见 [AGENTS.md](AGENTS.md#commands)。

## 接下来读

- [AGENTS.md](AGENTS.md) —— 每次会话都要遵守的规则，以及本仓库运行的那些命令。
- [选择 dsh-spec 技能](docs/choosing-skills.zh.md) —— 分组职责、推荐配套技能、常用组合与能力要求。
- [`skills/dsh-spec-skill-forge/SKILL.md`](skills/dsh-spec-skill-forge/SKILL.md) —— 编写技能的入口。
- [`dsh-spec-agent-notes` 技能](skills/dsh-spec-agent-notes/SKILL.md) —— 决策记录的约定与生命周期。

## 许可证

本项目以 MIT License 发布。全文与版权行见 [LICENSE](LICENSE)；上游通知、改编文件以及随包携带的 npm 包见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

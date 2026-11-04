# Agent Note: 从上游 dsh-pre-push-checks 技能锻造 dsh-spec-pre-push-checks

Status: implemented

[English](2026-10-28-forging-dsh-spec-pre-push-checks.md) | 中文

## 问题

本包发布 forge、decision-record、agent-experience、prose-standard 与 find-simplifications 五个技能；它们都没有携带 DeepSeek Harness 团队所遵循的推送前检查选择纪律，于是即将 push 的 agent 要么什么都不运行，要么条件反射地运行整个仓库套件。上游技能 `dsh-pre-push-checks` 专门为 deepseek-harness 仓库陈述该纪律——它的 `pnpm run change-scope` 报告、它的 Git hook、它的 stacked-PR 工具与它的 profile/snapshot 布局——而本包的交付物是面向一般软件工程的一组技能。`dsh-spec-pre-push-checks` 为那个领域适配它：与上游技能相同的选择与执行机制，其中 deepseek-harness 专属的指涉或被适配、或被重绑到等价手段、或在不存在等价物处被消解。

## 决策

本包发布 `dsh-spec-pre-push-checks`，作为位于 `submodules/dsh/.agents/skills/dsh-pre-push-checks/SKILL.md` 的上游技能的 create-mode 适配版本（`submodules/dsh` 固定在 `dsh-v0.2.2-alpha.2`，`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`）。它保留上游机制：确认 checkout 与分支；在检查范围之前验证 base；产出一份完整的出站范围报告；选择其回归会使本次改动失败的最窄证据；不重复 hook 或 CI 已经裁决的内容；仅在点名的情形下完整排练；保护改写历史的 push；在自动改写并发布之后立即验证；对特定环境的失败做证明，而不是重新解释它们。措辞是仓库中立的：采用者自己的命令、hook、工作流与布局约定从其声明中发现；上游点名 deepseek-harness 的文件、profile、snapshot 树或兄弟技能之处，本技能泛化该规则，或把它留给那些约定。

落地目录包含 `SKILL.md`、`scripts/change-scope.mjs` 与 `THIRD_PARTY_NOTICES`，并镜像到 `.agents/skills/dsh-spec-pre-push-checks/`；脚本的源码与构建接线留在 `package/dsh-spec-pre-push-checks/`，其测试在 `tests/change-scope.test.ts`，套件的清单行在 `tests/AGENTS.md`。被取代的上游同名安装副本 `.agents/skills/dsh-pre-push-checks/` 被移除；根 `AGENTS.md` 的技能列表与根 `THIRD_PARTY_NOTICES.md` 中的适配技能枚举点名该技能。历史发布说明保留其文字。

- 交付与语言：英文交付，描述追加中文触发词汇；本记录为英文并带其中文 `.zh.md` 对侧与 `.i18n.yaml` 一致性记录。

### 意图与边界

| 设置 | 值 |
|---|---|
| 名称 | `dsh-spec-pre-push-checks`；落地于 `skills/dsh-spec-pre-push-checks/` |
| 目标 | 在 push、force-push、标记 ready-for-review 或声称检查通过之前——以及自动工具改写并发布分支之后立即——选择并运行覆盖出站或刚发布 diff 的最小测试与检查集合，而不是条件反射地运行整个仓库套件 |
| 边界 | 不是 CI 的替代（CI 拥有穷尽覆盖与平台矩阵），不是 hook 的替代（仓库的 hook 运行自己的检查），不是默认运行完整本地排练的指令（那仍是点名的例外），也不是削弱失败选择的方式——降低阈值、排除受影响的文件或压制无测试运行都在本技能之外（上游 L74） |
| 交付物 | 落地技能目录 `skills/dsh-spec-pre-push-checks/`（`SKILL.md`、`scripts/change-scope.mjs`、`THIRD_PARTY_NOTICES`）及其安装副本；脚本的源码与构建接线在 `package/dsh-spec-pre-push-checks/`（`change-scope.ts`、`build.ts`、`vite.config.ts`、`package.json`）；其测试在 `tests/change-scope.test.ts`，套件的清单行在 `tests/AGENTS.md`；本记录及其中文对侧 |
| 受众与领域 | 在保持 Git 历史、通过分支与评审平台交付改动的软件工程仓库中工作的 agent |
| 额外的触发语言 | 中文：采用者的评审语言是中文，所以描述在英文交付文字之后追加中文触发词汇 |
| 运行时与工具 | 每套流程都需要 Git；随附报告还需要 Node.js 22.19+ 或 24+，且不使用网络；采用者无需安装、无需构建步骤 |
| 审查草稿 | 仓库把其双语伴随文件声明为 `.zh.md` 与 `.i18n.yaml`（`CONTRIBUTING.md` 的「Bilingual documents」）；本记录自带其中文对侧 |

### 来源约束

上游文件是来源；下面每个单元都是一条要求、禁令、条件或固定选择，连同它的位置。单元 U17-U18 陈述一种工作方式，其后跟着具体指令，因此各自是一个单元，而不是一组彼此独立的具体规则。有一项实现事实来自本仓库而非上游文字：U4 要求的报告是仓库已有的上游 change-scope 脚本移植（`package/dsh-spec-pre-push-checks/change-scope.ts`），其文件头点名上游路径与关系。

| 单元 | 位置 | 约束 |
|---|---|---|
| U1 | L1-4 | 描述在 push、force-push、标记 ready for review 或声称检查通过之前触发技能，并在 `gh stack sync` 发布被改写分支之后立即触发；它承诺覆盖出站或刚发布 diff 的最小测试与检查，而不条件反射地运行整个仓库套件 |
| U2 | L8 | 在 push 之前运行一次相关的本地证据；唯一的顺序例外是 `gh stack sync` 在本地验证之前发布；Git hook 有意保持狭窄（pre-commit 修好暂存的 lint、检查暂存空白、守卫 vendored-source 元数据；pre-push 只运行增量 typecheck）；CI 拥有穷尽覆盖与平台矩阵 |
| U3 | L10-18 | 检查出站改动：用 `git status --short --branch` 与 `git rev-parse --show-toplevel` 确认 checkout 与分支 |
| U4 | L19-25 | 验证活动 PR base 或 stack parent，fetch 该 ref，并对照它检查完整范围；change-scope 命令从不猜测或 fetch 一个 base；提供从当前 remote 或 stack 状态验证过的 ref；`--head` 检查另一个 commit；其带版本的 JSON 记录相对于已解析 merge base 的已提交路径，而暂存、未暂存与未跟踪路径描述 worktree；在变更后的 base 被合并之后，重跑报告、重新评估受影响行为，并只重跑被失效的检查 |
| U5 | L29 | 除 hook 之外没有通用的本地基线；每个行为改动都需要一个在其回归时会失败的最窄可用测试或专门构造的检查；只为 diff 实际到达的表面添加更广泛的检查 |
| U6 | L31 | 当出站改动新增或修改拥有资源或异步的测试、fixture、helper 或 CI 执行路径时，先使用 CI 测试可靠性技能，取得恢复、负对照、静默拆卸（quiescent teardown）或并发进程证据；本技能仍选择命令，且不重复已经通过的证据 |
| U7 | L33 | 包或脚本行为：运行所属测试文件或聚焦测试名；共享契约变化时添加相邻包测试；把仓库级覆盖留给 CI，除非改动确实是横切的或被要求 |
| U8 | L34 | Remote mock 类型：未构建的 `any` 是显式的本地回退，不是严格证据；在交接 Remote/mock 改动之前运行 typecheck；在诊断之前重建缺失、过期或不完整生成的声明；把例外保留在 test proxy 中 |
| U9 | L35 | 文档、Agent Notes、目录或文档链注释：运行 `doc-sync`；当文档工作流要求时运行完整 lint |
| U10 | L36 | model、编辑器、CLI 或终端可见的输出：运行拥有该输出的聚焦 keyless snapshot 或真实可运行示例场景 |
| U11 | L37 | 预期输出位置：录制的 Session 的预期输出属于顶层 `snapshots/`，带点名的 profile 与 pins；其他预期留在其所属测试旁的 `tests/expected/` 下；使用所属测试 lane |
| U12 | L38 | profile 与配置位置：跨包 profile 行为在 `apps/cli/tests/profiles/` 下，包 Loader 组合在包的 `tests/fixtures/` 下，面向用户的 overlay 在 `apps/cli/config/examples/` 下，并在 `docs/user/` 下带一份指南 |
| U13 | L39 | 包清单、公开导出、构建配置、worker/bin 条目或构建后的运行时路径：运行 `pnpm run build`、相关 hygiene 检查与所属构建产物的 smoke |
| U14 | L40 | 仓库测试与脚本类型：`build:artifacts` 只检查包项目；在声称 TypeScript 改动完成之前，在最新的 `build:artifacts` 之后运行 `build:check`，或运行 `build`；`build:check` 读取已有输出，从不重建它 |
| U15 | L41 | 真实 provider 或 agent 行为：在有凭据时运行相关的 `pnpm run test:e2e` 目标；绝不打印 secrets |
| U16 | L43 | 不要仅仅因为随后 commit 或 push 就手动重复一个已通过的检查；尤其不要仅仅为了重复 pre-push hook 而在 push 前立刻运行 typecheck |
| U17 | L45-51 | 把 Vitest 文件与名称过滤器直接放在 `pnpm run` 脚本名之后，不使用独立的 `--`；该规则适用于所列 pnpm 脚本，其他 launcher 保留自己的转发语法；在把一次过滤运行当作聚焦证据之前，检查报告出的选中测试数 |
| U18 | L53-74 | 测试选择与覆盖选择是分开的；当单元覆盖相关时，同时点名所属测试与覆盖必须证明的源文件或包，使用 runner 的 coverage-include 机制；配置的逐文件阈值在选中范围内适用；所属测试不明确时，使用 runner 的依赖/关联发现并先检查选择；无法发现行为的参数（配置、动态加载、子进程、worker、构建产物、外部 provider）被显式选择；绝不使用无测试抑制、降低阈值或收窄 include 来隐藏未覆盖的受影响文件；若选中范围失败，添加其所属测试，或仅当被排除的模块不可能受影响时才收窄源范围 |
| U19 | L76-78 | 仅当用户明确要求、诊断 CI 失败、或改动横跨仓库到没有可信的更窄集合时，才运行完整的本地近似；以当前工作流与包脚本为清单；不要重建被移除的聚合命令 |
| U20 | L80-84 | 独立分支与 stacked 分支允许 rebase，包括评审之后；在独立分支改写历史之前，fetch 当前远程分支并记录其精确 OID，然后用 `--force-with-lease=<branch>:<observed-oid>` 发布，以便并发更新中止；`gh stack push` 与 `gh stack sync` 为受管分支提供 lease 保护；原始 `--force` 绝不允许；任何改写后的 push 之后，fetch 活动 heads 并重新审计未解决的 review thread、approval、mergeability 与检查；改写前的 hash 与 inline-comment 锚点不是当前证据 |
| U21 | L86-95 | `gh stack sync` 把 fetch、级联 rebase 与 push 作为一个操作执行，所以本地验证无法位于改写与发布之间；在它之前，要求干净的 worktree 并记录官方 stack 顺序与精确的远程 heads；在它之后，重新查询每个分支 head 与 stack 顺序，对照每个层的活动 PR base 检查该层的范围，对每个受影响层运行选中的证据，保持每个 PR 未合并并报告验证待定，直到所有选中检查通过；失败时保留 lease 保护下的 heads，修复、验证并发布修正；命令成功不是 stack 就绪的证据 |
| U22 | L97-106 | 普通 push 之前出现相关失败时，停下并修复或解释阻塞；不要 push 然后指望 CI 不同；对 post-sync 例外，阻止合并并遵循修复流程；通过记录精确命令、失败测试与平台不匹配来证明特定环境的失败，确认相关的非平台证据，优先跨平台修复，仅在用户明确要求或同意时才绕过本地 hook，同时报告什么失败了以及为什么预期 CI 不同 |
| U23 | L108-137 | push 流程：运行选中的检查一次；正常 commit 并检查 pre-commit fixer 改动的文件；正常 push 或带精确的 lease push；验证远程 ref 与本地 `HEAD` 匹配；push 后检查远程 CI，并把 pending 报告为 pending；当没有报告检查且该 head 没有运行记录时，先读 mergeability 再怀疑 push，因为冲突的 PR 不产生工作流运行——解决冲突，而不是添加空 commit、toggle 或 revert-and-restore 历史，并用 `git merge-tree --write-tree HEAD origin/<base>` 确认冲突路径；对 `gh stack sync` 使用 post-sync 验证序列，而非普通顺序 |

### 处置

每个单元一行，一个处置标签。「依据」列陈述决定该行的目标领域事实、技能的目的、上游文字或裁定；消解则点名接管的检查。

| 单元 | 处置 | 目标 | 依据 |
|---|---|---|---|
| U1 | 适配 | `description`：保留 push、force-push、ready-for-review 与 checks-passed 触发；"a branch" 取代 "a deepseek-harness branch"；"immediately after an automated rewrite-and-publish" 取代 `gh stack sync`；追加中文触发词汇 | 触发面是技能的全部激活负担；采用者的评审语言是中文 |
| U2 | 适配 | 引言段：证据只运行一次；唯一的顺序例外是自动改写并发布；hook 是仓库自己的，不进入选中的证据；CI 拥有穷尽覆盖与平台矩阵 | hook 清单与 typecheck 后果是 deepseek-harness 事实；它们的意图（不重复 hook 或 CI）才是承载的约束 |
| U3 | 保留 | "Inspect the outgoing change" 第 1 步：确认 checkout 与分支；两条 Git 命令照写保留 | 命令与名词是领域中立的；本单元没有 deepseek-harness 专属的上游指涉 |
| U4 | 重绑 | "Inspect the outgoing change" 第 2 步与随附报告：base 是改动被评审所对照的那个（PR base，或 stack 的父分支），被 fetch 并显式提供；报告是技能自己的 `scripts/change-scope.mjs`，带承载的契约与重跑规则 | 软件工程采用者可能不提供 change-scope 命令；报告就是机制，所以技能携带其等价手段 |
| U5 | 适配 | "Select relevant evidence" 开篇：除仓库自己的 hook 之外没有通用的本地基线；最窄的会失败测试/检查；更广泛的检查只针对被到达的表面 | 规则是通用的；"the hooks" 是采用者自己的基线在 deepseek-harness 中的实例 |
| U6 | 重绑 | 一条选择条目，其条件与角色保持完整：当改动新增或修改拥有资源或异步的测试、fixture、helper 或 CI 执行路径时，判断恢复、负对照、静默拆卸或并发进程证据是否适用；本技能仍选择命令，且不重复已经通过的证据 | 所指技能属于另一个项目；证据种类与选择角色是等价手段 |
| U7 | 适配 | 选择条目 "Tested behavior"：所属测试文件或聚焦测试名；共享契约变化时添加相邻测试；仓库级覆盖交给 CI，除非横切或被要求 | 所属测试规则是领域中立的；runner 名变为采用者的 |
| U8 | 适配 | 选择条目 "Type checking and generated types"：有类型的改动在交接之前运行仓库的 typecheck；未构建或过期的生成声明不是严格证据——在诊断剩余错误之前重建缺失、过期或不完整的生成声明；把本地类型例外留在测试支持中，绝不留到生产类型或 ambient flag 中 | Remote/mock proxy 是 deepseek-harness 专属的；交接前运行的动作与回退约束以目标领域形式存活 |
| U9 | 适配 | 选择条目 "Documentation"：运行仓库的文档检查；当其文档工作流要求时运行完整 lint | `doc-sync` 是 deepseek-harness 中用于同一目的的命令 |
| U10 | 适配 | 选择条目 "Observable output"：拥有该输出的聚焦 snapshot 或真实可运行示例场景，不带 harness 的 keyless 词汇 | 检查种类是领域中立的；"keyless" 是 deepseek-harness snapshot runner 的属性 |
| U11 | 消解 | 采用者的约定拥有预期输出位置；所属测试 lane 的命令是接管的检查 | 目标没有固定的 snapshot 树或 session 格式；固定路径规则会是发明的机制 |
| U12 | 消解 | 采用者的约定拥有 profile 与配置位置；所属配置/profile 测试或文档检查接管 | 理由同 U11 |
| U13 | 适配 | 选择条目 "Build and packaging"：运行 build、仓库的打包/hygiene 检查与所属构建产物的 smoke | 类别保留；命令变为采用者的 |
| U14 | 适配 | 选择条目 "Type checking and generated types"：在声称一个类型或构建输入已移动的改动完成之前，在产生输出的 build 之后运行消费当前 build 输出的检查；过期输出不是证据 | `build:artifacts`/`build:check` 的拆分是 deepseek-harness 的实现方式；顺序与「声称完成之前」的条件才是约束 |
| U15 | 适配 | 选择条目 "External behavior"：在有凭据或环境可用时运行所属端到端目标；绝不打印 secrets | 一旦 "provider or agent" 变为外部行为，即领域中立 |
| U16 | 适配 | "Select relevant evidence" 的收尾段：不要因为随后 commit 或 push 就重复已通过的检查；尤其不要仅仅为了重复 hook 而重跑 typecheck | 规则是通用的；点名的 hook 与 typecheck 是上游仓库的实例 |
| U17 | 适配 | 收尾段：按 launcher 转发过滤器的方式传过滤器，保留 pnpm 形式作为示例；在把过滤运行当作证据之前检查选中的测试数 | 转发规则是通用的；pnpm/Vitest 是常见实现，仅作示例 |
| U18 | 适配 | "### Focus unit coverage on the affected source"：选择与覆盖分开；通过 runner 的 coverage-include 机制点名所属测试与源范围；阈值仍在范围内适用；所属不明确时使用依赖/关联发现；显式选择无法被发现的行为；绝不抑制无测试、降低阈值或收窄 include 以隐藏未覆盖的受影响文件；仅当被排除的模块不可能受影响时才添加所属测试或收窄 | 机制保留；具体 flag 是 runner 的 |
| U19 | 适配 | "Full local rehearsal"：三个点名情形存活；清单是当前工作流与包脚本；不要重建被移除的聚合命令 | `check:pre-push` 是 deepseek-harness 的聚合命令；其缺失以泛化方式陈述 |
| U20 | 适配 | "Protect history-rewriting pushes"：允许 rebase；fetch 并记录 OID；`--force-with-lease=<branch>:<observed-oid>`；stack 或自动化工具必须提供等价 lease 保护；原始 `--force` 绝不允许；任何改写后，重新 fetch 并重新审计 thread、approval、mergeability 与检查；改写前的 hash 与锚点不是证据 | lease 机制是通用的；工具名变为示例 |
| U21 | 重绑 | "### Validate after an automated rewrite and publish"：工具可能把 fetch、rebase 与发布作为一个操作执行，`gh stack sync` 作为示例被点名；前后序列与修复路径被承载 | 机制（验证无法位于改写与发布之间）对任何工具代为发布的采用者都真实；deepseek-harness 工具是实例而非机制 |
| U22 | 适配 | "Handle failures"：停下并修复或解释；不要 push 然后指望；自动发布失败后阻止合并并修复；用精确命令、失败测试与平台不匹配证明特定环境的失败，确认非平台证据，优先跨平台修复，仅在用户要求或同意时绕过 hook，并报告什么失败了 | 领域中立；只有 hook 与 CI 名词被泛化 |
| U23 | 适配 | "Push procedure"：检查运行一次；commit，检查 fixer 改动，带 lease push，验证远程 ref；检查远程 CI 并把 pending 报告为 pending；没有报告检查时，先读 mergeability 再怀疑 push，解决冲突而不是添加空历史，并用 `git merge-tree` 确认路径；自动发布例外使用自己的序列；GitHub 命令留在显式的 "when the review platform is GitHub" 示例中，而 provider 中立的规则独立存在 | GitHub 实现是示例；约束是 provider 中立的 |

覆盖：每个单元恰好一行、一个归宿。U11 与 U12 是两处消解；各自点名接管者。没有一行重复或与另一行冲突，也没有单元带有该行自相矛盾的标签。

### 随附的 change-scope 报告

报告是技能的机械一半。其源码是 `package/dsh-spec-pre-push-checks/change-scope.ts`，像其他技能包那样接线（`build.ts` 运行 `vp pack`，`vite.config.ts` 点名入口与落地目录的 `scripts/` 输出，`package.json` 是私有包标记）；`node scripts/build-skills.ts dsh-spec-pre-push-checks` 把它打包到 `skills/dsh-spec-pre-push-checks/scripts/change-scope.mjs`，即技能运行的已提交产物。

- 用法：`node <skill-dir>/scripts/change-scope.mjs --base <ref> [--head <ref>]`；它在项目的 Git checkout 内运行，并向 stdout 打印一份 JSON 报告。
- 输出：`formatVersion`（1）、`repositoryRoot`、`input`（`base`、`head`）、`resolved`（`baseSha`、`headSha`、`mergeBaseSha`）与 `paths`（`committed`、`staged`、`unstaged`、`untracked`），每个路径列表都排序并去重；已提交路径相对于已解析的 merge base。
- 行为：它从不 fetch，从不猜测 base；无法解析的 ref、有歧义的 ref、没有 merge base 的 base 与 head、以及位于 Git worktree 之外的目录，各自在 stderr 上以一条消息失败；报告退出 0，失败退出 1，用法错误（缺少或未知选项）退出 2；`--help` 打印用法并退出 0。
- 实现基础与适配：报告渲染从仓库已有的上游脚本逐字移植承载而来；CLI 表面被适配，因为 `using-scripts` 页面要求有文档的 `--help` 与有文档且彼此不同的退出码。该移植的文件头记录其取自的上游 commit（`ddefc45fbc7f8e46dd73185e68295696d1297887`）；固定基线 `dsh-v0.2.2-alpha.2`（`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`）携带相同的文件内容，所以来源文件头与 notices 同时点名这两个事实。报告字段未变；两份副本只在命令行接口上不同，且该适配有测试。
- 归属：归属在加载文字之外陈述。frontmatter 的 `license` 字段点名技能根的 `THIRD_PARTY_NOTICES`，其中携带上游与本仓库的 MIT notices、适配技能文字的上游路径与固定基线，以及 `change-scope` 的起源（移植的 taken-at commit，以及固定基线上相同的内容）。包源码文件头也陈述来源；bundle 的注释保留不参与。
- 测试：`tests/change-scope.test.ts` 定位已落地的 bundle，存在工作草稿时优先使用它，正如套件定位 forge 的 bundle（`tests/skill-spec.test.ts` 以该方式解析门禁）。

### 裁定

- **U11 与 U12 是消解，不是重绑。** 固定的预期输出或 profile 位置在未指定的软件工程仓库中没有等价手段：发明一棵树会是一个新机制。采用者的约定与所属测试 lane 的命令接管。
- **U6 重绑到证据种类，而不是兄弟技能。** 本包不发布可靠性技能，点名一个会把采用者指向它没有的技能；证据种类才是可移植的内容。
- **U21 是重绑而非消解。** 自动改写并发布工具对软件工程采用者是真实机制，顺序例外是锻造必须保留的上游执行机制的一部分；工具名变为示例。
- **报告随技能打包，而不是从采用者那里调用。** 本包的架构打包技能所需的脚本；遗留引擎的副本不是交付物，仅为已安装技能保留。
- **报告的渲染从遗留引擎逐字上游移植承载；其 CLI 表面被适配。** 该移植就是仓库已携带的同一 MIT 许可上游文件，所以已证明的报告契约与其来源被保留；`--help` 与退出码适配遵循脚本接口指导，并被陈述与测试。
- **归属在加载文字之外传递。** 基线的约定让技能根的 `THIRD_PARTY_NOTICES` 成为载体、frontmatter 的 `license` 字段成为其指针，因为文字内的文件头或注释会被当作指令加载；本技能对适配技能文字与移植报告都遵循该约定，且不依赖任何 bundler 注释行为。
- **`<skill-dir>` 是包含 `SKILL.md` 的目录，不是本包的安装路径。** 命令需要一种方式点名随附报告，但硬编码 `.agents/skills/dsh-spec-pre-push-checks` 会让一个通用技能假设某个客户端的安装布局；占位符定义时不带路径，好让每个采用者在自己的树中解析它。
- **记录使用仓库自己的遗留实现作为实现基础，而非设计来源。** 上游技能陈述要求，该移植携带其字段契约，没有其他来源为记录提供信息。
- **审查草稿是声明的，不是可选的。** 仓库的双语约定声明两个后缀；中文技能草稿及其配对记录在停止时是最新的，本记录的中文对侧在落地时写入。
- **落地遵循维护者授权。** 发布到 `skills/`，镜像到 `.agents/skills/`，移除被取代的安装副本，更新根文档，移动并配对本记录，并压合合并分支；不 push。
- **被取代内容在落地时移除。** 上游同名的安装副本移除；历史发布说明与遗留安装副本的文字保持原样。
- **记录的中文对侧在落地时写入。** 落地遵循本包的双语实践。

### 每项要求的锚点

| 要求 | 锚点 | 证据 |
|---|---|---|
| U1 描述触发 | 判定 | 独立评审接受描述措辞；触发率未验证 |
| U2 引言：证据一次、一个顺序例外、hook/CI 归属 | 判定 | 独立评审，机制走查 U1-U23 |
| U3 检查第 1 步 | 判定 | 独立评审 |
| U4 已验证 base 与报告契约 | 机械 | `node --test tests/change-scope.test.ts`（10 pass）；`--help`/0、报告/0、失败/1、用法/2 的探针 |
| U5 最窄证据 | 判定 | 独立评审 |
| U6 异步/拥有资源的证据条目 | 判定 | 独立评审 |
| U7 tested behavior 条目 | 判定 | 独立评审 |
| U8 typecheck 与生成类型 | 判定 | 独立评审 |
| U9 文档条目 | 判定 | 独立评审 |
| U10 可观察输出条目 | 判定 | 独立评审 |
| U11 与 U12 消解的放置规则 | 判定 | 独立评审确认没有承载固定输出树或 profile 路径 |
| U13 构建与打包条目 | 判定 | 独立评审 |
| U14 声称完成之前的当前构建输出 | 判定 | 独立评审 |
| U15 外部行为条目 | 判定 | 独立评审 |
| U16 不重复检查、不重复 hook | 判定 | 独立评审 |
| U17 过滤器转发与选中数量 | 判定 | 独立评审 |
| U18 覆盖聚焦 | 判定 | 独立评审 |
| U19 完整本地排练 | 判定 | 独立评审 |
| U20 改写历史的保护 | 判定 | 独立评审 |
| U21 自动改写与发布验证 | 判定 | 独立评审 |
| U22 失败处理 | 判定 | 独立评审 |
| U23 push 流程 | 判定 | 独立评审 |
| Agent Skills 规范与预算 | 机械 | `14 check(s), 0 failed`；108 行，约 2983 tokens |
| 归属随技能传递 | 机械 | 落地的 `license` 字段点名 `THIRD_PARTY_NOTICES`；该文件携带上游与本仓库的 notices，以及适配文字与移植的起源 |
| 仓库套件与格式 | 机械 | `pnpm test` 216/216；`pnpm run format:check` 干净 |
| 审查草稿在落地时移除 | 机械 | `publish` 报告声明的草稿被移除；仅属草稿的切换行在落地 `SKILL.md` 中不存在 |
| 记录已配对 | 机械 | `translation-pair check` 报告 1 named pair consistent |
| 触发质量 | 未验证 | 本仓库没有触发评估 harness；人工评审判断描述 |

## 备选方案

**几乎原样承载上游技能，只改仓库名。** 它落败因为 deepseek-harness 的命令、hook 清单、profile/snapshot 位置、兄弟技能引用与 stacked-PR 工具都是软件工程采用者没有的指涉；把它们留着会让技能指示会失败的命令，这与本包的目的相反。

**消解每个在本仓库中不存在的机制。** 它落败因为检查选择机制正是技能的目的：丢掉 change-scope 报告、受 lease 保护的改写或自动发布验证，会在上游技能有可执行流程处留下泛泛的建议。处置表保留机制，只适配其值或名称。

**依赖采用者自己的 change-scope 命令，不写脚本。** 它落败因为新技能集按技能自包含，而当前承载该报告的遗留引擎只在旧安装技能调用它期间保留；只安装本技能的采用者否则没有报告命令。等价手段随技能打包，所以仅凭 Git 与 Node 该流程即可执行。

**范围检查保留纯文字的 Git 命令，不打包报告。** 它落败因为 U4 的报告是选择其余部分读取的固定、带版本结构，两个执行者各写自己的 `git diff` 管道不会到达同一组路径（merge-base 解析、暂存/未暂存/未跟踪分离、路径编码）。技能随附的命令是机械锚点；判断留在文字里。

**原样发布移植报告，不带 `--help` 且只有单一失败退出。** 它落败因为 `using-scripts` 页面把有文档的 `--help` 与有文档、彼此不同的退出码当作 agent 可用脚本的一部分；逐字副本还会让技能声明的接口成为假的。适配限于 CLI 包装层，记录在源码文件头与 notices 中，并有测试；报告渲染保持不动。

**落地时不移除被取代的安装副本。** 它落败因为上游同名的副本会留在其替代者旁边继续安装，manifest 仍会宣传它，两个描述会竞争；维护者的落地顺序移除它及其 manifest 条目。

**让记录只有英文。** 它落败因为本仓库每个已落地的锻造记录都带中文对侧，笔记约定允许伴随文件；落地遵循该实践。

## 后果

- **过渡性重复。** 报告只存在于落地技能中，由本仓库拥有并携带 notices；遗留引擎及其副本已随管理器一并移除。
- **报告与上游移植在命令行接口上不同。** CLI 适配（`--help`、退出码）与遗留副本分叉，而报告渲染不分叉。分叉很小，记录在源码文件头与 notices 中，并有测试覆盖；未来的读者不应假设两份副本可以互换。
- **通用的选择条目可能读起来像清单。** 上游的具体表面让技能有用；泛化它们可能产生 agent 已经知道的建议。消解行把采用者约定留给采用者，而不是发明路径；评审只在 agent 没有技能就可能弄错时保留一条。
- **报告没有在 Windows 上得到证明。** 实现处理 CRLF 与 NUL 分隔的路径字节，并拒绝非 UTF-8 的 Git 输出，但测试只在 Linux 上运行；Windows 路径或编码缺陷会首先在采用者处暴露。
- **同时安装上游 `dsh-pre-push-checks` 的采用者会看到两个相似的描述。** 通用描述以相同的时机与自动发布触发开头；哪个技能被激活是 harness 的选择。本仓库移除了上游同名的安装副本，所以它自己的成本已经消失。
- **技能的放弃之处。** 它不陈述像上游那样详细的 stack 验证序列，没有仓库专属的路径规则，也对平台 CI 行为不给出超出其点名的 GitHub 示例的保证。那些就是刻意的消解与适配；需要它们的采用者保留自己的文档。
- **落地移除内容。** 上游同名的安装副本消失；依赖它们的项目改有新技能随附的报告。历史发布说明是仅剩的、把旧技能当作已发布来呈现的文字。
- **记录的对侧增加维护。** 笔记门禁结构性地检查对侧，配对门禁检查其 hash，所以任一侧的编辑都必须在同一改动中镜像并重新记录。

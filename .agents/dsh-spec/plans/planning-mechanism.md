# 计划：交付规划机制与工作流技能改写

## Summary

把"计划 + 工作副本"落成交付机制：新增 `.agents/dsh-spec/plans/` 树、它的契约、以及根 `AGENTS.md` 里的一段**钩子**——三样都像 notes 一样由集合机械维护。触发与规则都在计划面里（钩子宣告、契约承载），`dsh-agent-team-workflow` 因此**只做按 Agent Skills 规范的重整**，职责与语义不变。

## Background

- 今天计划只活在会话里：跨会话即失，交付的拓扑与卡片编排没有家；`notes/proposed/` 承载"想做但未细化"的提案，"现在想做"的交付没有对应载体。
- `dsh-agent-team-workflow` 的 §1 把"读技能"等同于"组队"，单 agent 交付读不到任何规划指引；Lead 的职责也没说清"不参与实现"。
- Agent Skills 规范给出技能文本的整理方向：`SKILL.md` 小于 500 行、引用按需加载并写明加载时机、procedure over declarations、defaults not menus、checklist、gotchas。
- 计划树是 `dsh-agent-team-workflow` 的工作面，而该技能之后会被改为可选（见 `optional-skills.md`）。本次先把树与钩子无条件落下，可选化时再条件化——中间的仓库状态仍然自洽。

## Objective

1. `.agents/dsh-spec/plans/README.md` 是本计划的契约（字段、状态由工作副本有无读出、依赖写法、生效条件、开工与收口），它与 `README.zh.md`、sidecar 组成双语对；`.agents/dsh-spec/plans/AGENTS.md` 是子树的短 orders 并指向契约——两件都照 notes 的形式（双语契约 + 单语 orders）。
2. 根 `AGENTS.md` 带一段**机械维护的钩子**（`<!-- dsh-spec:plans -->`），形制照 `notesSection()`：一个 `## Delivery plans` 标题 + 触发规则一句 + 指向 `plans/README.md`。子树两件与钩子都由初始器创建与同步，项目在标记之外的内容不受影响。
3. `skills/dsh-spec-manager/` 的落装面：`templates/plans-README.md.template` + `templates/plans-README.zh.md.template`（走 `counterpartTemplate`，与 notes README 同法）、`templates/plans-AGENTS.md.template`、`managedFiles()` 两条（`merge: 'replace'`）、钩子生成器与 `section` 合并的泛化、`references/manager-install.md` 的"采用会创建什么"表、测试。
4. `skills/dsh-agent-team-workflow/SKILL.md` **只按 Agent Skills 规范重整**：`SKILL.md` 小于 500 行、引用一层深并写明加载时机、procedure over declarations、defaults not menus、`description` 按规范的"做什么 + 何时用"重写。职责、语义与规则一律不变——规划不归它管了。
5. `skills/dsh-agent-team-workflow/references/task-card.md` 的 Context and scope 增加 `References` 字段（A-2 里唯一的新增）。
6. 若 `description` 的措辞按规范调整，`README.md` 与 `README.zh.md` 的该技能行随之同步，`README.i18n.yaml` 重录；职责表述不变。
7. 决策 note：`.agents/dsh-spec/notes/proposed/process/<yyyy-mm-dd>-a-delivery-records-a-plan-and-a-working-copy.{md,zh.md,i18n.yaml}`，随本交付转 `implemented/`。
8. 门禁与测试全绿（见各卡验收）。

## Constraints

- 不新增规范、不新建技能；**本次不加计划格式门禁**：计划少且临时，契约由 `plans/README.md` 承担，等真出现畸形计划再加。若将来加，用最省形状 `keys: ["markdown"]` + `selection: "files"`，内部只筛 `.agents/dsh-spec/plans/**`——不新增 scope key、不改 `check --all` 的语义、不会在零份计划时误报。
- 计划文件与 `plans/AGENTS.md` 不建对侧；`plans/README.md` 是双语对（`.zh.md` + sidecar），与 `notes/README.md` 同制。
- 不改 `submodules/dsh/`；不手改 `.agents/skills/`（只经刷新命令更新）。
- 本仓库 `AGENTS.md` 只由钩子与文档表承接；不加兜底规则。
- 技能不新增行为规则：触发与规则归计划面（钩子 + 契约），技能只是被任务触发、读取契约的团队工作流。
- 计划与工作副本在合并准备期删除，两个文件都不进 main。
- `source` 提案、可选技能改造、manager 包整顿各自独立（四份记录互不包含）。
- 依赖：无。本交付不需要等任何其他交付。

## References

| 来源 | 用途 |
|---|---|
| [Agent Skills Specification](https://agentskills.io/specification.md)、[Best practices](https://agentskills.io/skill-creation/best-practices.md) | 技能文本整理的规范依据 |
| [Agent Skills Overview](https://agentskills.io/home.md) | 三阶段加载（Discovery / Activation / Execution）的表述 |
| `.agents/dsh-spec/notes/README.md` | 提案与决策的格式、生命周期、双语三件套；同时是本机制"钩子 + 子树契约"的先例 |
| `.agents/dsh-spec/plans/README.md`（契约）与 `plans/AGENTS.md`（orders） | 本交付要发布的两份文本本身 |
| `skills/dsh-spec-manager/scripts/init-agents-md.ts` | `notesSection()`（生成钩子，:171-182）、`mergeManaged()` 的 `section` 分支把标记写死（:368-374）、`managedFiles()`（:302-318） |
| [The pull-request lifecycle](../notes/implemented/process/2026-09-21-the-pull-request-lifecycle.md) | 五阶段、Conventional Commits、PR 四节、squash 合并、规则先落地 |

## Design

### 机制（已定稿，写入契约）

1. 规划在用户当前所在的会话里进行，不做任何规划专用设置。
2. 计划随讨论写；需要跨会话或跨设备存活时**提交**它——它自己的一个小变更；若开工在即，它直接是交付分支的第一个提交。
3. 状态由工作副本的有无读出：无 `<slug>-progress.md` = 未开始，有 = 进行中，合并准备期两者一起删 = 完成。
4. 依赖是计划 `## Constraints` 里的一行前置命令，判据是 main 上的事实，不绑 note、不读别处状态；被阻塞的交付静止等待，不轮询。
5. 开工 = 用户的信号：建交付 worktree（仓库根之外）→ 按当时的 main 重读计划 → 跑前置命令 → 建工作副本与卡片。
6. 合并准备期收口：删计划与工作副本、把谈定的决策落进 notes、仍未决的当场交用户决定。

以上各条由 `.agents/dsh-spec/plans/README.md` 拥有；技能不复述它们。

### 计划树与钩子（机械维护，照 notes 的先例）

| 面 | 现状 | 本次 |
|---|---|---|
| 子树契约 | `notes/README.md`（带对侧）由模板落装、`replace` 合并 | 新增 `templates/plans-README.md.template` → `.agents/dsh-spec/plans/README.md` + `README.zh.md`（`counterpartTemplate`，含 sidecar），同样 `replace` |
| 子树 orders | `notes/AGENTS.md`：一句定义 + 指向 README 的 orders | 新增 `templates/plans-AGENTS.md.template` → `.agents/dsh-spec/plans/AGENTS.md`，同样 `replace` |
| 根钩子 | `notesSection()` 生成一段带标记的文本（`<!-- dsh-spec:agent-notes -->`），`mergeManaged()` 的 `section` 分支就地替换 | 新增 `plansSection()`（`<!-- dsh-spec:plans -->`）并让它进入同一个合并路径 |
| 合并机制 | **标记写死**在 `mergeManaged()` 的 `section` 分支（`init-agents-md.ts:368-374`），只认 notes 那一对 | 泛化成"钩子清单"（每项：标记对 + 生成函数），逐段替换、缺段追加——这是本交付唯一真正的引擎结构改动 |

钩子文本形制照 `notesSection()`：一个 `## Delivery plans` 标题 + 触发规则一句 + 指向 `plans/README.md` 的链接。子树两件与钩子都归集合所有，项目在标记之外的内容不受影响。

### 技能：只按标准重整

依赖方向与 notes 一致：**钩子宣告触发、树契约承载规则、技能读取契约**。`dsh-archive-agent-notes` 已是这个形状——它的 `description` 触发于"归档"，正文写 "Read the contracts" 并指向树里的契约文件，还注明 "Creating a tree is the initializer's job"。计划面照此办理：

| 谁 | 承担什么 |
|---|---|
| 根 `AGENTS.md` 的计划钩子 | 触发：多步交付先在这里写计划；指向契约 |
| `.agents/dsh-spec/plans/README.md`（契约）与 `plans/AGENTS.md`（orders） | 规则：字段、状态、依赖、生效、开工与收口；触发与删除规则在 orders 里 |
| 初始器 | 建树、落契约、注入钩子 |
| `dsh-agent-team-workflow` | 被任务触发、读取契约的团队工作流——本次仅按规范重整 |

重整范围（语义不变）：`description` 按"做什么 + 何时用"重写；`SKILL.md` 压到 500 行内；引用一层深并写明加载时机（`references/task-card.md` 何时读）；procedure over declarations；defaults not menus。**明确不改**：§1 激活规则、§5 worktree、§6 并行判据、§7 任务卡、§9 门禁与角色分工——它们讲的是团队执行，与规划无关。

本仓专属的 worktree/submodule 配方留在根 `AGENTS.md` 的环境说明里（已经在那儿），技能不带它。

## Team

Lead（本计划、建卡、验收、最终门禁、PR）；Worker（文本与引擎各一，按卡分配）；Reviewer（黑箱重跑）；Texter（双语 note 与 README 行、文风与因果顺序）。

## Topology

```
A-1 计划契约文本 ──┬─▶ A-2 技能按规范重整 ─────────────────┐
                   └─▶ A-3 落装：模板/受管文件/钩子/合并泛化/文档/测试 ─┴─▶ A-4 评审 ─▶ A-5 文本终检 ─▶ A-6 刷新副本+全量门禁+PR
```

- A-2 与 A-3 写域不相交（技能文本与 README 对 vs 引擎、模板、安装文档、测试、根 AGENTS.md 文档表），互不依赖，且都不需要对方的推理产出——三条件成立，可并行。
- 两者都等 A-1：契约文本是它们共同引用的唯一事实来源。

## Planned cards

| 卡 | 目标 | 写域 | 依赖 | 验收命令（退出 0） |
|---|---|---|---|---|
| A-1 | 子树两件：`plans/README.md`（契约，带中文对侧与 sidecar）与 `plans/AGENTS.md`（orders），与对应三个模板同文 | `.agents/dsh-spec/plans/`、`skills/dsh-spec-manager/templates/` | — | 模板与树内文本逐字一致；`translation-pair check .agents/dsh-spec/plans/README.md` 通过；契约含字段、状态、依赖、生效、开工与收口 |
| A-2 | 技能按 Agent Skills 规范重整（语义不变）+ task-card `References`（唯一新增）+ README 行同步 | `skills/dsh-agent-team-workflow/**`、`README.md`、`README.zh.md`、`README.i18n.yaml` | A-1 | `node scripts/verify-skill-structure.ts --root skills/dsh-agent-team-workflow`；`translation-pair check README.md` |
| A-3 | 落装：`managedFiles()` 加子树两条（README 走 `counterpartTemplate`）、`plansSection()` 钩子、`section` 合并泛化、`manager-install.md`、测试、根 AGENTS.md 文档表一行 | `skills/dsh-spec-manager/scripts/init-agents-md.ts`、`templates/`、`references/manager-install.md`、`tests/**`、`AGENTS.md` | A-1 | `node --test 'tests/**/*.test.ts'`；采用创建两件与钩子、刷新只同步、幂等 |
| A-4 | 决策 note 三件套：proposed，随本交付转 implemented | `.agents/dsh-spec/notes/**` | A-1 | `notes check <note>`；`translation-pair check <note>` |
| A-5 | 黑箱评审 A-1..A-4：逐条核 Objective，原样重跑各卡命令 | 只读 | A-1..A-4 | 各卡命令原样重跑 + `git diff` 与 Objective 逐条对应 |
| A-6 | 文本终检、刷新副本、全量门禁、PR | `.agents/skills/**`（由命令写） | A-5 | `verify-installed-copy`、`verify-port-provenance`、`node --test`、`check --all`、`md-links`（全量） |

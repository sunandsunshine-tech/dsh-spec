# 工作副本：交付规划机制与工作流技能改写

本文件是 `planning-mechanism.md` 的工作副本，按契约记录这次交付**实际**发生的顺序、失败的尝试、变更过的判据及其原因，并以这次交付得出的结论收尾。

## 起点

- 分支 `feat/plans-surface`，PR [#65](https://github.com/sunandsunshine-tech/dsh-spec/pull/65)（draft，base `main`）。开工时 sha：`97d3ed0`（计划的契约与 orders 已随两次提交落在本分支）。
- 交付 worktree：`/home/dreamstar/ideaProjects/dsh-spec-wt/B`（仓库根之外）；子模块按根 `AGENTS.md` 的链式 worktree 配方挂在 `<worktree>/submodules/dsh`。
- 起点基线：`node --test 'tests/**/*.test.ts'` 在挂好子模块 worktree 后 145 pass / 0 fail。

## 偏离与判据变更

1. **门的读法（本条适用 C、D；B 无依赖）**。计划 `## Constraints` 与 `plans/README.md` 说前置命令"读的是 main 上的一个事实"。本次按用户指令改为 **stack 的读法**：每层的门在**它自己的 worktree** 里跑，worktree 已坐在父层之上，父层完成后该门即通过；不轮询，失败即报阻塞并停。B 的 `## Constraints` 写明"依赖：无"，因此 B 无门可跑。
2. **`Planned cards` 与 `Topology` 图不一致**。Topology 图把 `A-4` 标成评审、`A-5` 文本终检、`A-6` 收尾；`Planned cards` 表把 `A-4` 定为决策 note、`A-5` 定为黑箱评审。按更细的卡片表执行（A-4 = note，A-5 = 评审，A-6 = 文本终检），拓扑图视为该表的摘要。
3. **Objective 7 的 note 路径笔误**。Objective 写作 `.agents/dsh-spec/plans/proposed/process/…`，而活动树是 `.agents/dsh-spec/notes/`；按卡片 A-4 的写域 `.agents/dsh-spec/notes/**` 执行。
4. **note 生命周期**。计划写"随本交付转 `implemented/`"；用户指令把合并准备期的收口（计划删除、note 转 implemented）留到其授权之后，因此本层只创建 `proposed/` 三件套，不转状态。
5. **收尾范围**。计划的 A-6 含"计划与工作副本收口"；本次只做到"可审查"：刷新安装副本、全量门禁、PR 去 WIP 转 ready、四节描述，计划与工作副本按用户指令保留。

## 实际顺序

（按发生顺序追加。）

1. 建 worktree（根之外），挂子模块 worktree，跑起点基线测试（145 pass / 0 fail）。
2. 创建本工作副本，按卡片表建卡 task-1..task-7，spawn worker-1 / worker-2 / reviewer-1 / texter-1。
3. A-1 完成（三模板与树内文本逐字一致，Lead 复核 sha 一致）；A-2 / A-3 / A-4 解锁。
4. A-2 完成（`description` 按规范重写 + §7 写明加载时机 + task-card `References` + README 对重录）；A-4 完成（note 三件套，留 `proposed/`）。
5. A-3 实施中：泛化 `mergeManaged` 的钩子清单、新增 `plansSection()`、managedFiles 两条、创建半程两件、inventory 一节、manager-install / manager-lifecycle / manager.ts 的枚举面、根 AGENTS.md 文档表一行、6 个新用例。
6. A-3 完成（150/150，唯一红＝安装副本门禁，待刷新）。Lead 提交 `0f3db33`，`gh stack sync` 推 B 并把 C、D 级联 rebase 到新 B；`upgrade --revision feat/plans-surface --root .` 刷新安装副本并注入 plans 钩子，提交 `6e9c819` 再推；此后 `node --test 'tests/**/*.test.ts'` 151/151，`verify-installed-copy`、`verify-port-provenance`、`check --all` 全绿。
7. A-5 黑箱评审（reviewer-1）：**REJECT**，两条阻断——B1 提交版 `6e9c819` 的文件扫描红（工作副本把 P1 草稿里的链接当成了自己的相对链接），B2 note 的验收判据仍写"采用建三件"（P3 之前的旧措辞）。Lead 提交 B1 修复 `63e4075`；worker-2 修 B2（两侧改两件 + 重录 sidecar）。待复审。
8. A-5 第二轮：reviewer-1 **PASS**（`43d0078`；B1/B2 复验通过，提交线性无 merge，Objective 1–8 全过）。
9. A-6 文本终检（texter-1）：15 条修正，全部文本；其中 F13 是真遗漏——`help.ts` 的 uninstall 说明与它生成的 `cli.md` 仍在列举旧的 left-in-place 集合，delivery 自己的 P5 只修了 `manager.ts` 与两句 prose。模板与树内文本、help 与 cli.md 的一致性由 Lead 复核通过。
10. A-6 复审（reviewer-1，独立复核文本终检之后的 `2000bc76`）：**PASS**。151/151、副本 10/10、出处 16/16、`check --all`、全 corpus md-links 152 文件、52 对配对、`check --base main` 全绿；三个模板与树内文本逐字一致、`--help en --markdown` 与 authored/installed 的 `cli.md` 逐字一致；`43d0078..HEAD` 的正文改动只有 9 个文本文件（+55/−55），两个 `.ts` 只改了字符串常量与一条注释，`tests/` 零改动。
11. A-7 收尾（Lead）：提交工作副本结论 `1e8924a`，`gh stack sync` 推 B（并把 C、D 级联 rebase 到新 B），PR [#65](https://github.com/sunandsunshine-tech/dsh-spec/pull/65) 去掉标题 `WIP: ` 前缀、由 draft 转 ready、四节描述重写。合并准备期的收口按用户指令留待授权。
12. **复核后、合并准备期之前：维护者改定了钩子的注入顺序**（见下节）。这不是计划里的"缺段追加"，而是维护者对评审后状态的一次裁定；计划文件未改。

## 复核后的维护者裁定：钩子注入顺序（2026-10-10）

**背景**：`## Delivery plans` 钩子原先按"缺段追加在文件末尾"注入，于是本仓库的顺序是 notes → norms → plans，而根 `AGENTS.md:73` 的常驻指令说"通用规范住在**文件末尾**的 `dsh-spec:norms` 钩子里"——那句话因此不再字面为真。计划 Constraints 限定根 `AGENTS.md` 只由钩子与文档表承接，所以当时把该句记成未决项，没有改它。

**维护者裁定**：改注入顺序，让集合自己的块相邻（plans 落在 notes 上或下），norms 自然留在最后，那句话就重新为真；不要去改常驻指令。

**实现**（本层唯一引擎改动的延续，`init-agents-md.ts` 的 `mergeSections`）：不再"就地替换 + 缺段追加到末尾"，改为**先把已存在的集合块整段取出、再按 `sectionHooks()` 的顺序在"最早那个已存在块的位置"重新放入**。标记之外的文本字节不变、相对顺序不变；集合的块因此总是相邻且顺序确定，另一个所有者（norms 钩子）随后追加/就位的内容留在它们下方。文件里一个块都没有时，仍在末尾按顺序放入全部。

**效果与证据**：本仓库 `AGENTS.md` 变成 notes(131-138) → plans(140-145) → norms(147-167)，`AGENTS.md:73` 复为字面为真；`init-agents-md.ts --sync` 二次运行 0 变化（幂等）；`tests/management.test.ts` 新增一条用例钉住该规则（集合块相邻、其后的块留在下方、notes 块字节不变），并把函数体换回"追加到末尾"验证该用例会变红（可证伪）；全量 152 条中 151 通过，唯一红＝安装副本门禁（本次改了 `init-agents-md.ts` 与 `manager-install.md`，待刷新）。`references/manager-install.md:31` 补一句说明块会被归拢到集合列出的顺序。

## A-6 文本终检结果

texter-1 在 `43d0078` 上做了纯文本的 15 条修正（9 个文件，+55/−55）：新 note 中文侧的全角标点与新标点风格（`translation-rules` 的 MUST）、note 中文的四条直译/生硬、`plans/README.zh.md` 的一条强调跨侧不一致与七条自然度/情态/保真问题（同步到它的模板）、以及 F13/F14/F15 三条陈旧或含混的落装面文字：

- **F13（真遗漏）**：`skills/dsh-spec-manager/scripts/help.ts` 的 uninstall 说明（en+zh）与它生成的 `references/cli.md` 仍写"`AGENTS.md` 的标记块、笔记树、`docs/` 与 `.rgignore`"，漏了计划树与第二对标记。与 P5 同属"封闭集合增员"的义务，A-3 漏在了这两个面。修正后 `cli.md` 由 `--help en --markdown` 重生成，`tests/help.test.ts` 的漂移守卫绿。
- F14：`manager.ts:801` 注释补 "plans"；F15：`manager-install.md:48` 的 "removed one" 改为 "removed either"。

刻意保留并上报：根 `README.zh.md` 全文件沿用半角标点（本次未引入，单独改动才有意义）；计划与工作副本里的计划代号（A-1…A-6、P1–P6、B1/B2、§N）属工作副本体裁，且合并准备期删除；全仓破折号间距不统一；`manager-install.md:33` 的既有语法缺陷（本交付未触及）。

`AGENTS.md:73`"norms 钩子在本文件末尾"的那句，texter-1 与我判断一致：一句删掉"at the end of"即可；因计划 Constraints 限定根 `AGENTS.md` 只由钩子与文档表承接，仍留给用户定夺。

## A-5 评审结果与处置

reviewer-1 在 `6e9c819` 上原样重跑各卡验收，结论 REJECT，两条阻断：

- **B1 提交版文件扫描**。工作副本第 39 行把 `plansSection()` 草稿里的 `[the contract](.agents/dsh-spec/plans/README.md)` 解析成本文件的相对链接，指向不存在的目标；Lead 在工作树的修复当时未提交，故"提交版"仍红。处置：Lead 提交 `63e4075`（草稿链接改代码形）。
- **B2 note 验收判据与已交付行为矛盾**。note 两侧写"采用路径建出三个文件"，而 P3 之后采用只落两件（`plans/README.md`、`plans/AGENTS.md`，不建 zh、不建 sidecar）。处置：重新打开 A-4，由原作者 worker-2 改两侧判据并重录 sidecar。

评审同时确认通过的：A-1 三条逐字 `diff`、A-2 全部（`SKILL.md` 对 main 只差 `description` 与 §7 一句）、A-3 的 151/151 与 10/10 副本、六条新用例、以及 reviewer 自建 `/tmp` 黑盒（采用两件+两钩子、sync 幂等、段外按字节保留、删树不重建、旧项目升级只补钩子、空文件幂等）、A-4 三条命令、`check --all`、`verify-port-provenance`、`check --base main`、全 corpus md-links（152 文件）、`translation-pair list`（52 ok / 0 out-of-sync / 0 missing）。

评审登记的非阻断项：`AGENTS.md:73` 的"norms 钩子在文件末尾"不再字面为真（本文件偏离 #7，Lead park）；note 仍留 `proposed/`；计划卡片表与拓扑图编号不一致；`tests/management.test.ts:508` 的既有用例调整把项目行移到标记紧前才落入 diff 上下文，真正的段外字节保留由 `:628` 覆盖（建议，不阻断）。

### 顺序偏差：刷新副本提到评审之前

计划把"刷新安装副本"放在 A-6（文本终检之后），但 `node --test 'tests/**/*.test.ts'` 里的 `tests/installed-copy.test.ts` 会因 `skills/` 与 `.agents/skills/` 不一致而红，评审就没有绿的 suite 可跑。处理：A-3 收口后由 Lead 先提交 + `gh stack sync` 推分支 + `upgrade --revision feat/plans-surface` 刷新副本，再交 A-5；文本终检若再改 `skills/` 文本，A-7 再刷新一次并重跑全量门禁。`upgrade` 幂等。

## Park 与裁决

A-3 实施时 worker-1 park 了五项（P1–P5），另有 A-4 一条卡片命令越界（P6）；按下述处理，并由 Lead 记入 PR 的 `## Reviewer notes`：

1. **P1 `plansSection()` 措辞**。计划 Design 已定形制（`## Delivery plans` 标题 + 触发规则一句 + 指向 `plans/README.md` 的链接），未定字面。采用 worker-1 草稿；字面属撰写，最终请用户复核。草稿原文如下，其中的链接以代码形引出，免得本文档自己把它解析成相对链接：
   `<!-- dsh-spec:plans -->` / `## Delivery plans` / "A delivery that spans more than one step records its plan in `.agents/dsh-spec/plans/` before it starts; a single-step or mechanical change does not. Read ``[the contract](.agents/dsh-spec/plans/README.md)`` for the plan's fields, the state read from its working copy, its dependency line, and the start-and-finish rules." / `<!-- /dsh-spec:plans -->`
   **维护者裁定（复核之后）**：措辞"更贴 `notesSection()` 的形状"——两段式，第一段是规则（带指向契约的链接），第二段是"读契约拿到什么"+"规则怎么被约束"。改成：
   `<!-- dsh-spec:plans -->` / `## Delivery plans` / "A delivery that spans more than one step records its plan in `.agents/dsh-spec/plans/` before it starts; a single-step or mechanical change does not. A plan is a working document rather than a decision record: what was decided, and why, lives in the notes tree, and the plan cites it (``[the contract](.agents/dsh-spec/plans/README.md)``)." / "Read `.agents/dsh-spec/plans/README.md` for the fields a plan carries, the state read from its working copy, the dependency line, and the start-and-finish rules. Nothing gates these files: the contract is the rule, and a delivery's first step reads it before it derives a goal, a team or a card." / `<!-- /dsh-spec:plans -->`
   第一段那句"计划是工作文档而非决策记录"与第二段"Nothing gates these files"都出自契约自己的措辞（`plans/README.md` 第 5 行与 §Gates），不是新规则；形制对齐 notes（规则段 + 读法段）。
2. **P2 采用报告的 inventory 形制**。计划只说"形制照 `notesSection()`"，未定报告。取与 notes 同形的单列一节，代价是报告多 3-4 行。
3. **P3 采用创建几件 / sidecar**。worker-1 实测：只建三件会让新项目的 `translation-pair check .agents/dsh-spec/plans/README.md` 因缺 sidecar 直接 FAIL。按计划 Objective 2「子树**两件**与钩子都由初始器创建与同步」与 Objective 3「与 `notes` README **同法**」，判定采用只创建 `plans/README.md` 与 `plans/AGENTS.md`；`plans-README.zh.md.template` 随包发布但采用不落盘，与 notes 采用只落英文契约完全同形；A-1 已定的"sidecar 不落装"不动。**这是对卡片初稿（我写的"创建三件"）的更正**，理由与计划字面一致。
4. **P4 钩子是否随树存在而注入**。计划 Background 明说"本次先把树与钩子无条件落下"，照此：B 里钩子无条件注入；条件化归 C（`optional-skills.md`）。
5. **P5 落装面的枚举面漏了计划树**。worker-1 实测：`manager.ts:802` 的 uninstall "left in place" 硬编码数组、`:20`/`:583` 的注释、`manager-lifecycle.md:69` 的同义 prose 都只列 notes/docs/rgignore。**按团队工作流 §8.2「一个封闭集合增减了成员——每一处陈述其规模或列举其成员的地方都在同一改动里移动」判定这是 A-3 欠的面，授权 worker-1 一并改**（只点名，不改 uninstall 行为；行为改动归 C-4）。理由记入 PR 的 `## Reviewer notes`。
6. **A-4 卡片验收命令 3 越界**。命令写"上面三个文件"，但 `md-links` 按设计拒绝非 Markdown 路径（"a path this check does not read is a mistake rather than a skip"），sidecar 无链接可查。改为对两个 Markdown 成员跑；不为了让字面命令变绿去改门禁。
7. **根 `AGENTS.md` 里"norms 钩子在本文件末尾"这句不再字面为真**（Lead 记下，未改）。钩子按"缺段追加"落在末尾，而 `AGENTS.md:73` 的常驻指令说通用规范住在文件末尾的 `dsh-spec:norms` 钩子里；刷新后顺序是 notes → norms → plans。计划的 Constraints 写明"本仓库 `AGENTS.md` 只由钩子与文档表承接；不加兜底规则"，所以不额外改那句，留给用户定夺（合并准备期或后续交付）。

## 结论

这次交付在 `2000bc76` 上达到**可评审**状态，全部卡片（A-1…A-6）完成，评审两轮通过（A-5 一轮 REJECT 后修复，A-6 复审一轮 PASS）。

落地的：计划面契约与 orders（树内文本 + 三个落装模板，逐字一致）、根 `AGENTS.md` 的机械维护钩子、`mergeManaged` 的钩子清单泛化、`managedFiles()` 两条、采用时创建两件并注入钩子、落装面各处枚举（`manager-install.md`、`manager-lifecycle.md`、`manager.ts`、`help.ts` 与它生成的 `cli.md`）的同步、`dsh-agent-team-workflow` 的规范重整（语义不变）、一条 `proposed/` 决策 note。

真实门禁输出（`2000bc76`）：`node --test 'tests/**/*.test.ts'` 151/151；`verify-installed-copy` 10 skill(s) equal；`verify-port-provenance` 16 ported file(s) @ 639ed015；`verify-skill-structure`（manager 51 资源 / workflow 1 资源）；`check --all`（47 notes + 9 archived）；全 corpus in-scope `md-links` 152 文件；corpus-wide `translation-pair` 52 对；`check --base main`。

**留给合并准备期（需用户授权）**：删除本计划与工作副本；把决策 note 从 `proposed/` 转 `implemented/`；PR 四节描述里的未决项见下。

**未决、已上报用户**：(1) `plansSection()` 钩子措辞由团队起草、计划只定形制；(2) 根 `AGENTS.md` 里"norms 钩子在本文件末尾"不再字面为真，而计划 Constraints 限定该文件只由钩子与文档表承接；(3) 依赖门按 stack 的读法在本层 worktree 里跑，与计划"main 上的事实"的措辞不同。

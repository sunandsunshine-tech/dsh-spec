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
7. 待办：A-5 评审 → A-6 文本终检 → A-7 全量门禁 + PR 转 ready。

### 顺序偏差：刷新副本提到评审之前

计划把"刷新安装副本"放在 A-6（文本终检之后），但 `node --test 'tests/**/*.test.ts'` 里的 `tests/installed-copy.test.ts` 会因 `skills/` 与 `.agents/skills/` 不一致而红，评审就没有绿的 suite 可跑。处理：A-3 收口后由 Lead 先提交 + `gh stack sync` 推分支 + `upgrade --revision feat/plans-surface` 刷新副本，再交 A-5；文本终检若再改 `skills/` 文本，A-7 再刷新一次并重跑全量门禁。`upgrade` 幂等。

## Park 与裁决

A-3 实施时 worker-1 park 了五项（P1–P5），另有 A-4 一条卡片命令越界（P6）；按下述处理，并由 Lead 记入 PR 的 `## Reviewer notes`：

1. **P1 `plansSection()` 措辞**。计划 Design 已定形制（`## Delivery plans` 标题 + 触发规则一句 + 指向 `plans/README.md` 的链接），未定字面。采用 worker-1 草稿；字面属撰写，最终请用户复核。草稿原文如下，其中的链接以代码形引出，免得本文档自己把它解析成相对链接：
   `<!-- dsh-spec:plans -->` / `## Delivery plans` / "A delivery that spans more than one step records its plan in `.agents/dsh-spec/plans/` before it starts; a single-step or mechanical change does not. Read ``[the contract](.agents/dsh-spec/plans/README.md)`` for the plan's fields, the state read from its working copy, its dependency line, and the start-and-finish rules." / `<!-- /dsh-spec:plans -->`
2. **P2 采用报告的 inventory 形制**。计划只说"形制照 `notesSection()`"，未定报告。取与 notes 同形的单列一节，代价是报告多 3-4 行。
3. **P3 采用创建几件 / sidecar**。worker-1 实测：只建三件会让新项目的 `translation-pair check .agents/dsh-spec/plans/README.md` 因缺 sidecar 直接 FAIL。按计划 Objective 2「子树**两件**与钩子都由初始器创建与同步」与 Objective 3「与 `notes` README **同法**」，判定采用只创建 `plans/README.md` 与 `plans/AGENTS.md`；`plans-README.zh.md.template` 随包发布但采用不落盘，与 notes 采用只落英文契约完全同形；A-1 已定的"sidecar 不落装"不动。**这是对卡片初稿（我写的"创建三件"）的更正**，理由与计划字面一致。
4. **P4 钩子是否随树存在而注入**。计划 Background 明说"本次先把树与钩子无条件落下"，照此：B 里钩子无条件注入；条件化归 C（`optional-skills.md`）。
5. **P5 落装面的枚举面漏了计划树**。worker-1 实测：`manager.ts:802` 的 uninstall "left in place" 硬编码数组、`:20`/`:583` 的注释、`manager-lifecycle.md:69` 的同义 prose 都只列 notes/docs/rgignore。**按团队工作流 §8.2「一个封闭集合增减了成员——每一处陈述其规模或列举其成员的地方都在同一改动里移动」判定这是 A-3 欠的面，授权 worker-1 一并改**（只点名，不改 uninstall 行为；行为改动归 C-4）。理由记入 PR 的 `## Reviewer notes`。
6. **A-4 卡片验收命令 3 越界**。命令写"上面三个文件"，但 `md-links` 按设计拒绝非 Markdown 路径（"a path this check does not read is a mistake rather than a skip"），sidecar 无链接可查。改为对两个 Markdown 成员跑；不为了让字面命令变绿去改门禁。
7. **根 `AGENTS.md` 里"norms 钩子在本文件末尾"这句不再字面为真**（Lead 记下，未改）。钩子按"缺段追加"落在末尾，而 `AGENTS.md:73` 的常驻指令说通用规范住在文件末尾的 `dsh-spec:norms` 钩子里；刷新后顺序是 notes → norms → plans。计划的 Constraints 写明"本仓库 `AGENTS.md` 只由钩子与文档表承接；不加兜底规则"，所以不额外改那句，留给用户定夺（合并准备期或后续交付）。

## 结论

（待交付收尾时填写。）

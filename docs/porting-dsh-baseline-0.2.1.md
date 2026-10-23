# dsh 基线 0.2.1 技能与 Agent Notes 移植说明

> 基线：`dsh-v0.2.1-rc.2`（`687f282e86`），2026-10-22 已升级并提交 `0e9760581580637afd8fc4f7b0d6a1ee9fe4fa34`。
> 读者：本仓库维护者。用途：作为下一轮技能锻造的决策输入。本文是分析报告，不是决策记录；结论要落地时另行按仓库约定写 Agent Note。
> 证据：每条判断都可在文末附录的命令与上游路径上复核；上游按只读处理，未改动。完整工作档案见 [附录索引](porting-appendix/README.md)。

## 0. 结论速览

### 0.1 基线升级（已完成）

| 项 | 旧 | 新 |
|---|---|---|
| 基线 tag | `dsh-v0.2.0-rc.2` | `dsh-v0.2.1-rc.2`（即 `origin/master` 当前 HEAD） |
| commit | `639ed015…` | `687f282e…` |

子模块 gitlink 与 `THIRD_PARTY_NOTICES.md` 的 pin 行同步；提交 `0e9760581580637afd8fc4f7b0d6a1ee9fe4fa34`。验证：`pnpm test` 82/82 通过，`pnpm run format:check` 通过，`node scripts/verify-dco.ts --base=aed89b6 --head=0e9760581580637afd8fc4f7b0d6a1ee9fe4fa34` 通过。0.2.1 相对 0.2.0：技能层 4 个新增、9 个技能（11 个文件）小改、6 个未变；notes 层契约冻结、内容大批归档；根 `AGENTS.md` 27 行变化全为 dsh 产品规则，没有触及本包规范目录的六组。

### 0.2 技能：19 个的处置（详见 §4、§5）

| 档 | 上游技能 | 处置 | 推荐领域 |
|---|---|---|---|
| **P0 本轮锻造（5 个上游 → 3 个技能）** | `dsh-prose-standard` + `dsh-trim-cot-leakage`；`dsh-pre-push-checks` + `dsh-code-review`；`dsh-archive-agent-notes` | 合并锻造 | 散文纪律；变更流程；决策记录 |
| **P1 下一轮（5 个上游 → 3 个技能 + 2 处小改）** | `dsh-translate-docs`；`dsh-ci-test-reliability`；`dsh-create-upgrade-guide`；`dsh-error-handling`；`agent-experience` | 独立锻造 ×3；error-handling 入 norms；agent-experience 并入 forge | 文档与双语；验证与测试；发布与升级；错误处理；技能与工具设计 |
| **P2 候补（4 个）** | `dsh-find-simplifications`、`dsh-speed-up-perf`、`dsh-merging-stacked-prs`、`record-browser-gif` | 独立锻造，按需 | 简化提议；性能；变更流程（合入）；素材录制 |
| **不移植（5 个）** | `dsh-doc`、`dsh-client-ui-ux`、`dsh-responsive-ui`、`dsh-official-plugin-artwork`、`cordis-styling-nitpicking` | `dsh-doc` 只抽事实核查程序；其余不携带（`cordis` 可作评审参考的可选素材） | — |

### 0.3 合并判断（详见 §6）

- **强合并**：`prose-standard ← trim-cot-leakage`（同对象、同判据、trim 自称以 prose 为背景）；`notes 生命周期 ← archive-agent-notes`（与包内 notes 契约合并成一个出资方）；`translate-docs ← dsh-doc 的双语面`（doc 不移植后的归并，不是上游技能间的合并）。
- **中强合并**：`变更流程 ← pre-push-checks + code-review`（同一对象"一次变更"、同一锚点"采用方的门禁/规范/决策记录"；合则一个技能两个阶段，分则必须写死互斥边界）。
- **并入而不成技能**：`error-handling` → norms 的 `failure` 组；`agent-experience` → forge 的上下文经济参考；`cordis` → 变更流程的"所有权/释放"评审参考（约 25–35 行，泛化后）。
- **保持独立**：`find-simplifications`、`ci-test-reliability`、`speed-up-perf`、`record-browser-gif`、`merging-stacked-prs`——对象与产物各不相同，合并会让触发互吞、锚点互借。

### 0.4 Agent Notes：不移植内容，只移植契约与规范内核（详见 §7）

上游 335 条 active、8 条 rejected、924 条已归档（全量 1267 个三元组，72.9% 已归档）；0.2.1 一次归档 282 条、删除 32 条，契约本身几乎冻结。81.8% 的 active notes 是 dsh 产品决策，不能随包维护；可移植的是约 30 条"如何做决定/如何验证/如何写"的元知识。建议：

- **不搬任何 note 正文**；只做 8 处 notes 契约修正（见 §7.3）、6–7 条新 norms（§7.5）、1 条决策记录 + 一张 pin 绑定的 provenance 表（§7.6）。
- 唯一值得评估的新技能领域是"持久化数据格式兼容性评审"；先以 norm 承载，观察一个发布周期再决定是否锻造。

### 0.5 三套目标技能集（详见 §6.3）

| 方案 | 落地技能 | 覆盖上游技能 | 一次性成本（粗估） | 适用 |
|---|---|---|---|---|
| **A 按域重建（推荐）** | 4 个：notes 生命周期、散文纪律、变更流程、文档与双语（+已有 forge） | 6 | 12–20 人日（含阶段 0） | 包主旨"一次变更要携带什么"最紧凑的形态 |
| B 逐技能重建 | 8 个：沿用 v0.4.0 集并更新到 0.2.1 | 8 | 18–26 人日 | 触发最准、但维护面最大 |
| C 扩展 | A + `ci-test-reliability` + `create-upgrade-guide` + `find-simplifications` = 7 个 | 9 | 20–30 人日 | 补齐"验证可靠性/发布"域 |

## 1. 范围、方法与判定口径

### 1.1 范围

| 对象 | 数量 | 覆盖方式 |
|---|---|---|
| 上游技能 | 19 个（39 个文件，约 78K token 文本） | 逐个读 `SKILL.md` 与全部 `references/`、`templates/`、`scripts/` |
| 上游 Agent Notes | 1267 个三元组 / 3809 个文件 | 全量按生命周期、类别、语言组统计；335 条 active 全量进主题清单，再按主题精读 |
| notes 契约与文档标准 | `README.md`、三个子树 `AGENTS.md`、`archived/manifest.json`、`docs/AGENTS.md` | 全文读取，并与本包提取版逐条 diff |
| 根 `AGENTS.md` | 0.2.0→0.2.1，27 行 | 逐条判断是否属于本包 norms 的素材 |
| 技能版本差 | 15 个文件（4 新 + 11 改） | 逐技能记录，判断重新锻造时是否跟进 |

### 1.2 判定口径

每个技能按同一套字段分析：作用与触发、结构与规模、核心对象与产物、判定标准来源、dsh 绑定清单（adapt／re-bind／dissolve）、通用内核、三锚点检验、移植建议（领域／程度／合并／优先级）。

**领域**：决策记录、散文纪律、变更流程、验证与测试、文档与双语、简化提议、设计与错误处理、发布与升级、产品专项。

**程度**：A 原样移植（只换名称/路径/命令等值）；B 重绑定为通用技能（对象/产物/判据按采用方重新锚定，实质改写）；C 抽取并入（并入其他技能或包规范）；D 不移植（产品专属，或移植后不过三锚）。

**三锚点**（本仓库已定，见 `.agents/dsh-spec/notes/implemented/process/2026-10-22-the-forge-marks-the-abstraction-ceiling.md`）：对象闭合（实例由技能之外的规范界定）、产物闭合（固定字段、可检查形状）、判据锚定（机械或直接有证据，不只是自身断言）。三锚在这里不是准入门槛，而是**移植深度的判据**：锚越少，重绑后越容易退化成散文，程度越应偏向 C/D。

**优先级**：P0 本轮；P1 下一轮或随 P0 顺带完成；P2 候补；不移植。

### 1.3 限制

- 技能未在真实采用方环境安装运行：触发质量、冷启动、代表性任务效用只有文本判断，没有安装验证。
- 工作量是文本改写量的粗估（英文 0.3 token/字符、中文 0.6 token/汉字），不含评审往返与决策记录成本。
- 合并方案是结构判断，只有真正锻造一次才能验证收敛；§9 的待决问题就是这个验证之前的取舍点。
- 本文不替维护者判断"值不值得扩大包的技能面"；它给出每个技能的证据、成本与风险。

## 2. 基线升级（已完成）

| 项 | 旧 | 新 |
|---|---|---|
| 基线 tag | `dsh-v0.2.0-rc.2` | `dsh-v0.2.1-rc.2` |
| commit | `639ed015397290b3745d163aafe02ffee4aa3f84` | `687f282e8625c6b8d11ff58211a90524be2e4317` |
| 是否最新 | 否 | 是：该 tag 即 `origin/master` 当前 HEAD（`git ls-remote --tags/heads` 核对） |

做法：`git -C submodules/dsh checkout dsh-v0.2.1-rc.2`；父仓库记录 gitlink；`THIRD_PARTY_NOTICES.md` 的 pin 行同步到新 tag 与 sha；提交 `0e9760581580637afd8fc4f7b0d6a1ee9fe4fa34 chore(baseline): 跟进上游基线到 dsh-v0.2.1-rc.2`（带 `Signed-off-by`）。验证：`pnpm test` → 82 tests, 82 pass, 0 fail；`pnpm run format:check` → 通过；DCO 检查通过。未改动 `.gitmodules` 的 URL；当前分支 CI 没有基线门禁，本分支也没有 `scripts/ports.json`，因此只有两处 pin 需要同步。

### 2.1 0.2.0→0.2.1 带来了什么

整体 8431 个文件、+320407/−84704 行，绝大部分是产品代码。

| 层 | 变化 |
|---|---|
| 新增技能 4 个 | `cordis-styling-nitpicking`、`dsh-error-handling`、`dsh-official-plugin-artwork`、`dsh-responsive-ui` |
| 修改技能 9 个（11 个文件，+237/−29 行） | `dsh-ci-test-reliability`、`dsh-client-ui-ux`、`dsh-code-review`、`dsh-doc`（模板）、`dsh-find-simplifications`（含 references）、`dsh-pre-push-checks`、`dsh-speed-up-perf`、`dsh-trim-cot-leakage`（含 references）、`record-browser-gif`；多为改指向、补交叉引用、补新规则 |
| 未变技能 6 个 | `agent-experience`、`dsh-archive-agent-notes`、`dsh-create-upgrade-guide`、`dsh-merging-stacked-prs`、`dsh-prose-standard`、`dsh-translate-docs` |
| notes 契约 | `README.md` 2 行、`docs/AGENTS.md` 13 行；其余冻结 |
| notes 内容 | 282 条 implemented 整批归档、32 条删除、171 条改写；归档 manifest 旧哈希 0 变化、新增 849 条（append-only 被真实执行） |
| 根 `AGENTS.md` | 27 行：`build:artifacts`／`build:check`、错误处理技能入口、官方插件图标入口、typed events 语义、defensive-patterns 目录指针等，全部是 dsh 产品规则，六组 norms 没有新增冲突条目 |

对移植的含义：0.2.1 是一次"契约冻结 + 内容归档 + 少量技能演进"的发布；对抽取最友好的是散文、归档、双语三个领域（零变化），漂移最大的是 `dsh-code-review`（每版都在增加 dsh 专属检查，直接抽取会持续再分叉）。

## 3. 本仓库现状与参照系

### 3.1 重构分支现状

当前分支 `refactor/dsh-skills`（基线升级后 `0e9760581580637afd8fc4f7b0d6a1ee9fe4fa34`）：

- `skills/` 只有 `dsh-spec-skill-forge` 一个已落地技能；`.agents/skills/` 仍有 9 个安装副本（8 个旧技能 + 锻造技能），按 `AGENTS.md` 是重构期间的部署状态，不是交付物。
- `.agents/dsh-spec/notes/` 30 个 note 三元组（proposed 1、implemented 23、rejected 2、archived 4）+ 契约文件；`.agents/dsh-spec/norms/norms.md` 12 条规范、5 组（evidence 2、owner 2、pr 3、prose 1、test 4）。
- `scripts/dsh-spec-manager/` 保留旧机制引擎（安装副本仍会调用），但不在 PR 门禁链路上；PR 只跑 `pnpm test` 与 DCO，`vendored` 提交通道在 push `main` 时跑。
- 既定方向：每个技能由锻造技能产出、带决策记录；抽象不高于锻造技能。

### 3.2 已发布的 v0.4.0 技能集（先例）

`main` 分支 v0.4.0 发布过 10 个技能；其中 8 个来自 0.2.0 基线，5 个几乎是原文：

| 技能 | 上游 0.2.1 对应 | 旧移植 `SKILL.md` 行数 | 上游行数 | 先例含义 |
|---|---|---|---|---|
| `dsh-archive-agent-notes` | 同名 | 68 | 68 | 原文移植，仅改路径与契约指针 |
| `dsh-prose-standard` | 同名 | 81 | 81 | 原文移植 |
| `dsh-trim-cot-leakage` | 同名 | 45 | 45 | 原文移植，带 references |
| `dsh-translate-docs` | 同名 | 76 | 74 | 近原文移植，自建 references |
| `dsh-find-simplifications` | 同名 | 67 | 65 | 近原文移植，references 按"抽象+案例"重写 |
| `dsh-code-review` | 同名 | 51 | 61 | 裁掉 dsh 产品专属检查 |
| `dsh-pre-push-checks` | 同名 | 128 | 137 | 裁掉 dsh 专属命令 |
| `dsh-agent-experience` | `agent-experience` | 11 | 19 | 只留原则条目 |
| — | v0.4.0 另有 2 个自研技能 | `dsh-spec-manager`、`dsh-agent-team-workflow` | — | 本次重构已移除，不在本文范围 |

这两类从未移植：4 个 0.2.1 新技能，以及 7 个 0.2.0 就存在但旧发布集未收的技能（`dsh-ci-test-reliability`、`dsh-client-ui-ux`、`dsh-create-upgrade-guide`、`dsh-doc`、`dsh-merging-stacked-prs`、`dsh-speed-up-perf`、`record-browser-gif`）。前次移植是**成本基线，不是可直接复用的设计**：它依赖已删除的 `dsh-spec-manager` 技能与 `.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts` 路径，且把 dsh 文档契约抄进了自己的 `references/`。本次决定的问题是：原有 8 个是否按 0.2.1 重新锻造、是否借机合并，以及新候选要不要进来。

### 3.3 两种重建方式

- **逐技能重建**：每个技能从上游对应技能重新锻造，保留独立触发面。技能小、触发准；维护面最大。
- **按域重建**：先定几个目标领域（决策记录、散文、变更流程、文档双语），每个领域锻造一个技能，把上游同类技能合并进去。技能少、域内规则只有一个家；单技能更大，合并需要验证。

§6 给出这两种的具体方案与合并候选。

## 4. 上游技能全景（19 个）

> 规模列：`SKILL.md 行数` / 全部文本估算 token（含 references／templates；scripts 另注）。变化列：0.2.0→0.2.1。锚点列：对象/产物/判据，`✓` 闭合、`~` 部分、`✗` 开。曾移植=进入过 v0.4.0。

| 组 | 技能 | 一句话作用 | 规模 | 0.2.1 变化 | 曾移植 | 三锚 | 建议程度 | 合并/落点 | 优先级 |
|---|---|---|---|---|---|---|---|---|---|
| 决策记录 | `dsh-archive-agent-notes` | notes 树的归档/清理判决与冻结封印 | 68 / 2.0k | 无 | 是 | ✓✓✓ | B→C | 与包 notes 契约合成 notes 生命周期技能 | P0 |
| 设计 | `agent-experience` | 模型可见信息的六条上下文原则 + 工具定义规则 | 19 / 0.6k | 无 | 是 | ✗~✗ | C | 并入 forge 的上下文经济参考；工具定义半部 D | P1 |
| 散文 | `dsh-prose-standard` | 散文写什么、每个位置必须覆盖什么；完整命题规则 | 81 / 2.9k（+examples 2.8k） | 无 | 是 | ✓✓✓ | B | 散文纪律技能主体 | P0 |
| 散文 | `dsh-trim-cot-leakage` | 审计并修复推理过程泄漏；8 类 + resolvability 测试 + 探针 | 45 / 2.3k（+refs 5.3k） | 2 行 | 是 | ✓✓✓ | C | 并入散文纪律作审计 reference | P0 |
| 变更流程 | `dsh-pre-push-checks` | 推送前选择覆盖 diff 的最小证据集并推送/报告 | 137 / 3.4k | +1 行 | 是 | ✓✓✓ | B | 变更流程技能的证据阶段 | P0 |
| 变更流程 | `dsh-code-review` | 评审 PR：先读要求、diff→owning 映射、blocker 带证据 | 61 / 3.2k | +16/−8 | 是 | ✓~✓ | C | 变更流程技能的评审阶段（独立则 B） | P0 |
| 变更流程 | `dsh-ci-test-reliability` | 并发/共享资源/时钟/清理下的测试可靠性与 flake 诊断 | 131 / 4.4k | 1 行 | 否 | ~开强 | B | 独立；被变更流程引用 | P1 |
| 变更流程 | `dsh-create-upgrade-guide` | 破坏外部可感面时同一次变更写迁移指南（固定格式+门禁） | 54 / 1.2k（+85 行门禁） | 无 | 否 | ✓✓✓ | B | 独立；模板/门禁自带 | P1 |
| 变更流程 | `dsh-find-simplifications` | 以消费者证据找可删的维护义务，产出 proposal note | 65 / 3.1k（+案例 2.6k） | +6/−8 | 是 | ✓✓✓ | B | 独立（或变更流程的提案模式） | P2 |
| 变更流程 | `dsh-merging-stacked-prs` | 用 GitHub 官方 stack 对象与 `gh stack merge` 落地依赖 PR 链 | 127 / 2.4k | 无 | 否 | ✓✓✓ | B/D | 独立；与 pr.lifecycle 的授权边界冲突需重写 | P2 |
| 文档双语 | `dsh-translate-docs` | 双语对工作流：briefing、整篇翻译、配对记录与校验 | 74 / 3.2k（+自建 refs 约 22k） | 无 | 是 | ✓✓✓ | B | 文档与双语技能；配对脚本自带 | P1 |
| 文档双语 | `dsh-doc` | DSH 文档语料的 kind/模板/站点/预算与事实核查 | 132 / 5.5k（+894 行 17k） | 8 行（模板） | 否 | ✗~✗ | D（抽 2 条） | 只抽事实核查与受众/页序规范 | 不移植 |
| 设计/错误 | `dsh-error-handling` | 类型化失败、处理归属、状态保证与可见报告 | 30 / 0.7k | 新增 | 否 | ✗开弱 | C | norms 新组 `failure` | P1 |
| 产品专项 | `cordis-styling-nitpicking` | 从 Cordis 插件入口审单例/副作用/清理顺序，只报可证 P0 | 65 / 2.8k | 新增 | 否 | ~ ~ ~ | D（或 C） | 包不携带框架语义；最多作评审参考 25–35 行 | P2 |
| 产品专项 | `dsh-client-ui-ux` | 客户端 UI 的判断类规范（token/反馈面/浮层/平台窗口） | 73 / 2.6k | +12/−1 | 否 | ✗开弱 | D | 若开 UI 域才并入 UI 技能 | 不移植 |
| 产品专项 | `dsh-responsive-ui` | 窄屏布局、截断、图标控件、hover/键盘/焦点检查清单 | 54 / 1.0k | 新增 | 否 | ~开强 | D | 若开 UI 域作该技能骨架 | 不移植 |
| 产品专项 | `dsh-official-plugin-artwork` | 官方插件图标/预览的绘制与评审 | 41 / 1.9k | 新增 | 否 | ✗~/~ | D | 不携带 | 不移植 |
| 产品专项 | `dsh-speed-up-perf` | 把"让它更快"变成可复现测量与证据化修复 | 92 / 3.7k | 3 行 | 否 | 开半强 | B | 独立 | P2 |
| 产品专项 | `record-browser-gif` | 浏览器交互录成可验证 GIF，并附到 PR/资产分支 | 172 / 5.0k（+440 行 Python） | 2 行 | 否 | ~✓强 | B（受限） | 独立；Python 运行时是例外决策 | P2 |

**读法**：19 个里只有 5 个三锚全闭（archive、prose、trim、pre-push、upgrade-guide——其中 archive/prose/trim/pre-push 是本轮 P0 的来源）；`code-review`、`ci-test-reliability`、`find-simplifications` 等靠证据纪律把开放的产物补到可判；`agent-experience`、`error-handling`、`client-ui-ux`、`artwork` 的对象/产物/判据至少两处开放，按天花板规则不能独立成技能或只能作规范。

## 5. 逐技能分析

以下每节按"作用 → 结构 → 对象/产物/判据 → 最重的 dsh 绑定 → 通用内核 → 建议"组织；完整的绑定逐条表见 [技能档案（流程/规范）](porting-appendix/skills-core.md) 与 [技能档案（产品/角色）](porting-appendix/skills-product.md)。

### 5.1 决策记录与上下文设计

#### 5.1.1 `dsh-archive-agent-notes`（P0，作为 notes 生命周期技能的一半）

- **作用**：在增加、审计、清理、归档、评审 Agent Notes 时加载。先让 notes 树通过合约校验，再按"未来是否还能指导工作"分类：小 UI/纯机械 → 删三元组；有持久价值 → 留；有历史价值 → 归档；被否提案 → 只在仍能阻止诱人错误时留。归档按冻结 triplet + manifest 封印。明确把"建树"排除在外。
- **结构与判据**：68 行 / 6,721 B / ≈2.0k tok，无脚本。三锚全闭：adopter 的 notes 合约界定对象；triplet + `Archived:` + manifest 哈希 + 固定报告界定产物；封印验证器机械，分类有校准案例可直接判。0.2.1 零变化。
- **最重的绑定**：项目名（adapt）；notes 合约与门禁命令（adapt；包内自带同形合约，但封印验证器在本包只有仓库级实现）；校准案例里的 dsh note 名与字数（dissolve，换成抽象判据）。
- **通用内核**：把决策语料当有生命周期的资产——新建时做取代检查（full/partial 与 consolidation）、按未来决策价值而非字数/年龄分类、归档冻结与哈希封印（"可编辑的快照不是证据"）、入链的三种处置、固定字段报告。
- **建议**：领域＝决策记录；程度 B，但**最终形态是一个 notes 生命周期技能**，archive 是它的归档半部（C）：单独锻造会让 notes 合约在"创建/校验/归档"两处各写一份。P0。**脚本是总开关**：封印/格式/链接检查约 1.15k 行 + mdast bundle，要么随 notes 技能自带，要么退化为无脚本、只给合约与人工判定步骤（后者会失去机械锚点）。触发边界还有一处要重新对齐：上游 description 提 "restoring"，但冻结规则只允许封存性迁移，归档不可逆——改写时要么删掉"恢复"触发词，要么明确它只指"从误删中修复入链"，不能与冻结规则冲突。

#### 5.1.2 `agent-experience`（P1，并入 forge）

- **作用**：写/改模型可见的工具定义（名字、描述、参数 schema、system-prompt 段），或设计技能、上下文加载、多步工作流时加载；六条上下文原则 + `## Tool definitions` 五条。
- **结构与判据**：19 行 / 2,093 B / ≈0.6k tok；`SKILL.md` 是 symlink，真文件在 `packages/preset/agent-preset/skills/agent-experience/SKILL.md`。唯一机械项是"前后测 token"，其余全是编辑判断；没有外部 schema 或门禁。
- **最重的绑定**：model-facing 工具面（re-bind 到有模型产品面的项目）；system-prompt 与 token 计量（re-bind；无计量手段则 dissolve）；六条原则（keep）；工具定义五条（有工具面才保留，否则整节 dissolve）。
- **通用内核**：最小上下文先行、延迟资源要有清晰描述与可靠取法、约束先于动作、有界输出、局部性、总工作量（省上下文只有在不引起更多检索/重读时才成立）。这正是 forge 的 Docs/资源策略缺的那几条。
- **建议**：领域＝技能与工具设计；程度 C：六条原则进 forge 的 `references/4-context-economy.md`（或并入现有 resources/SSOT 段落），`## Tool definitions` 半部 D。三锚两处不闭（任意 adopter 没有"模型工具面"；判据靠自身断言），独立锻造会与 forge 的 description/resources 规则争同一决定权。P1（一页文本的成本）。

### 5.2 散文纪律

#### 5.2.1 `dsh-prose-standard`（P0，散文纪律技能主体）

- **作用**：在本仓写、审、恢复、裁剪、审计散文时加载；核心是"完整命题"规则（actor/action、条件与时序、模态、负保证与例外、所有权/副作用/失败/后果全部保住才允许删装饰），再按位置给 required coverage 清单（public API 文档、内部注释、模块注释、测试、cookbook、README、Agent Notes、postmortem、技能指令、示例配置、prompt/可见串、诊断）。
- **结构与判据**：81 行 / 9,621 B / ≈2.9k tok + `references/examples.md` 169 行 / ≈2.8k tok。三锚全闭：表面可枚举、产物是"保留全部命题的编辑 + keep/add/trim/restore/restructure/defer 分类 + 实跑检查报告"、complete-proposition 可逐条直接判。0.2.1 零变化；前次移植 81 行、差异 27% 行，是最低重写成本之一。
- **最重的绑定**：`vendor/` 与冻结归档的排除路径（adapt）；`docs/AGENTS.md`、cookbook 与 JSX/`verify-client-ui-i18n`、snapshot 机制（dissolve/re-bind 到采用方对应物）；examples 里的 dsh 案例（re-bind：保留判断，案例重述）。
- **通用内核**：几乎整个技能——完整命题规则、一个解释一个家但本地合约可重复、按位置覆盖、生成摘要必须独立成立、限制是合约不是债务、可见文案是行为、trim 不靠字数、写与审的权限区分、borderline 的判定与沉淀。
- **建议**：领域＝散文纪律；程度 B；P0。它是包"一次变更要携带什么"里"散文纪律"的那一半，且与 norms `prose.voice` 同源。合并 trim（见 5.2.2）。`examples.md` 保持独立 reference（按需加载，符合资源规则）。

#### 5.2.2 `dsh-trim-cot-leakage`（P0，并入散文纪律）

- **作用**：审计并修复"像泄露的推理记录"的散文：8 类泄漏（会话引用、审计编号、变更叙述、stack/评审视角、控制流叙述、hedge 残留等）+ 一个 resolvability 测试（HEAD 的读者在没有会话/PR/未提交稿时能否解析每个引用与断言）+ keep 规则与 overcorrection traps + recall batteries 探针。
- **结构与判据**：45 行 / 7,699 B / ≈2.3k tok + `examples.md` 275 行 / ≈3.8k tok + `recall-batteries.md` 52 行 / ≈1.5k tok。三锚全闭；但判据与 prose 的 complete-proposition 是同一套——技能自己写明"REQUIRED BACKGROUND: dsh-prose-standard owns the complete-proposition rule"。
- **最重的绑定**：8 类泄漏模式（keep，通用）；owner note 路径与 `docs/AGENTS.md` 路由（adapt）；`rg` 探针的排除路径与自身目录名（adapt）；案例（re-bind）；门禁命令（re-bind 到采用方）。
- **通用内核**：resolvability 测试、8 类分类、keep 规则（不误删 durable 引用、不误留死引用）、探针 + 正负校准 +"探针不是定义"、修复顺序（owner-first）、冻结归档不动。
- **建议**：领域＝散文纪律（审计）；程度 C：作为散文纪律技能的 `references/leakage-audit.md`，body 只保留触发词与"审计时加载"。常规写散文不加载 7.5k token，审计时才加载。P0（随散文技能一起完成）。独立锻造的唯一理由是触发更专，但 description 可以覆盖。

### 5.3 变更流程

#### 5.3.1 `dsh-pre-push-checks`（P0，变更流程技能的证据阶段）

- **作用**：推送、force-push、标记 ready、或声称检查通过之前加载；选择覆盖本次 outgoing diff 的最小测试/检查集，跑一次并如实报告；改写推送用 `--force-with-lease=<branch>:<observed-oid>` 保护；规定 `gh stack sync` 之后的验证顺序。
- **结构与判据**：137 行 / 11,283 B / ≈3.4k tok，无脚本。三锚全闭：对象＝outgoing diff（git 定界）；产物＝选中的检查 + 实跑命令与输出 + 推送/CI 状态；判据＝采用方的 gate 清单存在性与 diff→surface 映射可直接判，lease/OID 机械。0.2.1 仅 +1 行；前次移植 128 行、差异 45% 行（多为值替换）。
- **最重的绑定**：`gh stack sync` 段（re-bind/dissolve，见 §6 边界）；`pnpm run change-scope`（re-bind 为 `git diff --name-only <base>...HEAD`）；dsh 的 gate 清单与录制输出布局（adapt/dissolve 到采用方声明）；Vitest 语法与覆盖率参数（re-bind 到采用方 runner）。
- **通用内核**：证据选择方法论——没有通用本地基线，每条行为改动都要有会因该回归而失败的最小检查；test selection 与 coverage selection 分开；dependency-graph 选测试的盲区；不重复已通过的检查；失败就停而不是"指望 CI 不同"；改写推送的安全规则与 post-rewrite 重审。
- **建议**：领域＝变更流程（证据）；程度 B；P0，且是 19 个里最接近"通用技能"的一个。合并 code-review（见 5.3.2），组成一个"变更流程"技能的两阶段；stack 段与 `merging-stacked-prs` 划界（§6.2）。

#### 5.3.2 `dsh-code-review`（P0，变更流程技能的评审阶段）

- **作用**：评审 deepseek-harness 的 PR 时加载：取 live base/head、跑 change-scope、**先读 owning 要求**（AGENTS.md、防御性模式、doc 规范、相邻技能、测试/门禁、Agent Notes、双语规则），再逐项做 blocking 要求与 manual checks，按"缺陷/位置/影响/证据"报告。
- **结构与判据**：61 行 / 10,577 B / ≈3.2k tok，无脚本。对象闭合（PR 由 git 定界）；产物是 findings + verdict，无 schema（弱）；判据借采用方自己的标准，机械部分很少。0.2.1 +16/−8，是唯一持续增生的技能（新增 Cordis 生命周期、error-handling、defensive-patterns 五页等 dsh 专属检查）。
- **最重的绑定**：`change-scope` 命令（re-bind 为 git）；dsh AGENTS.md/packages/AGENTS.md、docs/defensive-patterns 五页、docs/testing、type-equiv、snapshots、Cordis、locale-copy gate、model perspective（adapt/dissolve 到采用方对应物，约占内容 70%）。
- **通用内核**：评审元方法——先读要求再判 diff；changed paths → owning 文档；区分 blocker 与建议、不重复 gate 已拦的问题；每条 finding 给缺陷/位置/影响/证据；对作者报告保持怀疑（测试强度、真实入口、negative control）；实现中的 design note 与 shipped 现实对齐；双语 diff 评审。
- **建议**：领域＝变更流程（评审）；程度 C（并入变更流程技能，作 `references/review.md`），独立则 B。三锚的"产物"只勉强成立（评论线程无形状），并入以 PR 生命周期为对象的技能后产物变成闭合的"变更记录（描述四段 + 证据 + 评审结论）"。P0（在变更流程技能内）。**这是两个分析档案一致同意的合并点**。

#### 5.3.3 `dsh-ci-test-reliability`（P1）

- **作用**：设计、审查、诊断在 CI 并发、共享主机资源、时钟、进程全局状态、子进程、网络监听器或异步 teardown 下可能非确定失败的测试与 fixture；明确不替代测试分层策略，也不负责为一次 push 选命令。
- **结构与判据**：131 行 / 9,442 B / ≈2.8k tok + `references/ci-flake-diagnosis.md` 60 行 / ≈1.6k tok。0.2.1 仅 1 行改（改指向）。判据强（负控制、并发复现、静止清理可执行验证），对象与产物开放（证据是运行记录）。
- **最重的绑定**：测试策略文档与 defensive patterns（dissolve 或 re-bind 到采用方）；当前 Vitest 配置与 GitHub workflow（adapt 到声明位置）；snapshot 机制（re-bind）；pre-push 技能（adapt）。
- **通用内核**：执行拓扑建模、资源原子分配、进程全局状态限制与精确恢复、以状态（而非 sleep）同步、静止 teardown、先证回归再修、拒绝掩盖式修复、flake 诊断六类分类与最小复现阶梯。
- **建议**：领域＝验证与测试；程度 B；P1。独立技能，保留两层结构（诊断 reference 按需加载）。它补的是"what proves it"里最缺的一块：证据本身是否可信。与变更流程、code-review 的边界用一句话写死（基线已有："apply test-reliability first；本技能仍负责选命令"）。重写约 15–25%，是本组最省的之一，但体量约 4.4k token。

#### 5.3.4 `dsh-create-upgrade-guide`（P1）

- **作用**：当一次变更破坏仓库外部可观察的面（CLI/profile/配置键/持久数据/SDK/协议/包入口），或改到未发布升级指南已覆盖的面上时，在**引入破坏的同一次变更**里写或更新迁移指南。
- **结构与判据**：54 行 / 3,734 B / ≈1.2k tok，无自带脚本，但依赖 `dsh-doc/templates/upgrade-guide.md`（29 行）与 `scripts/verify-upgrade-guides.ts`（85 行）。三锚全闭：对象由外部可感面清单 + 版本语义界定；产物 = `guide.md` + 固定 frontmatter（`kind: upgrade-guide`、一句 description）+ `## Change`/`## Migration` 两节 + ≤500 词；判据 = 85 行可移植门禁 + 配对/链接门。0.2.1 零变化。
- **最重的绑定**：指南根与版本源（adapt 到采用方声明）；外部可感面清单（re-bind 为采用方公开面）；模板/门禁（随技能自带，因 `dsh-doc` 不移植）；双语机制（re-bind 为可选；单语项目不强制双胞胎）；`dsh-doc` kind 系统（不携带）。
- **通用内核**：在引入破坏的同一次变更里写迁移指南（不推迟到发版）；"外部可感知"的边界；一目录一破坏、固定格式；Change（旧/新行为 + 谁受影响）+ Migration（精确文件/key/命令/symbol + 如何确认）；500 词上限（超了链接源码/把理由移进决策记录/把重复步骤做成脚本）；版本未变持续更新、bump 后冻结、发布前跑门禁。
- **建议**：领域＝发布与升级；程度 B；P1。它是 19 个里三锚最全闭的候选之一，且与包已有决策"迁移成本是设计约束"同向；但"发布与升级"比本包当前三个支柱多一域，是否进包由维护者定（§9 Q7）。两个分析档案对优先级有分歧：产品档案主张 P0，本报告建议 P1——理由不是风险，而是域的主旨贴合度。

#### 5.3.5 `dsh-find-simplifications`（P2）

- **作用**：找"删掉能减少维护义务"的改动：无生产者的 API/字段、不改变消费者动作的区分、可换成更小显式行为而删掉整个子系统的机制、可派生而删的缓存/订阅、把组合误当策略的注册表、完整的维护成本；产出 proposal Agent Note 或内联 TODO。
- **结构与判据**：65 行 / 10,371 B / ≈3.1k tok + `references/historical-patterns.md` 45 行 / ≈2.6k tok。三锚全闭：对象是采用方代码库的可去除维护义务；产物是 proposed note 五段骨架或 TODO；判据是消费者证据/测试/搜索，可直接核查。0.2.1 +6/−8（上游删掉了 invariant companions 段）。
- **最重的绑定**：项目名与文档路径（adapt/dissolve）；dsh 架构事实（dissolve，抽象为"刻意 seam/双 provider/已定型格式"）；源码/运行时/生成物清单（re-bind 到声明位置）；历史案例 reference（re-bind：抽象判据 + 案例重述，前次示范 8.6KB→17.7KB）。
- **通用内核**：六个发现问题 + 证据分类（不可达删除/有明确损失的收窄/受保护义务证据不足）+ 所有权与失败语义 + 依赖替换的净减少检验 + 提案记录纪律。
- **建议**：领域＝简化提议；程度 B（独立）或 C（作变更流程的提案模式）；P2。它依赖 notes 合约与提案落点（notes 生命周期技能先有），且案例 reference 必须重写。若目标集选 A，本轮先不急；若维护者要"减少维护"能力，它比性能/录制更贴近包主旨。

#### 5.3.6 `dsh-merging-stacked-prs`（P2 / 条件）

- **作用**：落地一条依赖 PR 链时，使用 GitHub 原生 stack 对象与 `gh stack merge`，禁止手工模拟栈语义；缺成员只在作者一致时自动 link；落地前 re-query，合入后等 `MERGED`、验证剩余层、删分支前查依赖数。
- **结构与判据**：127 行 / 7,839 B / ≈2.4k tok。三锚全闭，但对象是 GitHub 的较新原生特性（GraphQL `PullRequest.stack`），依赖 `gh stack` 与 GitHub 服务端能力。0.2.1 零变化。
- **最重的绑定**：`gh stack` 扩展与 GitHub 服务端语义（keep，hard-stop 保留）；同仓库/跨 fork 限制（keep）；dsh 历史规范（dissolve）；**与包 `pr.lifecycle` 冲突**：上游是代理可 `gh stack merge --yes`，包规范是"合入是维护者的行为，由代理请求、维护者回答"——重绑必须把授权边界写死，否则移植即违反包自己的规范。
- **通用内核**：官方 stack 对象是唯一权威（不用 base 分支推断）、落地前 re-query、缺成员先问、已有 stack 不自动重构、改写后重审、整栈落地、用 stack API 合入、合入后验证。
- **建议**：领域＝变更流程（合入）；程度 B/D；P2。受众窄（用 GitHub 官方 stack 的项目），且授权边界与包规范冲突，成本容易被低估。若维护者自己就在用 stack，可提前。

### 5.4 文档与双语

#### 5.4.1 `dsh-translate-docs`（P1）

- **作用**：仅在用户显式点名时运行：维护 `foo.md ↔ foo.zh.md + foo.i18n.yaml` 双语对，包括 briefing 驱动的更新路径（生成 brief、机械变更 `--apply`、散文变更派子代理、最小编辑、sidecar 重录）与整篇翻译路径（先读 sources of truth、两遍法：写作/核源、单独复读）、术语表绑定、代码块 byte-identical、链接 locale、switcher、配对门禁。
- **结构与判据**：74 行 / 10,604 B / ≈3.2k tok；上游没有自带 references（全部在 dsh 的 `docs/i18n/`）。三锚全闭，前提是**配对合约与门禁随技能一起移植**。0.2.1 零变化；前次移植 76 行 + 自建约 73KB references，是本组搬运量最大的一个。
- **最重的绑定**：`docs/i18n/*`（re-bind：配对合约进 references；术语表归采用方拥有）；`gen-translation-brief` 与 `verify-translation-pairing`（re-bind：自包含脚本，约 2.4k 行 engine + mdast bundle，或退化为无脚本、只给合约与人工步骤）；`.agents/notes/archived/` 排除（adapt）；中英专用规则（keep/re-bind）。
- **通用内核**：双语对的完整工作流——最小更新而非重译、briefing 是翻译者的全部工作集、机械 fence 变更自动 apply、整篇两遍法、术语表绑定与"待定术语"、结构保持（fence byte-identical、链接语义、switcher）、sidecar 作为"确认过一致"的可审陈述、显式调用边界。
- **建议**：领域＝文档与双语；程度 B；P1。本包自己的 README/notes/发布说明都是双语对，双语是包的既有承诺（README："The two languages stay together"）；若维护者决定双语只是可选能力，降 P2（§9 Q4）。**脚本是第二道总开关**：没有自包含 pairing 脚本，三锚的机械判据就弱了。

#### 5.4.2 `dsh-doc`（D，只抽两条程序）

- **作用**：创建/重构/评审/审计/迁移 DSH 的 Markdown、包 README 与文档站：audience-first 层级、kind 映射的 YAML metadata、双语行对齐、目录导航、渐进深度、执行验证事实、仓库 gate 校验。
- **结构与判据**：132 行 / 18,418 B / ≈5.5k tok（已超 forge 默认 body 预算）+ 13 个 support files、894 行 / ≈17k tok；正文调用 26 次 `pnpm`，全部是 dsh 的 gate。0.2.1 只有 persistent-change 模板 8 行变化。
- **为什么 D**：对象（kind/模板/站点/持久化记录）全是 dsh 仓库事实派生；产物形状靠 kind 系统闭合（自造 kind 系统等于让技能发明自己的锚点）；判据是 24 处 dsh gate。三锚两条失败，按规则只能是散文/具体任务辅助；整技能移植重写 >80%，且要和散文纪律争"文档该写什么"。
- **能抽的两条程序**：（1）**事实核查必须执行**——每条操作断言都要在当前 checkout 执行、不能复现就删；与 norms `evidence.claims` 同域，落进变更流程技能一次。（2）受众优先与页序/voice 规则——只有维护者决定锻造"文档规范"技能时才用，而且**来源应换成采用方自己的文档标准**（新来源，需记录 deviation），不是从 dsh-doc 抽取。双语行对齐/sidecar/switcher 归 `translate-docs`。
- **建议**：D（不移植技能），抽 fact-check 进变更流程（作为 P0 变更流程技能的一部分，抽取成本约半天）。

### 5.5 产品专项

> 这一组多数是 dsh 产品本身的技能；`dsh-error-handling` 是通用原则，`dsh-speed-up-perf` 与 `record-browser-gif` 是通用方法但绑定深。对本包只有一个判断问题：它服务的是**任何采用方**，还是 dsh 产品团队。判 D 的四个（`cordis`、两个 UI 技能、`artwork`）都是后者；`dsh-doc` 已在 §5.4.2 单列。

#### 5.5.1 `dsh-error-handling`（P1，入 norms）

- **作用**：设计与审阅失败处理的原则：类型化失败与稳定判别；catch 只限制传播、不撤销已发生的变更，只有状态所有者能建立安全继续；日志不是恢复；报告要本地化、可行动、可见；不可信状态必须持续可见；验收看结果状态而非"异常被 catch 了"。
- **结构与判据**：30 行 / 2,389 B / ≈0.7k tok；无脚本；无对象/产物闭合，机械检查只有"验证最终状态"这一条可执行指令。锚在具名外部文献（Meyer 1997、Sutter 1999、Armstrong 2003）。
- **建议**：领域＝错误处理；程度 C：拆成 norms 的新组 `failure`（3–4 条红线：类型化与归属；catch 不撤销变更/日志不是恢复；不可信状态可见；验收看最终状态），由变更流程技能引用该组。做成独立技能会"永远触发、无法验收"。P1，成本约 5–8 行规范。

#### 5.5.2 `cordis-styling-nitpicking`（D / 可选参考）

- **作用**：从 Cordis 插件入口审所有权与生命周期，只报三条 P0（进程级单例状态、未回收副作用、清理依赖早于消费者完成），要求失败交错、可观察影响与确定性验收测试。
- **结构与判据**：65 行 / 9,200 B / ≈2.8k tok；无脚本；对象与判据一半绑在 Cordis API 与 vendor 源码。
- **建议**：领域＝代码质量/生命周期缺陷；程度 D（包不携带框架语义）。可把三条缺陷类别 + 证据纪律泛化成约 25–35 行的"所有权/释放评审参考"，作为变更流程技能的 `references/ownership-lifecycle.md`（C，P2，可选）。没有独立触发面：不要为它单独开技能。

#### 5.5.3 `dsh-client-ui-ux` / `dsh-responsive-ui` / `dsh-official-plugin-artwork`（D）

- **client-ui-ux**（73 行 / ≈2.6k tok）：去掉 DSH 的 token/primitive/页面例子后，剩下的是"做 UI 要考虑复用、反馈面、浮层、加载"的散文；对象（采用方设计系统）、产物（无固定形状）、判据（项目内部规范 + 审美）两处开。判 D。若维护者决定开 UI 域，正确做法是把它可判定的条款（反馈面寿命、浮层三检、复用优先）折进以 responsive-ui 为骨架的一个技能，而不是两个技能并存。
- **responsive-ui**（54 行 / ≈1.0k tok）：规则本身是 CSS/无障碍标准可核的（390px 无重叠/裁剪/横滚、`@media (hover: hover)`、图标控件 tooltip、截断有二级入口、宽度变化保焦点），是 UI 域成立时的骨架；但它没有产物与机械门，独立锻造低于 forge 的产物闭合要求。判 D；开 UI 域则 C（与 client-ui-ux 合并）。
- **official-plugin-artwork**（41 行 / ≈1.9k tok）：对象依赖"官方插件资产目录"，判据一半是审美与内部审批，通用内核很薄。判 D。

#### 5.5.4 `dsh-speed-up-perf`（P2）

- **作用**：把"让它更快"变成可复现的用户路径测量与小而证据化的修复：先约定用户可见端点、负载范围、资源约束、可接受行为差异与停止规则；调查真实路径、按观测成本排序、建真实合成基准、先证回归再删工作、保持行为与所有权、交付有界结果。
- **结构与判据**：92 行 / 12,167 B / ≈3.7k tok；无脚本。三锚：对象开（采用方用户路径）、产物半（7 字段测量卡 + 基准 lane）、判据较强（原始样本、负控制、行为测试、端到端复测）。0.2.1 3 行改。
- **通用内核**：性能工程方法学——端点/负载/约束/停止规则先约定；后端与浏览器端到端分开测；7 字段测量卡；先测未优化版本；一次一个因果因子；负控制；性能不替代功能证据；拒绝"端到端消失/典型负载回退/复杂度不划算"的优化；有界交付 + 排序后的后续清单。
- **建议**：领域＝性能；程度 B；P2。方法学价值高，但重写约 55–60%，且需要采用方先有基准设施，否则一半内容落不了地。

#### 5.5.5 `record-browser-gif`（P2 / 条件）

- **作用**：把浏览器/Web UI 交互录成优化过的 GIF，并用 `gh --attach` 或 assets 分支发布；录制与发布分离，一次故事板只能来自一次隔离运行。
- **结构与判据**：172 行 / 16,804 B / ≈5.0k tok + `scripts/encode_gif.py` 337 行 + `test_encode_gif.py` 103 行。产物闭合最强（编码器验证 GIF：容器时长、帧数、宽度、字节数、拒绝覆盖；发布后 API 核验）；对象部分闭合（浏览器应用 + PR 平台）。0.2.1 2 行改（凭据来源）。
- **最重的绑定**：DSH 构建/状态根/凭据 provider（re-bind）；"每个 GUI PR 必须带 GIF"（re-bind 为采用方可选政策，不能变成包对采用方的强制）；`gh`/github.com（keep，非 GitHub 项目要能干净跳过）。
- **建议**：领域＝素材录制/证据录制；程度 B；P2，且受"Python 运行时例外"约束：`encode_gif.py` 只依赖 python3/ffmpeg/ffprobe，是 19 个技能里唯一可直接留下的通用可执行件，但包的脚本管线是 Node + `package/<skill>/` + vite 打包。要么重写为 Node/TS，要么为它开 Python 例外（§9 Q11）。包的当前规模不建议此刻引入浏览器 + 媒体工具链。

## 6. 合并、拆分与目标技能集

### 6.1 合并判据

合并只在四条同时成立时推荐：**同一对象**（如"一次变更""一份决策记录语料"）；**同一判据来源**（采用方的门禁/规范/决策记录）；**触发边界能一句话写清**（不靠执行者猜）；**合并后正文仍可路由到 references 满足预算**（forge 默认 body < 5,000 token / < 500 行）。少一条就保持独立并写死互斥边界。

### 6.2 合并候选与结论

| # | 候选 | 形态 | 收益 | 代价/风险 | 结论 |
|---|---|---|---|---|---|
| 1 | `prose-standard ← trim-cot-leakage` | trim 作散文技能的审计 reference（8 类 + resolvability + batteries） | 同对象/同判据/同读者；trim 自己声明以 prose 为背景；常规写作不加载 7.5k token | 审计时多一次 reference 读取；拆分需保持 one home（scope/exclusions 只写一处） | **强，P0** |
| 2 | `notes 生命周期 ← archive-agent-notes + 包 notes 契约` | 一个技能：创建/取代检查/格式/归档/冻结 | notes 合约与封印验证器只有一个出资方；补上 archive 缺的创建/校验半部 | 脚本归属（§9 Q1）；范围比 archive 大 | **强，P0**（方案 A 的核心） |
| 3 | `变更流程 ← pre-push-checks + code-review` | 一个技能两阶段：证据/推送、评审；评审与检查清单按需 references | 同对象（一次变更）、同锚点（采用方 gates/norms/notes）；把"变更要携带什么"落成一个家 | 正文需路由；触发面变宽；评审内容 70% 需重写 | **中强，P0**；若要触发更准，独立 + 写死边界也可（方案 B） |
| 4 | `translate-docs ← dsh-doc 的双语面` | doc 不移植后，行对齐/sidecar/switcher 规则归 translate | 不出现第二份配对实现 | 与升级指南的双语面需引用同一机制 | **强（归并，非上游合并），P1** |
| 5 | `error-handling → norms failure` | 3–4 条红线，由变更流程技能引用 | 原则型内容做常设红线最便宜；永远在线 | norms 面扩大；与新组边界要写清 | **强，P1** |
| 6 | `agent-experience → forge reference` | 六条上下文原则作 forge 的上下文经济参考 | 补 forge 的 Docs/资源策略；一页成本 | forge body 增长；按资源规则作为可选 reference | **强，P1** |
| 7 | `cordis → 变更流程的 ownership reference` | 约 25–35 行泛化检查清单 | 三条缺陷类别是通用评审项 | 与框架源码断链后判据变弱 | 可选，P2 |
| 8 | UI 三件套 → 一个 UI 审查技能 | responsive 骨架 + client-ui 可判条款 + artwork 资产节 | 避免两个 UI 技能互引 | UI 域三锚弱，易成散文 | **条件性，建议不开**（§9 Q6） |
| 9 | `dsh-doc → 散文/变更流程` | 只抽 fact-check 一条程序 | 与 `evidence.claims` 同域，零重复 | 其余 22k token 不携带 | **抽取，不合并技能** |
| 10 | 不合并：`find-simplifications`、`ci-test-reliability`、`speed-up-perf`、`record-browser-gif`、`merging-stacked-prs` | 各自独立 | 对象/产物/触发都不同；合并会让触发互吞、锚点互借 | — | **保持独立** |

**关于 `pre-push` 的 stack 段与 `merging-stacked-prs` 的分歧**（两个分析档案的分歧点，本文裁决）：`pre-push` 是 P0、`merging-stacked-prs` 是 P2。**现在不搬**——先划界：`pre-push/变更流程` 拥有"刷新之后该跑什么检查"与通用 lease/OID 防护；`merging-stacked-prs` 拥有"如何刷新、预检、合入、合入后验证"。等 `merging-stacked-prs` 升到 P1 时，再把 `gh stack sync` 的具体操作搬过去；`pre-push` 保留一句"存在 stack 时按合并技能执行 post-sync 验证"。

### 6.3 三套目标技能集

**方案 A：按域重建（推荐）**

| 技能 | 来源上游技能 | 覆盖领域 | 关键内容 |
|---|---|---|---|
| `dsh-spec-notes`（名称待定） | `dsh-archive-agent-notes` + 包内 notes 契约 | 决策记录 | 新建取代检查、格式、分类、归档冻结、封印验证 |
| `dsh-spec-prose`（或沿用 `dsh-prose-standard`） | `dsh-prose-standard` + `dsh-trim-cot-leakage` | 散文纪律 | 完整命题、按位置覆盖、泄漏审计（reference） |
| `dsh-spec-change`（或沿用 `dsh-pre-push-checks`） | `dsh-pre-push-checks` + `dsh-code-review` + cordis 参考 + doc 的 fact-check | 变更流程 | 证据选择与推送、语义评审、最低验收 |
| `dsh-translate-docs` | `dsh-translate-docs` + doc 双语面 | 文档与双语 | 双语对、briefing、配对门、sidecar |
| `dsh-spec-skill-forge` | — | 技能锻造 | 已有 |

覆盖 6 个上游技能；落地技能 4 + forge = 5。优点：与包主旨"一次变更要携带什么（决定、证据、文字）"一一对应；每个技能一个闭合对象。风险：notes 与 translate 各有一个脚本决策；变更流程的正文预算要靠 references。

**方案 B：逐技能重建**：`dsh-archive-agent-notes`、`dsh-prose-standard`、`dsh-trim-cot-leakage`、`dsh-translate-docs`、`dsh-find-simplifications`、`dsh-code-review`、`dsh-pre-push-checks`、`dsh-agent-experience` 共 8 个（v0.4.0 集更新到 0.2.1）。优点：触发最准、先例最足、每个技能小。缺点：技能多、维护面大、notes 与双语仍缺创建/脚本半部。

**方案 C：扩展**：A + `dsh-ci-test-reliability` + `dsh-create-upgrade-guide` + `dsh-find-simplifications` = 7 个技能，覆盖 9 个上游技能。适合维护者认为"验证可靠性"和"发布升级"是采用方真实缺口时。

成本粗估（含锻造记录、评审草稿，不含 forge 基础设施改动）：A 12–20 人日（其中阶段 0 4–6），B 18–26，C 20–30。全做 19 个不推荐：文本总量约 78K token + 3 个脚本资产，且 5 个产品专项技能对本包采用方没有触发面。

## 7. Agent Notes 分析

### 7.1 体系解剖

`.agents/notes/README.md`（125 行）是唯一契约：路径编码 `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`、三种 lifecycle（proposed/implemented/rejected）+ 独立冻结的 archived、六类 class（feature/bug-fix/simplification/architecture/process/testing）、统一的 in-file 骨架（header 三行 + `## Problem` 开头 + 按 lifecycle 的必选章节 + 强制的 `## Alternatives considered`）、归档/删除判据、写作时机。三个子树 `AGENTS.md` 分别是根（每个新 note 触发 supersession 检查）、implemented（随代码保持 current、不写变更史）、archived（冻结、只允许封存性迁移）。配套：`.rgignore` 把 archived 排除出递归检索；`archived/manifest.json` 是追加式 sha256 封印；门禁在 `scripts/`（结构、格式、归档、配对、预算、链接）。

**这套体系最可移植的设计**是分工：契约 + 机械门禁 + 校准技能（archive 做语义判决，`translate-docs` 做翻译，prose 做覆盖度判断）。本包已经提取了契约、门禁（`scripts/dsh-spec-manager/`）与 norms，但只交付了锻造技能，其余校准技能缺失——这是**交付缺口，不是新领域**。

### 7.2 统计（基线 0.2.1）

| lifecycle | 三元组 | 说明 |
|---|---:|---|
| proposed | 42 | 6 类；feature 9、architecture 15、simplification 9、process 6、bug-fix 1、testing 2 |
| implemented | 293 | architecture 177、feature 40、process 34、testing 18、simplification 13、bug-fix 11 |
| rejected | 8 | simplification 7、architecture 1（被否的绝大多数是"简化"） |
| archived | 924 | 占全量 72.9%；feature 306、architecture 185、bug-fix 182、process 120、simplification 92、testing 39 |
| **合计** | **1267** | 3801 个 note 文件 + 8 个治理文件；三元组 0 残缺 |

active = 335（proposed 42 + implemented 293；另有 2 个治理文件 `implemented/AGENTS.md` 与它的 symlink，`find` 计数 337 的来源）。日期范围 2026-06-11 → 2026-10-15；9 月是峰值（143 条 implemented）。

0.2.0→0.2.1：282 条 implemented 整批归档、32 条删除、79 条新增、171 条改写；归档 manifest 旧 1923 条哈希 0 变化、新增 849 条（283 个三元组）——冻结与 append-only 是真实执行的。**上游自己把 notes 内容当作会被冻结/删除的决策记录，而不是稳定知识库**。

### 7.3 契约变化与本包差异

0.2.1 的契约本体只做了"链接随归档更新"（README 2 行、`docs/AGENTS.md` 13 行）与 docs 标准的局部演进，**契约设计没有变化**，不需要追一个移动的契约。

本包提取版与上游 0.2.1 有 16 处差异；其中 8 处建议 adopt（其余 keep 本包版或 ignore dsh 特化）。按优先序：

| # | 差异 | 上游 | 本包现状 | 建议 |
|---|---|---|---|---|
| 1 | 分类 canonical set 的 SSOT | "closed set in `scripts/…`；加类要同时改 canonical set 与本节" | 只写"closed set in this section" | **adopt（最高优先）**：本包 manager 的 `AGENT_NOTE_CLASSES` 仍是一份独立封闭集合，照 README 只加类会红 |
| 2 | 配对 sidecar 机制 | 指向 i18n 契约，解释 `.i18n.yaml` 谁重录、谁校验 | 没有解释 sidecar 是什么 | **adopt（最高优先）**：本包 manager 已移植 sidecar 机制，契约却只字未提 |
| 3 | 归档判决的委托 | "用校准过的 archive 工作流，不用字数/年龄/配额" | "按本节判据判断" | adopt 变体：补命令/流程指针 |
| 4 | 冻结/归档门禁的指认 | 指明 `verify-archived-agent-notes` 与"文档门禁跳过 archived 出链" | 只描述 manifest 与 `.rgignore` | adopt 两条 |
| 5 | 格式门禁的指认 | 指明 `verify-agent-note-format` 与格式理由的出处 | 提了规则，未提门禁与理由 | adopt |
| 6 | lifecycle 迁移的失败语义 | "门禁会失败" | "迁移不完整"（无可执行含义） | adopt |
| 7 | lifecycle 列表排版 | 4 行嵌套缩进 | 压成一行混排 | adopt（修格式） |
| 8 | 交叉引用示例 | 相对 Markdown 链接 | 反引号路径（不是链接） | adopt（机械可检） |

保留本包独有：会话中达成的决定（`A decision agreed in conversation counts.`）、`### Quoted text and secrets`、用 "change" 而非 "PR"。忽略：pre-format 祖父条款（本包空树；迁移既有 ADR 语料时另写折算说明）、Figma 例外、dsh 路径/技能链接。

### 7.4 主题清单（335 条全部归入，0 条残留）

| 主题 | 数量 | 可移植 |
|---|---:|---|
| A1 会话日志/持久化/格式迁移/投影 | 50 | 否（产品；版本策略可提炼） |
| A2 Agent 运行时/子代理/Team/目标 | 41 | 否 |
| A3 LLM 适配/流式/提示/压缩 | 21 | 否 |
| A4 工具/PTC/沙箱/执行世界/终端/审批 | 38 | 否 |
| A5 Web Host/API/认证/凭据 | 21 | 否 |
| A6 客户端 UI/对话/侧栏/composer | 28 | 否 |
| A7 桌面 Electron/安装更新/窗口 | 16 | 否 |
| A8 插件/Cordis/配置/Profile | 32 | 否 |
| A9 文件/工作区/Office/预览 | 13 | 否 |
| A10 账户/翻译/反馈/日程/浏览器操作 | 14 | 否 |
| M1 Agent Notes 与决策维护 | 2 | **是**（P0） |
| M2 文档/散文/生成可见性 | 5 | 部分（P1） |
| M3 PR/评审/发布流程 | 7 | 部分（PR 治理可移植） |
| M4 CI/构建/门禁/速度 | 13 | 部分（设计原则可移植） |
| M5 依赖/供应链/包与语言纪律 | 10 | 部分（依赖披露/vendoring 可移植；TS 规则除外） |
| M6 持久化类型兼容与版本判定 | 3 | **是**（P0） |
| T1 真实依赖/黑盒 E2E | 4 | 是（P0/P1） |
| T2 确定性/观测纪律/测试质量 | 6 | **是**（P0） |
| T3 性能基准与预算 | 8 | 是（方法，P1） |
| T4 桌面安装更新验证 | 3 | 否（产品验收装置） |
| **合计** | **335** | 274 产品 / 61 流程测试 |

### 7.5 可移植知识点（约 30 条中的 P0/P1）

| 拟落地 | 内容（一句话） | 主要上游来源 |
|---|---|---|
| norm `evidence.gate-promises`（可放现有 evidence 组） | 每条可机制化的规则/承诺都必须有一个"发现违规即非零退出"的检查 | `archived/process/2026-06-11-quality-gates.md` |
| norm `prose.exact-facts` | 散文写具体 actor/action/source/field/file；禁用一词多义的抽象标签与不可解析引用（会话编号、审查口令） | `implemented/process/2026-08-26-ban-ambiguous-origin-label.md`、两条 archived prose 元决策 |
| norm `test.observed-state` | 等待的必须是被断言的状态本身；不用墙钟窗口；有界等待从被测动作的交接开始 | `proposed/testing/2026-06-11-deterministic-and-stress-testing.md`、`implemented/testing/2026-09-27-observation-waits-on-observed-state.md` |
| norm `test.real-dependency` | 无外部依赖的替身只证管道；真实 API/制品另跑，缺凭据要响亮失败而不是假绿 | `implemented/testing/2026-06-19-real-api-e2e-ci.md` 等 |
| norm `data.reader-compatibility`（新组 `data`） | 格式版本由旧 reader 行为决定：能正确恢复/安全忽略可选能力并保留其记录/在变更前拒绝；首个发布 reader 是底线 | `implemented/process/2026-10-08-session-reader-compatibility-review.md`、`2026-08-10-session-log-version-mechanism.md` |
| norm `vendor.manifest-claims` | vendoring 双向验证：本地改动更新 manifest；manifest 每条声明能由上游 pin 复现 | `proposed/process/2026-06-11-supply-chain-and-vendor-drift.md` |
| norm `failure.*`（新组 `failure`） | 见 §5.5.1：类型化与归属、catch 不撤销变更、不可信状态可见、验收看最终状态 | `dsh-error-handling` 技能（0.2.1 新增） |
| notes 契约引用 | 格式统一、归档冻结、双语三件套、sidecar section-keyed 设计的"为什么" | `archived/process/` 四条元决策（uniform-format、frozen archive、bilingual pair、section-keyed pairing records） |

P1/P2 候选（`design.whole-value-events`、`owner.runtime-boundary`、`test.perf-budget`、`docs.audience-first`、`docs.tiers`、`simplify.external-dependency`、`test.ci-oracle` 等）见[完整档案](porting-appendix/notes.md) §8.3。**不搬任何 note 正文**：335 条 active 的产品事实必须随 dsh 源码更新，本包没有源码树；上游自己也在归档/删除这些内容（0.2.1 归档 282、删 32），今天抄的内容下个 pin 就可能冻结。

### 7.6 建议落点与成本

| 形态 | 内容 | 去向 | 成本 |
|---|---|---|---|
| 契约修正 | §7.3 的 8 处 + 三个子树 `AGENTS.md` 补命令名（`notes check`、`notes-archived check`、`notes-archived write`、`translation-pair check`、`translation-pair write`） | `.agents/dsh-spec/notes/`（+zh+sidecar） | 1–1.5 人日 |
| norms | 上表 6–7 条（P0 优先；新组只开 `failure` + `data`） | `scripts/dsh-spec-manager/references/norms.json` → 重新生成 norms.md + applied.yaml | 1–1.5 人日 |
| 决策记录 | 1 条 note：移植范围、逐条吸收表、provenance（pin 绑定）、不移植清单、维护触发、验收命令 | `.agents/dsh-spec/notes/proposed/process/2026-10-22-…md`（+zh+sidecar） | 0.5 人日 |
| 引用 | 上游 archived 元决策与产品 note 的路径表（只引用，不复制正文；路径随 pin 更新） | 上述记录 note 的 provenance 表 | 含上 |
| 不移植 | 335 条 active 正文、924 条 archived、dsh 特化 gate 路径、Figma 例外 | — | — |

对照成本：移植内容子集（20–30 条）起步要 60–90 个三元组文件、5–8 人日，且每次基线升级要重写事实 + 重翻译 + 重录 sidecar；全量不可行。**推荐只移植契约与规范内核**。

### 7.7 新技能领域评估

唯一值得过三锚测试的新领域是"持久化数据格式兼容性评审"：对象＝已持久化的数据格式及其 reader/writer（由项目自己的格式版本目录与类型声明限定）；产物＝兼容性评审记录（受影响格式、版本升降判据、unknown-data 策略、迁移路径、验证命令与输出）；判据＝类型指纹/归一化类型历史、reader corpus 测试、gate 输出。约 13 条 active notes 指向同一方法。

建议：**现在以 norm 承载**（`data.reader-compatibility`），观察一个发布周期；若采用方确实需要"迁移评审清单"，再按 forge 流程锻造 `dsh-spec-durable-format-review`。发布/包面治理（M3/M5）不列为技能候选：不同生态机制差异过大，做成通用技能会把包拖入生态假设。

## 8. 推荐顺序与工作量

| 阶段 | 内容 | 产出 | 依赖 | 估工 |
|---|---|---|---|---|
| **0 源与规范（本轮，无新技能）** | notes 契约 8 处修正 + 子树命令名；6–7 条 norms；1 条决策记录 + provenance；forge 增加上下文经济参考（agent-experience） | 契约、norms、记录、forge reference | 基线已升级；§9 Q5 确认范围 | 4–6 人日 |
| **1 P0 技能** | 散文纪律（prose+trim）；变更流程（pre-push+review+cordis 参考+fact-check）；notes 生命周期（archive+契约，脚本决策后） | 3 个已落地技能 | 阶段 0 的 norms/契约；§9 Q1、Q3 | 6–10 人日 |
| **2 P1 技能** | 文档与双语（translate+配对脚本）；验证可靠性（ci-test）；发布与升级（upgrade-guide） | 3 个已落地技能 | 阶段 1；§9 Q4、Q7 | 6–9 人日 |
| **3 P2/条件** | find-simplifications；speed-up-perf；merging-stacked-prs；record-browser-gif；UI 域（条件）；durable-format-review（先 norm 观察） | 按需 | 采用方需求证据 | 每项 1.5–4 人日 |

顺序理由：先把"规范与契约"这个所有技能的共同锚点做对（否则每个技能各写一份判据）；散文最便宜、上游最稳、先例最足；变更流程是包主旨的核心；notes 生命周期价值最高但受脚本决策约束，放在同阶段末；双语与验证可靠性是采用方第二层需求；发布/简化/性能/录制按需。

## 9. 待决问题（需要维护者拍板）

| # | 问题 | 选项 | 本报告建议 |
|---|---|---|---|
| Q1 | **脚本归属**：notes 封印/格式/链接检查（约 1.15k 行 + mdast bundle）与配对/briefing（约 2.4k 行）如何进包？ | A 每技能自带 `package/<skill>/` 打包；B 恢复一个共享引擎技能/包级 engine；C 只让确需脚本的技能自带，其余无脚本 | **C**：notes 脚本与其生命周期技能一起锻造（一个出资方）；translate 自带唯一需要的 pairing 脚本；其余技能无脚本 |
| Q2 | **目标集**：A 按域重建（4 技能）/ B 逐技能重建（8 技能）/ C 扩展（7 技能）？ | 见 §6.3 | **A**；若更看重触发精度选 B |
| Q3 | **变更流程合并还是独立**？ | A 合并 pre-push+code-review 为一个技能两阶段；B 独立、写死互斥边界 | **A**（方案 A 下）；选 B 时必须在两个 description 互写排除句 |
| Q4 | **双语是不是包的核心承诺**？ | A 是 → translate P1，配对脚本必须自包含；B 可选 → 降 P2，先只移配对合约与检查清单 | **A**（README 已有承诺，包自身文档就是双语对） |
| Q5 | **notes 契约修正 + norms 是否本轮做**？ | A 本轮做阶段 0；B 与 P0 技能同轮；C 只做契约不做 norms | **A**：它是所有技能的共同锚点 |
| Q6 | **UI 域是否进入这个包**？ | A 不进（client-ui-ux/artwork D，responsive-ui D）；B 进但只做一个合并 UI 技能；C 按现状分别移植 | **A**；若采用方有真实 UI 需求走 B，绝不要 C |
| Q7 | **发布与升级域是否进包**？`create-upgrade-guide` 排 P0 还是 P1？ | A P1（本报告）；B P0（产品档案主张，理由：三锚最全闭 + 迁移成本制度）；C 不进 | **A**：域的主旨贴合度低于前三者；若维护者认为采用方普遍有公开面与版本，升 P0 |
| Q8 | **命名**：一对一的沿用上游名，合并技能取什么名？ | A 一对一沿用，合并取 `dsh-spec-<领域>`；B 全部沿用上游名（合并后仍用其中一员的名字）；C 全部改 `dsh-spec-*` | **A**：一对一沿用使与上游 diff 可归因，合并技能名按对象取 |
| Q9 | **`gh stack` 依赖**：`merging-stacked-prs` 是否进包？ | A 接受，按 B 移植并重写授权边界；B 暂缓 P2；C 不移植，只保留 pre-push 的通用改写防护 | **B**：受众窄、与 `pr.lifecycle` 的授权边界冲突、`gh stack` 还不普及 |
| Q10 | **本文结论是否先落一条 `proposed/` Agent Note 再开锻造**？ | A 先记录（不移植内容、按域重建、provenance）再分批锻造；B 直接开锻造，记录随第一个技能落 | **A**：本文的组合判断本身就是需要留痕的决定，且 provenance 表要随第一个技能一起维护 |
| Q11 | **`record-browser-gif` 的 Python 运行时例外** | A 重写为 Node/TS；B 开 Python 例外并声明 compatibility；C 暂不进包 | **C** 当前；要进包时走 A |
| Q12 | **durable-format-review**：先 norm 还是直接锻造 | A norm 观察一个发布周期（本报告）；B 现在锻造；C 不做 | **A** |

## 附录 A：证据与复核命令

**基线**

```sh
git submodule status                                   # 687f282e86… submodules/dsh (dsh-v0.2.1-rc.2)
git -C submodules/dsh rev-parse 'dsh-v0.2.1-rc.2^{commit}'
git -C submodules/dsh ls-remote --tags origin | tail   # 最新 tag；origin/master HEAD 同 commit
git -C submodules/dsh diff --stat dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/skills .agents/notes AGENTS.md docs/AGENTS.md
pnpm test && pnpm run format:check
```

**技能**

```sh
git -C submodules/dsh diff --name-status dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/skills
git -C submodules/dsh diff dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/skills/<name>
wc -l -c submodules/dsh/.agents/skills/<name>/SKILL.md submodules/dsh/.agents/skills/<name>/references/*
git show main:skills/<name>/SKILL.md | wc -l            # 前次移植对照
```

**notes**

```sh
find submodules/dsh/.agents/notes/{proposed,implemented,rejected,archived} -name '*.md' ! -name '*.zh.md' | wc -l   # 1270 = 1267 note + 3 治理文件
find submodules/dsh/.agents/notes -name '*.i18n.yaml' | wc -l                                                      # 1268（含 README）
python3 - <<'PY'  # 三元组聚合与残缺检查（详见 notes 档案 §2.1）
…
PY
git -C submodules/dsh diff dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/notes/README.md docs/AGENTS.md
diff .agents/dsh-spec/notes/README.md <(git -C submodules/dsh show dsh-v0.2.1-rc.2:.agents/notes/README.md)
```

**本仓库现状**

```sh
find .agents/dsh-spec/notes/{proposed,implemented,rejected,archived} -name '*.md' ! -name '*.zh.md'   # 30 条
grep -o 'dsh-norm: [a-z.-]*' .agents/dsh-spec/norms/norms.md | wc -l                                  # 12 条
git ls-tree --name-only main:skills/                                                                  # v0.4.0 的 10 个技能
```

## 附录 B：上游技能原始规模

| 技能 | SKILL.md 行 | 全部文本字节 | 文本估算 token | scripts |
|---|---:|---:|---:|---|
| agent-experience | 19 | 2,093 | 0.6k | — |
| cordis-styling-nitpicking | 65 | 9,200 | 2.8k | — |
| dsh-archive-agent-notes | 68 | 6,721 | 2.0k | — |
| dsh-ci-test-reliability | 131 | 14,788 | 4.4k | — |
| dsh-client-ui-ux | 73 | 8,524 | 2.6k | — |
| dsh-code-review | 61 | 10,577 | 3.2k | — |
| dsh-create-upgrade-guide | 54 | 3,734 | 1.2k | 依赖 85 行门禁 |
| dsh-doc | 132 | 74,654 | 22.4k | — |
| dsh-error-handling | 30 | 2,389 | 0.7k | — |
| dsh-find-simplifications | 65 | 18,944 | 5.7k | — |
| dsh-merging-stacked-prs | 127 | 7,839 | 2.4k | — |
| dsh-official-plugin-artwork | 41 | 6,307 | 1.9k | — |
| dsh-pre-push-checks | 137 | 11,283 | 3.4k | — |
| dsh-prose-standard | 81 | 19,078 | 5.7k | — |
| dsh-responsive-ui | 54 | 3,256 | 1.0k | — |
| dsh-speed-up-perf | 92 | 12,167 | 3.7k | — |
| dsh-translate-docs | 74 | 10,604 | 3.2k | — |
| dsh-trim-cot-leakage | 45 | 25,245 | 7.6k | — |
| record-browser-gif | 172 | 34,518 | 5.0k | encode_gif.py 337 行 + test 103 行 |

合计约 78K token 文本、3 个脚本资产（notes 引擎、配对/briefing、GIF 编码器）。全部移植会让本包的技能面从 1 个膨胀到 20 个，加载成本与维护面都超出包的规模。

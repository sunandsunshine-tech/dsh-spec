# 基线产品/角色类技能移植档案

分析对象：`submodules/dsh/.agents/skills/` 下的 10 个产品/角色/工程类技能。
基线：`dsh-v0.2.1-rc.2` = `687f282e8625c6b8d11ff58211a90524be2e4317`；对比修订：`dsh-v0.2.0-rc.2` = `639ed015397290b3745d163aafe02ffee4aa3f84`。
读者：决定下一轮锻造方案的维护者。

## 方法与口径

**三锚检验**（`.agents/dsh-spec/notes/implemented/process/2026-10-22-the-forge-marks-the-abstraction-ceiling.md:25-33`）：

| 锚 | 判据 |
|---|---|
| 对象闭合 | 实例由技能之外的模式/规范界定，不是技能自己发明 |
| 产物闭合 | 交付物有固定字段和可检查形状 |
| 判定锚点 | 检查是机械的或直接有证据的，不只是技能/对象自己的断言 |

这 10 个技能大多低于 forge 的抽象层级，属于"具体任务辅助"。三锚在这里不是准入门槛，而是**移植深度的判据**：锚越少，重绑后越容易退化成散文，程度就越应偏向 C/D。

**程度**：A 原样移植（只换名字/取值，正文基本不动）；B 重绑定为通用技能（对象/产物/锚点按采用方重新锚定，实质改写）；C 抽取并入（只取一部分并入他技能或包规范）；D 不移植（产品专属，或移植后不过锚）。
**优先级**：P0 下一轮锻造首选；P1 随后（或作为 small change 并入）；P2 候补；不移植。
**dispositions**（`skills/dsh-spec-skill-forge/references/2-analyze-and-dispose.md:12-17`）：adapt 指称存在仅取值不同；re-bind 无指称或名称不同，抽象到目的再找等价手段；dissolve 不携带并说明谁接手。
行号均指该技能目录下 `SKILL.md`（另有说明者除外）；字节数取自 `wc -c`；token 按 forge 默认英文 0.3 tokens/字符估算，script 只在被调用时载入，单独标注。文中「peer 组」指并行的另一份分析（task-1 的 9 个流程/规范类技能：`agent-experience`、`dsh-archive-agent-notes`、`dsh-code-review`、`dsh-doc`、`dsh-find-simplifications`、`dsh-pre-push-checks`、`dsh-prose-standard`、`dsh-trim-cot-leakage`、`dsh-translate-docs`）。

**一个必须写明的上下文**：`main`（v0.4.0）已发布的 10 个技能里，本组一个都没有被移植（`git show main:skills`）。其中 6 个在 0.2.0 基线里已存在，4 个是 0.2.1 新增。上一轮把它们整体留在基线里，可能是判断、也可能是未逐条评估；本档案按锚点重新判定，不把旧结论当依据，但把它作为成本现实的旁证。

---

## 一、总览表

| 技能 | 一句话作用 | 对象闭合 | 产物闭合 | 判定锚点 | 建议领域 | 建议程度 | 合并/拆分 | 优先级 |
|---|---|---|---|---|---|---|---|---|
| `cordis-styling-nitpicking` | 从 Cordis 插件入口审所有权与生命周期，只报可证的 P0 | 部分（Cordis 插件图） | 部分（固定字段报告，无 checker） | 部分（三规则自述；框架源码与复现测试可核） | 代码质量/生命周期缺陷 | C | 并入 `dsh-code-review` 作 `references/ownership-lifecycle.md` | P2 |
| `dsh-ci-test-reliability` | 设计/审查/诊断并发、共享资源、时钟与异步清理下会非确定失败的测试 | 部分（测试 + runner/CI 拓扑） | 开（无固定交付物，证据是运行记录） | 强（负控制、并发复现、静止清理均可执行验证） | 测试可靠性 | B | 独立技能；被 `pre-push-checks`/`code-review` 引用 | P1 |
| `dsh-client-ui-ux` | DSH 客户端 UI 的判断类规范：token 复用、反馈面、浮层、加载、平台窗口 | 不闭合（DSH 设计系统） | 开（UI 变更无固定字段） | 弱（自称 lint 管不到的判断；i18n/字重/审批可查） | UI/UX | D（UI 域获批则 C） | 若做 UI 域：被 `responsive-ui` 吸收 | 不移植 |
| `dsh-create-upgrade-guide` | 外部可感知面被破坏时，在同一变更写固定格式的迁移指南并过门禁 | 闭合（枚举外部可感面 + 版本语义） | 闭合（固定 frontmatter/章节 + 85 行 gate） | 强（路径/结构/词数机械可查；内容靠散文评审） | 发布与升级 | B | 工作流独立；模板/kind 归 `dsh-doc` | **P0** |
| `dsh-error-handling` | 失败的类型化、处理归属与状态保证，以及可见可行动的本地化报告 | 不闭合（任何失败路径） | 开（无交付物） | 弱（原则来自文献；唯一可执行要求是验证最终状态） | 错误处理 | C（并入 norms 的 failure 组） | 拆入 norms + `code-review` 引用 | P1 |
| `dsh-merging-stacked-prs` | 用 GitHub 官方 stack 对象与 `gh stack merge` 落地依赖 PR 链 | 闭合（GraphQL `PullRequest.stack` 外部 schema） | 可机械验证（每个 PR `MERGED`、剩余层成链、依赖数为 0） | 强（查询 live API 状态） | 变更流程（PR 生命周期/合入） | B | 独立；与 `pre-push-checks` 的 post-sync 段划界 | P2 |
| `dsh-official-plugin-artwork` | 画/审官方插件图标与功能预览：题旨、比例、字母、透明、导出、审批 | 不闭合（只有存在官方资产目录的项目才有对象） | 部分（36×36 viewBox、自包含 SVG） | 部分（SVG/目录门机械可查；审美与审批靠人判） | 素材/品牌视觉 | D | 若做 UI 域：溶解进 UI 技能的资产节 | 不移植 |
| `dsh-responsive-ui` | 响应式布局、截断、标题换行、纯图标控件、悬停/提示、宽度变化焦点 | 部分（Web 响应式布局，CSS 语义外部） | 开（页面行为，浏览器可核） | 较强（390px、`@media (hover:hover)`、tooltip、无横滚可核） | UI/UX | C（并入新 UI 技能；不开 UI 域则 D） | 与 `client-ui-ux` 合并为一个通用 UI 审查技能 | P2（条件） |
| `dsh-speed-up-perf` | 把"让它更快"变成可复现的用户路径测量与证据化修复 | 不闭合（项目自有用户路径） | 半（测量卡 7 字段 + 项目基准 lane） | 较强（测量/负控制/行为测试可执行；真实性靠判断） | 性能 | B | 独立；引用 `ci-test-reliability` | P2 |
| `record-browser-gif` | 把浏览器交互录成可验证 GIF，并按需 attach/资产分支发布；录制与发布分离 | 部分（浏览器应用 + PR 平台） | 闭合（编码器验证的 GIF + JSON 摘要 + 103 行测试） | 强（编码器断言 + 发布后 API 核验；演示真实性靠人） | 素材录制/证据录制 | B | 独立；`artwork`/`speed-up-perf` 引用 | P2 |

统计：10 个技能合计 `SKILL.md` 839 行 / 79,662 B（约 2.4 万 token），另有 references 60 行 / 5,346 B、scripts 440 行 / 17,714 B。若全部按原样移植，装入后加载成本明显超过一个包应有的规模；P0/P1 的选择必须做减法。

**结论摘要（给维护者）**

- 三锚全闭的只有 `dsh-create-upgrade-guide`：对象有外部清单、产物固定、判据有 85 行可移植门禁。它是本组唯一的 P0。
- 最通用、最值得留的不是新增的 4 个产品技能，而是两个"过程型"技能：`dsh-ci-test-reliability`（B，P1，补证据可信度）与 `dsh-error-handling`（C，P1，进 norms 的 `failure` 组，不单独做技能）。
- 判 D 的两个（`dsh-client-ui-ux`、`dsh-official-plugin-artwork`）都是"去掉产品设计系统/资产目录后只剩审美散文"；`dsh-responsive-ui` 只在维护者决定开 UI 域时作为合并后的骨架。
- 合并主方向：cordis → `dsh-code-review` 的 reference；error-handling → norms；upgrade-guide 的模板/kind → `dsh-doc`；merging-stacked-prs 与 `pre-push-checks` 划界；record-browser-gif 是 GUI 证据的 owner，另两个技能只引用。
- 两个可移植脚本资产中真正干净的是 `record-browser-gif/scripts/encode_gif.py`（只依赖 python3/ffmpeg/ffprobe），但它与包的 Node 脚本管线冲突，是否破例是维护者决定。

---

## 二、逐技能分析

### 1. `cordis-styling-nitpicking`（0.2.1 新增）

**作用与触发**：在代码评审或定向生命周期审计中，从 Cordis 插件的导出入口（`apply` 或具体默认导出）出发，审计模块初始化、注册服务、监听器、effect、disposer 与可达调用，只报告三条 P0 规则（全局单例状态、未回收副作用、清理依赖早于消费者完成）中可证实的违规。触发词是"审查 Cordis 插件"与 pull request；它明确排除无关 helper、构建工具、CLI 路径与测试作为缺陷目标（`:8`）。

**结构**：`SKILL.md` 65 行 / 9,200 B；无 `references/`、`templates/`、`scripts/`。0.2.0 无此目录，0.2.1 新增 65 行/9,200 B（`git diff --stat dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/skills/cordis-styling-nitpicking`）。

**核心对象与产物**：对象是"从插件入口可达的所有权图"（注册—使用—释放）。产物是一份 P0 审计报告，字段由 `Reporting` 固定：源码位置、插件根、消费者、资源所有者、失败交错、可观察影响、修正、确定性验收测试（`:61-63`）；若调用方给结构化输出 schema，则按该 schema 报告（`:65`）。

**判定标准来源**：机械/可核的部分是框架语义（`ctx.on()`/`ctx.plugin()`/`ctx.effect()` 自带回收；`vendor/cordis/src/fiber.ts` 兄弟 disposer 并发、`reflect.ts` 服务撤回的时序，`:41`）和"可证的失败交错 + 确定性验收测试"（`:59`）；不可机械判的是 P0 归类、"谁拥有该 effect"、报告是否已穷尽（技能自己声明"不得声称穷尽安全"，`:63`）。三条规则是技能自述，但每条都要求落到框架源码或可复现交错上，因此**弱锚点被证据要求部分补上**。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `DeepSeek Harness Cordis 插件`（description `:3`、标题） | re-bind | 采用方插件/依赖注入框架名，从声明位置读取 |
| 入口 `apply` / 具体默认导出（`:8`） | adapt | 采用方框架的插件入口约定 |
| `../../../AGENTS.md`、`docs/cordis-tutorial/02-lifecycle-and-effects.md`、`03-services.md`、`docs/defensive-patterns/general.md`（`:12-15`） | dissolve | 采用方的架构/生命周期规则文档；包不携带产品文档树 |
| `ctx.effect/ctx.on/ctx.plugin/ctx.provide`、`this.ctx`、`inject`（`:20-55`） | re-bind | 框架的"注册即效果、注册返回 disposer"等价原语；无此语义则退化为显式 cleanup 契约 |
| `vendor/cordis/src/fiber.ts`、`reflect.ts`（`:41`） | dissolve | 采用方框架源码或版本化 workaround 文档 |
| "function plugin + yielded effects" 具体补丁（`:45-55`） | dissolve | 由采用方框架版本自行解决；包不携带框架补丁 |
| Agent Note 提议 + supersession check（`:63`） | adapt | 采用方的决策记录机制 |
| 结构化输出 schema、P0 严重级（`:65`） | adapt | 采用方评审报告的字段与严重级定义 |

**通用内核**：三个缺陷类别（进程级单例、未回收副作用、清理依赖早于消费者完成）+ 证据纪律（合法交错、可观察影响、确定性验收测试、区分"仅源码发现"）。这三类在任意插件/服务框架（Cordis、DI 容器、事件总线、进程管理器）都成立，但解除 Cordis API 之后，判定要依赖采用方框架释放语义的文档，否则只剩"审查所有权"这句空话。

**移植建议**：领域＝代码质量/生命周期缺陷；程度 **C**。理由：对象只有在 Cordis 才有现成闭合边界；重绑成通用框架审计后，原 65 行里约 50 行是 Cordis 专有语义（`ctx.effect`、`yield disposer`、fiber 并发、`provide` 撤回），保留的只是三个缺陷类别与报告字段。它不构成独立触发面（"审 Cordis 插件"在包的目标项目里不存在），却正好是 `dsh-code-review` 的一个阻断项（基线 `dsh-code-review/SKILL.md:35` 第 4 条就是引用它）。最省的形态是 **`dsh-code-review` 的 `references/ownership-lifecycle.md`**：三问清单 + 证据要求，约 25-35 行。

**合并与拆分**：并入 `dsh-code-review`（peer 组的方向，`code-review` 在基线里是引用它的 hub）。合并方向：**本技能 → code-review 的 reference**，不反向。跨组注意：如果维护者判定 `dsh-code-review` 不移植，则本技能直接 D，不要单独为"生命周期审计"开一个技能——它没有独立触发面。

**成本与风险**：重写约 70-80%（65 行只剩 15-20 行可留）；移植后正文约 3-4 KB（1.1-1.3k token），但作为 reference 只需在评审时加载。无 script 风险。触发边界风险：若保留独立技能，"所有权/释放"触发词会与 code-review、防御性模式文档互相抢触发；并入 reference 后消失。

---

### 2. `dsh-ci-test-reliability`（0.2.0 已有）

**作用与触发**：设计、审查、诊断在 CI 并发、共享主机资源、时钟、进程全局状态、子进程、网络监听器或异步 teardown 下可能非确定失败的测试与 fixture；用于新增/修改这类测试、排查 flaky CI、审查测试隔离（`:3`）。它明确不替代测试分层策略，也不负责为一次 push 选命令（`:8`），并在推送前把手交给 `dsh-pre-push-checks`（`:131`）。

**结构**：`SKILL.md` 131 行 / 9,442 B；`references/ci-flake-diagnosis.md` 60 行 / 5,346 B。0.2.0→0.2.1 只有 1 行改动：`docs/defensive-patterns.md` → `docs/defensive-patterns/general.md`（`:13`），其余不变。

**核心对象与产物**：对象是测试与 fixture 对宿主资源、全局状态、时钟和进程生命周期的使用，以及测试执行拓扑（同文件 → worker 进程 → 仓库门禁进程 → 共享 runner 的 job，`:20-25`）。产物不是文件，而是一次改动的**可靠性证据**：资源所有权、原子分配、就绪信号、清理注册、静止完成信号，以及"先复现再修"的负控制。诊断路径的产物是分类结论 + 复现的最小拓扑（reference `:13-60`）。

**判定标准来源**：多数是**可执行证据**：回归能在修复前失败、负控制在真实 runner 失败、并发独立进程复现、恢复现场精确（`try/finally`、`afterEach` 兜底，`:49-54`）、清理等到静止信号（`:85-89`）、timeout 与 lane 预算比较（`:67-73`）。可机械核对的有 `listen(0)`、`mkdtemp`、Windows/POSIX 语义差异（`:35-65`）。不可机械判的是"哪些断言算削弱""flake 分类归属哪一类"——reference `:14-27` 用证据规则约束，但仍需人判断。整体是**判据最可执行**的一个（对象与产物仍开，靠证据纪律补）。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `DeepSeek Harness tests/fixtures`（description `:3`、标题） | adapt | 采用方产品名/测试套件名 |
| `docs/testing.md` 测试层策略（`:12`） | dissolve | 采用方测试策略；没有则技能给通用分层判据（单元/集成/录制/端到端） |
| `docs/defensive-patterns/general.md`（`:13`） | dissolve | 采用方生命周期/并发规则文档 |
| 当前 Vitest 配置与 GitHub workflow（`:14`）、Actions job/runner（`:23-25`）、`--testTimeout`（`:69`） | adapt | 采用方的 runner、CI 平台与 worker 拓扑（声明位置） |
| `snapshots/AGENTS.md` 录制会话（`:15`） | re-bind | 采用方的 recorded-output/snapshot 机制（若有；没有则溶解该条） |
| `../dsh-pre-push-checks/SKILL.md`（`:16`、`:131`） | adapt | 包内 pre-push 技能（若移植）；否则改为"推送前的检查选择"一般表述 |
| `listen(0)`、`mkdtemp`、`afterEach`、`process.env`、`cwd`、fake timers（`:35-54`） | keep | 通用 API/概念，保持 |
| Windows/POSIX 语义、Actions 日志与 runner 证据（`:58-65`、reference `:11-24`） | adapt | 采用方的平台矩阵与 CI 证据入口 |
| real-API 重试例外策略（`:114`） | re-bind | 采用方对外部服务边界的重试政策；不得泛化到本地测试 |

**通用内核**：执行拓扑建模、资源原子分配、进程全局状态限制与精确恢复、平台自有语义、timeout 与 lane 预算、以状态（而非 sleep）同步、静止 teardown、先证回归再修、拒绝掩盖式修复（加 timeout/重试/串行/吞错/弱断言）、flake 诊断六类分类与最小复现阶梯。这套东西与语言/框架弱绑定，是**跨项目最可复用**的通用工程知识之一。

**移植建议**：领域＝测试可靠性；程度 **B**。理由：锚点强、通用性高、重写量低（只换 runner/CI/文档指针，约 15-25%），且能补上包"what proves it"里最缺的一块：证据本身是否可信。代价是体量（约 4.4k token，若含 reference），以及它必须和 `pre-push-checks`（选择命令）、`code-review`（测试强度）划清边界，否则触发互相吞。

**合并与拆分**：**独立技能**，保留 `SKILL.md` + `references/ci-flake-diagnosis.md` 的两层结构（诊断是独立任务，按需加载，符合 forge 的资源策略）。跨组关系：`dsh-pre-push-checks`（peer）继续在"选择出站证据"处引用它；`dsh-code-review`（peer）在测试强度/可靠性处引用它；二者不吸收正文。保留上游 reference 文件名 `references/ci-flake-diagnosis.md`，便于与基线做目录级差分。

**成本与风险**：重写约 15-25%；移植后约 13-14 KB（约 3.9-4.2k token，含 reference）。无 script。风险：(1) 体量大，触发词"flaky test"会与 pre-push、code-review 抢；(2) 若采用方没有 CI 平台矩阵或 snapshot 机制，部分条款要声明为可选/溶解，否则变成空要求；(3) 基线明确把"选命令"排除在外，移植时必须保留这句边界，否则会和 pre-push 重叠。

---

### 3. `dsh-client-ui-ux`（0.2.0 已有）

**作用与触发**：DSH 客户端 UI 变更的判断类规范：视觉 token 纪律与复用优先、反馈面选择（toast vs in-place notice vs empty state）、加载态、浮层/菜单安全、平台窗口适配、间距审查、设计评审升级（`:3`、`:8`）。它自我定位为"guidance, not a complete checklist"，只管 lint/typecheck/i18n 门管不到的判断（`:8`）。

**结构**：`SKILL.md` 73 行 / 8,524 B；无 references/templates/scripts。0.2.0→0.2.1 为 +12/-1：新增 `## Architecture prerequisites`（`:12-15`，指向 `packages/client/AGENTS.md` 与 `docs/defensive-patterns/client-components.md`）；反馈面一节的起句被替换为引用 `dsh-error-handling`（`:34`）；新增 `## Responsive layouts` 指针（`:59`）。

**核心对象与产物**：对象是 DSH Web/客户端 UI 变更（页面、组件、浮层、加载态、平台窗口）。产物没有固定文件：一段 UI 变更本身，加上评审意见/设计审批。没有 schema、没有 gate，也没有可机检的完成判定。

**判定标准来源**：技能自己说得很清楚：这些是 lint、typecheck、i18n 门做不了的判断（`:8`）。可机械/直接查的只有少数：token 是否已存在（搜索既有页面，`:19`）、字重是否 ≤500（`:22`）、i18n 门（`:8`）、设计师审批（`:73`）。其余是"做得像不像既有页面"的审美判断，且大量以 DSH 自己的页面（Plugins 页、RowActionToast、`--dsh-frame-top-clearance`）为参照。**三锚里两个开**。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `packages/client`、`packages/client/AGENTS.md`、`ui-primitives` catalog（`:3`、`:12-15`、`:8`） | dissolve | 采用方的设计系统/组件目录（声明位置） |
| `docs/web-styling.md` token 规则、locale-owned copy 决策（`:8`） | dissolve | 采用方 styling 与本地化规范 |
| Toast / `shell.overlay` / RowActionToast / sidebar slot / HoverCard / Tooltip / Skeleton（`:30-39`、`:43`） | re-bind | 采用方的反馈、浮层、加载原语（名字由声明位置给） |
| `--dsh-frame-top-clearance`、`[data-platform='darwin']` 覆盖（`:63-64`） | re-bind | 采用方的平台窗口/安全区变量与覆盖方式 |
| Plugins 页、Session 统计、输入框 model selector、自动化任务会话（`:21-22`、`:28`、`:37`） | adapt | 换采用方的同类页面例子，或删除 |
| 中文通知两句内省略句号（`:39`） | dissolve | 采用方语言/文案规范；中文项目可保留 |
| 设计师/产品评审 roster（`:73`） | dissolve | 采用方的审批角色与名单来源 |
| `dsh-error-handling`、`dsh-prose-standard`、`dsh-responsive-ui` 引用（`:8`、`:34`、`:59`） | adapt | 包内对应技能（若移植） |

**通用内核**：复用优先于新增；反馈面的寿命必须长于产生它的面板（toast 要在外面板宿主里，失败不空白化）；验证浮层的可关闭/适配视口/不被裁剪三件事；一页一种加载处理；间距对称 + 有意留白；用户可感知的 UI 变更需要设计/产品评审。这些判断在**已有设计系统的 Web 项目**里成立，但每一项都要先知道采用方的 primitive 与 token 名称，否则无法执行。

**移植建议**：领域＝UI/UX；程度 **D**（若维护者决定开 UI 域，则降为 C）。理由：DSH 绑定集中在对象与判据上——去掉 DSH 的 token/primitive/页面例子后，剩下的是"做 UI 时要考虑复用、反馈、浮层、加载"的散文，而对象（采用方设计系统）、产物（无固定形状）、判据（审美 + 项目内部规范）三锚开两个，按天花板注记的口径已属"prose"。包若移植它，等于把"某项目 UI 品味"当通用能力卖，正是包要避免的缺陷。**若**维护者认为 UI 域值得开，正确做法是只做一个以 `responsive-ui` 为基底的通用 UI 审查技能，把本技能中少数可判定条款（反馈面寿命、浮层三检、复用优先）折进去，而不是两个技能并存。

**合并与拆分**：与 `responsive-ui` 合并，方向 **client-ui-ux → responsive-ui 基底**（后者的规则更具体、更少 DSH 绑定，适合当骨架）。与 `official-plugin-artwork` 的关系：artwork 是本技能"图标来自既有库、新 glyph 需审批"（`:28`）的特例，若 UI 域成立应作为资产节溶解进来。

**成本与风险**：重写约 70-75%；通用部分约 2.5-3 KB（0.8-0.9k token）。无 script。主要风险是**伪通用**：DSH 的 token/primitive 一旦换成抽象词，执行者仍需采用方的设计系统声明，包却给不出这个声明机制；触发词"UI 变更/review UI"又会与 code-review 抢。

---

### 4. `dsh-create-upgrade-guide`（0.2.0 已有）

**作用与触发**：当 DSH 的一次变更破坏了仓库外部可观察的面（CLI/命令/flag/profile、`cordis.yml` 与 settings key、持久用户数据 Session/SQLite、TS/Python SDK、JSON-RPC/HTTP/ACP、发布包名与入口），或改动了未发布升级指南已覆盖的面时，在**引入破坏的同一次变更**里写或更新 `docs/upgrade-guide/v<version>/<item>/guide.md`（`:3`、`:8`）。它解决的读者是"从 vT 升到下一版的人要改什么"（`:8`）。

**结构**：`SKILL.md` 54 行 / 3,734 B；无自带 references/templates/scripts，但依赖 `dsh-doc` 的 `templates/upgrade-guide.md`（29 行，`dsh-doc/templates/upgrade-guide.md`）。0.2.0→0.2.1 **无变化**（`git diff --stat` 无输出）。支撑它的机械门是 `scripts/verify-upgrade-guides.ts` 85 行 / 4.7 KB（另计）。

**核心对象与产物**：对象是"外部可感知的破坏性变更"，由 `:12-18` 的五类清单加版本语义界定（这是外部约定，不是技能自造）。产物是闭合的三件套：`guide.md`（英文）、`guide.zh.md`（中文）、`guide.i18n.yaml`（配对记录），每项目录只许这三个文件（`:28`）；`guide.md` 固定 `kind: upgrade-guide` + 一句 description、一个 `#` 标题 + 恰好 `## Change`/`## Migration` 两节、≤500 词（`:38-40`）；中文侧固定 `## 变更`/`## 迁移`。位置、版本（根 `package.json` 的版本）、维护规则（版本未变时目录描述到当前 master 的 delta、版本 bump 后冻结）都写死（`:24-32`）。

**判定标准来源**：**机械门** `verify-upgrade-guides.ts` 检查：只允许 `v<semver>/<kebab-item>/guide.{md,zh.md,i18n.yaml}`、frontmatter keys 恰为 `description,kind`、`kind` 值、非空 description、标题层级与章节、英文 500 词上限（`scripts/verify-upgrade-guides.ts:15-48`）。另有配对门 `verify-translation-pairing --write`（`:46`）与链接门 `verify-md-links`（`:53`）。不可机械判的是"这个破坏是否外部可感知"（清单给了边界）和 "Migration 步骤是否真的可确认"（靠散文评审）。三锚全闭，是本组唯一。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `docs/upgrade-guide/v<version>/<item>/guide.md` 固定位置（`:24`） | adapt | 采用方声明的迁移指南根；默认可用同一约定 |
| `<version>` = 根 `package.json` 的 version（`:26`） | adapt | 采用方的版本源（声明位置：package.json/版本文件/tag） |
| 外部可感知面清单（dsh 命令/profile、`cordis.yml`、Session/SQLite、SDK、JSON-RPC/HTTP/ACP、包入口，`:12-18`） | re-bind | 采用方的公开面清单：CLI、配置键、持久数据、公开 API/协议、包入口 |
| `dsh-doc/templates/upgrade-guide.md`（`:36`） | adapt | 随技能携带模板，或由采用方的 docs 技能提供模板/kind |
| `verify-upgrade-guides`（`:36-40`） | adapt | 移植为包内 Node 检查（源放 `package/<skill>/`，经 `skill:build` 打包），或采用方自有门禁 |
| `guide.zh.md` + `guide.i18n.yaml` + `verify-translation-pairing --write`（`:28`、`:46`） | re-bind | 采用方的双语/配对机制；单语项目溶解为单一 `guide.md`，不强制双胞胎 |
| `docs/AGENTS.md` 双语配对规则（`:46`） | dissolve | 采用方文档规范 |
| `dsh-prose-standard`、Agent Note 链接（`:44-46`） | adapt | 包内散文纪律/决策记录（若移植） |
| `master`、`dsh` 产品名（`:26`、`:32`） | adapt | 采用方默认分支名与产品名 |

**通用内核**：**在引入破坏的同一次变更里**写迁移指南（不推迟到发版）；"外部可感知"的边界清单；一目录一破坏、固定两侧文件与配对记录；`Change`（旧/新行为 + 谁受影响）+ `Migration`（按序列出精确文件/key/命令/symbol + 如何确认迁移成功）两节；500 词上限（超了就链接源码/把理由移进决策记录/把重复步骤做成脚本）；版本未变时持续更新、版本 bump 后冻结、永不跨一个 release；发布前跑门禁。这套东西与语言无关，任何有公开面与版本的项目都成立，**且天然属于"变更必须携带什么"的包主旨**。

**移植建议**：领域＝发布与升级；程度 **B**。理由：三锚全闭（对象有清单、产物有固定形状、判据有 85 行可移植的机械门），是本组里唯一能按 forge 标准"向下实例化"的候选；重写只发生在位置/版本源/双语机制/门禁指针上（约 45-50%），核心工作流原样成立。它对包的独特价值：包已有一条决策"迁移成本是设计约束"（`.agents/dsh-spec/notes/implemented/process/2026-09-22-migration-cost-is-a-design-constraint.md`），而升级指南正是把迁移成本写进变更的制度化工具。**这是本组第一优先**。

**合并与拆分**：与 peer 组的 `dsh-doc` 有明确分工：`dsh-doc` 拥有 kind 系统与模板（基线 `dsh-doc/SKILL.md:60` 已把 upgrade-guide kind 指向本技能），本技能拥有范围、放置、维护、长度与验证。方向：**模板/kind 归 `dsh-doc`，工作流独立成技能**（与上游同构）；若 `dsh-doc` 不移植，则模板与本技能同船携带。与 `dsh-prose-standard`（散文覆盖）和双语技能是引用关系，不合并。跨组待决：若维护者决定把 upgrade-guide 当作 `dsh-doc` 的一个 kind 而不单独锻造，则本轮 P0 改为 `ci-test-reliability`（见待决问题 Q1）。

**成本与风险**：重写约 45-50%；正文约 3.5-4 KB（1.0-1.2k token），模板 29 行（909 B），门禁 85 行 TS（4.7 KB）需按包内脚本布局重写（预计 100-140 行，因去掉 `js-yaml`/使用仓库既有 mdast 或手写 frontmatter 解析）。风险：(1) 位置与版本源是采用方约定，必须有默认值 + 声明位置覆盖，否则技能无法触发；(2) 双语配对是 DSH 产品机制，采用方未必有——必须重绑为可选，不能把"必须写中文侧"带进通用文本；(3) 若采用方没有 docs 树，门禁要有 `--root` 与空语料失败规则（包已有"空语料判失败"的边界）；(4) 触发边界与"写文档/更新 README"要划清：只有当公开面被破坏且旧用户需动手时才触发。

---

### 5. `dsh-error-handling`（0.2.1 新增）

**作用与触发**：设计与审阅失败处理时的原则：预期失败要有声明类型、稳定判别符与处理相关信息；catch 只限制传播，不撤销已发生的变更，只有状态的所有者才能建立安全继续；报告要本地化、可行动、可见；不可信状态/未知结果必须显式暴露；验收要看结果状态与可见结果，而不是"异常被 catch 了"（`:8-26`）。触发面是任何失败/恢复/重试/后台任务/用户可见错误。

**结构**：`SKILL.md` 30 行 / 2,389 B；无 references/templates/scripts。0.2.0 无此目录，0.2.1 新增 30 行/2,389 B。

**核心对象与产物**：对象是"失败"及其归属（任何代码的失败路径）——开放；产物是处理决策与报告本身——不闭合，无文件、无字段、无 checker。它是**原则清单**而非工作流。

**判定标准来源**：原则锚在外部文献（Meyer 1997 契约与不变式、Sutter 1999 异常安全保证、Armstrong 2003 隔离与监督，`:28-30`），这是本组里唯一有**具名外部来源**的技能；但技能没有提供任何机械检查。"Verify resulting state and visible outcomes, not merely that an exception was caught"（`:26`）是可执行的验收指令，但要由人执行。三锚开两个。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| 标题 `DeepSeek Harness Error Handling`（`:6`） | adapt | 去掉产品名 |
| `assertNever`、TypeScript 专名（`:12`） | dissolve | 语言无关化： "不可达分支的断言错误可以保持普通 `Error`" |
| "receiving application's locale mechanism"（`:22`） | re-bind | 采用方的本地化机制/报告面 |
| "UI or default-enabled, accessible logs"（`:24`） | re-bind | 采用方的可见面（UI、日志、告警） |
| Meyer/Sutter/Armstrong 三本文献（`:28-30`） | keep | 通用知识来源，保留 |

**通用内核**：类型化失败与稳定判别；处理/报告所有者、containment 与状态保证要写进 owning API 文档；catch 不撤销变更；日志不是恢复；重试要有安全重复、取消与预算；最终报告要有摘要、受影响操作、安全下一步；不可信状态持续可见；不无保证地声称成功/回滚/可重试；验收看状态不看 catch。这些是**通用工程规范**，与语言无关。

**移植建议**：领域＝错误处理；程度 **C**（并入包规范）。理由：它没有对象/产物/判据闭合，做成独立技能会是一个永远触发、无法验收的"原则技能"——正是包要避免的"两句失败锚就是散文"。但它的内容值得留：作为 `norms` 的 **failure 组**（3-4 条红线：类型化与归属、catch 不撤销变更/日志不是恢复、不可信状态可见、验收看最终状态），加上 `dsh-code-review` 引用该组；成本约 5-8 行规范 + 1 个引用。若维护者坚持技能形态，则降为 C 的另一变体：并入 `dsh-code-review` 的 error-handling 检查清单，不单独触发。

**合并与拆分**：拆入 **norms 的新组 `failure`**；`dsh-code-review`（peer）在错误处理检查处引用。与 `dsh-prose-standard` 的"可见文案"有轻微重叠（报告要可读），但 owner 不同：prose 管语言，本条管失败语义。跨组注意：基线 `dsh-code-review/SKILL.md:25,42` 与 `dsh-client-ui-ux/SKILL.md:34` 都引用它，说明在上游它本就是 leaf；包内用 norms id 引用比用技能名更稳。

**成本与风险**：重写约 5-10%（几乎全文可用）；norms 形态约 0.5-0.8 KB（0.2k token）。无 script。风险：作为技能会"永远相关"导致触发泛化；作为 norms 则要处理与现有 `test`/`evidence` 组的归属（我建议单开 `failure` 组，不要塞进 test，因为失败处理覆盖非测试代码）。

---

### 6. `dsh-merging-stacked-prs`（0.2.0 已有）

**作用与触发**：落地一条依赖 PR 链（A ← B ← C，每层基于下一层）时，使用 GitHub 原生 stack 对象与 `gh stack merge`，禁止用 `gh pr merge` + `gh pr edit` 手工模拟栈语义（`:3`、`:8`）。触发词："stacked PRs"、"PR stack"、"dependent PRs"、合并基分支是另一 open PR 的 PR。它要求同仓库依赖链在落地前必须是官方 stack（`:3`）。

**结构**：`SKILL.md` 127 行 / 7,839 B；无 references/templates/scripts。0.2.0→0.2.1 **无变化**。

**核心对象与产物**：对象是 GitHub 官方 stack（GraphQL `PullRequest.stack` 与 `stackEntry.position`，`:20-45`），它的成员/顺序/目标分支由 GitHub 的外部 schema 界定，不是技能自造。产物是"已落地的栈状态"：每个选中 PR `MERGED`、剩余层仍成链，分支删除前依赖数为 0（`:101-117`），全部可用 `gh` 查询机械验证。

**判定标准来源**：机械可查：`gh stack --version`（缺失即 hard-stop）、同仓库限制（`:12`）、GraphQL 查询的 stack number/trunk/entries/positions（`:48-64`）、`gh pr view` 的 MERGED/mergeCommit（`:104-107`）、`gh pr list --base` 长度为 0（`:111-117`）。不可机械判的是"是否该刷新"（`:68-75`）与"expected order"的意图判断，但都由 live 状态约束。三锚全闭，依赖外部工具可用性。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `gh stack` 扩展/服务端 stack 特性、版本门（`:12`） | keep | 外部工具契约，原样保留（hard-stop 保留） |
| 同仓库限制、跨 fork hard-stop（`:12`） | keep | GitHub 外部语义，保留 |
| `PullRequest.stack` / `stackEntry.position` GraphQL（`:20-45`） | keep | 外部 schema，原样 |
| `../../../AGENTS.md` 允许的 merge-forward/rebase 历史（`:8`） | dissolve | 采用方的历史/合并规范（声明位置） |
| `docs/cookbook/responding-to-pr-review-on-a-stack.md`（`:8`） | dissolve | 采用方的 stack 评审传播规则 |
| `<owner>`/`<repo>`/`<pr>` 命令占位（`:16-46`、`:87-117`） | keep | 占位符保持 |
| merge queue 行为、`--yes --merge`（`:97`） | keep | GitHub 语义，保留 |
| 合入是维护者授权的动作（包规范 `pr.lifecycle`） | re-bind | 保留"合入需授权"边界：技能准备与验证，合入由维护者点下；不得沿用上游的自动合入语境 |
| `gh stack sync`/`checkout`/`rebase` 的刷新路径（`:68-75`） | keep | 外部工具语义 |

**通用内核**：官方的 stack 对象是唯一权威（不用 base 分支推断）；落地前 re-query；缺成员只在作者一致时自动 link，作者不一致先问；已有 stack 不自动重构/重排；只在需要时刷新，改写后重审；"land the stack"指整栈，部分落地要显式边界 PR；用 stack API 合入，不绕过 merge requirements；合入后等到 MERGED、验证剩余层、删分支前查依赖数；任何重写后重新审计 review/approval/checks。

**移植建议**：领域＝变更流程（PR 生命周期/合入）；程度 **B**。理由：锚点强，但对象依赖 GitHub 的一个较新的原生特性（gh stack + 服务端 stack），且**与包的 `pr.lifecycle` 规范存在语义冲突**：包规范说"合并是维护者的行为，由代理请求、维护者回答"，上游技能则是代理可直接 `gh stack merge --yes`。重绑时必须把"授权边界"重写清楚（技能做预检与验证，合入动作等维护者授权），否则移植即违反包自己的规范。受众也窄（用 GitHub 官方 stack 的项目）。因此不是本轮首选。

**合并与拆分**：与 peer 的 `dsh-pre-push-checks` 有硬重叠：后者的 `:88-95,137` 已拥有"`gh stack sync` 之后的 post-sync 验证序列"。建议**边界而非合并**：pre-push 拥有"刷新后该跑什么检查"，本技能拥有"如何刷新、预检、合入、合入后验证"。若维护者想要一个"合入"技能，本技能可吸收 pre-push 的同步段（方向：合并进本技能，因为合入是终点），但会让本技能依赖 GitHub stack 特性更重；我不建议。与 `pr.lifecycle` 规范的关系：不合并，但要在技能里写明"合入动作的授权来源是采用方规范"。

**成本与风险**：重写约 10-15%；移植后约 7 KB（约 2.1k token）。无 script（命令内联），但**外部工具风险最高**：`gh stack` 需要较新版本与 GitHub 服务端特性，缺失时技能只能 hard-stop；若采用方不用 GitHub，则整个技能无对象。触发边界风险：与 pre-push 的 stack sync 段、与包的 PR 生命周期都会抢触发，必须在 description 里写死"仅当存在多条依赖 PR 且要合入时"。

---

### 7. `dsh-official-plugin-artwork`（0.2.1 新增）

**作用与触发**：为 DSH 官方插件（含 experimental）画与审图标，以及可选的特性预览图；覆盖题旨提取、比例、字母、透明、主题、导出与包元数据、设计审批（`:3`、`:8`）。不用于工具栏/动作图标（`:3`）。触发面是"给某个插件做官方图标/预览"。

**结构**：`SKILL.md` 41 行 / 6,307 B；无 references/templates/scripts。0.2.0 无此目录，0.2.1 新增。

**核心对象与产物**：对象是 DSH 插件目录里的官方 artwork（`PluginArtwork`、`packages/*/icon.svg`、Plugin Manager 页面），只有存在"官方插件资产目录"的产品才有这个对象。产物是 SVG 资产与可选预览图：SVG 有明确约束（`width="36" height="36" viewBox="0 0 36 36"`、自包含几何、本地唯一命名 gradient/mask/clip、无脚本/事件/动画/外链/字体/`foreignObject`，`:23`、`:32`），预览图另有尺寸/语言/资产上限规则（`:12`）。

**判定标准来源**：部分机械：`pnpm run verify-package-meta`（包元数据与 SVG artwork）、`pnpm run constraints`、`pnpm run verify-official-bundle-catalog`（`:39`），以及 SVG 自包含/透明度/主题可查；部分靠人：题旨是否准确、比例是否平衡、字母是否对齐、是否"可识别且不抢邻座"、设计审批（`:37-41`）。对象与审美都强产品绑。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| 官方插件图标/预览（对象本身，`:3`、`:8`） | dissolve | 只在采用方有"官方资产目录"时才有对象；无则技能不存在 |
| `docs/cookbook/adding-a-plugin-preview.md`（`:12`） | dissolve | 采用方预览规范 |
| `packages/client/ui-primitives/src/plugin-artwork.tsx`、`PluginManagerPage.tsx`、参考 `icon.svg`（`:18`、`:23`、`:25`） | dissolve | 采用方组件/参考资产 |
| 36×36 viewBox、自包含 SVG 导出、无脚本/外链/字体（`:23`、`:32`） | keep | 通用 SVG 资产规则（可作为采用方资产规范） |
| `pnpm run verify-package-meta`、`constraints`、`verify-official-bundle-catalog`（`:39`） | dissolve | 采用方自有资产门 |
| 编号备选/两主题/实际尺寸对比/设计审批（`:37-41`） | keep | 通用资产评审纪律；审批角色由采用方声明 |
| `dsh web` 真机检查、`record-browser-gif` 引用（`:40-41`） | re-bind | 采用方预览环境与证据录制技能 |
| 产品名/包名/官方面（`:8`、`:31`） | adapt | 采用方品牌名 |

**通用内核**：先看真实功能再画；借用一套连贯处理而不是拼贴；一个主主体 + 必要细节；用比例/轮廓/调色区分相关能力；光学尺寸与留白；字母按可见墨迹对齐并转 path；空区真透明；导出交给 owner（manifest/资产目录）；机械门不替代视觉评审；新 glyph 需设计审批。这些是可复用的**品牌资产纪律**，但脱离"官方资产目录"这个对象就失去落点。

**移植建议**：领域＝素材/品牌视觉；程度 **D**。理由：对象不闭合（只有产品自有的官方资产目录存在时才有实例），产物只有一部分可检，判据一半是审美与内部审批。按三锚测试，两个锚不过；通用内核很薄，且完全可以作为采用方设计系统声明的一部分，不值得一个技能。若维护者开 UI 域，最多把其中的 SVG 自包含/两主题/审批条款溶解进 UI 技能的资产节。

**合并与拆分**：方向 **artwork → UI 技能（若存在）**；与 `record-browser-gif` 是引用关系（`:41` 要求 GUI PR 用 GIF），不合并——一个是画资产，一个是录证据。与 `dsh-client-ui-ux` 的图标条款（`:28`）重叠，若 UI 域成立二者同归一处。

**成本与风险**：重写约 80-85%；通用部分约 1.5 KB（0.45k token）。无 script；但它是本组**最没有移植收益**的技能：面向人员的设计流程、依赖产品资产目录、机械门全是 DSH 的 pnpm 脚本。风险：若硬移植，会在目标项目里触发"给插件画图标"却无资产目录/审批角色的空转。

---

### 8. `dsh-responsive-ui`（0.2.1 新增）

**作用与触发**：设计与实现/审查响应式客户端布局：390 CSS px 最小视口、空间分配决策顺序、文本截断、标题换行、纯图标控件、移动端 hover、移动端 tooltip、移动端键盘、宽度变化时的焦点保持（`:3`、`:8-54`）。触发面是任何 Web 客户端的窄屏适配。

**结构**：`SKILL.md` 54 行 / 3,256 B；无 references/templates/scripts。0.2.0 无此目录，0.2.1 新增。

**核心对象与产物**：对象是 Web 响应式布局（CSS 视口/媒体查询等外部语义界定）；产物是页面行为，没有文件形状，但可在浏览器里按宽度与输入方式核验。

**判定标准来源**：多数条款**可直接核验**：390px 下无重叠/裁剪/横向滚动/主操作不可达（`:10`）、`@media (hover: hover)` 而非视口宽度（`:42`）、图标控件是否有 tooltip（`:31-38`）、截断内容是否有二级入口（`:21`）、移动端是否自动弹键盘（`:54`）。少数是产品决定（390px、"More account information" 不得图标化、model selector 可图标化，`:36-37`），需要采用方替换。它没有机械文字检查器，但有浏览器证据可承担。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `DeepSeek Harness`（description `:3`） | adapt | 采用方产品名，或删除 |
| 390 CSS px 最小视口（`:10`） | adapt | 采用方声明的最小视口；默认可保留 390 作为建议 |
| Plugins 页标题换行、Session 统计、输入框 model selector、自动化任务会话等例子（`:21`、`:28`、`:37-38`） | dissolve | 删除或换采用方同类例子 |
| `@media (hover: hover)`、tooltip、焦点保持（`:42`、`:44-50`、`:45`） | keep | CSS/无障碍通用规则 |
| Tooltip/HoverCard 等产品原语（`:35`） | re-bind | 采用方的提示原语 |
| "More account information 不得图标化"（`:36`） | dissolve | 产品决定，不携带 |

**通用内核**：先调空间分配/换行，再截断/图标化/收进 More；主操作与主状态不得消失；不用全局裁剪/缩字号/缩小点击目标掩盖冲突；截断必须有二级入口且不能丢错误；标题优先完整；图标化需"含义清楚 + tooltip"；hover 只给支持 hover 的设备；移动端不自动弹键盘；宽度变化尽量保焦点。这是一份**可执行的窄屏检查清单**，比 `client-ui-ux` 更接近可判定。

**移植建议**：领域＝UI/UX；程度 **C**（并入新 UI 技能；若只做这一个技能并由它吸收 `client-ui-ux` 的可判定条款，可视为 B；UI 域不开则 D）。理由：内容短（54 行/约 1k token）、重写量小（约 15-25%，主要是例子与 390px 决策），规则本身是 CSS/无障碍标准可核的；但它是**清单而非工作流**，没有产物与机械门，独立锻造会低于 forge 的产物闭合要求，最好作为"通用 UI 审查技能"的一部分。若维护者决定开 UI 域，它就是骨架（把 `client-ui-ux` 的可判定条款折进来）。

**合并与拆分**：与 `client-ui-ux` 合并为**一个**通用 UI 审查技能，方向：以本技能为骨架、`client-ui-ux` 提供反馈面/浮层/复用条款、`official-plugin-artwork` 提供资产条款。跨组：`dsh-code-review`（peer）的 UI 检查项会成为该技能的触发入口；若 UI 域不开，code-review 保持"读采用方的设计规范"的一般表述即可。

**成本与风险**：重写约 15-25%；移植后约 3 KB（0.9k token）。无 script。风险：验收需要浏览器（390px、hover、tooltip），包内没有浏览器门禁时只能靠人/项目测试；390px 与"哪个操作可图标化"是产品决定，通用化后必须由采用方声明，否则会变成软性审美要求；触发与 code-review、client-ui 抢。

---

### 9. `dsh-speed-up-perf`（0.2.0 已有）

**作用与触发**：把"让它更快"变成可复现的用户路径测量与小而证据化的修复：先约定用户可见端点、负载范围、资源约束、可接受行为差异与停止规则；再调查用户路径、按观测成本排序、建真实合成基准、先证回归再删工作、保持行为与资源所有权，最后交付有界结果（`:8-92`）。触发面是"性能调查/优化/基准/门禁"。

**结构**：`SKILL.md` 92 行 / 12,167 B；无 references/templates/scripts。0.2.0→0.2.1 3 行改：`docs/defensive-patterns.md` → `README.md`（`:12`）、决策记录链接 `implemented` → `archived`（`:16`）、删去 "disable invariants"（`:78`）。

**核心对象与产物**：对象是采用方用户路径的性能（开放，由采用方约定端点/负载）；产物是**测量卡**（7 个固定字段：用户操作、负载、入口路径、时钟、内存、判定、行为，`:39-48`）+ 可重复基准/门禁（基准 lane 属于项目测试设施，`:31-35`）+ 有界修复与证据。测量卡有固定字段但无 schema/checker；基准门是项目自有的。

**判定标准来源**：相当一部分**可执行**：原始样本与聚合、负控制（收紧后的断言在原实现/受控复现上失败，`:74`）、行为测试与快照、端到端复测、内存可达对象测量。不可机械判的是负载真实性、校准与"可接受的小差异"，依赖项目约定与评审。它自己明确"guidance, not a quota or a script"（`:8`），并继承了 `dsh-ci-test-reliability` 的进程/时钟/清理纪律（`:12`）。三锚：对象开、产物半、判据较强。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| DSH 用户路径（冷启动/历史读取/会话列表/浏览器折叠与流式，`:20-25`） | re-bind | 采用方的用户路径；从声明位置读取 |
| `benchmarks/AGENTS.md`、性能门禁决策（`:33`）、`benchmarks/` lane | dissolve | 采用方基准设施；没有则技能只给测量卡+本地基准，不设门 |
| `docs/architecture.md`、`docs/testing.md`、`docs/defensive-patterns/README.md`、包说明与 Agent Notes（`:12-16`） | dissolve | 采用方架构/测试/契约文档（声明位置） |
| `dsh` profile、built assets、现有测试 harness（`:49`） | re-bind | 采用方的构建产物、运行入口与浏览器测试设施 |
| keyless snapshot、GUI GIF 证据（`:80`） | adapt | 采用方的记录输出/证据机制（若有） |
| `dsh-ci-test-reliability`、`dsh-pre-push-checks` 引用（`:12`、`:90`） | adapt | 包内对应技能（若移植） |
| 官方 stack/独立 worktree 分层（`:88`） | adapt | 采用方的 PR 分层规则 |
| Node 机器校准/CPU 倍率（`:53`） | dissolve | 采用方自有的校准机制；没有则只报原始样本与比值 |
| 敏感数据不入 fixture（`:35`） | keep | 通用隐私纪律 |

**通用内核**：先约定端点/负载/约束/停止规则；分开后端与浏览器端到端测量；调查真实用户路径而不是猜热点；真实合成基准 + 固定输入 + 冷/热分离；7 字段测量卡；先测未优化版本再改；一次只改一个因果因子；负控制；性能不替代功能证据；行为/所有权/持久化保证不能被换性能；拒绝"端到端消失/典型负载回退/复杂度不划算/取消与保留说不清"的优化；有界交付+排序后的后续清单。这是**性能工程的方法学**，与具体产品弱绑定。

**移植建议**：领域＝性能；程度 **B**。理由：方法学价值高、判据有测量与负控制支撑；但对象是采用方用户路径、基准设施是项目自有，重写约 55-60%（`benchmarks/`、会话历史、profile、校准、快照、GIF 全部要重绑或溶解），体量约 2-2.5k token，且需要采用方先有基准与性能门禁，否则一半内容落不了地。它对包的价值是补"what proves it"的性能分支，但优先级低于测试可靠性与发布升级。

**合并与拆分**：不与其他技能合并：与 `ci-test-reliability` 是"测量可信"的引用关系（`:12`），与 `record-browser-gif` 是"浏览器证据"的引用关系（`:80`），与 `find-simplifications`（peer）在"删工作/保行为"上有概念重叠但对象不同（一方按测量，一方按证据与维护成本）——不建议合并，两边的完成判据不同。跨组：`dsh-pre-push-checks` 的"性能 PR 证据"表述要指向本技能。

**成本与风险**：重写约 55-60%；移植后约 7-8 KB（约 2.1-2.4k token）。无 script，但**隐含设施成本高**：没有基准 lane 与校准的项目里，负控制与阈值条款无法执行，只能降级为"测量卡 + 本地对比"。风险：(1) 触发"make it faster"会吸走所有性能相关请求，包括只需要一次 profile 的小任务；(2) 若采用方没有构建产物/浏览器测试，浏览器端条款要声明为可选；(3) 上游已把性能相关决策记录归档（`:16`），说明这类技能维护成本高、随产品演化漂移快。

---

### 10. `record-browser-gif`（0.2.0 已有）

**作用与触发**：把浏览器/Web UI 交互录成优化过的 GIF：优先用环境可用的浏览器控制工作流，必要时用 Playwright Videos 连续采集，再用自带编码器裁剪/变速/定格/限宽/限色；仅当任务包含"附到 PR"时，用 `gh --attach` 或 assets 分支发布（`:3`、`:8`）。它要求每个改变产品可见 GUI 的 PR 都带一个从该 PR 真实服务器与模型流程录制的 GIF（`:12-16`）。

**结构**：`SKILL.md` 172 行 / 16,804 B；`scripts/encode_gif.py` 337 行 / 12,988 B；`scripts/test_encode_gif.py` 103 行 / 4,726 B。0.2.0→0.2.1 2 行改：备注路径 `implemented` → `archived`（`:10`）；凭据来源从"source root `.env`"改为"`~/.dsh/.credentials.yaml` + recording overlay 设置 `dsh-credentials-local` provider 的 path"（`:30`）。

**核心对象与产物**：对象是浏览器 UI 演示（需要真实服务器、真实模型流程、PR head）；产物是**闭合**的：一个 `.gif`，由编码器机械验证（容器时长、动画帧数、宽度、字节数、拒绝空/越界区间、拒绝覆盖、模式专属 flag，`encode_gif.py:298-333`），输出 JSON 摘要；发布路径的验证也是机械的（`gh` 版本、10MB 上限、上传后 200/`image/gif`/校验和/正文 `<img>`，`:124-141`、`:162-170`）。测试 `test_encode_gif.py` 103 行用真实 ffmpeg 子进程验时序、颜色顺序、拒绝与大小限制。

**判定标准来源**：**编码器 + 单元测试**是机械锚点（`:107-114`、`encode_gif.py:193-333`、`test_encode_gif.py:44-100`）；发布后可用 GitHub API 核验（`:141`、`:162-170`）；"演示是否真实/是否含敏感信息/是否只来自一次运行"靠人（`:16`、`:76`、`:110`）。对象是"浏览器应用 + PR 平台"，部分闭合。

**dsh 绑定清单**：

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `DSH_HOME`/`DSH_AGENTS_HOME`/workspace/session 状态、`pnpm run build && pnpm run build:web`（`:29-32`） | re-bind | 采用方的构建命令与隔离状态根（声明位置） |
| `~/.dsh/.credentials.yaml`、`dsh-credentials-local` provider、`DEEPSEEK_API_KEY`/根 `.env`（`:30`） | dissolve | 采用方应用自己的凭据路径；只要求"走应用正常配置路径、不回显密钥" |
| Playwright 依赖从 `apps/web/package.json` 解析（`:38`）、脚本里的 `repo`/`apps/web`（`:51`） | re-bind | 采用方声明的浏览器驱动与包位置 |
| `.playwright-mcp/` 运行目录（`:42`、`:111`） | adapt | 采用方 gitignore 的证据目录（默认 `.playwright-mcp/` 可保留） |
| 环境提供的"浏览器控制工作流"（`:8`、`:34-40`） | re-bind | 采用方环境可用的浏览器控制方式；不可用则 screenshot capture 路径 |
| "每个 GUI PR 必须带 GIF + 真服务器/真模型"（`:12-16`） | re-bind | 采用方对 UI 变更的证据政策；默认建议，不强制 |
| `gh --attach`（v2.99+、github.com、10MB）与 assets 分支/`?raw=true`（`:116-172`） | keep | GitHub 外部契约，原样保留；非 GitHub 平台则溶解发布段 |
| `python3`/`ffmpeg`/`ffprobe`、`GIF_SKILL_DIR`、`encode_gif.py` 参数与验证（`:78-105`） | keep | 自包含脚本，保留；运行时要求写入 `compatibility` |
| 录制与发布分离、一次故事板=一次运行、禁止拼接（`:18-23`、`:31`） | keep | 通用证据纪律，保留 |

**通用内核**：录制与发布分离；一次故事板只能来自一次隔离运行（禁止拼帧）；从 PR 精确 commit 构建并在干净 worktree 录制；真实服务器/API（凭据走应用配置，不回显）；3-6 个有意义状态、语义定位、不要用固定等待建立就绪；编码参数可解释（区间、变速、定格、fps、宽度、颜色）并披露；验证编码后的 GIF 本身（不是只看源帧）；发布用 `gh --attach`，必要时 orphan assets 分支，绝不把媒体提交进产品分支；发布前重读 PR head。这是**通用"把 UI 变更录成可核验证据"的流程**，但 staging 部分与 DSH 的构建/状态根/凭据强绑。

**移植建议**：领域＝素材录制/证据录制；程度 **B**。理由：产物闭合最强（编码器+测试是现成的、自包含的通用资产），证据纪律通用；但 SKILL.md 的约 55-60% 是 DSH 的 staging（构建命令、状态根、凭据 provider、`apps/web`），必须重绑到采用方的构建/状态/凭据约定；"每个 GUI PR 必须 GIF"是产品政策，要降为采用方可选的政策。**脚本是它最有价值的可移植资产**：`encode_gif.py` 只依赖 `python3`/`ffmpeg`/`ffprobe`，无 DSH 布局，测试用合成视频不依赖产品——这是本组唯一可直接留下的可执行件。

**合并与拆分**：独立技能；`official-plugin-artwork`（`:41`）与 `speed-up-perf`（`:80`）引用它作为"GUI 变更证据"，不合并。跨组：`dsh-code-review`（peer）在 UI 变更审查处可引用它（基线 code-review 没有直接引用，但 `client-ui-ux` 的评审面会要求证据）。与 `dsh-doc`/证据相关技能不重叠。**发布段（gh attach/assets 分支）可整体保留，也可拆成 references/publish.md**：它只在任务包含附加时才需要，符合按需加载资源策略。

**成本与风险**：重写约 55-60%；正文约 9-10 KB（约 2.7-3k token）+ 编码器 Python 约 13 KB + 测试 4.7 KB（只在维护/发布时载入）。**script 风险最高**：包的脚本政策是 Node 运行时 + `package/<skill>/` 源码经 vite 打包到 `script/`；Python 脚本进不了这条管线，必须做例外决定（`compatibility` 声明 Python 3 + ffmpeg，或把编码器重绑为 Node/TS）。trigger 风险：`record-browser-gif` 会在任何"录个 GIF"请求触发，而环境缺浏览器控制/ffmpeg 时只能报依赖缺失；"每个 GUI PR 必须带 GIF"若原样带入会变成包对采用方的强制政策，必须改写。发布段依赖 `gh` 版本与 github.com，非 GitHub 项目要能干净地跳过。

---

## 三、组内合并候选图

### 3.1 合并/拆分候选（组内 + 跨组）

| 候选 | 成员 | 方向 | 合并后形态 | 依据 | 风险 |
|---|---|---|---|---|---|
| **UI 审查技能**（条件性） | `dsh-responsive-ui` + `dsh-client-ui-ux`（可判定部分）+ `dsh-official-plugin-artwork`（资产节） | responsive 作骨架，另两者并入 | 一个新技能「Web UI 变更审查」，或并入 `dsh-code-review` 的 UI reference | client-ui 在基线里已把响应式委托给 responsive（`dsh-client-ui-ux/SKILL.md:59`）；artwork 是图标特例（`:28`） | UI 域是否值得开是维护者决定；三锚开到两个时容易变散文 |
| **code-review leaf 群** | `cordis-styling-nitpicking` → `dsh-code-review`；`dsh-ci-test-reliability`、`dsh-error-handling` 被 code-review 引用 | cordis 并入；另两个保持技能/norm 被引用 | code-review 的 `references/ownership-lifecycle.md`；其余为被引用节点 | 基线 code-review 已是 hub，阻断项 4 引用 cordis、阻断项 6 涉 UI、手动检查引用 ci-test/error（`dsh-code-review/SKILL.md:20-55`） | code-review 会变胖；leaf 失去独立触发面 |
| **failure 规范组** | `dsh-error-handling` → norms | 抽 3-4 条红线进 norms 新组 `failure` | `norms.json` 新组 + `AGENTS.md` 红线 + code-review 引用 | 原则型无产物、无判据，做技能会永远触发（`:3`）；上游 code-review 已按 leaf 引用 | 与现有 `test`/`evidence` 组边界要写清（我建议单开 `failure`） |
| **发布与升级** | `dsh-create-upgrade-guide`（工作流）+ `dsh-doc`（kind/template）+ `dsh-prose-standard`（散文） | 工作流独立；模板/kind 归 docs；引用 prose | 一个技能 + 一个 kind/template + 一条发布规范 | 上游同构拆分：`dsh-doc/SKILL.md:60` 拥有 kind，`dsh-create-upgrade-guide` 拥有范围/放置/维护/长度 | 若 docs 技能不移植，模板与门禁要随技能走；双语机制必须可选 |
| **PR 合入边界** | `dsh-merging-stacked-prs` + `dsh-pre-push-checks`（post-sync 段）+ `pr.lifecycle` norm | 边界划分，不合并 | pre-push 管"刷新后跑什么"，merging 管"如何刷新/预检/合入/合入后验证" | 基线 pre-push 已拥有 sync 后验证（`dsh-pre-push-checks/SKILL.md:88-95,137`）；包规范规定合入需授权 | 两者触发都会命中 `gh stack sync`；授权边界必须按包规范重写 |
| **证据录制** | `record-browser-gif`（owner）+ `official-plugin-artwork`/`speed-up-perf`（引用） | 不合并，引用 | 一个录制技能 + 两处引用 | 上游 artwork `:41`、speed-up `:80` 都要求 GUI 证据 | 脚本运行时决策（Python vs Node）是前置条件 |

### 3.2 关系图（组内）

```
cordis-styling-nitpicking ──(C)──→ dsh-code-review/references/ownership-lifecycle.md   [跨组]
error-handling ──(C)──→ norms.failure ──→ dsh-code-review 引用                          [跨组]
responsive-ui ──┐
client-ui-ux ───┼──(条件合并)→ 通用 UI 审查技能 ←──(溶解)── official-plugin-artwork        [跨组]
                └──→ dsh-code-review 的 UI 检查项                                        [跨组]
dsh-ci-test-reliability ──→ 独立技能 ←──(引用)── dsh-pre-push-checks / dsh-code-review        [跨组]
dsh-create-upgrade-guide ──→ 独立技能 ←──(kind/template)── dsh-doc / dsh-prose-standard        [跨组]
dsh-merging-stacked-prs ──→ 独立技能 ←──(post-sync 边界)── dsh-pre-push-checks                 [跨组]
dsh-speed-up-perf ──→ 独立技能 ──(引用)──→ dsh-ci-test-reliability, record-browser-gif
record-browser-gif ──→ 独立技能 ←──(引用)── dsh-official-plugin-artwork, dsh-speed-up-perf
```

### 3.3 跨组必须由 Lead 调停的点

1. **评审/变更流程是 hub**：本组 4 个技能（cordis、ci-test、client-ui、error-handling）在基线里都被 `dsh-code-review` 引用。peer 档案建议把 `dsh-code-review` + `dsh-pre-push-checks` 合并为一个「变更流程（评审+检查选择）」技能并定为 P0；若采纳，本组 cordis 的 reference 挂到该合并技能、error-handling 仍进 norms、ci-test 独立并被互引（code-review 单独移植同理）。若二者都不移植，cordis 转 D、client-ui 转 D。
2. **`dsh-create-upgrade-guide` 的模板/kind 归属被 peer 结论改变**：上游把 kind/template 放在 `dsh-doc`；但 peer 档案判 `dsh-doc` 为 D（整技能不移植，只抽 fact-check/页序/voice），双语半部归 `dsh-translate-docs`（P1）。因此 upgrade-guide 若锻造，**模板与门禁必须随技能自带**，双语侧引用 translate-docs 的配对机制，否则会出现第二份配对实现（one home per fact）。
3. **`dsh-pre-push-checks` 与 `dsh-merging-stacked-prs` 的 post-sync 段**：二者都在处理 `gh stack sync` 之后。建议 pre-push 保留验证选择、merging 保留刷新/合入；两边的 description 要互相写死排除句。
4. **`dsh-pre-push-checks` 与 `dsh-ci-test-reliability`**：前者选命令、后者管隔离与证据；基线 pre-push 已用一行"apply the project's test-reliability rules first"（`dsh-pre-push-checks/SKILL.md:31`）划界，移植时保留这句即可。
5. **`dsh-prose-standard` 与 `dsh-error-handling`**：可见错误文案由 prose 管语言、error 管语义；不要两边都写"错误消息要清楚"。

### 3.4 与 peer 档案（`skills-core.md`）的对照与分歧

| 事项 | peer 的结论 | 对本档案的影响 / 我的意见 |
|---|---|---|
| 下一轮 P0 | `dsh-pre-push-checks`（与 code-review 合并为变更流程）、`dsh-prose-standard`（吸收 trim） | 本组的 P0（upgrade-guide）与其并不冲突，但一个轮次最多容纳 2-3 个 P0；建议 Lead 把"发布与升级"作为第三个 P0 或下一轮第一个 |
| `dsh-doc` | 判 D，只抽 fact-check/页序/voice；双语归 `dsh-translate-docs`（P1） | 我的 Q7 前提改变：upgrade-guide 自带模板 + 门禁；双语引用 translate-docs 的配对机制 |
| `dsh-code-review` | 与 pre-push 合并为「变更流程」，P1 | cordis 的 reference 目标从 code-review 改为该合并技能；ci-test/error 的引用关系不变 |
| pre-push 的 stack 段 | 明确建议"stack 部分跨组并入 merging-stacked-prs" | **保留意见**：pre-push 是 P0、merging 是 P2；现在搬会让 pre-push 丢掉 `gh stack sync` 的 post-sync 验证规则。建议先划界，merging 升 P1 时再搬（这是需要 Lead 拍板的具体分歧） |
| `dsh-translate-docs`（P1） | 双语对与配对门由它拥有 | 若与 upgrade-guide 同轮，upgrade-guide 只引用其机制，不复制 sidecar 规则 |
| `dsh-find-simplifications`（P2） | 以证据找可删维护义务 | 与 speed-up-perf 的"删工作"判据不同（证据/维护成本 vs 测量），不建议合并；同轮做时在两边 description 写排除句 |

---

## 四、待决问题

**Q1（最重要）下一轮锻造先做"发布与升级"还是"测试可靠性"？**
- 选项 A：先 `dsh-create-upgrade-guide`（P0）。三锚全闭、有 85 行可移植门禁、补包缺失的"迁移成本"制度，且与包已有决策"迁移成本是设计约束"同向。
- 选项 B：先 `dsh-ci-test-reliability`（升 P0）。它补"what proves it"的证据可信度，通用性更广，但体量大、无产物闭合、需要与 peer 的 pre-push/code-review 同时排期。
- 建议：A。理由：它是本组唯一产物闭合且判据机械的候选，锻造风险最低；B 放在同轮后半步。若维护者判断"发布指南依赖 docs 树约定过重"，则改选 B，并把 upgrade-guide 降为 P1。

**Q2 `dsh-error-handling` 做技能还是做 norms？**
- 选项 A：norms 新组 `failure`（3-4 条红线）+ code-review 引用（推荐）。
- 选项 B：独立技能（需自造对象/产物/判据，必然触发泛化）。
- 选项 C：并入 code-review 的错误处理清单。
- 建议：A。原则型内容做常设红线比做技能便宜、可执行；C 会让 code-review 再胖一层，且失败处理并不只在评审时相关。

**Q3 UI/UX 域是否进入这个包？**
- 选项 A：暂不进入，`client-ui-ux`/`official-plugin-artwork` 判 D，`responsive-ui` 也判 D（推荐）。
- 选项 B：进入但只做一个合并技能（responsive 骨架 + client-ui 可判定条款 + artwork 资产节），程度 B。
- 选项 C：按现状分别移植（最差：两个技能互相引用、判据仍靠项目设计系统）。
- 建议：A 或 B。若维护者认为"UI 证据/审查"是采用方的真实痛点，走 B；**绝不要 C**。

**Q4 是否接受 `gh stack` 作为包的依赖？**
- 选项 A：接受，按 B 移植，hard-stop 与授权边界重写（推荐，若维护者维护 GitHub stack 工作流）。
- 选项 B：暂缓 P2，等 `gh stack` 稳定/更普及。
- 选项 C：不移植，只在 pre-push 里保留 stack sync 提示。
- 建议：B。理由：它是本组锚点第二强的技能，但对象是 GitHub 的较新特性、受众窄，且与包 `pr.lifecycle` 的"合入需授权"规范存在语义冲突，重绑成本被低估。若维护者自己就在用 stack，选 A。

**Q5 `record-browser-gif` 的编码器如何进包？**
- 选项 A：Python 原样 + `compatibility` 声明（python3/ffmpeg/ffprobe），作为 `script/` 直接携带（不走 `package/` 打包）。
- 选项 B：重绑为 Node/TS 编码器，纳入 `package/<skill>/` + `skill:build`（推荐，若采纳证据录制域）。
- 选项 C：只带 SKILL 的录制/发布流程，不带编码器（自相矛盾，不推荐）。
- 建议：先决定"证据录制"是否进包（Q6）；进则 B 以保持包的单一运行时，不进则 D，别为它开 Python 例外。

**Q6 "证据录制"是否作为包的新领域（含 GUI 证据政策）？**
- 选项 A：是，做 `record-browser-gif`（B，P1/P2），与 `speed-up-perf`、UI 审查技能互引（推荐仅在维护者认为采用方普遍有 Web UI 时）。
- 选项 B：否，判 D/P2，等有采用方需求再开。
- 建议：B 当前、A 候补。包的零/Node 运行时与"一个技能一个触发面"的现状不适合此刻引入浏览器+媒体工具链。

**Q7 `dsh-create-upgrade-guide` 的默认约定怎么定？**
- 位置：默认 `docs/upgrade-guide/v<semver>/<item>/guide.md`，允许采用方在声明位置覆盖（推荐）。
- 版本源：默认根 `package.json` 的 `version`，允许声明覆盖（推荐）。
- 双语：有配对机制的采用方写双边 + 配对记录；单语项目只写 `guide.md`，不强制双胞胎（推荐；上游的 `guide.zh.md` + `guide.i18n.yaml` 是 DSH 产品机制，不能原样带进通用文本）。
- 门禁：移植 85 行 TS 为包内 Node 检查，保留"空语料判失败"的边界；若采用方无 docs 树，检查要能干净跳过或由采用方声明根。
- 建议：以上四项打包成一个"默认 + 声明覆盖"设计，写进技能 global rules；否则技能无法在任意项目触发。

---

### 附：成本汇总（供排期）

| 技能 | 现 SKILL 字节 | 估计移植后正文字节 | 估计 token | 重写占比 | script |
|---|---|---|---|---|---|
| cordis-styling-nitpicking | 9,200 | 3,500-4,500 | 1.1-1.3k | 70-80% | 无 |
| dsh-ci-test-reliability | 9,442 + ref 5,346 | 12,000-14,000 | 3.6-4.2k | 15-25% | 无 |
| dsh-client-ui-ux | 8,524 | 2,500-3,000（若 C） | 0.8-0.9k | 70-75% | 无 |
| dsh-create-upgrade-guide | 3,734 + 模板 29 行 | 3,500-4,500 + 门禁 100-140 行 | 1.0-1.2k + 门禁 | 45-50% | Node 检查（移植） |
| dsh-error-handling | 2,389 | 500-800（norms） | 0.2k | 5-10% | 无 |
| dsh-merging-stacked-prs | 7,839 | 6,500-7,500 | 2.0-2.2k | 10-15% | 无（命令内联） |
| dsh-official-plugin-artwork | 6,307 | 1,500（若溶解） | 0.45k | 80-85% | 无 |
| dsh-responsive-ui | 3,256 | 2,800-3,200 | 0.9k | 15-25% | 无 |
| dsh-speed-up-perf | 12,167 | 7,000-8,000 | 2.1-2.4k | 55-60% | 无 |
| record-browser-gif | 16,804 | 9,000-10,000 | 2.7-3.0k | 55-60% | Python 编码器 337 行 + 测试 103 行 |

**总量参考**：即使只做 P0+P1（upgrade-guide + ci-test + error-handling norms），新增约 4.8-5.6k token 正文 + 一个 100-140 行 Node 门禁；全做约 1.6 万 token 正文 + 两个脚本资产，超出这个包当前一个技能的规模，必须分批。

**证据索引**：每个技能的完整读本与行数见正文；跨组依据见 `submodules/dsh/.agents/skills/dsh-code-review/SKILL.md:20-55`、`dsh-pre-push-checks/SKILL.md:31,88-95,137`、`dsh-doc/SKILL.md:60`；包规范与决策见 `skills/dsh-spec-skill-forge/SKILL.md` 与 `.agents/dsh-spec/notes/implemented/process/2026-10-22-the-forge-marks-the-abstraction-ceiling.md`、`2026-09-22-migration-cost-is-a-design-constraint.md`。

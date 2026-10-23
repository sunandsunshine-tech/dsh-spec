# 基线 9 个流程/规范类技能：移植档案

分析对象：`submodules/dsh` @ `dsh-v0.2.1-rc.2`（`687f282e86`），只读。范围：9 个技能；文件数 3（prose、trim）或 2（find-simpl）或 1（其余），`dsh-doc` 14 个；合计 2,117 行 / 179,199 字节 / 约 53.8K tokens（英文按 0.3 tokens/char 估算，与锻造技能的默认估算口径一致；行数/字节均取自 `wc -l -c`）。

判定框架：本仓 Agent Note《The forge marks the abstraction ceiling》（`.agents/dsh-spec/notes/implemented/process/2026-10-22-the-forge-marks-the-abstraction-ceiling.md`）的三锚点测试；forge 的 Docs/SOP/Script、keep/adapt/re-bind/dissolve、one home per fact，以及交付内容须满足 agentskills.io 的 guides（`skills/dsh-spec-skill-forge/SKILL.md`；脚本仍报告默认体量上限）；包的三根支柱（`AGENTS.md`：decision records、prose discipline、change workflow）与 README 的两项承诺（"Decisions stay put"、"The two languages stay together"）。

关键背景（会改变结论）：

- **前次 v0.4.0 的 10 技能集已从 `skills/` 移除，但 `main` 分支的移植版仍在**：9 个里有 8 个在前次移植过（只有 `dsh-doc` 从未移植），且 `.agents/skills/` 的部署副本与 `main` 完全一致。前次的做法是"抽取式移植"：保留原文，只替换引用与去掉 DSH 专名（见 Note《The shipped skill text is an extraction》）。它是**成本基线**，不是可直接复用的设计：它依赖已删除的 `dsh-spec-manager` 技能与 `.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts` 路径，且把 DSH 文档契约抄进了自己的 `references/`。
- **forge 的骨架决定脚本归属**：每技能脚本源在 `package/<skill>/`，由 `vite.config.ts` 打包成自包含 `script/*.mjs`；没有跨技能共享脚本的机制（`package/README.md`）。因此凡是需要 DSH gate 的技能，要么自带脚本，要么把规则降为 prose。
- **0.2.0→0.2.1 漂移很小**（下文的"差异触达行数"是 diff 增删行合计，只作重写规模参照，不等于被改的独立行数）：agent-experience 0 行、archive 0、prose 0、translate 0；code-review +16/−8、find-simpl +6/−8（含 references）、doc 4/4（仅 templates/persistence-change.md）、pre-push +1、trim 2。对抽取友好，唯独 code-review 每版都在增加 DSH 专属检查，直接抽取会持续再分叉。
- 基线实为 19 个技能目录：本组 9 个 + 同伴组 10 个（cordis-styling-nitpicking、dsh-ci-test-reliability、dsh-client-ui-ux、dsh-create-upgrade-guide、dsh-error-handling、dsh-merging-stacked-prs、dsh-official-plugin-artwork、dsh-responsive-ui、dsh-speed-up-perf、record-browser-gif）。交叉引用统计：prose-standard 被 8 个技能引用（枢纽）、pre-push-checks 6 个、dsh-doc 3 个、trim-cot 2 个、code-review 1 个、agent-experience 0。

---

## 一、总览表

| 技能 | 一句话作用 | 对象闭合 | 产物闭合 | 判定锚点 | 建议领域 | 建议程度 | 合并/拆分 | 优先级 |
|---|---|---|---|---|---|---|---|---|
| agent-experience | 设计给模型看的工具/技能/上下文时，用最小上下文、显式发现、约束前置、有界输出、局部性、总工作量六条原则 | ✗ 任意 adopter 项目没有 model-facing 工具面；若限定为 Agent Skill 才闭合 | ~ 改的是定义文本，无固定字段；token 计量依赖 harness | ✗ 除"前后测 token"外全是编辑判断，且计量常不可得 | 技能与工具设计 | C（并入 forge；tool-definition 半部 D） | 并入 forge（方向：forge←agent-experience） | P2 |
| dsh-archive-agent-notes | 校验 notes 树、对新 note 做取代检查、按未来价值 keep/archive/delete，并封印 archived triplet | ✓ adopterr 的 notes 合约（路径、triplet、status、manifest）界定 | ✓ triplet + `Archived:` 行 + manifest 哈希 + 固定报告 | ✓ 封印验证器机械；分类有校准案例、可直接判 | 决策记录/notes 生命周期 | B（独立）→ C（并入 notes 生命周期技能） | 被"notes 生命周期"技能吸收；与 find-simpl 分工 | P1 |
| dsh-code-review | 按本仓标准评审 PR，先读要求再看 diff，输出 blocker/suggestion 与证据 | ✓ PR（base/head 由 git 定界） | ~ findings 无 schema，评审产物是评论线程而非文件 | ✓ 项目的 AGENTS.md/norms/gates 可锚定；语义评审是判断 | 变更流程（评审） | C（并入变更流程技能；独立则 B） | 与 pre-push-checks 合并为"变更流程"；跨组与 merging-stacked-prs 协调 | P1 |
| dsh-doc | 按 kind/template 体系写/审 DSH 的 Markdown、包 README 与文档站，事实必须执行验证 | ✗ kind 系统是 DSH 事实派生，adopterr 无对应 schema | ~ 页面/模板形状只在 DSH 内闭合 | ✗ 锚点是 24 处 DSH pnpm gate，adopterr 无 | 文档与双语 | D（整技能不移植）+ C（抽两条程序） | 抽 fact-check、页序/voice 并入 prose/变更流程；双语对齐归 translate；kind/模板/站点/持久化记录 dissolve | 不移植 |
| dsh-find-simplifications | 以消费者证据找可删除的维护义务，产出 proposal Agent Note 或内联 TODO | ✓ adopterr 的代码库（由 declaration 提供入口） | ✓ proposal note 五段骨架；小改动落 TODO | ✓ 证据=调用点/测试/搜索，可核查；v1 有校准案例 | 变更流程（提案/简化） | B（独立）或 C（作变更流程的提案模式） | 与 archive 分工（提案 vs 保留）；案例 reference 必须按"抽象+案例"重写 | P2 |
| dsh-pre-push-checks | 推送/force-push/ready 前，按 diff 选择最小证据集，跑一次并如实报告；保护改写推送 | ✓ outgoing diff（git 定界） | ✓ 已执行命令 + 输出 + push；"只报告跑过的"可核查 | ✓ adopterr 的 gate 清单存在性 + diff→surface 映射可直接判；lease/OID 机械 | 变更流程（检查选择/证据） | B | 与 code-review 合并为"变更流程"；stack 部分跨组并入 merging-stacked-prs | P0 |
| dsh-prose-standard | 写/审/恢复/裁剪散文：保留完整命题，按位置覆盖必须信息，删除推理转述 | ✓ 表面可枚举（Markdown/API 文档/注释/测试/README/notes/prompt/串） | ✓ 保留命题的编辑 + keep/add/trim/… 分类 + 实跑检查报告 | ✓ complete-proposition 可逐条列举直接判；覆盖清单可对照 | 散文纪律 | B | trim-cot 并入本技能（审计模式）；page 级规则留给 doc 技能（若锻造） | P0 |
| dsh-trim-cot-leakage | 审计并修复"泄露推理过程"的散文：8 类泄漏 + 一个 resolvability 测试 + recall batteries | ✓ 泄漏类清单闭合；表面同 prose-standard | ✓ 审计报告 + 修复后散文 + 复跑 batteries | ✓ resolvability 直接判；batteries 是机械探针（rg） | 散文纪律（审计） | C（并入 prose-standard；独立则 B） | 并入 prose-standard 作审计 reference | P2 |
| dsh-translate-docs | 维护 `foo.md ↔ foo.zh.md + .i18n.yaml` 双语对：briefing 驱动的更新路径、整篇翻译、配对校验 | ✓ pair 由树声明（有 counterpart 即成对），adopterr 语言由 declaration 定 | ✓ 三文件 pair + switcher 行 + sidecar 哈希 + scoped verify | ✓ pairing gate 机械（结构/fence/行对齐/链接 locale）；术语表是 adopterr 拥有的合约 | 文档与双语 | B | 双语半部归本技能（doc 的 bilingual 面对齐并进来）；跨组与 create-upgrade-guide 协调 upgrade guide 的双语 | P1 |

---

## 二、逐技能分析

### 1. agent-experience

**作用与触发**：在编写或修改 model-facing 工具定义（名字、描述、参数 schema、system-prompt 段），以及设计技能、上下文加载、多步工作流时加载，目的是让信息可发现、上下文用得省。文件只有 19 行：开头 6 条原则 + `## Tool definitions` 5 条。没有任何 references/templates/scripts。

**结构**：`SKILL.md` 是 symlink，真文件在 `packages/preset/agent-preset/skills/agent-experience/SKILL.md`：19 行 / 2,093 字节 / 约 628 tokens；目录里只有这一个文件（symlink 本身 1 个）。0.2.0→0.2.1 **无变化**（两个 tag 的 blob 相同）。**没有脚本**。

**核心对象与产物**：对象是"模型看到的接口面"：工具定义、技能、上下文加载、工作流步骤。产物是改动后的定义文本，外加一条度量（first-turn prompt tokens 前后对比）。

**判定标准来源**：唯一机械项是"Measure the change"（token 前后测量），其余全是编辑判断（"minimal context"、"discovery explicit"、"constraints visible"）。没有外部 schema，也没有 gate。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "model-facing tool definition (name, description, parameter schema, system-prompt section)" | re-bind | 若 target 项目有给模型的工具/技能面，对象是它；否则 dissolve（任意 adopter 项目没有这一面） |
| "system-prompt section"、"first-turn prompt tokens" | re-bind | adopterr 的提示组装与 token 计量；无计量手段则 dissolve 掉"Measure"一条 |
| 六条上下文原则（minimal context、discovery、constraints、bounded outputs、locality、total work） | keep | 通用，且正是 forge 的 Docs/资源策略的另一种说法 |
| `## Tool definitions` 五条（delete obvious constraints、describe behavior、parameter rules、say once、measure） | re-bind/dissolve | 只有 adopterr 真有模型工具定义时保留；否则整节 dissolve |

通用内核：六条原则（尤其 "Evaluate total work：省上下文只有在不引起更多检索/重读/错误时才算省"）对任何"给 agent 写指令"的技能都成立；`## Tool definitions` 半部依赖模型产品面。

**移植建议**：领域＝技能与工具设计；程度 **C（抽取并入 forge）**。理由：锚点测试两处失败（对象在任意项目不闭合、判定靠自身断言），按 ceiling 规则它只能是"具体任务辅助"或 prose，不能独立成技能；而 forge 的对象恰好闭合，这 6 条是可放进去的 Docs。`## Tool definitions` 半部 **D**（除非将来锻造一个 adopter 专属的"给模型写接口"技能，那需要 adopter 自己有 harness schema，才可能过 ceiling）。

**合并与拆分**：方向 forge ← agent-experience。forge 的 "Resources and ownership" 与 "SSOT" 已隐含 minimal-context/say-once；需要新增的是 "discovery explicit"（每个延迟加载的资源要有描述与可靠取法，正好是 references 的门槛）、"constraints visible"、"bounded outputs"、"locality"、"total work" 五条，作为 forge 的 Docs reference（例如 `references/4-context-economy.md`），或并入 forge 的 Templates reference。与 prose-standard 有弱重叠（prompt/visible strings 的措辞纪律），但 prompt 的"措辞"归 prose、"信息结构"归本条，边界可写清。

**成本与风险**：重写比例：作为独立技能 100%（19 行里 11 行是 tool-definition 半部）；作为 forge reference 约 300–500 tokens 新文本。无脚本风险。触发边界风险：若独立锻造，会与 forge 自己的 "description"、"Resources" 规则争同一决定权（one home per fact 违规）；并入 forge 后无此风险，但要防止把"原则清单"写成第二份 forge 规则。

---

### 2. dsh-archive-agent-notes

**作用与触发**：在增加、审计、清理、归档、恢复或评审 Agent Notes 时加载。先让 notes 树对合约通过校验，再按"未来是否还能指导工作"做语义分类：实现型只描述小 UI/纯机械改动的整组删除、有持久价值的保留、有历史价值但已难指导的整组归档；被否型只在仍能阻止诱人错误时保留；归档按冻结 triplet + manifest 封印执行。它明确把"建树"排除在外（initializer 的职责）。

**结构**：`SKILL.md` 68 行 / 6,721 字节 / 约 2,016 tokens；无 references/templates/scripts。0.2.0→0.2.1 **无变化**。前次移植版 68 行 / 7,054 字节，差异触达 30 行（增删合计，约为原文 68 行的 44%：项目名、notes 路径、DSH 门禁命令替换）。

**核心对象与产物**：对象是 notes 生命周期树：`{lifecycle}/{class}/yyyy-mm-dd-title.md` + `.zh.md` + `.i18n.yaml` triplet、`Status:`、`Archived:` 行、`archived/{class}/`、`archived/manifest.json` 封印、inbound links。产物是：一份分类判定 + 归档后的 triplet 与 manifest + 固定字段的报告（kept/deleted/archived/rejected/borderline）。

**判定标准来源**：机械半边硬——`notes-archived` 验证器（append-only 模式先证明既有 seal 全匹配，再只加新 triplet 哈希）、`md-links check`、`git diff --check`；语义半边有"分类判据 + 校准案例（字数只是发现工具，不是判据）"，且可由读者直接对照（该 note 是否仍约束当前代码/是否仍能阻止诱人错误）。**这是本组里三锚点最硬的技能之一**，前提是 adopterr 的 notes 合约与封印验证器存在。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| description 里的 "in deepseek-harness" | adapt | adopter 项目名 |
| `../../notes/README.md`、`../../notes/archived/AGENTS.md`、`notes/README.md#when-to-write-one` | adapt | adopterr 的 notes 合约（由 declaration 命名路径）；包内自带同名合约 |
| `implemented/<kind>/`、`archived/<kind>/`、`implemented` 有意不出现在归档路径 | keep | 与包内 notes 合约同形，保留 |
| `foo.md` / `foo.zh.md` / `foo.i18n.yaml` triplet | keep（双语 adopterr） | 目标语言不同则 re-bind 成对应两语 + sidecar |
| `Status: implemented`、`Archived: YYYY-MM-DD` 插在其下、两侧同值 | keep | 合约字段 |
| `pnpm run verify-archived-agent-notes --write` / `verify-archived-agent-notes` / `doc-sync` / `lint` / `git diff --check` | adapt | adopterr 的封印验证器与聚合检查；**当前包没有可安装的验证器 → 必须由本技能自带脚本或并入 notes 生命周期技能** |
| 校准案例：collapsed sidebar control rail 533 words、event-sourced sessions 248 words 等 DSH note 名与字数 | dissolve | 换成抽象判据（"closed, minor presentation behavior"/"foundational authority and durability boundary"），案例由 adopterr 自己的 notes 替换 |
| "small UI adjustments or purely mechanical changes" 删除判据 | re-bind | 泛化为"只改表现层/纯机械改动"，前次移植已做 |
| "the archive verifier intentionally never checks outbound links of archived notes" | keep | 机制事实 |

**通用内核**：把"决策语料"当有生命周期的资产处理：新建时的取代检查（full/partial、consolidation 规则）、按未来决策价值而非字数/年龄分类、归档的冻结与哈希封印（"可编辑的快照不是证据"）、inbound link 的三种处置（redirect/retarget/delete）、报告字段。这是一套与产品无关的决策记录纪律，正是本包"决策记录"支柱的保留半部。

**移植建议**：领域＝决策记录/notes 生命周期；程度 **B（独立锻造）**，但更推荐作 **C**：它是"保留与冻结"半部，缺"创建/格式校验/合并"半部；单独锻造会让 notes 合约与验证器在多个技能里各写一份。只有当维护者决定"下一个锻造目标是 notes 生命周期技能"时，archive 应作为该技能的 references（归档步骤 + 封印机制），而不是第二个技能。P1；若 notes 生命周期被定为下一锻造目标，则作为其组成部分升为 P0。

**合并与拆分**：方向 notes 生命周期技能 ← archive。拆分：`Check supersession when adding a note` 其实属于"创建"流程，应归 notes 技能的新建步骤；`Archive one implemented triplet` + 封印机制归同一技能的归档步骤。与 find-simplifications 的关系：find-simpl 的新 note 要做 supersession check，前次是链接 archive；合并后两者都指向 notes 技能（one home）。与 translate-docs 的关系：冻结 triplets 不是翻译工作，translate 只需引用同一合约。与 prose-standard 的关系：archived notes 是 prose 审查的排除项，路径由 adopterr 合约给出。

**成本与风险**：规模 2,016 tokens；重写比例约 40%（前次 44% 为参照，且新架构要再改 notes 路径与门禁命令）。**脚本风险高**：封印验证器在 `scripts/dsh-spec-manager/scripts/` 里约 1,154 行（archived-agent-notes 187 + agent-note-tree 154 + notes-root 50 + verify-agent-note-format 136 + verify-archived-agent-notes 173 + manifest 179 + markdown 275），另加 `vendor-mdast.mjs`（约 240KB 的 Markdown 解析 bundle）才能检查链接；把它打包进单个技能会显著增大该技能，且需要新测试（原 manager 的测试已随技能移除）。触发边界风险：与"写 note"（创建）重叠；"恢复（restore）"在上游是只读说法，归档后不可逆，重绑时要把不可编辑性写成红线。

---

### 3. dsh-code-review

**作用与触发**：评审 deepseek-harness 仓库的 PR 时加载：先取 PR 的 live base/head、跑 change-scope，再**先读 owning 要求**（AGENTS.md、防御性模式 5 页、doc 规范、各相邻技能、测试/门禁、Agent Notes、双语规则），然后逐项做 7 条 blocking 要求 + 16 条 manual checks，最后按"缺陷/位置/影响/证据"报告。它自己声明"guidance, not a complete checklist"。

**结构**：`SKILL.md` 61 行 / 10,577 字节 / 约 3,173 tokens；无 references/templates/scripts。0.2.1 变化 **+16/−8**：新增"Read the requirements before judging the diff"；`docs/defensive-patterns.md` 拆成 5 页并要求读全所触页面；Blocking #4 从"invariant companions"换成"Cordis ownership and cleanup"（引入 cordis-styling-nitpicking）；新增 dsh-error-handling 引用与 manual check；negative controls 简化。这是本组唯一持续增生的技能。前次移植版 51 行 / 9,091 字节，差异触达 52 行（增删合计，约为原文 61 行的 85%；多为整句替换）。

**核心对象与产物**：对象是一个 PR（base/head 定界，外部闭合）。产物是 findings（inline 定位到最紧的 diff 范围 + PR 级评论）+ 一个 verdict；没有固定字段或记录文件，产物的"闭合"是弱项——它是评论线程，不是可校验的交付物。

**判定标准来源**：依赖被评审项目自己的标准：AGENTS.md/norms（本包可提供）、防御性模式（DSH 有，adopterr 可能没有）、测试/快照 gate（adopterr 若有）、设计记录（本包 notes 合约）。这些是真实外部锚点，但每条 manual check 的"对不对"仍是语义判断。机械可判的部分其实很少（change-scope、locale-copy gate、type docs 同步这些都要 adopterr 自己存在对应 gate 才有）。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "deepseek-harness repo" 描述/标题 | adapt | "this repository" |
| `pnpm --silent run change-scope --base … --head …` | re-bind | `git diff --name-only <base>...<head>`（前次移植已做） |
| `AGENTS.md`、`packages/AGENTS.md` | adapt | `<root>/AGENTS.md` 与各子树 AGENTS.md |
| `docs/defensive-patterns/` 5 页（general/package-surface/remote-and-api/client-components/conversation-and-session） | dissolve | adopterr 的架构/防御性文档（若有）；没有则删，不要自造 |
| `docs/AGENTS.md`、`docs/testing.md`、quality-gates note、`docs/subsystems/`、`type-equiv` | adapt/dissolve | adopterr 的文档/测试规范与目录；无则删 |
| dsh-prose-standard / dsh-ci-test-reliability / dsh-client-ui-ux / dsh-error-handling / cordis-styling-nitpicking 技能链接 | adapt | adopterr 安装的对应技能；未安装则溶解为"项目的 X 规则（若有）" |
| Cordis ownership & cleanup（singleton state/unreversed effects/cleanup order） | dissolve | adopterr 的框架规则（若有） |
| Client UI copy locale-owned / `verify-client-ui-i18n` / t seat / JSX | dissolve | adopterr 的 i18n 机制；无 GUI 则删 |
| Model perspective（prompts、tool schemas、snapshots、e2e） | dissolve | 无模型产品则删 |
| Agent Notes / `.agents/notes/README.md` | adapt | 包内 notes 合约 |
| bilingual changes → `docs/i18n/translation-rules.md`、`terminology.md`；"extended translation skill outside automatic review" | re-bind | translate-docs 技能与其合约（若安装） |
| Loader/bin/worker/ACP bridge/subprocess、snapshots、Session | dissolve | adopterr 的真实入口与记录输出机制 |
| "GitHub review thread"、inline comment | keep | adopterr 的 change-request 机制（GitHub/GitLab/其他） |

**通用内核**：评审的元方法——先读要求再判 diff；按 changed paths 映射到 owning 文档；区分 blocker/suggestion 且不重复 gate 已拦的问题；每条 finding 给出缺陷、位置、影响、证据；对"作者报告"保持怀疑（测试强度、真实入口路径、negative control）；把已实现的设计记录与 shipped 现实对齐；接收评审时按技术理由验证/反驳。这些都能脱离 DSH 成立。

**移植建议**：领域＝变更流程（评审）；程度 **C（并入变更流程技能）**，独立则为 B。理由：三锚点里"产物"只勉强成立（评论线程无形状），按 ceiling 规则它更接近"具体任务辅助"；而并入一个以 PR 生命周期为对象的技能后，产物变成闭合的"变更记录（描述四段 + 证据 + 评审结论）"，锚点齐了。它的大量条目（defensive patterns、Cordis、UI copy、model perspective）在 adopterr 处 dissolve，重写比例高（约 70% 内容需重新绑定或删除），但保留的骨架（先读要求、diff→owning 映射、blocker/证据、验证作者证据、notes 对齐、双语 diff 评审）仍是本包"变更流程"支柱的评审半部。P1。

**合并与拆分**：与 pre-push-checks 合并为"变更流程"技能：pre-push 是"选择证据/推送"步骤，review 是"评审"步骤；两者共享同一对象（一次变更）与同一锚点（adopterr 的 gates + norms + notes）。cross-group：与同伴组的 `dsh-merging-stacked-prs` 协调（合并/落地是第三步骤）；它的 manual checks 若引用同伴组的 ci-test-reliability/client-ui-ux/error-handling，应写成"加载对应技能"而不是复制其内容（one home）。若维护者要保留 8 技能规模，则 code-review 独立 B P1 也可，但要在两者之间写死触发边界（"review in progress" vs "push now"）。

**成本与风险**：3,173 tokens 上游；重写后正文预计 2,000–2,500 tokens（多数 DSH 条目 dissolve），需路由到 references 才能与 pre-push 合并进一个 body（预算 5,000）。无脚本风险（只用 git/gh 查询）。触发边界风险：与 pre-push（"准备推送"）、merging-stacked-prs（"合并"）、find-simpl（"评审一个简化提案"）都相邻，必须在 description 写清"对已存在的变更做语义评审，不选测试、不做合并"。

---

### 4. dsh-doc

**作用与触发**：创建/重构/评审/审计/迁移 DSH 的 Markdown 文档、包 README 和文档网站：audience-first 层级、kind 映射的 YAML metadata、双语行对齐、Summary/目录导航、从用户到开发者的渐进细节、执行验证事实、仓库 gate 校验。是本组最大、最 DSH 专属的技能。

**结构**：`SKILL.md` 132 行 / 18,418 字节 / 约 5,525 tokens（**已超 forge 默认 5,000 tokens body 预算**）。support files 13 个、894 行 / 56,236 字节：`references/metadata-links-i18n.md` 78 行、`structure-hierarchy.md` 87、`style.md` 49、`review.md` 67、`website-sync.md` 95；`templates/package-group.md` 59、`package-reference.md` 103、`package-library.md` 96、`package-bundle.md` 103、`persistence-change.md` 73、`persistence-release.md` 30、`persistence-format.md` 25、`upgrade-guide.md` 29。合计 1,026 行 / 74,654 字节 / 约 22.4K tokens（本组 42%）。0.2.0→0.2.1 只有 `templates/persistence-change.md` 8 行变化（兼容性说明写得更严格）。无 scripts；但正文调用 26 次 `pnpm`（24 次 `pnpm run`）——全部是 DSH 的 gate。

**核心对象与产物**：对象是 DSH 的文档语料（页面、包 README、文档站投影、持久化变更记录、升级指南）。产物是"按 kind 选择模板后写出的页面"+"双语 counterpart"，其中 kind 由机械事实派生（`packages/README.md`→package-group；`dsh.bundle.patch`→package-bundle；library registry→package-library；否则 package-reference；路径模式决定 persistence-*/upgrade-guide）。

**判定标准来源**：几乎全部是 DSH 的机械 gate：`test:docs`、`doc-sync`、`verify-doc-budgets`（manifest 上限）、`verify-package-readme-summaries`（100 词）、`verify-translation-pairing`、`verify-md-links`、`verify-persistence-formats/releases`、`docs:check`（站点投影）、`verify-skill-invocation`。语义部分（voice rules、quality criteria、newcomer test）是判断，但**对象/模板/anchor 全部由 DSH 仓库事实闭合**；在 adopterr 处没有这套 kind 系统，除非 adopterr 自己发明一套 doc schema——那等于把锚点交给 adopterr 自由创造，不是本技能能闭合的。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "DeepSeek Harness Markdown documentation, package READMEs, website" | adapt | adopterr 的文档语料 |
| `kind` 8 类 + 每类一个模板（package-group/reference/library/bundle/persistence-change/release/format/upgrade-guide） | dissolve | adopterr 没有这些文档种类；自造 kind 系统需要 adopterr 自己的 doc 标准，超出本技能 |
| `templates/` 8 个模板 | dissolve | DSH 包布局专用 |
| `docs/AGENTS.md`、`docs/AGENTS.md#wordcount-budgets`、`docs/cookbook/adding-a-package.md`、`docs/cookbook/reviewing-persistence-type-changes.md`、`docs/persistence-changes/README.md`、`docs/i18n/*` | dissolve/adapt | adopterr 的文档规范；多数项目没有 |
| 24 处 `pnpm run`（test:docs/doc-sync/lint/verify-doc-budgets/…）、`git diff --check` | dissolve/re-bind | adopterr 的文档 gate；没有 gate 就没有机械锚点 |
| `website/docs.ts`、`scripts/project-doc-site.ts`、`website/.generated/`、VitePress、`llms.txt` | dissolve | adopterr 的站点投影（多半不存在；DSH 专属） |
| `packages/*`、`dsh.bundle.patch`、`dsh plugin`、Cordis、`Session`、`JSONL`、`session-persistence-jsonl` 参考例 | dissolve | DSH 产品结构 |
| Fact-check procedure（每条操作断言都要在当前 checkout 执行；不能复现就删） | keep/re-bind | 通用，且是本技能最硬的资产 |
| Voice rules（Summary 说"能做什么"；开发者节解释而非枚举；Dev Note 是唯一 slop 区；current state only；受控技术英语） | re-bind | 页面级写作规范，可移植（但需要 adopterr 的 doc 规范承接） |
| Quality criteria（Brief/Intuitive/Friendly/Accurate/Agent-readable/Newcomer-complete） | re-bind | 通用评审判据 |
| 双语行对齐、sidecar、switcher | re-bind | 归 translate-docs 技能（同一合约） |

**通用内核**：四条可抽的程序：(1) **事实核查必须执行**（run every claimed operation；不能复现就删；旧文档也要对最新源码复核）；(2) **受众优先与渐进深度**（入口短、用户→开发者、每个 H2 先一句定向、重内容折叠、Dev Note 唯一非权威区）；(3) **一页一个 kind、kind 机械派生**的思想（取代"看标题猜用途"）；(4) **corpus 审计**（预算、slop 清单、重复规则、过时清单）。

**移植建议**：领域＝文档与双语；程度 **D（整技能不移植）+ C（抽两条程序）**。理由：(1) 对象在任意 adopterr 处不闭合（kind/模板/站点全是 DSH 事实，adopterr 无对应 schema）；(2) 产物形状靠 kind 系统闭合，移植必须自造一套 kind 体系，等于让技能发明自己的锚点，正是 ceiling 规则禁止的；(3) 判定锚点 24 处 DSH gate 在 adopterr 处不存在。三条里两条失败 → 按规则只能是 prose/具体任务辅助。能救的只有 fact-check 程序与受众/页序规范：fact-check 与"evidence.claims"天然同域，可并入变更流程或散文纪律；页序/voice 若维护者想锻造"文档规范"技能，正确做法是**从 adopterr 自己的 doc 标准取源**（新来源、需以 deliberate deviation 记录），而不是从 dsh-doc 抽取。优先级：整技能不移植；抽取项随 P0 的 prose/变更流程顺带完成。

**合并与拆分**：拆分方向：fact-check → 变更流程（"声称的检查必须跑过"）；页级 voice/quality → 若锻造 doc 技能才用；bilingual 行对齐/sidecar/switcher → translate-docs（doc 与 translate 在双语面重复，必须 one home）；upgrade-guide 模板 → 归同伴组的 `dsh-create-upgrade-guide`（若移植）；persistence-change/release/format → dissolve（DSH 持久化格式专属）；website-sync → dissolve（站点投影专属）。

**成本与风险**：22.4K tokens、1,026 行是 9 个中最大的；重写 >80%（references 与 templates 大多 dissolve）；无脚本可移植（全部是 DSH gate，不能自包含）；若强行 B，需要凭空发明 kind 系统 + gate + 站点投影，成本远超收益且违反 ceiling。触发边界风险：若与 prose-standard 并存，两者都讲"文档该写什么"，会争同一决定权；这是它不移植、只抽程序的另一个理由。

---

### 5. dsh-find-simplifications

**作用与触发**：找"删掉能减少维护义务"的改动：无生产者的 API/字段、不改变消费者动作的区分、可换成更小显式行为而删掉整个子系统的机制、可派生而删的缓存/订阅、把组合误当策略的注册表、完整的维护成本。可产出 proposal Agent Note、内联 TODO/FIXME，或评估另一分支的简化。

**结构**：`SKILL.md` 65 行 / 10,371 字节 / 约 3,111 tokens；`references/historical-patterns.md` 45 行 / 8,573 字节 / 约 2,572 tokens。合计 110 行 / 18,944 字节 / 约 5,683 tokens。0.2.1 变化：SKILL.md 与 references 合计 **+6/−8**：SKILL.md 删掉"invariant companion justified by independent observations"整段（上游把这个能力删了）、新增 static unused-code checker 要覆盖 manifest 驱动加载的句子；references 8 行变化（archived/implemented 链接重定向、`the owning note` 指向自己）。前次移植：67 行 / 10,184 字节 + reference 扩到 17,749 字节、46 行差异（按"抽象判据 + DSH 案例"重写，是前次抽取里唯一按抽象方法重做的 reference）。

**核心对象与产物**：对象是"一个代码库里可去除的维护义务"（API/表示/生命周期状态/配置路径/依赖/测试/文档），由 adopterr 的代码库闭合。产物：substantial 时的 proposal Agent Note（Problem/Proposal/Alternatives considered/Acceptance criteria/Risks + 消费者证据 + 放弃的能力 + 可观察验收条件），小改动时的 TODO/FIXME/XXX 注释；不产出代码。

**判定标准来源**：证据链——生产者/消费者路径（rg + 读匹配）、测试/声明能否证明合约、真实入口、生成目录的消费者、依赖替换的净删除量、`pnpm` gate 与 `git diff --check`。这些是"直接可证据化"的，不是自身断言；但"这个候选值不值得删"仍是判断，有 calibrated historical patterns 兜底。产物锚在本包 notes 合约的 proposed 骨架上，因此可闭合。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "DeepSeek Harness code" 描述/标题 | adapt | adopterr 的项目名 |
| `AGENTS.md`、architecture、defensive patterns、testing policy 路径 | adapt/dissolve | adopterr 的对应文档 |
| "The two LLM adapters are intentional. JSONL is the sole first-party Session persistence provider… out-of-tree providers" | dissolve | 抽象为"刻意的 seam/双 provider/已定型格式"，前次已做；具体 DSH 事实删 |
| `packages/*/*/src`、`apps/`、`python/`、shipped profiles/overlays、loader resolution、generated runtime assets | re-bind | adopterr 的源码树/运行时/生成物清单（由 declaration 提供） |
| `rg` + 精确符号/读写/discriminant/event/wire string/config key/包名/`.method(` | re-bind | 通用文本搜索方法；`rg` 可换 adopterr 的 grep |
| "invariant companions"整段（0.2.1 上游已删） | dissolve | 不移植 |
| dependency policy note、`Node builtins at the engine floor` | adapt | adopterr 的依赖政策（若有） |
| Agent Notes 骨架、supersession 通过 dsh-archive-agent-notes | adapt | 包内 notes 合约 + notes 生命周期技能 |
| 子代理划分域（loop/persistence、model/tool assembly、Host/Client/SDKs、subprocess…） | re-bind | adopterr 的子系统清单 |
| `pnpm run doc-sync` / `lint` / `git diff --check`、draft PR | re-bind | adopterr 的检查与 change-request 机制 |
| `references/historical-patterns.md`（12 个 DSH 决策案例 + 路径） | re-bind | 按 Note《The shipped skill text is an extraction》的方法：先写判断（权衡的力、何时翻转），再把案例重述在下面，案例换成 adopterr 自己的 |

**通用内核**：六个发现问题（effect path 是否完整、区分是否改变消费者动作、更小显式行为能否删子系统、能否在使用处读权威值、组合是否被误当策略、谁承担完整维护成本）+ 证据分类（不可达删除 / 有明确损失的收窄 / 受保护义务证据不足）+ 所有权与失败语义（borrow vs own、异步机制映射、durable marker 不是冗余日志）+ 依赖替换的净减少检验 + 提案记录纪律。这套是产品无关的架构判断力，是"简化提案"技能的核心。

**移植建议**：领域＝变更流程（提案/简化）；程度 **B**（独立）或 **C**（作变更流程技能的提案模式）。锚点测试：对象（adopterr 代码库）✓、产物（proposed note 五段骨架 + TODO）✓、判定（消费者证据/测试/搜索，直接可证）✓——过 ceiling，可以独立。但优先级 P2：它依赖 notes 合约与 archive/notes 生命周期（若 notes 技能未锻造，提案无处落），且 references 必须重写（DSH 案例不能留）。若变更流程技能先锻造，把"简化提案"作为其一个模式（C）更省一个技能；独立 B 的理由是它的搜索/证据方法篇幅大、与"推送前检查"触发不同。

**合并与拆分**：与 archive 分工：archive 管保留/归档/删除，find-simpl 管产生提案；两者都要求 supersession check，合并后统一指向 notes 技能。与 prose-standard 分工：find-simpl 的"移除代码复述/远处 owned 解释"部分引用 prose，不复制。与 dsh-doc 的 slop 审计：doc 的"找重复规则/过时清单"与本技能重叠，方向是 doc 那条引用本技能（若 doc 存在）。不拆分。

**成本与风险**：5,683 tokens 上游；正文重写约 50–60%（6 个问题可保留，DSH 事实全换）；reference 必须重写（前次示范：8.6KB→17.7KB，按抽象+案例重述，成本最高的单文件之一）。无脚本风险（搜索+git 命令）。触发边界风险：与 archive（"整理 notes"）、变更流程（"提案"）、prose（"删冗余解释"）相邻，description 要写"找可删除的维护义务并出提案，不执行删除、不整理 notes 存续"；0.2.1 显示上游在删 DSH 架构条目，直接抽取会持续漂移。

---

### 6. dsh-pre-push-checks

**作用与触发**：推送、force-push、标记 ready、或在分支上声称"检查通过"之前加载；`gh stack sync` 刚发布改写分支之后立即加载。核心是**选择覆盖本次 outgoing diff 的最小测试/检查集**，不反射式跑全套；推送后核对 CI，失败就停；改写推送用 `--force-with-lease=<branch>:<observed-oid>` 保护，并规定 post-sync 的验证顺序。

**结构**：`SKILL.md` 137 行 / 11,283 字节 / 约 3,385 tokens；无 references/templates/scripts。0.2.1 变化 **+1 行**（`build:artifacts` 只查包项目，声明完成前要跑 `build:check`）。前次移植版 128 行 / 9,914 字节，差异触达 62 行（增删合计，约为原文 137 行的 45%）。

**核心对象与产物**：对象＝outgoing diff（committed scope vs merge base + worktree 的 staged/unstaged/untracked），由 git 定界。产物＝选中的检查 + 实际执行过的命令与输出 + 推送结果/CI 状态；"只报告跑过的命令"是可核查的产物约束。

**判定标准来源**：diff→surface 的映射（判断，但有明确清单）、adopterr 的 gate 清单（命令是否存在、是否覆盖该 surface，可核查）、`git diff`/`rev-parse`/push lease/OID、`gh pr checks` 的 pending/failure 语义。机械部分最多，且"声明未跑的检查"可被输出对照。三锚点最稳的一个。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "deepseek-harness branch" 描述/标题 | adapt | adopterr 的项目名 |
| `gh stack sync` / `gh stack push` / post-sync 验证 / 官方 stack 顺序 | re-bind/dissolve | 有 stacked PR 流程才保留；否则把 stack 部分并入同伴组 dsh-merging-stacked-prs，只留通用改写防护（lease/OID/重审 unresolved threads） |
| `--force-with-lease`、raw `--force` 禁止、改写后重查 heads/approvals/checks | keep | 通用 |
| `pnpm --silent run change-scope` | re-bind | `git diff --name-only <base>...HEAD`（前次已做） |
| `pnpm run doc-sync`、`typecheck`、`build`、`build:artifacts`、`build:check`、`hygiene`、`test:e2e`、`test:snapshot`、`test:expected`、`test:web` | adapt | adopterr 的 gate 清单（从 AGENTS.md/declaration 读） |
| `packages/*/*/src`、`apps/cli/tests/profiles`、`snapshots/`、`tests/expected/`、`session[.vN].jsonl`、`snapshot.yml`、`*.snapshot.ts` | dissolve/re-bind | adopterr 的源码/期望输出布局；前次已泛化为"recording tree + owning test" |
| Vitest 语法（`--coverage.include`、`vitest related`、`--passWithNoTests`、per-file 100%） | re-bind | adopterr 的 test runner 与其 coverage 语法（前次已泛化为 `<runner>`） |
| `gh pr checks`、`gh pr view --json mergeable,mergeStateStatus`、`/actions/runs?head_sha=` | re-bind | GitHub 专用；其他 host 换等价查询；"CONFLICTING 时 GitHub 不产生 workflow run"的洞见保留为"无信号先读 mergeability" |
| hooks（pre-commit/pre-push）、removed `check:pre-push` aggregate、Loader/Cordis/profile | adapt/dissolve | adopterr 的 hooks；DSH 专名删 |
| `git merge-tree --write-tree` | keep | 通用 |

**通用内核**：证据选择方法论——"没有通用本地基线，每条行为改动都要有会因该回归而失败的最小检查"；把 test selection 与 coverage selection 分开；dependency-graph 选测试的盲区（配置/动态加载/子进程/worker/构建产物/外部 provider）；不重复已通过的检查；失败时停而不是"指望 CI 不同"；环境性失败要证明；改写推送的安全规则与 post-rewrite 重审。这套可以整体离开 DSH，只需换命令与布局。

**移植建议**：领域＝变更流程（检查选择/证据）；程度 **B**，且是 **P0**：三锚点全过（对象 diff、产物"跑过的命令+结果"、锚点 adopterr gates 存在性），是本组最接近"通用技能"的一个；前次移植已证明 45% 行可完成值替换，剩余是 layout 与 stack 段的溶解。它是本包"变更流程"支柱的证据半部，与 norms `test.fast-subset`、`evidence.claims` 同主题，落成技能后能把 norms 的"最小子集"变成可执行 SOP。

**合并与拆分**：与 code-review 合并为"变更流程"技能（review 步骤 + evidence/push 步骤）；`gh stack sync`/stack 段与同伴组 `dsh-merging-stacked-prs` 合并到一处（跨组）；test-reliability 的细节路由给同伴组 `dsh-ci-test-reliability`，不复制；"哪些检查能证明文档改动"路由给 prose/doc 技能。拆分：无。

**成本与风险**：3,385 tokens 上游，重写后正文约 2,200–2,800 tokens（前次 9.9KB 可作底稿，但要去掉 DSH 布局与 stack）。无脚本风险：命令全是 git/gh，前次已把 change-scope 换成 git；若保留 stack 部分则依赖 `gh stack` 扩展，应在 `compatibility` 记录。触发边界风险：与 code-review（评审）、merging-stacked-prs（合并）、ci-test-reliability（测试可靠性）相邻；description 必须把"选择并执行覆盖 diff 的最小证据，不做语义评审、不做合并"写死。0.2.1 仅 +1 行，漂移小。

---

### 7. dsh-prose-standard

**作用与触发**：在本仓写、审、恢复、裁剪、审计散文时加载：决定 Markdown、public API 文档（JSDoc/Javadoc/docstrings）、代码与测试注释、prompt、描述、诊断、CLI/UI 字符串各自"必须写什么"。核心规则是"完整命题"：编辑前列出 actor/action、条件与时序、模态、负保证与例外、所有权/副作用/失败/后果，全部保住才允许删装饰；然后按散文位置给 required coverage 清单。显式声明"guidance, not a script"，要求 scope 明确、排除 vendored 与冻结归档。

**结构**：`SKILL.md` 81 行 / 9,621 字节 / 约 2,886 tokens；`references/examples.md` 169 行 / 9,457 字节 / 约 2,837 tokens。合计 250 行 / 19,078 字节 / 约 5,723 tokens。0.2.0→0.2.1 **无变化**。前次移植：81 行 / 9,685 字节（差异 22 行，约 27%），主要改 description 与标题、把 JSDoc 泛化为 "public API documentation"、Cordis-free→framework-free、`vendor/` 排除改为本仓的 `vendor-*`、notes 路径改为 `.agents/dsh-spec/notes/`、doc/translate 链接改写。`references/examples.md` 169 行中仅 8 行变化（多为路径/术语替换），**DSH 案例基本原样保留**。

**核心对象与产物**：对象是"固定表面上的散文"——表面是可枚举的（Markdown、API 文档、内部注释、模块注释、测试、cookbook、README、Agent Notes、postmortem、技能/agent 指令、示例与配置注释、prompt 与可见串、诊断），这使对象在 adopterr 处仍可闭合（由 adopterr 技术栈决定具体形式）。产物是"保留全部命题的编辑 + 每个候选的分类（keep/add/trim/restore/restructure/defer）+ 实际跑过的检查 + 报告"；由编辑器 diff 承载，无固定字段，但 complete-proposition 规则使每一步可复核。

**判定标准来源**：complete-proposition 规则是可直接判的（逐条列举命题，检查是否成立）；required coverage 按位置对照；examples 是校准；machine 部分依赖 adopterr 的 gate（locale copy 检查、snapshot、`git diff --check`）。它不发明自己的断言——判据是"这段文字对调用者/维护者承诺了什么"，直接可证。三锚点过。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "deepseek-harness repo" 描述/标题 | adapt | "this repository" |
| `vendor/` 排除（且不跟随 symlink） | adapt | adopterr 的 vendored 依赖目录；前次改为 `vendor/**` + `vendor-*` |
| `.agents/notes/archived/` 冻结归档排除 | adapt | adopterr notes 合约的 archived 路径 |
| `docs/AGENTS.md`（the documentation standard）、`docs/cookbook/adding-a-package.md#4`、`docs/AGENTS.md#writing-rules` | dissolve/adapt | adopterr 的文档规范；无则删，规则自足 |
| JSDoc/`@param`/`@returns` 等生态形式 | re-bind | public API 文档（JSDoc/Javadoc/docstrings 任一生态）；前次已做 |
| Client UI copy / Cordis-free primitives / `verify-client-ui-i18n` / JSX / t seat | dissolve | adopterr 的 i18n 机制；无 GUI 则删 |
| snapshot / recorded output / model-visible text / runnable snapshot | dissolve | 无模型/记录输出则删；有则换成 adopterr 机制 |
| "lightweight routine path"、bilingual pair 重录 | re-bind | translate-docs 技能 / adopterr 的配对合约 |
| `rg`/`wc`/`git diff --check` | keep | 通用命令 |
| `references/examples.md` 的 DSH 案例（coordinator/session prefix/worker realm/Remote/SSE/`verify-doc-typecheck`） | re-bind | 保留判断原则，案例换成 adopterr 的；或明确标注"示例来自另一个项目" |

**通用内核**：几乎整个技能：完整命题规则；一个解释只有一个 home，但本地合约可重复；required coverage by location（这是"散文职责表"，任何项目的注释/README/API 文档/决策记录都适用）；生成的摘要必须能独立成立；limitations 是合约而非债务清单；模型可见文本是行为；trim 不能靠字数；review 与 write 的权限区分（audit 只报告，explicit write 才改）；borderline 案例的判定与沉淀。它是本包"散文纪律"支柱的写/审半部。

**移植建议**：领域＝散文纪律；程度 **B**，**P0**：三锚点全过（表面可枚举、产物是"命题完整性 + 分类 + 报告"、判据直接可证），前次已证明约 73% 文本可保留（27% 行改动），是 9 个里重写成本最低、价值最高、上游最稳定（0.2.1 零变化）的技能。它直接兑现包 README 的 "a change has to carry… what proves it" 中"prose discipline"那一半，且与 norms 的 `prose.voice` 同源。

**合并与拆分**：吸收 trim-cot-leakage（审计模式）；与 dsh-doc 的分工是"句子级 vs 页面级"（doc 若锻造，page order/budget/kind 归 doc，prose 只给每个位置的覆盖要求）；与 translate-docs 的分工是"命题完整 vs 双语保真"（translate 的 fidelity 检查引用 prose 的 complete-proposition，不复制）；与 code-review 的关系是"新增散文的语义评审"步骤引用本技能。拆分：`examples.md` 保持独立 reference（按需加载，符合资源规则）；coverage 清单可留在 body。

**成本与风险**：上游 5,723 tokens（body 2,886 < 5000 预算，可直接承载）；`examples.md` 需按"抽象原则 + 可替换案例"重写（前次只做了轻微路径替换，留下大量 DSH 专名，新架构下必须再处理；预计 9.5KB 中 60–70% 改写或重述）。无脚本风险（命令是 rg/wc/git）。触发边界风险：与 trim-cot（审计泄漏）、doc（页面规范）、translate（双语）、code-review（评审新散文）相邻；description 要写"决定文本该说什么/说多少，不负责页面层级、不负责双语配对、不负责找泄漏"。

---

### 8. dsh-trim-cot-leakage

**作用与触发**：审计并修复"像泄露的推理记录"的散文：只对作者会话成立、只在当时可见的引用（(decision N)、audit item codes、未提交草稿的 §N、plan phase labels）、变更叙述（"used to"、"no longer"、"this cut"）、stack/PR 视角、对评审者的辩解、控制流叙述、无标记的延期/hedge、作者语言残留。核心是"一个测试"：HEAD 的读者在没有 session transcript/PR thread/未提交稿的条件下能否解析每个引用并验证每个断言？不能则把存活事实改写成当前视角，删掉记录；能则不是泄漏。另有 8 类 taxonomy、keep 规则（issue refs、measured bounds、suppression reasons、runtime old/new 等）与 overcorrection traps。

**结构**：`SKILL.md` 45 行 / 7,699 字节 / 约 2,310 tokens；`references/examples.md` 275 行 / 12,566 字节 / 约 3,770 tokens；`references/recall-batteries.md` 52 行 / 4,980 字节 / 约 1,494 tokens。合计 372 行 / 25,245 字节 / 约 7,574 tokens（本组第二）。0.2.1 变化 2 行（owning note 链接改为 archived/owning reference）。前次移植：45 行 / 7,491 字节 + references 12,539/5,644 字节；body 差异 22 行（增删合计，约为原文 45 行的 49%，主要是路径与泛化），`examples.md` 275 行中 12 行变化，但 `recall-batteries.md` 52 行中 41 行被重写（排除规则/路径/自身目录）——**案例与探针都需要按新架构再处理**。

**核心对象与产物**：对象是"推理过程泄漏的散文"，由 8 类 taxomomy 闭合；表面同 prose-standard（Markdown、JSDoc、docs、Agent Notes）。产物是审计结果（命中 + 语义判定）+ 修复后的散文 + 复跑 batteries 后的 keep 列表 + 各表面的 gate 结果。

**判定标准来源**："一个测试"直接可判；recall batteries 是机械探针（rg，需正/负校准，明确"探针不是定义"）；keep 规则可判（issue ref 在 HEAD 可解析、measured 是证据词、suppression reason 是必需 prose、runtime old/new 不是历史）；overcorrection traps 提供反例。三锚点过（对象与判据都可直接对照），但它的判定规则与 prose-standard 的 complete-proposition 是同一套——技能自己已写 "REQUIRED BACKGROUND: dsh-prose-standard owns the complete-proposition rule"。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| `(decision 7)`/`(audit C2)`/`design §4.7`/`T4`/`W3`/`P-I` 等模式 | keep | 通用模式（例子里的 "decision N" 是通用形态） |
| 引用的 owner note 路径（`notes/archived/process/2026-08-09-committed-artifact-citations.md`） | adapt | 换成 adopterr 的 notes 路径；机制（有 committed owner 就按名+路径引用）保留 |
| `docs/AGENTS.md` 的 change-story routing、"Agent Notes and postmortems sanctioned evidence" | re-bind | adopterr 的 doc/notes 合约 |
| `.agents/notes/archived/` 排除 | adapt | adopterr archived 路径 |
| `rg -n --hidden`、`--glob '!vendor/**'`、`--glob '!.agents/skills/dsh-trim-cot-leakage/**'`（自身自命中）、`--glob '!node_modules/**'` | adapt | adopterr 的路径与技能自身目录名 |
| `verify-type-equiv`、`verify-translation-pairing`、`doc-sync`、`verify-md-wrap`、`verify-md-links` | re-bind/dissolve | adopterr 的对应 gate；包内只有部分（pairing/md-links） |
| 双语 fences、pair 重录、lightweight routine | re-bind | translate-docs 合约 |
| `references/examples.md` 275 行中的 DSH 具体路径/PR #88/issue #1470/RFC 9110/Agent Note 名 | re-bind | 判断原则保留，案例换成 adopterr 的；少量通用引用（RFC）保留 |
| recall-batteries 中的 DSH 路径（`.agents/notes/archived/**`、vendored 目录） | adapt | adopterr 路径 |

**通用内核**：resolvability 测试本身；8 类泄漏分类；keep 规则（方向性纠偏：不误删 durable 引用、不误留死引用）；探针（batteries）+ 校准（正/负例）+"探针不是定义"的元规则；overcorrection traps（把义务改成背书、把假设升成已发布、连同转述删掉事实、丢证据来源）；修复顺序（owner-first：生成目录→源头；type fence→源注释；双语→counterpart；冻结归档不动）。这是"散文纪律"的审计半部，范围可整体离开 DSH。

**移植建议**：领域＝散文纪律（审计）；程度 **C（并入 prose-standard）**，独立则 B。理由：两者对象相同（散文）、判据相同（complete-proposition + resolvability）、读者相同（本仓写作者）；trim 自己就把 prose 标为 REQUIRED BACKGROUND。合并方式：prose-standard 的 body 保留写/审 SOP，把泄漏审计作为 references/leakage-audit.md（8 类 + 一个测试 + batteries + examples 拆分），body 只留触发词与"审计时加载"；这样常规写 prose 不加载 7.5K tokens，审计时才加载。独立锻造的唯一理由是触发词更专（"audit leakage"），但 description 可以覆盖。P2（若并入 P0 的 prose，则随 P0 一起完成）。

**合并与拆分**：方向 prose ← trim。拆分：`examples.md`（275 行）与 `recall-batteries.md`（52 行）保持为 reference（按需加载）；taxonomy 与 keep 规则可留在审计 reference 中；"scope/exclusions"部分与 prose 共用一处（one home）。与 archive 的关系：冻结归档是排除项，不是合并对象。与 doc 的关系：doc 的 slop 清单引用本审计（若 doc 存在）。

**成本与风险**：7,574 tokens（其中 6.3K 在 references）；重写比例：body 约 30–40%，examples 约 60%（前次仅轻微改路径，DSH 案例必须按抽象重述或明确标为外来示例）；batteries 探针可保留、路径要换。无脚本风险（rg 探针；adopterr 没有 rg 则换 grep，需改探针写法）。触发边界风险：与 prose-standard（同一对象）、doc（slop）、code-review（评审叙事）相邻；并入 prose 后风险消失，但会增大审计时的加载量（可接受，按需 reference）。

---

### 9. dsh-translate-docs

**作用与触发**：仅在用户显式点名时运行（`disable-model-invocation: true`、`user-invocable: true`）：维护 `foo.md ↔ foo.zh.md` 对，包括 briefing 驱动的更新路径（生成 brief、机械-only 变更 `--apply`、散文变更派子代理、最小编辑、scoped 记录）、整篇新对路径（先读 sources of truth、section by section、Pass 1 写作/Pass 2 逐句核源、单独复读）、术语表绑定、代码块 byte-identical、链接 locale、switcher、sidecar 记录、配对 gate 校验。

**结构**：`SKILL.md` 74 行 / 10,604 字节 / 约 3,181 tokens；0.2.1 时**没有 references/templates/scripts**（全部 sources of truth 在 DSH 的 `docs/i18n/`）；0.2.0→0.2.1 **无变化**。前次移植：76 行 / 11,210 字节 + 自建 references（i18n-contract.md/zh/yaml、translation-rules.md/zh/yaml、style-samples.md、translation-prompt.md，合计约 73KB）；差异 44 行（约 59% body 行被改，主要是 manager 命令与路径），说明它是前次抽取里 reference 搬运量最大的一个。

**核心对象与产物**：对象是双语对：`foo.md`、`foo.zh.md`、`foo.i18n.yaml` sidecar；"有 zh sibling 或 sidecar 即成对"由树声明，adopterr 的语言由 declaration 定。产物是更新后的 pair + sidecar 哈希重录 + scoped verification + 报告（新对 vs 最小更新、「待定术语」列表）；形状固定（三文件、switcher 行、hash sidecar），可校验。

**判定标准来源**：pairing gate 机械（heading depth、fenced blocks、table row/column、list kind/起始/项数、link locale、semantic target、行数对齐）；sidecar 哈希机械；术语表是 adopterr 拥有的合约（binding in both directions）；fidelity（不加不减、code span verbatim）是判断但可逐句核。三锚点过，前提是**配对合约与 gate 随技能一起移植**。

**dsh 绑定清单**

| 内容 | 类型 | 通用替代 |
|---|---|---|
| "DeepSeek Harness bilingual-document workflow" 描述/标题 | adapt | adopterr 的双语工作流 |
| `docs/i18n/README.md`、`translation-rules.md`、`terminology.md`、`translation-prompt.md`、`style-samples.md` | re-bind | 前次已把前四个搬进技能 `references/`；新架构应：配对合约进 references/，**术语表归 adopterr 拥有**（Note《Terminology rows are the maintainer's decision》），style samples 可保留但标注来源 |
| `pnpm run gen-translation-brief`、`gen-translation-brief --apply` | re-bind | 自包含的 brief 生成器（可移植 DSH 的 `gen-translation-brief.ts` + `translation-brief.ts`，约 850 行，依赖 git diff；前次用 manager 命令） |
| `pnpm run verify-translation-pairing --write/<pair>/--list`、`doc-sync`、`verify-md-wrap`、`verify-md-links` | re-bind | 自包含 pairing 脚本（DSH 的 `translation-pairing.ts`+`verify-translation-pairing.ts`+`translation-pairing-record.ts`+`translation-links.ts`+`i18n-scope.ts` 约 1,560 行 + `vendor-mdast` bundle）；adopterr 的 aggregate check |
| `docs/i18n/translation-prompt.md`（automated pipeline 模板） | dissolve | agents 不渲染它，只有术语表被注入；可不带 |
| `scripts/translation-pairing.manifest.json`、generator-owned switcher 例外 | re-bind | 前次已改为 declaration-driven（有 counterpart 即成对，无需注册） |
| `.agents/notes/archived/` 冻结 triplet 不翻译 | adapt | adopterr archived 路径 |
| 中文专用规则（Chinese and first-occurrence columns、「待定术语」、`English \| 中文` switcher） | keep/re-bind | 包是英中双语，保留；其他语言 adopterr 需泛化为"目标语言列 + 待定术语" |
| `disable-model-invocation: true` / `user-invocable: true` | keep | 技能元数据（显式调用边界） |
| 升级指南、doc 页的双语 | — | 若 doc 技能不移植，双语规则全部收在本技能；若同伴组 create-upgrade-guide 移植，其 guide 对的双语也归本技能 |

**通用内核**：双语对的完整工作流——最小更新而非重译（保留已审措辞）、briefing 作为翻译者的全部工作集（不重读语料、不重推 diff）、机械 fence 变更自动 apply、整篇翻译的两遍法（写作/核源）+ 单独复读、术语表绑定与「待定术语」流程、结构保持（fence byte-identical、链接语义、switcher）、sidecar 作为"我确认两边同义"的可审陈述、显式调用边界。这是可以整体离开 DSH 的“文档与双语”方法论。

**移植建议**：领域＝文档与双语；程度 **B**（重绑定为通用双语配对技能），**P1**；若包不承诺双语（adopterr 单语）则降 P2，但本包自己的 README/notes/模板都是双语对，且 NOTES 合约按 triplet 组织，双语是包的既有承诺（README："The two languages stay together"），故建议 P1。成本集中在两处：(1) 配对/简报脚本自包含化（约 2.4K 行 engine + mdast bundle，或退化为"无脚本、只给合约与人工校验步骤"，但那样三锚点的"机械判据"就弱了）；(2) 合约 references 搬运（约 73KB，前次已做过一版，可复用其内容但要按 adopterrs 重写路径）。术语表必须留给 adopterrs（否则每次升级覆盖其决定）。

**合并与拆分**：与 dsh-doc 的双语面对齐部分合并进本技能（行对齐、sidecar、switcher 归本技能，doc 不再持有）；与 prose-standard 分工：prose 管命题完整，translate 管双语保真与结构；与 code-review 分工：评审双语 diff 时引用本技能的 gate，不复制；跨组：同伴组 `dsh-create-upgrade-guide` 的 guide 对（`guide.md`/`guide.zh.md`）双语归本技能合约。拆分：不需要拆；但可把"更新路径"与"新对路径"拆成两个 references（body 留 triage 与边界）。

**成本与风险**：3,181 tokens body + 约 22K tokens references（若搬 73KB）——是单技能加载成本最高的之一，因此 references 必须按需加载（更新路径只载 brief 输出，不载整篇翻译路径）。脚本风险最高（pairing gate + brief 生成器 + mdast bundle），且原 manager 的测试已移除，需新测试。触发边界风险：显式调用边界（不自动触发）必须保留；与 doc/prose 的边界（双语 vs 页面规范 vs 句子规范）要写清；与 create-upgrade-guide 的双语归属需与 Lead 协调。

---

## 三、组内合并候选图

组内（本 9 个）：

```text
                    ┌──────────────── 散文纪律（新技能） ────────────────┐
                    │  dsh-prose-standard (B, P0)  ←─ C ─ dsh-trim-cot-leakage │
                    │  写/审 SOP + coverage           审计 reference(8类+batteries) │
                    └──────────────────────────────────────────────────────────┘
                    ┌──────────────── 变更流程（新技能） ────────────────┐
                    │  dsh-pre-push-checks (B, P0) + dsh-code-review (C)  │
                    │  证据/推送步骤 + 评审步骤（references/review.md）     │
                    └──────────────────────────────────────────────────────────┘
                    ┌──────────────── notes 生命周期（决策记录，待决） ──┐
                    │  dsh-archive-agent-notes (C→B) + 创建/校验/合并半部 │
                    └──────────────────────────────────────────────────────────┘
   dsh-translate-docs (B, P1) ── 双语对独立，吸收 doc 的双语面
   dsh-find-simplifications (B/C, P2) ── 提案模式；与 notes/变更流程分工
   dsh-doc (D) ── 抽 fact-check → 变更流程；页级 voice → 若未来 doc 技能；双语 → translate
   agent-experience (C) ── 六条上下文原则 → forge references；tool-definition 半部 D
```

合并方向与理由（一句话版）：

| 合并 | 方向 | 理由 |
|---|---|---|
| prose-standard ← trim-cot | trim 作 prose 的审计 reference | 同对象（散文）、同判据（complete-proposition/resolvability）、同读者；trim 自己声明 prose 是 REQUIRED BACKGROUND；常规写作不加载审计材料 |
| 变更流程 ← pre-push + code-review | 一个技能两个步骤/引用 | 同对象（一次变更）、同锚点（adopterr gates + norms + notes）；pre-push 是证据半部、review 是语义半部；评审产物需要 PR 记录才闭合 |
| notes 生命周期 ← archive（+ 未来创建/校验半部） | archive 作生命周期技能的归档 reference | 同一对象（notes 树）；archive 缺"新建/格式校验/合并"半部，单独成技能会把 notes 合约写两遍；封印验证器只应有一个 home |
| translate ← doc 的双语面 | 双语规则归 translate | doc 的双语行对齐/sidecar/switcher 与 translate 完全同域；doc 不移植后这些规则仍需要家 |
| forge ← agent-experience 的六条原则 | 并入 forge 的 Docs reference | forge 对象闭合；agent-experience 独立不闭合；六条是 forge 资源策略的扩展 |
| find-simpl 保持独立（或作变更流程的提案模式） | 不并入 archive | 它产出提案而非保留/归档；与 notes 的关系是"提案落进 notes 合约" |
| dsh-doc 不整体合并 | 只抽 fact-check（→变更流程/prose） | 其余文件/模板/站点绑定 DSH，adopterr 处无锚点 |

跨组（需 Lead 与同伴组核对）：

| 本组技能 | 跨组技能 | 关系与协调点 |
|---|---|---|
| pre-push-checks（stack 段）+ code-review | 同伴组 `dsh-merging-stacked-prs` | 三处都谈 PR 生命周期：**push/rewrite 的 stack 部分应只留一处**；建议 merging-stacked-prs 拥有"同步/合并"，pre-push 只留通用 lease 防护，或三者合成一个变更流程技能 |
| code-review | 同伴组 `dsh-ci-test-reliability`、`dsh-client-ui-ux`、`dsh-error-handling`、`cordis-styling-nitpicking` | review 的 manual checks 大量引用这些技能；若它们移植，review 应写成"加载对应技能"而非复制清单；若不移植，review 对应条目 dissolve |
| dsh-doc | 同伴组 `dsh-create-upgrade-guide` | upgrade-guide 模板/kind 原属 doc，但 scope/placement/长度规则归 create-upgrade-guide；doc 不移植后，升级指南的双语对归 translate |
| dsh-prose-standard | 同伴组 `dsh-client-ui-ux` | 可见串（UI copy）的措辞纪律：prose 管"说什么/完整命题"，client-ui-ux 管"哪个反馈面/什么语气"；不要两边都写"locale-owned" |
| dsh-translate-docs | 同伴组 `dsh-create-upgrade-guide` | guide 的双语对（`guide.zh.md`）归本技能合约，create-upgrade-guide 只管 guide 的内容结构 |
| dsh-archive-agent-notes | 同伴组（若有 notes 初始化/技能套件安装类技能） | notes 合约与封印验证器只能有一个出资方；若同伴组不涉及，则由 notes 生命周期技能（待决）承接 |

---

## 四、待决问题

**Q1. 脚本归属：恢复一个共享引擎，还是每技能自带 script？**
- 背景：`archive` 需要封印/notes 校验脚本（engine 子集约 1,154 行 + mdast bundle），`translate` 需要 pairing/brief 脚本（约 2,414 行 + mdast bundle）。forge 的打包机制是"每技能自带 `package/<name>/` + `vite.config.ts`"，没有共享脚本位。engine 现在只在 `scripts/dsh-spec-manager/`，属仓库工具、不随技能发布（`package/README.md`、AGENTS.md 的 Commands）。
- 选项 A：每个技能自带打包脚本（把 engine 子集拆进各自 `package/<skill>/`）。代价：同一 Markdown 解析/notes/配对逻辑在两三个技能里各一份，违反 SSOT；每个都要自带约 240KB bundle；测试翻倍。
- 选项 B：恢复一个"notes / 契约引擎"技能（或包级 engine 目录），其他技能只引用命令。代价：与"重建为一个 forge 技能"的现状冲突，需要新的打包与安装模型。
- 选项 C：**只让确需脚本的技能自带脚本**：`archive` 的脚本部分与其 notes 生命周期技能一起锻造（一个出资方）；`translate` 自己带一个自包含的 pairing 脚本（唯一需要脚本的独立技能）；其余技能全部无脚本。
- 建议：**C**。先决定 Q2 的 notes 生命周期是否成为下一锻造目标；若是，archive 的脚本与合约都收进它。`translate` 的 pairing 脚本单独打包（其对象是文件对，与其他技能无共享逻辑，除 mdast 解析可接受重复 bundle）。

**Q2. 下一个（或下一批）锻造目标是什么？**
- 选项 A：先 prose（散文纪律），再变更流程，再 notes 生命周期，再双语。
- 选项 B：先 notes 生命周期（决策记录是包的脊梁）。
- 选项 C：先变更流程（证据/推送）。
- 建议：**A 的变体**：P0 先 prose-standard（最小重写、最稳定、兑现包 README 的一半），紧接着 pre-push-checks（证据半部）；notes 生命周期必须先决定 **来源**（它无法从本 9 个上游技能锻造——archive 只是保留半部，创建/校验半部来自已移除的 `dsh-spec-manager`，属"deliberate deviation"，需要按 rejected note 的教训记录），所以它应作为一个**独立决策**，而不是顺手排进本轮；translate 在 Q3 决定后 P1。

**Q3. 双语是包的核心承诺还是可选能力？**
- 事实：包的 README 明说 "The two languages stay together"；notes 合约按 triplet 组织；但配对是"声明驱动"的（有 counterpart 即成对，无则单语合法，见 `scripts/dsh-spec-manager/scripts/i18n-scope.ts`）。
- 选项 A：双语为核心承诺 → translate-docs B、P1，pairing 脚本必须自包含，术语表归 adopterr。
- 选项 B：双语为可选 → translate-docs 降 P2，或先只移植"配对合约 + 检查清单"（C），脚本后置。
- 建议：**A**，但把 `translation-pairing` 的机械 gate 与"术语表由维护者拥有"写进第一次锻造的 outcome assertion；否则该技能会退化成"翻译建议"，三锚点的机械判据丧失。

**Q4. code-review 独立还是并入变更流程？**
- 选项 A：独立 B（保留 8 技能规模惯例、触发更专）；选项 B：C 并入变更流程（产物借 PR 记录闭合、与 pre-push 共享对象/锚点）。
- 建议：**B（并入）**，且评审内容放 `references/review.md` 按需加载；若维护者更看重触发精准与加载成本，则 A 可接受，但必须与 pre-push 写死触发边界，并把两者的公共锚点（gates/norms/notes）只写一处。

**Q5. trim-cot 并入 prose 还是独立？**
- 选项 A：C 并入（同对象/同判据，省一个技能；审计材料按需加载）；选项 B：独立 B P2（触发更专："审计泄漏"）。
- 建议：**A**。唯一反对理由是用户可能直接点名审计；description 里保留 "audit leaked reasoning / CoT leakage" 触发词即可。

**Q6. dsh-doc：真的不移植吗？**
- 选项 A：D（整技能不移植），只抽 fact-check 与页序/voice 两条程序；选项 B：另起一个"文档规范"技能，但**来源换成 adopterr 自己的 doc 标准**（新来源，需记录 deviation）。
- 建议：**A**。B 的代价是重新发明 kind 系统与 gate，且本包的目标不是成为文档站工具；fact-check 程序（"每条操作断言必须执行过"）与 norms `evidence.claims` 是同一事实的两个面，应在变更流程技能里落一次（one home），文档页级规范只在确有必要时再从 adopterr 取源。

**Q7. 新技能命名与追溯：沿用上游名还是改成 dsh-spec-\*？**
- 事实：前次沿用上游名（`dsh-prose-standard` 等），Note《The shipped skill text is an extraction》要求"与 `submodules/dsh/` 的 diff 保持可归因"，沿用名使 diff 对齐。forge 的规则只约束 name 格式（小写、连字符、≤64、与目录一致）。
- 建议：**沿用上游名**（`dsh-prose-standard`、`dsh-pre-push-checks`、`dsh-translate-docs`、`dsh-archive-agent-notes`、`dsh-code-review`、`dsh-find-simplifications`、`dsh-trim-cot-leakage`、`dsh-agent-experience`），新造的合并技能再取新名（如 `dsh-spec-change-workflow`、`dsh-spec-prose`、或继续用上游名做合并后技能名）。这样 re-extraction 的 diff 仍可对照基线，包的用户也能从上游文档找到出处；改名会同时破坏这两件事。

**Q8. 合并技能的 body 预算与拆分粒度**
- 事实：forge 默认 body < 5,000 tokens、< 500 行；合并 prose+trim 上游合计约 5.7K tokens（body 2.9K+2.3K），合并 pre-push+code-review 约 6.6K tokens。
- 建议：合并后 body 只放触发、边界、全局定义/规则、SOP 步骤；评审/审计/泄漏等大块材料按需放进 `references/<step>.md`。forge 不再以预算为路由理由；体量只由脚本报告，是否可接受由 Agent Skills guides 判断。

---

### 附：证据索引（只读，均可复核）

- 上游技能：`submodules/dsh/.agents/skills/<name>/SKILL.md` 及其 references/templates（本档案结构一节的行数/字节均来自 `wc -l -c`）；`agent-experience` 真文件在 `submodules/dsh/packages/preset/agent-preset/skills/agent-experience/SKILL.md`（`SKILL.md` 是 symlink）。
- 0.2.0→0.2.1：`git -C submodules/dsh diff dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/skills/<name>`。
- 前次移植：`git show main:skills/<name>/SKILL.md`（8 个；`dsh-doc` 从未移植），`.agents/skills/` 部署副本与 `main` 相同（已核对）。
- 判定框架与包契约：`.agents/dsh-spec/notes/implemented/process/2026-10-22-the-forge-marks-the-abstraction-ceiling.md`、`skills/dsh-spec-skill-forge/SKILL.md` 及 `skills/dsh-spec-skill-forge/SKILL.md`、`offline-skill-authoring.md`、`.agents/dsh-spec/notes/implemented/process/2026-09-21-the-shipped-skill-text-is-an-extraction.md`、`.agents/dsh-spec/notes/README.md`、`.agents/dsh-spec/norms/norms.md`（经 AGENTS.md 的 norms 摘要）、`package/README.md`、`scripts/dsh-spec-manager/scripts/i18n-scope.ts`。

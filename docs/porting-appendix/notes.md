# dsh 基线 Agent Notes 体系解剖、统计与移植说明

- **分析对象**：`submodules/dsh`（git submodule，只读），基线 `dsh-v0.2.1-rc.2`（commit `687f282e86`，merge PR #6408）。对照版本 `dsh-v0.2.0-rc.2`。
- **本包现状对照**：`.agents/dsh-spec/notes/`（提取版契约）、`.agents/dsh-spec/norms/norms.md`、`scripts/dsh-spec-manager/`（已移植的门禁）、`skills/dsh-spec-skill-forge/SKILL.md`。
- **读者**：决定下一步锻造/移植方案的维护者。
- **本文路径约定**：除特别注明外，路径均相对 `submodules/dsh/`；"本包"指 `dsh-spec` 仓库；"上游"指 `submodules/dsh`。分析日期 2026-10-22。
- **结论先行**：**不要移植 notes 内容**；只移植"契约 + 规范内核"（8 条左右 norms + 6 处契约修正 + 1 条记录 note + 1 张 pin 引用表）。理由与证据见第八节。

## 摘要（TL;DR）

1. **精确计数**：基线 active notes = **335**（`proposed/` 42 + `implemented/` 293），`rejected/` 8，frozen `archived/` **924**，三元组总数 **1267**，全部 EN/ZH/sidecar 完整（0 个残缺）。任务给的 337 是 `find proposed implemented -name '*.md'` 的原始计数，其中 2 个是治理文件 `implemented/AGENTS.md` 与其 symlink `implemented/CLAUDE.md`，真实 note 是 335。
2. **契约在 0.2.1 几乎冻结，内容发生大迁徙**：0.2.0→0.2.1 契约只有 README/README.zh 各 2 行、README.i18n.yaml 4 个哈希、`docs/AGENTS.md` 13 行变化；同时 **282 条 implemented notes 被整批移入 archived**、24 条 implemented 删除、6 条 rejected 删除、74+5 条新增、171 条 active 正文被改动。归档 manifest 的 1923 条旧哈希全部不变、新增 849 条（=283 个三元组），证明冻结是机械执行的。
3. **内容结构**：335 条 active 中 **274 条（81.8%）是 dsh 产品决策**（会话格式、Agent 运行时、PTC/沙箱、客户端 UI、Desktop、插件系统、Web Host、LLM 适配、Office、账户/翻译/市场）；只有 **61 条（18.2%）是流程/工具决策**，其中可提炼为通用知识的内核约 25–30 条。真正有价值的"如何做决定"的元决策大多已经在上游被归档（unified note format、bilingual pairing、doc tiers、quality gates、committed citations、section-keyed pairing records、evidence-led simplification）。
4. **可移植内核集中在 6 个面**：Agent Notes 自身契约、文档/散文/引用规范、测试证据纪律（观测等待、真实依赖、性能预算）、持久化格式兼容（reader 行为决定版本、首版 reader 是底线、whole-value events）、依赖/供应链/vendoring、PR/release 流程。候选清单见第五节（30 条），拟落点见第八节。
5. **新技能领域**：notes 主题只揭示 **1 个值得评估的新领域**——"持久化数据格式兼容性评审"（durable-format-review）；不建议现在锻造，先以 norms 承载（第七节）。文档/散文/翻译/归档/CI/性能/简化等领域上游 19 个技能已覆盖，本包的问题是"没交付这些技能"，不是"没有这个领域"。
6. **对现有契约的最高优先修正**：本包 `.agents/dsh-spec/notes/README.md` 在提取时把上游的 **门禁引用与"canonical set + 本节"双写规则删掉了**（第 20 行只写"closed set in this section"），而门禁（`scripts/dsh-spec-manager/scripts/agent-note-tree.ts` 的 `AGENT_NOTE_CLASSES`）实际仍有一份封闭集合；adopter 只改 README 加类会直接红。建议采纳上游第 23 行句式，并恢复归档/配对命令指引（差异全表见第三节）。

---

## 一、notes 体系解剖

### 1.1 文件、行数与角色

| 文件 | 行数 | 角色 |
|---|---|---|
| `.agents/notes/README.md` | 125 | **唯一契约**：布局命名、分类、归档删除、写作时机、文件格式（header/body skeleton/alternatives/move/中文对侧） |
| `.agents/notes/README.zh.md` | 131 | 中文对侧，逐 section 同构；header token 与 `Status:` 行保持英文原文（`i18n/README.md` 契约） |
| `.agents/notes/README.i18n.yaml` | 46 | 双语一致性记录：14 个 heading section 的 en/zh 块哈希（详见 1.5） |
| `.agents/notes/AGENTS.md` | 7 | 子树指令：每个新 note 触发 supersession 检查；同一 PR 归档合格 implemented 三元组；archived 冻结不可当现行权威 |
| `.agents/notes/implemented/AGENTS.md` | 13 | implemented 契约：路径/符号/默认值/机制随代码同改；不写变更史；不重写"决定"本身；不 Guide 未来时归档 |
| `.agents/notes/archived/AGENTS.md` | 9 | 冻结规则：只允许封存性迁移、`Archived:` 行、sidecar 重录、入链修复；verifier 与 `--write`；Figma 链接例外 |
| `.agents/notes/implemented/CLAUDE.md` | symlink | 指向 `AGENTS.md`（工具兼容；门禁 `ROOT_ALLOWLIST` 允许） |
| `.agents/notes/archived/manifest.json` | 2772 条 | frozen-content manifest：`{version: 1, files: {path: "sha256:…"}}`，追加式 |
| `.rgignore`（仓库根） | 2 | `/.agents/notes/archived/`，把冻结归档排除出递归检索 |
| `docs/AGENTS.md` | 77 | **人读文档标准**（Markdown tier 表、one-home-per-fact、写作规则、字数预算、slop checklist）；notes 在 tier 表里是独立一档，但结构规则明确不适用于 notes |
| `scripts/agent-note-tree.ts` | — | 结构 SSOT：lifecycle/class 封闭集合、walker、`INDEX.md` 禁止、root allowlist |
| `scripts/verify-agent-note-classification.ts` | — | 树断言：lifecycle/class/depth/文件名；拒绝 legacy 目录与 `INDEX.md` |
| `scripts/verify-agent-note-format.ts` | — | in-file 格式：header 3 行、`Status:` 语法、per-lifecycle skeleton、`## Alternatives considered` 强制、implemented 禁 proposal 词汇、祖父注释只对 2026-07-05 前 |
| `scripts/archived-agent-notes.ts` + `verify-archived-agent-notes.ts` | — | 归档：封闭 class 树、完整三元组、`Archived:` 元数据、sidecar 哈希、追加式 manifest；`--write` 封存 |
| `scripts/verify-translation-pairing.ts` | — | 三件套配对：存在性、switcher、结构镜像、sidecar 哈希一致；archived 不在其演化范围 |
| `package.json` 的 `doc-sync` | — | 聚合 `verify-md-wrap`、`verify-md-links`、notes 三个门禁、`verify-translation-pairing`、`verify-doc-budgets` 等 |
| `.agents/skills/dsh-archive-agent-notes/SKILL.md` | — | **校准过的归档判决流程**（契约把"归档还是删除还是保留"的判断委托给它，而非字数/年龄/配额） |
| `.agents/skills/dsh-translate-docs/SKILL.md` | — | 扩展翻译工作流（仅用户显式调用）；日常双语走 docs/AGENTS.md 的轻量路径 |
| `.agents/skills/dsh-doc`、`dsh-prose-standard`、`dsh-code-review`、`dsh-pre-push-checks`、`dsh-trim-cot-leakage` | — | notes 生态的其余执行者：slop checklist 审计、散文标准、评审、最小检查子集、推理泄漏清理 |
| `docs/i18n/README.md` | — | 双语契约本体：三件套、双权威、sidecar 机制、gate 边界（"绿门禁=确认过一致，不等于内容正确"） |

### 1.2 路径编码与封闭集合

- 路径 = `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`；日期是**首次提出**日期（git 历史为准），不是实现/归档日期。
- lifecycle 封闭集合：`proposed/`、`implemented/`、`rejected/`（active 树）+ 独立冻结的 `archived/`（无 `implemented` 层级，只允许 implemented 进档）。
- class 封闭集合（6 个）：`feature`、`bug-fix`、`simplification`、`architecture`、`process`、`testing`；`refactor` 被有意排除（与 simplification 重叠）。
- `architecture` / `process` 分界：前者是"我们发布的源码结构"，后者是"代码外围的工具/策略/流程"。
- canonical set 写在 `scripts/agent-note-tree.ts` 的 `AGENT_NOTE_CLASSES`；README 第 23 行要求**两处同时改**。门禁拒绝任何其他 class 目录；`INDEX.md` 被禁止（"树本身就是清单"）。
- lifecycle root 只允许 `AGENTS.md` / `CLAUDE.md` 两种非 note Markdown。

### 1.3 文件格式骨架

- **header**：前 3 行严格为 `# Agent Note: <title>`、空行、`Status: <status>`，后接空行。Status 三种：`proposed` / `implemented` / `rejected — <一行理由>`；**不带日期与括号**（文件名带首次提出日期，git 带其余历史）。
- **body 骨架**：所有 note 以 `## Problem` 开头；之后按 lifecycle：
  - `proposed/`：`## Proposal`（可未来时）+ …bespoke… + `## Alternatives considered` + `## Acceptance criteria` + `## Risks`；
  - `implemented/`：`## Decision`（现在时、描述已发布事实）+ …bespoke… + `## Alternatives considered` + `## Consequences`；**禁止** `## Proposal`/`## Plan`/`## Migration plan`/`## Acceptance criteria`（该门禁判 spec-speak）；
  - `rejected/`：冻结的 proposal 形状，判决在 `Status:` 行，只需 header/`## Problem`/`## Proposal`/alternatives。
- `## Alternatives considered` **强制**：没有"它击败了什么"的决定会招致重审；alternatives 只记录不发明。2026-07-05 之前的旧文件允许一条精确的祖父注释占位（门禁白名单）。
- **lifecycle 迁移**：改 `Status:` + 满足目标目录骨架，同一改动完成；proposed→implemented 必须把 Proposal 重写成现在时 Decision，把 criteria/risks 折进 Consequences（或 `## Testing`/`## Verification`）。
- **中文对侧**：`.zh.md` 与英文逐 section 同构；机器校验的 header token（`# Agent Note: `、`Status:` 行）用英文原文。
- **归档封存**只加一行 `Archived: YYYY-MM-DD`（`Status: implemented` 正下方、双语同位置），并重录 sidecar、修复入链；这是唯一允许的归档内容改动。
- （上游契约没有而本包有的两节：`### Quoted text and secrets` 与 `**A decision agreed in conversation counts.**`，来源见第三节。）

### 1.4 门禁（gates）与命令

| 门禁 | 检查什么 | 失败语义 |
|---|---|---|
| `verify-agent-note-classification` | 树：lifecycle/class/depth/文件名；根 `INDEX.md`；未知目录；root allowlist | 非零；空语料也退非零（"空语料上通过的门禁比没有更糟"） |
| `verify-agent-note-format` | 头部 3 行、`Status:` 与目录一致、per-lifecycle 必选 heading、implemented 禁用 heading、alternatives 存在、祖父注释只对 pre-2026-07-05、`.zh.md` 跳过 | 非零 |
| `verify-archived-agent-notes` | archived 封闭 class 树、完整 EN/ZH/sidecar 三元组、`Status: implemented` + `Archived:` 行、sidecar 内容哈希、append-only manifest；`--write` 才允许追加封存 | 非零 |
| `verify-translation-pairing` | 三件套完整、sidecar 规范且与当前文本一致、双向 switcher、结构镜像（heading/代码块/表格/列表/链接目标）；archived 排除 | 非零；`--list`/`--explain`/`--write <pair>` 三种模式 |
| `verify-doc-budgets` | `scripts/doc-budgets.manifest.json` 逐文件字数上限；超或缺失都红 | 非零 |
| `verify-md-wrap` / `verify-md-links` | 每段一物理行；本地链接可解析 | 非零 |
| `doc-sync` | 上述文档门禁的聚合入口，本地与 CI 同一套 | 非零 |

门禁与契约的耦合方式：`agent-note-tree.ts` 是结构 SSOT；`archived-agent-notes.ts` 是 manifest 格式与封存例外的 SSOT；`verify-agent-note-format.ts` 用 `FORMAT_ADOPTED = '2026-07-05'` 固定祖父规则；`docs/AGENTS.md` 的 slop checklist 为 implemented 禁 proposal 词汇提供理由。

### 1.5 `.i18n.yaml` sidecar 的角色（机制核心）

- 一个"pair"是**三个 sibling 文件**：`foo.md` + `foo.zh.md` + `foo.i18n.yaml`；两语言**同等权威**（可以中文先写），绑定的只是"两侧说同一件事"；pair 整组合并，PR 不允许只落一种语言。
- sidecar 内容：逐 heading section 记 en/zh 块哈希。key = 英文 heading 的 slug 路径（`/` 表示首个 heading 前的文本；重名加 `~2`、`~3`）；值 = 该 section 中"两种语言里都有内容"的块的哈希（即每侧 top-level block，排除 fenced code 与生成区域——那两类已被要求两侧逐字相同）。
- 哈希取自 **git blob 哈希**（`gitBlobHash`：`sha1("blob <len>\0" + content)` 的前 16 位十六进制），所以与文本内容绑定、与行号/格式无关。
- **合并友好**：不同 section 的编辑改不同行，Git 默认文本合并（含 GitHub）可组合；只有两个分支改同一 section 的哈希内容才真正冲突。这替代了"整文件哈希"的做法（决策本身在 archived 的 section-keyed pairing records note 里）。
- 记录流程：改任一侧 → 同步另一侧 → `verify-translation-pairing --write <pair>` 重录 → **yaml diff 就是"确认过一致"的可评审行为**；`--write --all` 是显式全语料形式。
- 门禁边界写在 `docs/i18n/README.md`：绿门禁只证明"这些内容被确认过"，不证明两侧语义正确；语义是 reviewer 的另一半责任。
- 与 notes 的关系：active notes 与 README 本身都在配对范围内；**archived 被排除在演化配对门禁之外**，改由归档 verifier 校验"完整三元组 + 封存哈希"。
- 本包 `scripts/dsh-spec-manager/scripts/translation-pairing*.ts` 已移植同一机制。

### 1.6 归档树、manifest 与冻结

- 路径 `archived/{class}/yyyy-mm-dd-topic-title.md`；`implemented` 层级故意缺席（只有 implemented 能进）。
- 判决标准（契约第 38 行）：小 UI/纯机械改动 → **删除**三元组并修链；其他 implemented 只有"决定已完整、rationale 不太可能指导未来、但仍有历史决策价值"时才归档；alternatives/ownership 边界/负向保证/持久或 wire 语义/安全规则/重引入条件仍有用的，保持 active。**永不归档 proposed**（过时提案去 rejected）。rejected 只在"仍能阻止一个诱人的错误"时保留。判决交给 `dsh-archive-agent-notes` 校准流程，不用字数/年龄/配额。
- manifest：`{"version": 1, "files": {path: "sha256:<64hex>"}}`，路径 `archived/` 相对、排序确定；每次检查校验"已封存文件不变、三元组完整、class 合法、`Archived:` 元数据正确、sidecar 哈希一致"；只有 `--write` 才允许**追加**新条目（append-only），并拒绝任何既有哈希变化。已有三个硬编码的"授权 Figma 链接移除"例外（`scripts/archived-agent-notes.ts`），之外任何内容改动都是缺陷。
- 冻结的意义：**不可变的快照才是证据**——"谁都能改的归档不能证明当时决定了什么"。
- 0.2.1 的 manifest 实测：旧 1923 条哈希 **0 改变**、新增 849 条（283 三元组），说明冻结规则真的被执行。

### 1.7 `.rgignore` 与检索边界

- 仓库根 `.rgignore`（2 行）：
  ```
  # Frozen Agent Notes are historical snapshots, not current search authority.
  /.agents/notes/archived/
  ```
- 效果：递归搜索不会把冻结事实混进 active 决策；查历史必须在命令里显式命名 archived 目录。本包提取版把这个事实写进了契约（`.agents/dsh-spec/notes/README.md` 第 39 行），并保留了同内容的 `.rgignore`。

### 1.8 `docs/AGENTS.md` 与 notes 的分工

- `docs/AGENTS.md` 是**人读文档**标准：文档结构（教程 vs 参考）、tier 表（root AGENTS.md、subtree AGENTS.md、architecture.md、subsystems、Agent Notes、defensive-patterns、postmortem、persistence history、cookbook、user、package README、development.md、生成参考、skills）、写作规则、字数预算、slop checklist、引用规则。
- 明确边界："These rules apply to human-facing documentation; Agent Notes remain outside their scope."——notes 有自己的 in-file 契约，但 tier 表把 Agent Notes 列为一档：**active 决策记录（why/what-given-up/required verification）；implemented 用现在时描述已发布现实；migration plan、acceptance checklist、fixture walkthrough、spec-speak 不属于这里；archived 是冻结历史，永不当前权威**。
- slop checklist 直接服务于 notes：`implemented/` 里的 spec-speak（"should"、migration plan、acceptance checklist）是缺陷；"reasoning transcripts"、"implementation-status annotations"、"hand-restated catalogs" 同样禁止。这是 notes 格式门禁"禁用 proposal heading"的语义来源。
- 0.2.1 对 docs 标准的改动（13 行）：新增 `defensive-patterns/` tier、`cli-help` 生成参考、tier 放置行、把两个决策引用从 note 改为 gate/技能、预算上调（root 1960→2080、packages/AGENTS 750→810、本文件 1320→1430、去掉 defensive-patterns.md 550）。

### 1.9 驱动 notes 体系的技能（calibration）

19 个基线技能中，**7 个直接围绕该体系运作**：`dsh-archive-agent-notes`（归档/清理判决）、`dsh-translate-docs`（扩展翻译）、`dsh-doc`（放置/验证/slop audit）、`dsh-prose-standard`（覆盖度与编辑判断）、`dsh-code-review`（评审）、`dsh-pre-push-checks`（最小检查子集）、`dsh-trim-cot-leakage`（推理泄漏清理）。契约依赖这些技能做**判断**，门禁只做机械断言。这一分工（契约+门禁+校准技能）是 notes 体系本身最可移植的设计。

---

## 二、统计

### 2.1 使用的命令（可复核）

```bash
# 1) 原始 base .md 计数（任务给的 337 来源）
find submodules/dsh/.agents/notes/proposed submodules/dsh/.agents/notes/implemented \
  -name '*.md' ! -name '*.zh.md' | wc -l
# → 337

# 2) 按 lifecycle/class/后缀精确枚举 + 三元组完整性 + 日期 + 期间对账（脚本 /tmp/dsh-porting/stats3.py）
python3 /tmp/dsh-porting/stats3.py
#   核心实现：os.walk(".agents/notes")，正则 ^(\d{4}-\d{2}-\d{2})-(.+?)\.(i18n\.yaml|zh\.md|md)$
#   按 (lifecycle, class, slug) 聚合后缀集合，集合 != {md, zh.md, i18n.yaml} 计为残缺

# 3) 与基线 tag 的树级对账
git -C submodules/dsh ls-tree -r --name-only dsh-v0.2.1-rc.2 -- .agents/notes | ...
git -C submodules/dsh ls-tree -r --name-only dsh-v0.2.0-rc.2 -- .agents/notes | ...

# 4) manifest 对账 + 冻结验证
python3 -c "import json; m=json.load(open('submodules/dsh/.agents/notes/archived/manifest.json')); ..."
git -C submodules/dsh show dsh-v0.2.0-rc.2:.agents/notes/archived/manifest.json

# 5) 0.2.0→0.2.1 内容迁徙
git -C submodules/dsh diff --name-status -M dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/notes
# 6) 契约文件差异
git -C submodules/dsh diff dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/notes/README.md .agents/notes/README.zh.md \
  .agents/notes/README.i18n.yaml .agents/notes/AGENTS.md .agents/notes/implemented/AGENTS.md \
  .agents/notes/archived/AGENTS.md docs/AGENTS.md

# 7) 主题清点（脚本 /tmp/dsh-porting/classify2.py，335/335 归入、0 未归）
python3 /tmp/dsh-porting/classify2.py
```

### 2.2 生命周期 × 类别计数（基线 dsh-v0.2.1-rc.2）

每个 note 都有 3 个文件（EN `/class/*.md`、ZH `*.zh.md`、sidecar `*.i18n.yaml`），下表"notes"列即三元组数。

| lifecycle | class | notes | zh | sidecar |
|---|---|---:|---:|---:|
| proposed | feature | 9 | 9 | 9 |
| proposed | bug-fix | 1 | 1 | 1 |
| proposed | simplification | 9 | 9 | 9 |
| proposed | architecture | 15 | 15 | 15 |
| proposed | process | 6 | 6 | 6 |
| proposed | testing | 2 | 2 | 2 |
| **proposed 小计** | | **42** | **42** | **42** |
| implemented | feature | 40 | 40 | 40 |
| implemented | bug-fix | 11 | 11 | 11 |
| implemented | simplification | 13 | 13 | 13 |
| implemented | architecture | 177 | 177 | 177 |
| implemented | process | 34 | 34 | 34 |
| implemented | testing | 18 | 18 | 18 |
| **implemented 小计** | | **293** | **293** | **293** |
| rejected | architecture | 1 | 1 | 1 |
| rejected | simplification | 7 | 7 | 7 |
| **rejected 小计** | | **8** | **8** | **8** |
| archived | feature | 306 | 306 | 306 |
| archived | bug-fix | 182 | 182 | 182 |
| archived | simplification | 92 | 92 | 92 |
| archived | architecture | 185 | 185 | 185 |
| archived | process | 120 | 120 | 120 |
| archived | testing | 39 | 39 | 39 |
| **archived 小计** | | **924** | **924** | **924** |
| **合计** | | **1267** | **1267** | **1267** |

- 全部 notes 文件 = 1267 × 3 = **3801**；加上 8 个非 note 文件（3 个 README、`AGENTS.md`、`implemented/AGENTS.md`、`implemented/CLAUDE.md` symlink、`archived/AGENTS.md`、`archived/manifest.json`），`.agents/notes/` 下共 **3809 个文件**。
- 全语料按 class：feature 355、architecture 378、bug-fix 194、process 160、simplification 121、testing 59（合计 1267）。
- 结构观察：`rejected/` 只出现 2 个 class（simplification 7、architecture 1）——被拒绝的提案绝大多数是"简化"类，说明该仓库的 re-litigation 主要风险在 simplification。

### 2.3 337 的核验：任务给的计数要修正为 335

```bash
$ find submodules/dsh/.agents/notes/proposed submodules/dsh/.agents/notes/implemented \
    -name '*.md' ! -name '*.zh.md' | wc -l
337
$ ... | grep -vE '/[0-9]{4}-[0-9]{2}-[0-9]{2}-'
submodules/dsh/.agents/notes/implemented/CLAUDE.md
submodules/dsh/.agents/notes/implemented/AGENTS.md
```

- **337 = 42 proposed + 295 implemented 原始 `.md`**；其中 implemented 的 295 条包含 2 个治理文件：`implemented/AGENTS.md`（13 行子树指令）和 `implemented/CLAUDE.md`（指向它的 symlink，被结构门禁 `ROOT_ALLOWLIST` 允许）。
- 因此 **真实 active notes = 42 + 293 = 335**。验收要求"337 条全部进入主题清单"在数据上按 **335 条 note + 2 条治理文件**执行：附录 A 列出全部 335 条 slug（0 条未归主题），2 条治理文件在第 1.1 节说明其角色、不参与主题清点。
- 语言/三元组：1267 个三元组 100% 完整（0 残缺），因此"active note 有中文对侧和 sidecar"是强制的，不是惯例。

### 2.4 三元组完整性、语言覆盖与异常

- **残缺三元组：0**（按 `(lifecycle, class, slug)` 聚合后缀集合，1267 个集合全部 = `{md, zh.md, i18n.yaml}`）。
- 语言覆盖：每个 lifecycle 的 zh 数 = notes 数 = sidecar 数（见 2.2），没有单侧 note。
- 异常清单（相对"note 文件"而言的非 note 文件，共 8 个）：
  1. `README.md` / `README.zh.md` / `README.i18n.yaml` —— 契约本体（配对三件套）；
  2. `AGENTS.md`（notes 根）—— 子树指令；
  3. `implemented/AGENTS.md` + `implemented/CLAUDE.md`（symlink）—— implemented 子树指令；
  4. `archived/AGENTS.md` + `archived/manifest.json` —— 归档规则与冻结清单。
- 其他检查均无异常：无未知 lifecycle/class 目录、无坏文件名、无 `INDEX.md`、无缺失 sidecar、无孤儿文件、manifest 与树 **完全对账**（见 2.6）。
- 日期范围（文件名 = 首次提出日期）：proposed 2026-06-11 → 2026-10-09；implemented 2026-06-11 → **2026-10-15**（全库最新）；rejected 2026-06-16 → 2026-07-26；archived 2026-06-11 → 2026-09-28。

### 2.5 月度分布

| 月份 | proposed | implemented | rejected | archived |
|---|---:|---:|---:|---:|
| 2026-06 | 6 | 11 | 4 | 57 |
| 2026-07 | 9 | 44 | 4 | 341 |
| 2026-08 | 4 | 48 | 0 | 329 |
| 2026-09 | 20 | 143 | 0 | 197 |
| 2026-10（截至 10-22） | 3 | 47 | 0 | 0 |
| **合计** | **42** | **293** | **8** | **924** |

- active 月产：06 月 17、07 月 53、08 月 52、09 月 163、10 月 50（共 335）。**9 月是峰值**（143 implemented）。
- 归档量在 7–8 月达到峰值（341/329），与 0.2.1 的批量归档一致；归档最晚日期 2026-09-28。

### 2.6 归档 manifest 对账（基线）

- manifest `version: 1`，`files` 共 **2772** 条 = **924 三元组 × 3**，与 archived 树逐文件一致（树中没有 manifest 外文件，manifest 没有树外条目）。
- 按 class（三元组）：feature 306、architecture 185、bug-fix 182、process 120、simplification 92、testing 39。
- 占全语料比例：archived 924 / 1267 = **72.9%**；active 335 / 1267 = 26.4%；rejected 8 / 1267 = 0.6%。

### 2.7 0.2.0 → 0.2.1 的内容迁徙（"归档大迁徙"）

| 指标 | 0.2.0-rc.2 | 0.2.1-rc.2 | 变化 |
|---|---:|---:|---:|
| proposed | 39 | 42 | +3 |
| implemented（notes） | 525 | 293 | **−232** |
| rejected | 14 | 8 | −6 |
| archived（三元组） | 641 | 924 | **+283** |
| 全部 notes | 1219 | 1267 | +48 |
| archived manifest 条目 | 1923 | 2772 | +849（=283 三元组） |

按 git diff 精确拆解：

- **282 条 implemented notes 被整体移入 archived**（rename，EN+ZH+sidecar 三件套；`-M` 识别出 282 组）。新增归档 note 1 条（`archived/feature/2026-09-07-public-web-deployments.md`）。
- 删除：implemented 24 条、rejected 6 条、proposed 2 条（共 32 条 base `.md`）。
- 新增 active：implemented 74 条、proposed 5 条（共 79 条）。
- 修改 active 正文：implemented 148 条、proposed 17 条、rejected 6 条（共 171 条 base `.md`），多为移档后的链接/事实修复。
- manifest 冻结验证：1923 条共同条目 **哈希 0 变化**，新增 849 条（283 三元组），**0 删除** —— 归档真的是 append-only。
- 结论：**0.2.1 是一次"契约冻结 + 内容大归档"的发布**。上游自己把 notes 内容当作会被冻结/删除的决策记录，而不是稳定知识库。

### 2.8 异常与注意点

- 统计口径陷阱：`find ... -name '*.md'` 会同时数到 `implemented/AGENTS.md` 与 `CLAUDE.md` symlink；`git ls-tree` 也会把 symlink 当 blob 计入。报"337 条 active"时必须注明含 2 个治理文件。
- 无 `proposed/` 根 AGENTS.md；`archived/` 无 lifecycle 层级，路径深度与 active 不同（结构门禁分别处理）。
- 归档里包含**契约自身的元决策**（unified format、no-index、section-keyed pairing records 等）——这解释了为什么 active 契约只剩 README 的 125 行，而理由在 archived 里。

---

## 三、0.2.0 → 0.2.1 契约变化 + 与本包现有契约的差异

### 3.1 上游契约本身的变化（0.2.0 → 0.2.1）

| 文件 | 变化量 | 实质变化 |
|---|---:|---|
| `.agents/notes/README.md` | 2 行 | ① 第 19 行：删除指向 "no-index Agent Note" 的链接，改为内联理由"it duplicates path metadata and makes unrelated note changes contend on one generated file"；② 第 56 行：uniform-format 的链接从 `implemented/process/…` 改为 `archived/process/…`（该 note 本版被归档） |
| `.agents/notes/README.zh.md` | 2 行 | 同上（中文对侧同步） |
| `.agents/notes/README.i18n.yaml` | 4 个哈希 | 上述两个 section 的 en/zh 哈希重录（契约机制正常工作） |
| `docs/AGENTS.md` | +7/−6 行 | 新增 `defensive-patterns/` tier、`cli-help` 生成参考；tier 放置行补 `defensive-patterns/`；子系统页 scoping 链接从 note 改为 `scripts/verify-subsystem-pages.ts`；散文规则链接从 note 改为 `dsh-prose-standard` 技能；doc-tiers 链接改指 archived；预算上调（root 1960→2080、packages 750→810、本文件 1320→1430、删掉 defensive-patterns 550） |
| `.agents/notes/AGENTS.md`、`implemented/AGENTS.md`、`archived/AGENTS.md` | 0 | 未变 |
| `.agents/notes/archived/manifest.json` | +849 条 | 283 个新封存三元组（append-only） |
| `scripts/agent-note-tree.ts`、3 个 notes 门禁、`archived-agent-notes.ts`、`.rgignore` | 0 | 未变 |
| `.agents/skills/dsh-archive-agent-notes`、`dsh-translate-docs` | 0 | 未变（判决校准路径稳定） |
| `docs/i18n/README.md` | 1 行 | section-keyed pairing records 的链接改指 archived |

**结论**：0.2.1 的契约本体只做了"链接随归档更新"和 docs 标准的局部演进；**契约设计没有变化**。因此本包需要吸收的是"版本差异里那几行通用内容"（见 3.2），不需要追一个移动的契约。

### 3.2 本包提取版（`.agents/dsh-spec/notes/`）与上游 0.2.1 的差异全表

| # | 差异点 | 上游 0.2.1 现状 | 本包现状（行号） | 建议 | 理由 |
|---|---|---|---|---|---|
| 1 | lifecycle 列表排版 | 4 行，含嵌套缩进（README 第 10–13 行） | **被压成一行**，`- **proposed/** … - **implemented/** … - **rejected/**` 混排（第 11 行） | **adopt（修格式）** | 提取时的机械错误；影响 adopter 阅读与 Markdown 渲染，不涉及语义 |
| 2 | 交叉引用示例 | 相对 Markdown 链接 `[topic](../../implemented/architecture/2026-…-….md)`（第 17 行） | 反引号路径 `` `implemented/architecture/2026-…-….md` ``（第 14 行），不是链接 | **adopt（改成链接形式）** | 契约要求"mechanically checkable 的相对 md 链接"；示例必须是链接，否则 adopter 会照抄非链接形式，`verify-md-links` 也覆盖不到 |
| 3 | `INDEX.md` 禁止的理由 | 内联理由（"duplicates path metadata…"）+ 链接已归档的 no-index note | 独立理由："an index is a second inventory that drifts from the first…"（第 16 行） | **keep（本包版）** | 本包版更抽象、不依赖 dsh 具体历史，且 no-index 理由已由 owner.ssot 覆盖 |
| 4 | 分类 canonical set 的 SSOT | "closed set in `scripts/agent-note-tree.ts`; the classification gate rejects other folders. Adding a class requires updating the canonical set and this section."（第 23 行） | "closed set in this closed set. Adding a class means adding it here."（第 20 行）——**只写 README 一处** | **adopt（最高优先）** | 本包 `scripts/dsh-spec-manager/scripts/agent-note-tree.ts` 的 `AGENT_NOTE_CLASSES` 仍是一份独立封闭集合；照 README 只加类会红。契约必须写明"两处同时改"，否则 SSOT 断裂 |
| 5 | 归档判决的委托 | "Use the calibrated `dsh-archive-agent-notes` workflow rather than word count, age, or a target quota."（第 38 行） | "Judge the call against the criteria stated here, not by word count, age, or a target quota."（第 35 行） | **adopt 变体（补命令/流程指引）** | 本包 manager 有归档门禁与 `notes-archived write`，但该命令没有任何契约文字指向；adopter 只能看到 manifest 结果、看不到"怎么封存"。用"命令名"替代 dsh 技能链接，符合本包"技能只命名命令"的约定 |
| 6 | 冻结/归档门禁的指认 | "`verify-archived-agent-notes` enforces … except the exact seal transitions documented in archive instructions"（第 42 行）；另有"Documentation gates skip archived sources, including their outbound links" | 只描述 manifest 与 `.rgignore`，**未提任何门禁、也未提"文档门禁跳过 archived"**（第 39 行） | **adopt（两条都补）** | 本包 manager 真的有该门禁（`notes-archived check`），且其 md-links/散文门禁确实跳过 archived（`md-scope.ts` 的 `ARCHIVED_NOTES_PREFIX` 拒绝）。契约缺这句会让 adopter 误以为需要维护 archived 的出链 |
| 7 | 格式门禁的指认 | "enforced by `pnpm run verify-agent-note-format` … the rationale … is [archived the uniform-format Agent Note]"（第 56 行） | "Every active Agent Note follows one in-file format; the format is uniform because retrieval must not depend on who wrote the note…"（第 55 行），**无门禁、无理由出处** | **adopt（补门禁命令 + 出处引用）** | 本包有 `verify-agent-note-format`（manager 内），且格式理由（统一检索、拒绝过的替代）是 archived 元决策；补引用比复制理由更便宜 |
| 8 | 写作时机的触发语 | "in the same **PR** only for lasting decision rationale"（第 46 行） | "in the same **change** only"（第 43 行） | **keep（本包版）** | 包要适配非 GitHub/无 PR 的宿主；"change" 是正确的通用化 |
| 9 | 会话中达成的决定 | **无** | "**A decision agreed in conversation counts.** Record it as a `proposed/` note before the change exists…"（第 45 行） | **keep（本包独有）** | 本包自己的决策（`notes/implemented/process/2026-09-21-the-note-trigger-follows-dsh.md` 第 17 行明说这是本技能集自己的句子）；上线前记录、避免只活在 transcript 里，是 adopters 的真实缺口 |
| 10 | Quoted text / secrets | **无** | `### Quoted text and secrets`（第 112–116 行）：外部引用文本作为带出处的引文；凭据写 `[REDACTED_SECRET]` | **keep（本包独有）** | 来自本包 `2026-09-20-three-rules-from-a-memory-pipeline` 的决策，与 norms 的 `evidence.external-is-data` 及 secret 扫描配套；上游 lacks it，但这正是本包更通用之处 |
| 11 | lifecycle 迁移的失败语义 | "the gate fails the move otherwise"（第 121 行） | "the move is incomplete otherwise"（第 120 行） | **adopt（补门禁指认）** | 本包格式门禁会因骨架不满足而红；写"incomplete"没有可执行含义，建议加"the format gate fails the move otherwise" |
| 12 | 中文对侧的机制指引 | "under the `docs/i18n/README.md` contract; … The format gate skips `.zh.md` files — the pairing gate checks their consistency."（第 125 行） | "A `.zh.md` counterpart mirrors its English sibling's structure section-for-section; … stay in English verbatim."（第 124 行）——**没解释 `.i18n.yaml` 是什么、谁重录、谁校验** | **adopt（最高优先，加一节或指针）** | 本包 manager 已移植 sidecar 机制（`translation-pairing*.ts`）且 notes 模板树里就有 `.i18n.yaml` 文件，但契约没有任何一句解释它。adopter 面对裸 sidecar 无从下手；这是提取时丢失的最实质的可移植内容 |
| 13 | 祖父注释（pre-format） | 允许 2026-07-05 前文件用固定注释占位 alternatives（第 116 行） | **整段删除** | **ignore（可保留删除）但需在迁移说明中交代** | 本包初始化空树，新 adopter 无 pre-format note；但迁移既有 ADR 语料的 adopter 需要一条"如何折算"的说明（见第九节待决 9.4） |
| 14 | `AGENTS.md` 三个子树指令 | 引用 `docs/AGENTS.md`、`dsh-archive-agent-notes` 技能、`verify-agent-note-format`、Figma 例外 | 改成泛化措辞；删除技能/门禁/例外引用；`implemented/AGENTS.md` 内联了删除 vs 归档的判据 | **partial adopt** | 保留泛化（正确），补"命令/门禁名"两个指针；Figma 例外与 dsh 路径必须 ignore |
| 15 | `docs/AGENTS.md` 文档标准 | 77 行标准存在 | **未被提取进本包**（本包 `docs/AGENTS.md` 只有 23 行的 terminology 规则） | **记录为包缺口（见七/八），不在 notes 契约内处理** | notes 契约引用了 slop checklist / 文档 tier 的理念，但 adopters 拿不到成文标准；属于"文档纪律"技能的缺口，而不是 notes 内容的移植对象 |
| 16 | 契约的"引用出处" | 归档理由以相对链接引用 archived note（如 uniform-format、frozen-archive） | 本包契约**不链接任何 reason note** | **adopt（指引式）** | 本包自己的笔记树（34 条）与上游 archived 元决策都可作为出处；建议以"记录 note + provenance 表"承载，而不是复制正文（见 8.5） |

> 说明：本包 `README.i18n.yaml` 比上游多 1 个 section（`quoted-text-and-secrets`，15 vs 14），哈希已按本包文本重录——这是第 10 条差异的机械结果，属**已正确处理**。

---

## 四、active notes 主题清单（335 条全部归入，0 条残留）

### 4.1 方法

- 对 335 条 active notes 提取 `## Problem` 首段与 slug，按"主题规则 + 显式指定"分类（脚本 `/tmp/dsh-porting/classify2.py`，规则见附录 B）。
- **验收**：335 条每一条恰好命中 1 个主题，`UNASSIGNED = 0`；完整 slug 清单见附录 A（可逐条核对）。rejected 8 条单独列在 4.4，不混入 active 主题。
- 主题分两层：**A\* = dsh 产品决策**（10 个），**M\*/T\* = 流程/工具/测试决策**（10 个），后者才是可移植候选池。

### 4.2 主题表

> 路径前缀 `impl.` = `implemented/`，`prop.` = `proposed/`，`arch.` = `archived/`；日期简写为 `MM-DD`。完整路径可在附录 A 的 slug 上补 `{lifecycle}/{class}/2026-…-{slug}.md`。

| 主题 | 数量 | 类别构成 | 代表路径（3–5 条） | 可否移植 |
|---|---:|---|---|---|
| **A1 会话日志/持久化/格式迁移/投影缓存** | 50 | arch 43, simp 3, bug 3, feat 1 | `impl.architecture/2026-06-11-event-sourced-sessions.md`；`impl.architecture/2026-09-06-v3-canonical-session-envelopes.md`；`impl.architecture/2026-08-10-session-log-version-mechanism.md`；`impl.architecture/2026-08-31-released-session-format-migrations.md`；`prop.architecture/2026-09-10-session-data-compatibility.md` | 否（产品）；其中"版本判定/首版 reader/whole-value events"可提炼，见 5.4 |
| **A2 Agent 运行时/子代理/Team/任务/目标** | 41 | arch 23, feat 10, simp 6, bug 2 | `impl.feature/2026-08-05-agent-teams.md`；`impl.architecture/2026-07-15-agent-initiator-scope.md`；`impl.architecture/2026-07-31-goal-owned-durable-events.md`；`impl.simplification/2026-09-17-unified-subagent-activations.md`；`impl.bug-fix/2026-09-30-job-session-lifecycle.md` | 否（产品） |
| **A3 LLM 适配/流式/提示与上下文/压缩** | 21 | arch 13, feat 4, simp 3, bug 1 | `impl.architecture/2026-06-13-twin-llm-adapters.md`；`impl.architecture/2026-07-05-reconstructable-requests.md`；`impl.architecture/2026-07-20-routed-model-context-and-compaction-policy.md`；`impl.architecture/2026-07-29-terminal-llm-stream-failures.md`；`impl.architecture/2026-08-21-deepseek-llm-api-request-extensions.md` | 否（产品/协议） |
| **A4 工具/PTC/沙箱/执行世界/终端/审批** | 38 | arch 21, feat 11, simp 3, bug 3 | `impl.architecture/2026-06-13-capability-seams.md`；`impl.architecture/2026-07-19-cooperative-tool-cancellation.md`；`impl.feature/2026-06-15-ptc.md`；`impl.feature/2026-07-16-persistent-pty-sessions.md`；`impl.feature/2026-07-06-approval-seam.md` | 否（产品）；"capability seam"模式可提炼但已被 dsh 生态绑定 |
| **A5 Web Host/API/认证/凭据/远程** | 21 | arch 18, simp 2, bug 1 | `impl.architecture/2026-07-28-api-browser-trust-boundary.md`；`impl.architecture/2026-08-24-browser-token-authentication.md`；`impl.architecture/2026-10-12-peer-principal-and-remote-access.md`；`impl.architecture/2026-09-19-remote-duplex-stream.md`；`impl.architecture/2026-08-13-credential-records-and-authorization-flows.md` | 否（产品/安全模型） |
| **A6 客户端 UI/聊天/侧栏/composer** | 28 | arch 21, feat 7 | `impl.architecture/2026-07-22-slot-type-chain-implementation.md`；`impl.architecture/2026-09-21-conversation-build-groups.md`；`impl.architecture/2026-10-09-composer-command-chip.md`；`impl.architecture/2026-08-09-client-conversation-node-assembly.md`；`impl.architecture/2026-10-13-chat-single-fold-motion.md` | 否（产品 UI） |
| **A7 桌面 Electron/安装更新/窗口** | 16 | arch 10, feat 5, simp 1 | `impl.architecture/2026-08-25-electron-desktop-packaging-and-updates.md`；`impl.architecture/2026-09-08-desktop-bundled-runtime-and-external-plugins.md`；`impl.architecture/2026-09-15-desktop-native-fatal-recovery.md`；`impl.feature/2026-09-14-desktop-primary-runtime.md` | 否（产品） |
| **A8 插件/Cordis/配置/Profile/包解析** | 32 | arch 23, feat 6, simp 3 | `impl.architecture/2026-07-23-client-plugin-loading-model.md`；`impl.architecture/2026-08-05-profile-plugin-bundles.md`；`impl.architecture/2026-09-18-declarative-agent-presets.md`；`impl.feature/2026-10-02-plugin-market-index-format.md`；`impl.feature/2026-09-20-config-schema-dump-validation-policy.md` | 否（产品/Cordis 栈） |
| **A9 文件/工作区/Office/文档预览** | 13 | arch 7, feat 4, simp 1, bug 1 | `impl.architecture/2026-09-05-workspace-files-service.md`；`impl.architecture/2026-09-08-document-preview-operations.md`；`impl.architecture/2026-09-14-independent-libreoffice-kit.md`；`impl.architecture/2026-09-27-progressive-office-skills.md` | 否（产品） |
| **A10 账户/翻译/反馈/日程/浏览器与计算机操作** | 14 | arch 13, feat 1 | `impl.architecture/2026-09-05-canonical-feedback-log.md`；`impl.architecture/2026-09-17-account-provider-signout.md`；`impl.architecture/2026-09-26-cua-application-consent.md`；`impl.architecture/2026-10-05-persistent-machine-translation.md`；`impl.feature/2026-10-15-deepseek-search-fetch-api.md` | 否（产品集成） |
| **M1 Agent Notes 与决策维护** | 2 | process 2 | `impl.process/2026-07-26-frozen-agent-note-archive.md`；`prop.process/2026-07-13-human-review-skill-maintenance.md` | **是**（P0，见 5.1） |
| **M2 文档/散文/生成可见性** | 5 | process 5 | `prop.process/2026-08-20-audience-first-documentation-quality.md`；`impl.process/2026-08-26-ban-ambiguous-origin-label.md`；`impl.process/2026-09-14-generated-cli-help-reference.md`；`prop.process/2026-06-20-discover-package-inventory.md`；`prop.process/2026-06-11-api-extractor-reports.md` | **部分**（P1，见 5.2） |
| **M3 PR/评审/发布流程** | 7 | process 7 | `impl.process/2026-08-02-native-github-stacks-and-optional-rebases.md`；`impl.process/2026-08-08-unified-github-label-taxonomy.md`；`impl.process/2026-08-10-event-directed-pr-review-status.md`；`impl.process/2026-08-10-npm-release-sequences.md`；`impl.process/2026-09-09-parallel-macos-notarization.md` | **部分**（PR 治理可移植；发布/签名属 dsh 产品） |
| **M4 CI/构建/门禁/速度** | 13 | process 13 | `impl.process/2026-07-21-serial-cross-platform-ci-reference.md`；`impl.process/2026-10-11-build-artifacts-check-split.md`；`impl.process/2026-10-12-local-gate-speedups.md`；`impl.process/2026-08-08-native-windows-pull-request-ci.md`；`impl.process/2026-07-26-ci-failover-runbook.md` | **部分**（CI 设计原则可移植；具体 runner 设施不可） |
| **M5 依赖/供应链/包与语言纪律** | 10 | process 10 | `impl.process/2026-07-26-dependencies-over-hand-rolling.md`；`impl.process/2026-09-19-no-unknown-casts.md`；`impl.process/2026-07-30-generated-third-party-notices.md`；`impl.process/2026-10-05-product-package-classification.md`；`impl.process/2026-10-14-experimental-dependency-policy.md` | **部分**（依赖/披露/vendoring 可移植；TS/包治理属生态相关） |
| **M6 持久化类型兼容与版本判定** | 3 | process 3 | `impl.process/2026-10-08-session-reader-compatibility-review.md`；`impl.process/2026-09-11-persistence-type-history.md`；`impl.process/2026-09-17-persistence-schema-review.md` | **是**（P0，见 5.4） |
| **T1 真实依赖/黑盒 E2E** | 4 | testing 4 | `impl.testing/2026-06-19-real-api-e2e-ci.md`；`impl.testing/2026-08-23-installed-python-wheel-black-box-ci.md`；`impl.testing/2026-08-24-session-log-snapshot-corpus.md`；`impl.testing/2026-07-24-web-gui-browser-e2e-lane.md` | **是**（P0/P1，见 5.3） |
| **T2 确定性/观测纪律/测试质量** | 6 | testing 5, bug-fix 1 | `prop.testing/2026-06-11-deterministic-and-stress-testing.md`；`impl.testing/2026-09-27-observation-waits-on-observed-state.md`；`prop.testing/2026-06-11-mutation-testing.md`；`impl.testing/2026-09-27-plugin-manager-git-child-environment.md` | **是**（P0，见 5.3） |
| **T3 性能基准与预算** | 8 | testing 8 | `impl.testing/2026-09-04-session-open-performance-gate.md`；`impl.testing/2026-09-06-frontend-performance-budgets.md`；`impl.testing/2026-10-07-memory-limited-benchmarks.md`；`impl.testing/2026-10-07-scaled-benchmark-report.md`；`impl.testing/2026-09-28-session-corpus-performance.md` | **是（方法）**（P1，见 5.3） |
| **T4 桌面安装更新验证** | 3 | testing 3 | `impl.testing/2026-09-10-desktop-local-updater-qualification.md`；`impl.testing/2026-09-14-desktop-installed-update-journal.md`；`impl.testing/2026-09-14-desktop-installed-update-materials.md` | 否（dsh Desktop 的验收装置） |
| **合计** | **335** | | | 274 产品 / 61 流程测试 |

### 4.3 归档按类别分布 + 归档中的元决策

| archived class | 三元组 | 占归档 | 说明 |
|---|---:|---:|---|
| feature | 306 | 33.1% | 产品能力（多数是历史实现细节） |
| architecture | 185 | 20.0% | 产品结构决策（含 0.2.1 批量移入的老架构） |
| bug-fix | 182 | 19.7% | 已修复缺陷的记录 |
| process | 120 | 13.0% | **notes 体系的元决策大多在这里**（见下） |
| simplification | 92 | 10.0% | 已完成的删除/合并 |
| testing | 39 | 4.2% | 已退役的测试设施 |
| **合计** | **924** | 100% | |

归档中与"如何工作"相关、可作移植出处的元决策（均在 `archived/process/`）：

- `2026-06-11-quality-gates.md` —— 每条机制化承诺配门禁；
- `2026-06-11-vendor-cordis-as-source.md` —— vendoring 以 source+manifest 记录；
- `2026-07-02-bilingual-docs-and-pairing-gate.md` —— 双语三件套与配对 gate；
- `2026-07-04-doc-tiers-and-budgets.md` —— 文档 tier 与字数预算；
- `2026-07-05-uniform-agent-note-format.md` —— note in-file 格式与拒绝过的替代；
- `2026-07-10-readme-known-limitations-gate.md` —— README 限制段规范；
- `2026-07-19-remove-generated-agent-note-index.md` —— 禁止生成索引；
- `2026-07-22-fast-local-git-hooks.md`、`2026-07-27-explicit-change-scope-report.md`、`2026-08-27-gate-runner-fail-fast.md` —— 本地检查/变更范围/gate 聚合；
- `2026-08-08-browser-gif-evidence-chain.md`、`2026-09-12-maintained-repository-references.md` —— 评审证据与可维护引用；
- `2026-08-09-concrete-prose-names-actors-and-recorded-facts.md`、`2026-08-09-committed-artifact-citations.md` —— 散文与引用规则；
- `2026-09-19-evidence-led-simplification-surveys.md` —— 简化方法（producer→outcome 全路径）；
- `2026-09-23-section-keyed-translation-pairing-records.md` —— sidecar 的 section-keyed 设计（本包 manager 已实现）。

> 这些 note 现在都是**冻结历史**，不能当作现行权威；但它们是"该规则为什么长这样"的出处，适合作为本包契约/norm 的 citation，而不是被复制成正文（见 8.5）。

### 4.4 rejected 清单（8 条，含 `Status:` 行给出的判决理由）

| 路径 | 驳回理由（`Status:` 行） |
|---|---|
| `rejected/architecture/2026-06-16-typed-event-schemas.md` | 拒绝运行期事件 schema 注册表；事件 map 保持编译期，Zod 只校验 projection 状态与迁移后的持久 payload |
| `rejected/simplification/2026-06-20-drop-durable-step-boundaries.md` | `step/end` 是"模型步骤完成"的持久信号；保留对称 `step/start`/`step/end` 对崩溃修复、不变式与 transcript 检查更清楚 |
| `rejected/simplification/2026-06-20-fold-session-persistence-interface.md` | 独立的 persistence Service Definition 包是有意的模块角色拆分；折进 `dsh-session` 是拿更清晰的 backend 边界换包数量 |
| `rejected/simplification/2026-06-20-truncate-interrupted-turns.md` | 单轮可包含大量真实工作；保留被中断的尾部优于加载时静默丢弃 |
| `rejected/simplification/2026-07-12-prune-unused-skill-registry-api.md` | 直接运行期 skill 注册是第三方插件的正式扩展路径 |
| `rejected/simplification/2026-07-19-fold-compaction-package-split.md` | 计划支持更多 compaction backend，Service Definition 与 basic provider 保持分离 |
| `rejected/simplification/2026-07-26-builtin-timer-promises-for-hand-rolled-sleeps.md` | 实现（PR #679）证伪了等价前提：vitest fake clock 不拦截 `node:timers/promises`，换来 ~10 行删除却丧失确定性快速测试 |
| `rejected/simplification/2026-07-26-dependency-swaps-rejected-by-nih-audit.md` | 十项并行 NIH 审计中每个替换都未达到净简化证据门槛；记录在案以免重跑 |

**可移植性判断**：rejected 的价值是"别再提这个"的负向证据；除非本包采用同样的技术栈（TS/vitest/Node），否则只应引用其**方法**（驳回需给出可复现证据，如第 7 条"实现证伪前提"），不移植具体判决。

---

## 五、可移植知识点候选（一行一条候选 note）

> 判定标准：该决定是否只依赖"如何做决定/如何写/如何验证"，而不依赖 dsh 的产品对象（包名、wire 格式、运行时 API）。优先级 P0 = 建议本迭代吸收；P1 = 下一轮；P2 = 仅登记引用。

### 5.1 Agent Notes 与流程元知识

| 路径 | 状态 | 决定一句话 | 可移植理由 | 建议落点 |
|---|---|---|---|---|
| `implemented/process/2026-07-26-frozen-agent-note-archive.md` | active | implemented note 是小 UI/纯机械就删除、其余按"未来指导价值"归档；冻结归档才是证据；active 语料是持续维护成本 | 任何采用 note 机制的项目都会面对归档判决与维护成本 | **notes 契约**（判据已在，补理由引用）+ 记录 note 的出处引用；P0 |
| `archived/process/2026-07-05-uniform-agent-note-format.md` | archived | 统一 in-file 格式（header/骨架/alternatives）与门禁，使检索不依赖作者；记录 reject 的替代 | note 格式的"为什么"对 adopter 通用，且本包正缺格式理由 | **notes 契约引用**（恢复上游第 56 行的 archived 链接语义）；P0 |
| `archived/process/2026-07-02-bilingual-docs-and-pairing-gate.md` | archived | 双语对 = EN+ZH+sidecar 三件套、双权威、整组合并；手工维护第二语言必然腐烂，需机械门禁 | 双语项目通用；本包已移植配对门禁 | **notes 契约新增"配对/中文对侧"一节** + translation 规则引用；P0 |
| `archived/process/2026-09-23-section-keyed-translation-pairing-records.md` | archived | sidecar 按 heading section 记哈希，避免整文件哈希的合并热点；`--write` 是"确认一致"的可评审行为 | 双向编辑项目的通用协作机制；本包 manager 已有实现 | **notes 契约**（sidecar 机制说明）+ 本包 `translation-pair` 命令引用；P0 |
| `archived/process/2026-06-11-quality-gates.md` | archived | 每条可机制化的 prose 承诺都必须有一个非零退出的命令；CI 跑全量、本地 hook 只做廉价检查 | 通用工程纪律；本包 norms 只覆盖了证据，未覆盖"承诺→门禁" | 新增 norm `docs.gate-promises`（或 `evidence.gates`）；P0 |
| `archived/process/2026-07-19-remove-generated-agent-note-index.md` | archived | 生成索引是第二清单、合并热点；lifecycle/class 树就是清单 | note 机制通用；本包已采纳该措辞 | **notes 契约引用**（本包第 16 行理由的出处）；P1 |

### 5.2 文档 / 散文 / 引用

| 路径 | 状态 | 决定一句话 | 可移植理由 | 建议落点 |
|---|---|---|---|---|
| `proposed/process/2026-08-20-audience-first-documentation-quality.md` | active(proposed) | 受众优先质量契约：brief/intuitive/friendly 等的可评审定义，替代"写得短"这种主观标准 | 所有项目都有文档质量评审 | **docs 技能规则**（未来 dsh-doc 类技能）或 `docs.audience-first` norm；P1 |
| `implemented/process/2026-08-26-ban-ambiguous-origin-label.md` | active | 一个词承载多种来源含义时禁用，改指本地具体概念（source-event/provider/model identity…） | 散文与命名的通用规则 | 新增 norm `prose.exact-facts`；P0 |
| `archived/process/2026-07-04-doc-tiers-and-budgets.md` | archived | 文档 tier 与"一个事实一个家"；每层只写本层，细节链接到拥有者；预算防止增长 | 通用文档结构纪律 | `docs.tiers` norm 或 docs 技能规则；P1 |
| `archived/process/2026-08-09-concrete-prose-names-actors-and-recorded-facts.md` | archived | 散文写具体 actor/action/source/field/file，不写抽象类别词；用"对同事解释"的语言自检 | 通用写作规则 | 并入 `prose.exact-facts`；P0 |
| `archived/process/2026-08-09-committed-artifact-citations.md` | archived | 持久文本只引用已提交、仓库内可解析的物（note 路径/issue），禁止会话编号、审查口令、PR/栈位置 | 通用"推理泄漏/不可解析引用"防治 | 并入 `prose.exact-facts` 或独立 `prose.cite-committed`；P0 |
| `archived/process/2026-09-12-maintained-repository-references.md` | archived | 维护文本不得写真实 commit id/disallowed org URL，引用必须可机器解析 | 通用引用可维护性 | norm `evidence.references`（与上条合并）；P1 |
| `archived/process/2026-07-10-readme-known-limitations-gate.md` | archived | 每个包 README 有统一的 `## Known Limitations and Deferred Work` 段并由门禁检查 | 包 README 的通用约定 | docs 技能规则；P2 |

### 5.3 测试 / 证据 / 性能

| 路径 | 状态 | 决定一句话 | 可移植理由 | 建议落点 |
|---|---|---|---|---|
| `proposed/testing/2026-06-11-deterministic-and-stress-testing.md` | active(proposed) | 禁墙钟 sleep；把等待改成事件/状态驱动；核心不变量（日志回放=派生历史）单独断言 | 所有测试套件通用；本包 test.offline 只覆盖了"无网络/时钟依赖"的一部分 | 新增 norm `test.observed-state`（主来源）；P0 |
| `implemented/testing/2026-09-27-observation-waits-on-observed-state.md` | active | 等的必须是"被断言的状态"本身；有界等待的起点从被测动作的交接开始，而不是测试开始 | 通用 flake 防治 | 同上（细则）；P0 |
| `implemented/testing/2026-06-19-real-api-e2e-ci.md` | active | 无 key 套件只证管道；真实 API/制品必须另跑，缺 secret 要响亮失败而非假绿 | 任何有外部依赖的套件 | norm `test.real-dependency`；P0 |
| `implemented/testing/2026-08-23-installed-python-wheel-black-box-ci.md` | active | 测"安装后的制品边界"（干净 venv 里的 wheel），非源码路径 | 发布类项目的通用验收形态 | 并入 `test.real-dependency`；P1 |
| `implemented/bug-fix/2026-09-06-packed-install-private-npm-cache.md` | active | 验证器显式拥有临时缓存目录（`--cache`），清理才完整 | hermetic 测试的通用细则 | `test.offline` 的证据细则/引用；P1 |
| `implemented/testing/2026-09-04-session-open-performance-gate.md`（T3 集群代表） | active | 性能 gate 的预算从**实测基线**校准，跑在代表性硬件上；报告规模/内存维度而非单点数字 | 性能门禁方法论通用（同集群另有 frontend/corpus/memory/scaled 5 条） | norm `test.perf-budget` 或性能技能规则；P1 |
| `proposed/testing/2026-06-11-mutation-testing.md` | active(proposed) | 覆盖率只证"执行过"，不证"断言会察觉"；用 PR 增量 mutant 作为证据 | 测试有效性通用 | docs/testing 技能规则；P2 |
| `implemented/testing/2026-09-27-plugin-manager-git-child-environment.md` | active | 测试隔离外部环境（删除 Git 命令行配置组再 spawn），否则断言的是宿主环境 | 通用测试隔离 | `test.offline`/`test.behaviour` 细则；P1 |

### 5.4 数据兼容与架构模式

| 路径 | 状态 | 决定一句话 | 可移植理由 | 建议落点 |
|---|---|---|---|---|
| `implemented/process/2026-10-08-session-reader-compatibility-review.md` | active | 结构 schema 差异不自动等于新版本号；版本判据是旧 reader 行为：能正确恢复 / 安全忽略可选能力并保留其记录 / 在变更前拒绝 | 任何有持久格式的项目 | 新增 norms 组 `data`：`data.reader-compatibility`（P0） |
| `implemented/architecture/2026-08-10-session-log-version-mechanism.md` | active | 已发布的第一个 reader 是版本底线；缺失的拒绝/降级行为无法补进用户手里已发布的副本 | 兼容性设计的硬约束 | 并入 `data.reader-compatibility` 的 invariant；P0 |
| `implemented/process/2026-09-11-persistence-type-history.md` | active | 用归一化类型历史 + 每-root 确认/指纹记录持久类型的结构变化，供 review 判断"是新增可选数据还是改变语义" | 持久化 review 通用 | `data.type-history`（与 `data.reader-compatibility` 同组，可合并为一条 norm）；P1 |
| `implemented/process/2026-09-17-persistence-schema-review.md` | active | 指纹必须绑定兼容性元数据：binding、policy 版本、discriminator、unknown-kind 保留承诺、归属 kinds | 同上 | 并入 `data.type-history`；P1 |
| `proposed/architecture/2026-07-27-session-projection-and-command-log.md` | active(proposed) | **whole-value event 规则**：携带状态的日志事件必须带完整变更后状态，绝不只带 delta | 事件溯源/日志型系统的通用模式 | norm `design.whole-value-events`；P1 |
| `implemented/architecture/2026-06-11-dev-invariants-over-deep-readonly.md` | active | 生产必须成立的不变式需要运行时边界；TS readonly 或"可选的开发插件"都不构成保证 | 通用所有权/边界规则 | norm `owner.runtime-boundary`；P1 |
| `implemented/architecture/2026-07-24-single-harness-home-resolver.md`；`proposed/process/2026-06-20-discover-package-inventory.md` | active | 同一事实只能有一个 resolver / 清单从唯一来源生成并校验 | 已被本包 `owner.ssot` 覆盖 | **仅引用**（说明 owner.ssot 的上游证据链）；P2 |

### 5.5 发布 / 依赖 / 供应链 / PR

| 路径 | 状态 | 决定一句话 | 可移植理由 | 建议落点 |
|---|---|---|---|---|
| `implemented/process/2026-07-26-dependencies-over-hand-rolling.md` | active | 引入维护良好的外部依赖是合法简化，不是政策例外；但要有与其他简化相同的证据标准 | 通用工程判断 | norm `simplify.external-dependency`（或 find-simplifications 技能规则）；P1 |
| `proposed/process/2026-06-11-supply-chain-and-vendor-drift.md` | active(proposed) | 现有 vendoring 只校验"改动→manifest"单向；必须反向验证 manifest 的声明（clone 上游 pin、diff、记录本地改动补丁） | 通用 vendoring 完整性 | norm `vendor.manifest-claims`（新组 `vendor`/`release`）；P0（本包自己就有 vendoring 机制） |
| `archived/process/2026-06-11-vendor-cordis-as-source.md` | archived | vendoring 以"源码 + manifest"落地，改动记录在案；为 drift 校验提供对象 | 通用 vendoring 形态 | 与上一条合并成 vendoring 规范的出处；P1 |
| `implemented/process/2026-10-05-product-package-classification.md` | active | 非实验包必须有"有效产品用途"或显式 policy 例外；安装依赖存在≠产品使用 | 多包发布项目的通用治理 | norm `release.package-surface`；P2 |
| `implemented/process/2026-10-14-experimental-dependency-policy.md` | active | 实验包遵守与发布包完全相同的依赖分区规则，无组级豁免；扫描每个包自己的 Host/子进程入口 | 同上 | 并入 `release.package-surface`；P2 |
| `proposed/process/2026-06-11-api-extractor-reports.md` | active(proposed) | 公开 API 的每次变化都必须成为可 review 的 diff 行（生成 `etc/<pkg>.api.md`，CI 校验新鲜度） | API 项目通用 | docs/PR 技能规则；P2 |
| `implemented/process/2026-08-02-native-github-stacks-and-optional-rebases.md` | active | 同仓库 ≥2 的依赖 PR 链落地前用 GitHub 官方 stack 对象表示；混合/不可用时才手工 | GitHub 工作流通用 | pr 规范扩展或 stacked-PR 技能规则；P2 |
| `implemented/process/2026-08-10-event-directed-pr-review-status.md` | active | review webhook 是状态命令：review_requested→In review；changes_requested→In progress（submitted 事件仍必要） | GitHub 项目治理通用 | 并入 pr 规范/技能；P2 |
| `implemented/process/2026-07-21-serial-cross-platform-ci-reference.md` | active | 必需聚合 job 不能是唯一完整性 oracle；PR 与 master 事件职责互补 | CI 设计通用 | CI 技能规则/norm `test.ci-oracle`；P1 |
| `proposed/process/2026-07-13-human-review-skill-maintenance.md` | active(proposed) | 从 review 证据周期维护技能：私有不入库的工具、刷新 origin 后重放失败模式，避免清单膨胀 | 技能维护通用；本包交付技能时同样需要 | forge SKILL 规则（技能维护一节）；P1 |
| `implemented/process/2026-09-19-no-unknown-casts.md` | active | 禁止 `as unknown` 断言绕过类型检查（含测试/fixture/benchmark） | 仅 TS 生态 | 生态相关规则（不进通用 norms），可作 adopters 的示例/citation；P2 |
| `archived/process/2026-09-19-evidence-led-simplification-surveys.md` | archived | 简化必须追踪 producer→outcome 完整路径，并把配置/生命周期/测试/文档的删除量与源码一起计账 | 通用简化方法 | find-simplifications 技能规则；P1 |
| `archived/process/2026-08-27-gate-runner-fail-fast.md` | archived | 聚合门禁支持 fail-fast；被中止的 gate 记 `skipped` 而非 `passed`，退出码仍非零 | 门禁/CI 工具通用 | norms `evidence.claims` 细则/引用；P2 |
| `archived/process/2026-07-27-explicit-change-scope-report.md` | archived | 变更范围用版本化 JSON 报告（base/head/merge-base + committed/staged/unstaged/untracked 路径集） | 评审工具通用 | pre-push/review 技能规则；P2 |
| `implemented/process/2026-07-30-generated-third-party-notices.md` | active | 第三方声明从 manifest 生成、随依赖变化保持真实、对读者可行动 | 依赖披露通用 | 引用（本包自身已有 `THIRD_PARTY_NOTICES.md` + `submit-vendored.ts`）；P2 |

### 5.6 已由现有 norms 覆盖、只需在上游找到证据链的（不需新增规范）

- `owner.ssot` ← `implemented/architecture/2026-07-24-single-harness-home-resolver.md`、`proposed/process/2026-06-20-discover-package-inventory.md`；
- `test.fast-subset` ← `archived/process/2026-07-22-fast-local-git-hooks.md`、`implemented/process/2026-10-12-local-gate-speedups.md`；
- `test.offline` ← `implemented/bug-fix/2026-09-06-packed-install-private-npm-cache.md`、`implemented/testing/2026-09-27-plugin-manager-git-child-environment.md`；
- `evidence.claims` ← `archived/process/2026-06-11-quality-gates.md`、`archived/process/2026-08-27-gate-runner-fail-fast.md`；
- `pr.lifecycle` ← `archived/process/2026-07-22-fast-local-git-hooks.md`、`archived/process/2026-07-27-explicit-change-scope-report.md`。

---

## 六、不可移植/不相关判定

### 6.1 判定标准（为什么"内容"不能搬）

1. **对象不封闭**：dsh 产品 notes 的对象是 `packages/*`、wire 格式、运行时 API、Electron/Web 客户端；这些 schema 只属于 dsh。按本包自己的"抽象天花板"规则（`2026-10-22-the-forge-marks-the-abstraction-ceiling.md`），object/artifact/criteria 三锚点若不成立，方法只能作为具体任务辅助，不能成为可检查的通用知识。
2. **事实随代码维护**：`implemented/AGENTS.md` 要求 note 的路径/符号/默认值/机制**随发布现实同改**；本包没有 dsh 源码树，无法维持 `current`，抄过来的每条事实都会在下一个上游版本漂移。
3. **上游自己也在处置这些内容**：73% 已归档、0.2.1 一次归档 282 条并删除 30 条、171 条被改写——把"正在被冻结/删除的东西"移植成本包的长期资产，是把上游的临时状态变成自己的永久债务。
4. **判据不可重建**：产品 note 的 alternatives/risks 大量指向 dsh 内部 issue/PR/包名；离开上游语料后无法复核，也无法在 review 中验证。

### 6.2 dsh 产品决策大类（274 条 active，81.8%）

| 主题 | 数量 | 典型例子 | 为什么不可移植 |
|---|---:|---|---|
| A1 会话日志/持久化/格式/迁移/投影 | 50 | `v3-canonical-session-envelopes`、`released-session-format-migrations`、`session-projection-mandatory-seam` | 绑定 JSONL/Zstandard/wire envelope 与 dsh reader 实现；版本策略可提炼（5.4），具体格式不可 |
| A2 Agent 运行时/子代理/Team/目标 | 41 | `agent-teams`、`goal-owned-durable-events`、`unified-subagent-activations` | dsh 的 inbox/goal/job/preset 领域模型 |
| A3 LLM 适配/流式/提示/压缩 | 21 | `twin-llm-adapters`、`reconstructable-requests`、`routed-model-context-and-compaction-policy` | provider 协议与 dsh 缓存/压缩语义 |
| A4 工具/PTC/沙箱/执行世界/终端/审批 | 38 | `ptc`、`cooperative-tool-cancellation`、`persistent-pty-sessions`、`windows-acl-restricted-token-sandbox` | 绑定 dsh 工具注册表、PTC 运行时、平台沙箱 |
| A5 Web Host/API/认证/凭据/远程 | 21 | `api-browser-trust-boundary`、`peer-principal-and-remote-access`、`remote-duplex-stream` | dsh Host 的方法面与安全模型 |
| A6 客户端 UI/聊天/侧栏/composer | 28 | `slot-type-chain-implementation`、`conversation-build-groups`、`composer-command-chip` | React/Cordis UI 基座与 dsh 产品交互 |
| A7 桌面 Electron/安装更新/窗口 | 16 | `electron-desktop-packaging-and-updates`、`desktop-native-fatal-recovery` | dsh Desktop 发布/窗口/更新设施 |
| A8 插件/Cordis/配置/Profile/包解析 | 32 | `client-plugin-loading-model`、`profile-plugin-bundles`、`plugin-market-index-format` | 与上游 vendored Cordis 栈强绑定 |
| A9 文件/工作区/Office/文档预览 | 13 | `workspace-files-service`、`document-preview-operations`、`independent-libreoffice-kit` | dsh 工作区与 Office 引擎 |
| A10 账户/翻译/反馈/日程/浏览器操作 | 14 | `account-provider-signout`、`cua-application-consent`、`persistent-machine-translation` | 产品账户、CUA、翻译/计费 |
| **合计** | **274** | | |

### 6.3 流程/测试主题里也不可移植的部分

- **M4 的 dsh CI 设施**（failover 池、Blacksmith、self-hosted runner、Wine、签名缓存/公证）：机器与凭据绑定，不可移植；可移植的只有"PR 与 master 职责互补""聚合不是唯一 oracle""预算从实测校准"等原则。
- **M3 的 dsh 发布细节**（三条 npm 发布序列、Electron 公证、SignTool）：产品发布流水线，不可移植；PR 标签/评审状态机可移植。
- **T4 的 Desktop 安装更新验收**：dsh Desktop 的特定装置；"装真实制品 + 跨进程状态日志"的方法可作 5.3 的补充例子，但整套不可移植。
- **M5 的 TS 特定规则**（`no-unknown-casts`、`no-top-level-await-in-packages`、`no-top-level-await`）：生态相关，只在 TS 项目成立；作为 norms 会违反本包"不假设单一生态"的边界（`AGENTS.md` 的"Ask before changing what the package claims to be generic"）。
- **archived 的产品内容（741 条非 process/testing 归档）**：只作为历史证据存在，不应成为本包内容或规范的来源；引用也要谨慎（冻结、可能已被取代）。

---

## 七、是否揭示了新的候选技能领域

### 7.1 与上游 19 个基线技能的覆盖对照

上游 `.agents/skills/` 的 19 个技能，按职能分组：

| 组 | 技能 | 与 notes 主题的关系 |
|---|---|---|
| notes/文档自身 | `dsh-archive-agent-notes`、`dsh-doc`、`dsh-prose-standard`、`dsh-translate-docs`、`dsh-trim-cot-leakage` | 直接服务 M1/M2 + 双语；M1/M2 的"技能化"已存在 |
| 工程流程 | `dsh-code-review`、`dsh-pre-push-checks`、`dsh-merging-stacked-prs`、`dsh-create-upgrade-guide`、`dsh-find-simplifications`、`dsh-ci-test-reliability` | M3/M4/T1–T3 已被覆盖（CI 可靠性、简化、stacked PR、升级指南、评审、最小检查） |
| 性能/体验 | `dsh-speed-up-perf`、`dsh-client-ui-ux`、`dsh-responsive-ui`、`cordis-styling-nitpicking`、`agent-experience`、`dsh-error-handling` | 产品类；T3 性能方法由 `dsh-speed-up-perf` 覆盖 |
| 其他 | `dsh-official-plugin-artwork`、`record-browser-gif` | 产品/证据类；后者对应 browser-gif evidence chain 的元决策 |

要点：**7/19 技能直接围绕 notes 体系运作**。"文档标准、散文、翻译、归档、CI、性能、简化"这些领域上游已有技能；本包当前只交付 forge 一个技能，这是**交付缺口**，不是"新领域"。

### 7.2 候选一（唯一值得过锚点测试的）：持久化数据格式兼容性评审

**证据主题**：M6（3 条 process）+ A1 中约 10 条同族决策，合计约 13 条 active notes 指向同一方法：

- `implemented/process/2026-10-08-session-reader-compatibility-review.md` —— 版本由旧 reader 行为决定；
- `implemented/architecture/2026-08-10-session-log-version-mechanism.md` —— 首个发布 reader 是底线，缺失的拒绝/降级行为不可补；
- `implemented/architecture/2026-08-31-released-session-format-migrations.md` —— 已发布的 v0 使结构写入变更不能再当 pre-release 丢弃；
- `implemented/architecture/2026-08-31-alpha-historical-unknown-event-refusal.md`、`2026-08-30-retain-ignorable-external-session-events.md` —— unknown event 的"可安全跳过 / 必须拒绝"判据；
- `implemented/architecture/2026-09-06-v3-canonical-session-envelopes.md`、`2026-09-01-v2-embedded-assistant-streams.md`、`2026-09-17-native-v4-read-validation.md`；
- `proposed/architecture/2026-09-10-session-data-compatibility.md`、`2026-09-29-session-migration-follow-redirect.md`；
- `implemented/process/2026-09-11-persistence-type-history.md`、`2026-09-17-persistence-schema-review.md`。

**锚点测试**（本包 `2026-10-22-the-forge-marks-the-abstraction-ceiling.md` 的 object/artifact/criteria）：

| 锚点 | 是否封闭 | 依据 |
|---|---|---|
| Object closed | 条件满足 | 对象是"已持久化的数据格式 + 其 reader/writer"，由项目自己的格式版本目录与类型的声明限定，不是技能自造的 schema |
| Artifact closed | 满足 | 交付物是"兼容性评审记录"：受影响格式、版本升降判据、unknown-data 策略、迁移路径、验证命令与输出——字段可固定、形状可检查 |
| Criteria anchored | 条件满足 | 已有可执行证据：类型指纹/归一化类型历史、reader corpus 测试、gate 输出；技能可要求"每条兼容性结论附可复现命令与输出" |

**结论**：该领域**能过锚点测试**，但它是"按项目类型实例化"的技能（本包的天花板规则要求 generalization 向下、按域实例化，不能做成万物兼容审核器）。建议：

- **现在**：以 1 条 norm（`data.reader-compatibility`，必要时加 `data.type-history`）承载，成本最低；
- **下一步**：观察一个发布周期，若 adopter 确实需要"迁移评审清单/版本判据"，再按 forge 流程锻造 `dsh-spec-durable-format-review`（对象/制品/验收都已在表里）。

### 7.3 候选二（弱）：发布与包面治理

**证据**：M3 的 `npm-release-sequences`、M5 的 `product-package-classification`、`experimental-dependency-policy`、`default-product-experimental-isolation`、`published-dependency-faces`、`generated-third-party-notices`，以及 `shipped-optional-bundles`。

**锚点测试**：object 可封闭（package manifest + 发布 workflow 是外部 schema）；artifact 可封闭（发布计划/依赖面清单/notices 新鲜度）；criteria 部分锚定（manifest 门禁、notices 生成/校验）。但"发布"在不同生态（npm/PyPI/容器/桌面签名）机制差异过大，做成通用技能会把本包拖入生态假设，**违反"不假设单一生态"的边界**。结论：**不列为技能候选**；最多提炼成 1 条 `release.package-surface` norm（P2）。

### 7.4 明确不是新领域的

- 文档/散文/引用 → `dsh-doc`、`dsh-prose-standard`、`dsh-trim-cot-leakage` 已覆盖；
- 双语/翻译 → `dsh-translate-docs` 已覆盖；
- notes 归档/清理 → `dsh-archive-agent-notes` 已覆盖（本包 manager 也有门禁）；
- CI 可靠性 / 性能 / 简化 / stacked PR / 升级指南 → 上游 5 个技能已覆盖；
- T2/T3 的"观测纪律/性能预算"更适合作为 norms，单独成技能会与 `dsh-ci-test-reliability`、`dsh-speed-up-perf` 重叠。

---

## 八、移植建议

### 8.1 结论：不移植 notes 内容，只移植"契约 + 规范内核"

理由（对第六节的补充）：

1. **内容不可维护**：335 条 active + 924 条 frozen 的产品事实必须随 dsh 源码更新（`implemented/AGENTS.md` 的强制义务）；本包无源码树，抄一行就欠一笔"事实会过期"的债。
2. **上游自己在丢弃内容**：0.2.1 归档 282 条、删除 30 条；今天抄的内容下个 pin 就可能进入冻结区。
3. **可移植的是元知识**：真正跨项目有用的 25–30 条（第五节）几乎都是"如何做决定/如何验证/如何写"，它们本来就该落在 norms、契约、技能规则里；正文复制只会增加翻译与配对成本。
4. **抽象天花板**：产品 notes 的对象是开放的（dsh 源码树），按本包规则不能变成可检查的通用制品。
5. **收益/成本不对称**：移植 8 条 norms + 6 处契约修正（约 2–4 人日）即可覆盖本包 adopters 的通用缺口；移植内容子集（20–30 条）起步就要 60–90 个三元组文件，且每次 pin 升级都要重写事实 + 重翻译 + 重录 sidecar。

**移植形态（推荐）**：

| 形态 | 内容 | 去向 |
|---|---|---|
| 契约修正 | 第三节 3.2 中建议 adopt 的 8 处（#1/#2/#4/#5/#6/#7/#11/#12） | `.agents/dsh-spec/notes/README.md`（+zh+sidecar）与三个子树 `AGENTS.md` |
| 规范（norms） | 5.1–5.5 中 P0/P1 条目提炼出的 6–8 条（见 8.3） | `scripts/dsh-spec-manager/references/norms.json` → 重新生成 `.agents/dsh-spec/norms/norms.md` + `applied.yaml` |
| 决策记录 | 1 条新 note：移植范围、逐条吸收表、provenance、维护触发 | `.agents/dsh-spec/notes/proposed/process/2026-10-22-the-package-absorbs-the-upstream-notes-kernel.md`（+zh+sidecar） |
| 引用 | 上游 archived 元决策与产品 note 的路径表（不复制正文） | 上述记录 note 的 provenance 表 |
| 技能 | 只评估 1 个新领域（durable-format-review，第七节）；文档/散文/归档等沿用上游已有技能的锻造路线 | 不在本轮 |

### 8.2 需要改动的本仓库文件

| # | 文件 | 改动 | 依据 | 估计成本 |
|---|---|---|---|---|
| 1 | `.agents/dsh-spec/notes/README.md` + `README.zh.md` + `README.i18n.yaml` | 采纳 3.2 的 #1（修列表排版）、#2（链接示例）、#4（class 两处同改）、#5（归档命令/流程指认）、#6（冻结门禁 + 文档门禁跳过 archived）、#7（格式门禁 + 理由出处）、#11（迁移失败语义）、#12（配对 sidecar 机制一节）；保留 #3/#8/#9/#10；忽略 #13–#15 的 dsh 特化部分；重录 sidecar | 第三节差异表 | 0.5–1 人日 |
| 2 | `.agents/dsh-spec/notes/AGENTS.md`、`implemented/AGENTS.md`、`archived/AGENTS.md` | 用"命令名"补回工作流指引：`notes check`、`notes-archived check|write`、`translation-pair check|write`；不写 dsh 脚本路径、不写 Figma 例外 | 3.2 #5/#6/#14 | 0.5 人日 |
| 3 | `scripts/dsh-spec-manager/references/norms.json` → 重新生成 `.agents/dsh-spec/norms/norms.md` + `applied.yaml` | 新增 8.3 的 6 条 P0（+P1 视容量），每条含 `title/titleZh/invariant/body/source`；用 `norms update` 生成，避免手改生成物 | 第五节 + 本包 norms 机制 | 1–1.5 人日 |
| 4 | `.agents/dsh-spec/notes/proposed/process/2026-10-22-the-package-absorbs-the-upstream-notes-kernel.md`（+zh+i18n） | 记录本次移植决策与 provenance（8.4） | 本包"决策记录是 Agent Note"的约定 | 0.5 人日 |
| 5 | `.agents/dsh-spec/norms/applied.yaml` | 随 3 自动更新（哈希记录） | norms 机制 | 包含在 3 |
| 6 | （可选，另行锻造）`skills/` | 若要补文档/散文/归档技能，走 forge 流程从上游技能重新提取，而不是把 dsh 文档搬进本包 | 第七节 | 2–3 周（另立项） |
| 7 | （不推荐）`docs/` | 不建议把 provenance 表放人读文档：它属于决策理由，按本仓库 tier 规则应进 notes | 仓库 `docs/AGENTS.md` 与 AGENTS.md | — |

### 8.3 建议新增的 norms（草稿，待维护者确认 id/group）

| 拟 id | group | invariant（一句话） | 主要来源 note | 优先级 |
|---|---|---|---|---|
| `docs.gate-promises` | `docs`（新组）或 `evidence` | 每条可机制化的规则/承诺，都必须有一个"发现违规即非零退出"的检查 | `archived/process/2026-06-11-quality-gates.md`、`2026-06-11-doc-sync-enforcement.md` | P0 |
| `prose.exact-facts` | `prose` | 散文写具体的 actor/action/source/field/file，禁用一词多义的抽象标签与不可解析引用（会话编号、审查口令） | `implemented/process/2026-08-26-ban-ambiguous-origin-label.md`、`archived/process/2026-08-09-concrete-prose-names-actors-and-recorded-facts.md`、`2026-08-09-committed-artifact-citations.md` | P0 |
| `test.observed-state` | `test` | 等待的必须是被断言的状态本身；不用墙钟窗口；有界等待从被测动作的交接开始 | `proposed/testing/2026-06-11-deterministic-and-stress-testing.md`、`implemented/testing/2026-09-27-observation-waits-on-observed-state.md` | P0 |
| `test.real-dependency` | `test` | 无外部依赖的替身只证管道；真实 API/制品另跑，缺凭据要响亮失败而不是假绿 | `implemented/testing/2026-06-19-real-api-e2e-ci.md`、`2026-08-23-installed-python-wheel-black-box-ci.md` | P0 |
| `data.reader-compatibility` | `data`（新组） | 格式版本由旧 reader 行为决定：能正确恢复 / 安全忽略可选能力并保留其记录 / 在变更前拒绝；首个发布 reader 是底线 | `implemented/process/2026-10-08-session-reader-compatibility-review.md`、`implemented/architecture/2026-08-10-session-log-version-mechanism.md` | P0 |
| `vendor.manifest-claims` | `release`（新组）或 `vendor` | vendoring 双向验证：本地改动必须更新 manifest；manifest 的每条声明必须能由上游 pin 复现（drift 检查） | `proposed/process/2026-06-11-supply-chain-and-vendor-drift.md`、`archived/process/2026-06-11-vendor-cordis-as-source.md` | P0 |
| `design.whole-value-events` | `design`（新组） | 携带状态的日志事件必须携带完整变更后状态，绝不只带 delta | `proposed/architecture/2026-07-27-session-projection-and-command-log.md` | P1 |
| `owner.runtime-boundary` | `owner` | 生产必须成立的不变式需要运行时边界；类型系统或可选开发插件不构成保证 | `implemented/architecture/2026-06-11-dev-invariants-over-deep-readonly.md` | P1 |
| `test.perf-budget` | `test` | 性能预算从实测基线校准、跑代表性硬件、并报告规模/内存维度 | T3 集群（6 条） | P1 |
| `docs.audience-first` | `docs` | 文档质量用可评审的受众定义（brief/intuitive/friendly）衡量，而不是篇幅 | `proposed/process/2026-08-20-audience-first-documentation-quality.md` | P2 |
| `docs.tiers` | `docs` | 一个事实一个家；每层只写本层，细节链接到拥有者；用预算防止文档增长 | `archived/process/2026-07-04-doc-tiers-and-budgets.md` | P2 |
| `simplify.external-dependency` | `simplify`（新组） | 用维护良好的外部依赖替换手写实现是合法简化，证据标准与其他简化相同 | `implemented/process/2026-07-26-dependencies-over-hand-rolling.md` | P2 |
| `test.ci-oracle` | `test` | 聚合 job 不是唯一完整性 oracle；PR 与主线事件职责互补 | `implemented/process/2026-07-21-serial-cross-platform-ci-reference.md` | P2 |

> 成本注意：新增 norms 组会扩大本包规范面；建议 **P0 只加 2 个新组（`docs`、`data`）**，其余先进现有组（`prose`/`test`/`evidence`/`owner`），把 `design`/`review` 等留到下一轮。若决定不引入新组，`data.reader-compatibility` 可暂放 `owner`，`docs.gate-promises` 暂放 `evidence`，但语义会略松。

### 8.4 建议写入的决策记录（一条 Agent Note）

- 路径：`.agents/dsh-spec/notes/proposed/process/2026-10-22-the-package-absorbs-the-upstream-notes-kernel.md`（+ `.zh.md` + `.i18n.yaml`；若随后一次性落地，按本包流程图移入 `implemented/`）。
- 章节（沿用本包契约）：`## Problem` / `## Proposal` / `## Alternatives considered` / `## Acceptance criteria` / `## Risks`。
- 必含内容：
  1. **pin**：`submodules/dsh @ dsh-v0.2.1-rc.2 (687f282e86)`，及"只读证据、不写子模块"的边界；
  2. **决策**：只移植契约+规范内核，不移植内容；
  3. **逐条吸收表**：第五节候选 → norm id / 契约段落 / 仅引用；
  4. **provenance 表**：上游路径（注明 pin 与当时生命周期 active/archived）→ 吸收方式 → 本包落点；
  5. **不移植清单**：274 条产品决策 + 924 archived 内容 + dsh 特化 gate 路径；
  6. **维护触发**：升 pin 时重跑第三节的契约 diff、检查 provenance 表路径是否被归档/删除、重跑 `notes check`/`translation-pair check`；
  7. **验收命令与真实输出**（候选）：
     ```sh
     node scripts/dsh-spec-manager/scripts/dsh-spec.ts notes check --all --root .
     node scripts/dsh-spec-manager/scripts/dsh-spec.ts notes-archived check --all --root .
     node scripts/dsh-spec-manager/scripts/dsh-spec.ts translation-pair check
     node scripts/dsh-spec-manager/scripts/dsh-spec.ts norms list
     pnpm test
     ```
  8. **Alternatives**：全量内容移植（成本/漂移）、完全不移植（adopter 缺规范）、只加文档（不进门禁）——各自为何落选。

### 8.5 上游内容的引用方式（不复制正文）

- 在记录 note 的 provenance 表中引用上游路径；路径必须绑定 pin（`dsh-v0.2.1-rc.2`）。**不要**把 `submodules/dsh/...` 写成契约或正文里的相对链接：本包发布物不应依赖 submodule 存在。
- 优先引用的 archived 元决策（全文留在上游，仅引用）：`quality-gates`、`uniform-agent-note-format`、`bilingual-docs-and-pairing-gate`、`doc-tiers-and-budgets`、`remove-generated-agent-note-index`、`concrete-prose`、`committed-artifact-citations`、`section-keyed-translation-pairing-records`、`evidence-led-simplification-surveys`、`vendor-cordis-as-source`、`maintained-repository-references`、`browser-gif-evidence-chain`、`explicit-change-scope-report`、`gate-runner-fail-fast`。
- 升 pin 时的检查：这些路径可能被归档/删除（0.2.1 就把 `uniform-format`、`section-keyed pairing` 等从 implemented 移到 archived），引用表要允许"生命周期列随 pin 更新"，而不是把路径当永久事实。

### 8.6 维护成本估算

| 方案 | 一次性成本 | 每次基线升级成本 | 风险 |
|---|---|---|---|
| A. 只修契约差异（3.2 的 8 处） | 1–1.5 人日 | 约 0.5 小时（契约文件 diff） | 低 |
| B. A + 6–8 条 norms + 记录 note（**推荐**） | 3–5 人日 | 0.5–1 人日（重读 61 条流程/测试 note 摘要、更新 provenance 路径） | 中低：norms 稳定，source 引用需随 pin 维护 |
| C. B + 恢复/锻造文档、散文、归档技能 | 2–3 周（forge 流程） | 1–2 人日（技能与上游技能的 extraction 关系） | 中：与上游技能重叠，需要"每技能对应上游来源"的记录 |
| D. 内容移植 20–30 条三元组 | 60–90 个文件、5–8 人日 | 每版重写事实 + 重翻译 + 重录 sidecar，1–2 人日/批 | 高：无法保持 current，且与上游"内容会归档"冲突 |
| E. 全量移植 1267 三元组 | 3801 个文件 | 不可行 | 极高 |

### 8.7 不做清单

- 不把 archived 内容复制进包；不恢复生成式 `INDEX.md`；不搬运 note 正文（含 alternatives/risks）。
- 不把 dsh 的 gate 脚本路径、Figma 例外、PR/issue 编号、包名写进通用契约。
- 不新增 notes class（6 类够用；若加必须"canonical set + README"两处同改）。
- 不把 `docs/AGENTS.md` 整篇并入 notes 契约（它属于另一个领域，应走文档技能的锻造）。
- 不在本包对 notes 内容建立"摘录语料库"（另一种内容移植，维护成本同 D）。

---

## 九、待决问题（交给维护者决定）

| # | 问题 | 选项 | 建议 |
|---|---|---|---|
| 9.1 | **移植范围** | A 只修契约差异；B 契约 + 规范内核（推荐）；C 再加内容子集；D 全量 | **B**：收益/成本最优，且与"内容会归档"的上游事实一致。C/D 见 8.6 的 D/E 风险 |
| 9.2 | 契约与三个子树 `AGENTS.md` 是否要**写死命令名**（`notes check`、`notes-archived write`、`translation-pair write`）？ | A 写命令名（像上游写 `pnpm run verify-…`）；B 只写"门禁/工作流存在"；C 不写 | **A**：本包 manager 的命令是稳定接口，且"技能只命名命令"已是本仓库约定；比上游的脚本路径更不易漂移 |
| 9.3 | 是否在 notes 契约中补一节**配对 sidecar 机制**（三件套、section-keyed 哈希、`--write` 语义）？ | A 补完整一节；B 只加一段 + 指向 translation-pair 命令；C 保持现状 | **A 或 B 必须有**：这是提取版最实质的缺口（3.2 #12）。机制细节可由 `translation-pair explain` 承载，契约给"是什么/谁重录"即可（倾向 B） |
| 9.4 | 是否提供 **pre-format 祖父条款**（adopter 迁移既有 ADR 语料）？ | A 恢复上游的 2026-07-05 注释白名单；B 写一段"既有语料迁移说明"；C 不管 | **B**：本包 gate 已删除祖父逻辑；不必为罕见迁移恢复门禁例外，用迁移说明折算成新格式即可；若维护者认为 adopter 语料迁移是常态，则改 A |
| 9.5 | 新增 norms 是否必须**双语**（`titleZh` + `invariant` 中文）？ | A 全部双语；B 只 title 双语；C English-only | **A 或 B**：`norms.json` 已有 `titleZh` 字段且 `.agents/dsh-spec/norms/norms.md` 是推广物；为中文 adopter 提供 titleZh 成本低。`invariant`/`body` 若翻译，需进 pairing 记录（成本上升），建议先 B |
| 9.6 | **provenance 表**放哪里、谁在升 pin 时刷新？ | A 记录 note 内（推荐）；B `.agents/dsh-spec/` 独立 JSON；C `docs/` 人读页 | **A**：决策理由属于 notes；升 pin 的维护者按仓库 `AGENTS.md` 的"Every skill change traces to dsh"自然承担刷新 |
| 9.7 | 是否锻造 **durable-format-review** 技能？ | A 现在锻造；B 先 norms、观察一个发布周期（推荐）；C 不做 | **B**：能过锚点测试但需要 per-domain 实例化；先以 `data.reader-compatibility` 验证需求，再按 forge 流程立项 |
| 9.8 | 是否把 **docs 标准**（`docs/AGENTS.md` 的 tier/预算/slop checklist）纳入本包？ | A 作为 norms 的 `docs.*` 组；B 恢复/锻造文档技能；C 不纳入 | **A 起步，B 作为后续**：tier/预算规则是 notes 之外的独立领域；`docs.gate-promises` + `docs.tiers` 两条 norm 先覆盖最高价值部分，完整文档技能另行锻造 |

---

## 附录 A：主题 → 335 条 active notes 完整归属（逐条核对用）

> 说明：每条以 slug 列出，配合 4.2 表的前缀与日期即可还原完整路径（`{lifecycle}/{class}/2026-…-{slug}.md`；proposed/implemented 的 class 见附录 B 分类脚本）。全部 335 条各出现一次，0 条未归；rejected 8 条见 4.4。

**M1 Agent Notes 与决策维护（2）**
frozen-agent-note-archive, human-review-skill-maintenance

**M2 文档/散文/生成可见性（5）**
ban-ambiguous-origin-label, generated-cli-help-reference, api-extractor-reports, audience-first-documentation-quality, discover-package-inventory

**M3 PR/评审/发布流程（7）**
event-directed-pr-review-status, native-github-stacks-and-optional-rebases, npm-release-sequences, parallel-macos-notarization, python-runtime-windows-hosted, shipped-optional-bundles, unified-github-label-taxonomy

**M4 CI/构建/门禁/速度（13）**
blacksmith-failover-leg, build-artifacts-check-split, ci-failover-runbook, dual-release-install-layout-work-budget, local-gate-speedups, lossless-build-speedups, native-windows-pull-request-ci, pr-artifact-typechecks, serial-cross-platform-ci-reference, windows-runtime-signature-cache, windows-signature-completion, worktree-local-lefthook, remove-packed-session-fixture-migrator

**M5 依赖/供应链/包与语言纪律（10）**
default-product-experimental-isolation, dependencies-over-hand-rolling, experimental-dependency-policy, generated-third-party-notices, no-top-level-await-in-packages, no-unknown-casts, node-engine-floor, product-package-classification, published-dependency-faces, supply-chain-and-vendor-drift

**M6 持久化类型兼容与版本判定（3）**
persistence-schema-review, persistence-type-history, session-reader-compatibility-review

**T1 真实依赖/黑盒 E2E（4）**
installed-python-wheel-black-box-ci, real-api-e2e-ci, session-log-snapshot-corpus, web-gui-browser-e2e-lane

**T2 确定性/观测纪律/测试质量（6）**
packed-install-private-npm-cache, observation-waits-on-observed-state, plugin-manager-git-child-environment, spreadsheet-selection-by-keyboard-before-reflow, deterministic-and-stress-testing, mutation-testing

**T3 性能基准与预算（8）**
backend-continuation-performance, frontend-performance-budgets, memory-limited-benchmarks, opt-in-reasoning-chunk-browser-stress, scaled-benchmark-report, session-corpus-performance, session-open-performance-gate, user-text-credential-matching

**T4 桌面安装更新验证（3）**
desktop-installed-update-journal, desktop-installed-update-materials, desktop-local-updater-qualification

**A1 会话日志/持久化/格式迁移/投影缓存（50）**
alpha-historical-unknown-event-refusal, bounded-session-log-upload, deprecate-synchronous-session-event-reads, dev-invariants-over-deep-readonly, event-domain-semantics, event-sourced-sessions, explicit-session-history-preparation, first-class-tool-role-messages, fork-children-stay-one-shot, handle-based-session-persistence, identified-immutable-message-values, image-offload-events, native-v4-read-validation, persistence-attribution-policy, plugin-owned-message-projections, process-local-blank-sessions, producer-owned-message-sources, projection-cache-listing-identity-and-cached-rows, read-only-session-migration-preparation, reconstructable-requests, released-session-format-migrations, retain-ignorable-external-session-events, session-history-and-event-transport, session-log-otel-byte-limits, session-log-upload-default, session-log-version-mechanism, session-observations-and-projection-owned-client-state, session-projection-mandatory-seam, session-surface, session-working-directory, system-prompt-as-surface-node, v2-embedded-assistant-streams, v3-canonical-session-envelopes, client-session-blank-reconciliation, reused-blank-runs-requested-preset, session-list-host-fairness, cross-process-session-write-lease, jsonl-only-session-persistence, remove-synthetic-log-only-turns, domain-kv-storage-and-workspace, durable-last-activity-index, logical-session-storage-rebuild, session-capability-protocols, session-data-compatibility, session-developer-transition, session-migration-follow-redirect, session-projection-and-command-log, session-refactor-faq, storage-root-and-derived-medium-recovery, trim-session-query-convenience-api

**A2 Agent 运行时/子代理/Team/任务/目标（41）**
adjacent-agent-steer-messaging, agent-initiator-scope, awaited-agent-creation, configuration-source-ownership, cooperative-tool-cancellation, declarative-agent-presets, developer-session-changes, explicit-agent-runtime-identity, followup-enqueue-and-owned-runs, goal-owned-durable-events, host-plane-ownership-after-presets, host-schedule-storage, operator-scoped-connect-handshake, parent-owned-subagent-catalog, preset-scoped-schedule-tools, preset-scoped-time-context, schedule-hard-delete-and-bounded-history, scheduled-message-framing, separate-context-injection-from-turn-execution, team-identity-runtime-context, timed-user-question-two-settlements, web-desktop-plugin-identity-compatibility, job-session-lifecycle, session-open-read-coordination, agent-teams, archive-admission-reads-stored-tasks, archive-stops-running-session-work, continuable-subagent-conversations, model-facing-goal-tools, product-subagent-noninteractive-permissions, spawn-agent-preset-selection, subagent-persona-tool-filter-and-depth, user-authorized-subagent-model-routes, explicit-schedule-time-zone, one-send-one-turn, preset-owned-subagent-composition, team-direct-inbox, unified-subagent-activations, unify-agent-and-session-id, required-cancellation-through-tool-capability-seams, task-surface

**A3 LLM 适配/流式/提示与上下文/压缩（21）**
anonymous-reasoning-translation, bounded-llm-request-recovery, cancelled-stream-prefix-finalize, context-breakdown-system-prompt-state, deepseek-llm-api-request-extensions, paid-native-flash-reasoning-translation, projected-token-usage-and-request-context, prompt-variables-and-tool-guidance-ownership, provider-routed-llm-adapters, routed-model-context-and-compaction-policy, shared-agents-root-instructions, terminal-llm-stream-failures, twin-llm-adapters, process-specific-prompt-values-in-runtime-context, deepseek-messages-adapter, in-history-system-prompt-replacement, interactive-side-sessions, recallable-compaction, provider-only-instruction-reads, prune-stream-visibility-helpers, retire-prompt-registry-change-event

**A4 工具/PTC/沙箱/执行世界/终端/审批（38）**
best-effort-persistent-ptc, capability-seams, client-derived-tool-presentation, dynamic-tool-updates, jobs-seam-consolidation, persistent-ptc-sandbox, portable-execution-world-consumers, posix-ssh-runtime, preparing-tool-arguments, ptc-owned-policy-cleanup, ptc-runtime-python-fd3-protocol, sandboxed-node-ptc-runtime, subprocess-control-pipe, timeout-deadline-library, tool-call-three-phases, tool-call-timeout-policy, tool-output-spill-files, tool-render-intent-union, user-terminal-permissions, web-capability-seam, workflow-ptc-sandbox-reuse, background-shell-command-display, pty-bundled-console-host, pwsh-prompt-tail-grace, approval-seam, auto-review, auto-review-user-approval-fallback, parallel-tool-call-execution, persistent-pty-sessions, ptc, ptc-typed-tool-returns, unattended-browser-terminal-reclamation, windows-acl-mandatory-integrity-confinement, windows-acl-restricted-token-sandbox, native-or-ptc-presentation, remove-e2b-providers, pre-tool-input-rewrite, shell-env-key-declarations

**A5 Web Host/API/认证/凭据/远程（21）**
api-browser-trust-boundary, browser-token-authentication, compiler-independent-typert-model, concrete-web-bind-address, credential-boundaries-and-atomic-registration, credential-records-and-authorization-flows, ctx-remote-failure-vocabulary, deepseek-account-login, experimental-cua-object-api, headless-environment-auth, native-https-web-listener, outbound-proxy-policy, peer-principal-and-remote-access, remote-duplex-stream, stored-credential-precedence, typert-remote-method-calls, web-document-relative-app-routes, authenticated-browser-host-preferences, acp-automation-only-protocol, unified-typert-remote-metadata, python-sdk-directional-client

**A6 客户端 UI/聊天/侧栏/composer（28）**
chat-group-tree-exchanges, chat-single-fold-motion, client-conversation-node-assembly, client-resource-model, client-session-conversation-ownership, client-session-references, component-factories-and-local-slots, composer-command-chip, conversation-build-groups, device-local-shortcut-preferences, exclusive-conversation-matches, locale-owned-client-ui-copy, message-node-factories-and-delegates, platform-browser-storage, reasoning-content-slot-factory, sidebar-retained-tab-layout, slot-type-chain-implementation, structured-draft-initialization, user-text-json-nodes, context-form-vocabulary, host-release-change-refresh-prompt, right-sidebar-docking-infrastructure, session-inspector, sidebar-browser, sidebar-file-and-directory-auto-refresh, web-sidebar-terminal, composer-model-and-draft-editor, semantic-composer-chain-phases

**A7 桌面 Electron/安装更新/窗口（16）**
desktop-bundled-runtime-and-external-plugins, desktop-close-to-background-and-quit-confirmation, desktop-native-fatal-recovery, desktop-page-close-shortcuts, desktop-shell-configuration, desktop-web-wrapper, desktop-welcome-window-material, electron-desktop-packaging-and-updates, fatal-diagnostics-and-crash-reports, window-drag-coverage-contract, desktop-browser-webview, desktop-primary-runtime, remove-desktop-profile-core-cleanup, desktop-mandatory-update-api, desktop-update-extensions, desktop-update-policy-and-installation

**A8 插件/Cordis/配置/Profile/包解析（32）**
client-plugin-loading-model, client-shells-and-dynamic-packages, consumer-owned-startup-strictness, creator-persistent-plugin-management, current-profile-plugin-management, dsh-source-launch-tsx-esm, experimental-capabilities-as-optional-bundles, guided-plugin-installation, official-on-demand-bundles, plugin-install-registries, prebuilt-system-primitives, profile-owned-live-configuration, profile-package-refresh-and-manifest-invalidation, profile-plugin-bundles, profile-resolution-generations, profile-resolution-lookup-order, public-package-manifest, replace-changed-package-modules-on-recomposition, single-dsh-application-launcher, single-harness-home-resolver, volatile-config-references, webworker-preview-profile-parity, built-in-plugin-feature-previews, config-schema-dump-validation-policy, plugin-market-discover, plugin-market-index-format, nontransactional-loader, cordis-cleanup-dependency-lifetimes, pi-extensions-bridge, pi-plugins-compatibility, config-only-hmr, retire-app-bin-boot-helpers

**A9 文件/工作区/Office/文档预览（13）**
bounded-office-conversion, document-preview-operations, independent-libreoffice-kit, progressive-office-skills, workspace-file-binary-transfer, workspace-file-read-authority, workspace-files-service, browser-excel-preview, explicit-worktree-creation, generic-file-upload, present-workspace-source-files, attachment-read-quarantine, defer-office-background-scheduling

**A10 账户/翻译/反馈/日程/浏览器与计算机操作（14）**
account-provider-signout, browser-use-provider-registration, canonical-feedback-log, computer-use-provider-registration, cua-application-consent, cua-continuous-hover, cua-hover-routes-and-coordinates, cua-shared-native-helper, deepseek-account-remote-model-catalog, experimental-voice-input, nonofficial-feedback-otel, persistent-machine-translation, single-file-executable-sdk-runtime-distribution, deepseek-search-fetch-api

**R 被拒绝提案（8）**
typed-event-schemas, builtin-timer-promises-for-hand-rolled-sleeps, dependency-swaps-rejected-by-nih-audit, drop-durable-step-boundaries, fold-compaction-package-split, fold-session-persistence-interface, prune-unused-skill-registry-api, truncate-interrupted-turns


---

## 附录 B：证据、口径与只读合规

### B.1 分类脚本口径

- 分类输入：`## Problem` 首段 + slug + lifecycle/class；脚本 `/tmp/dsh-porting/classify2.py`（本次分析的一次性脚本，不进入仓库）。
- 优先级：rejected → M\*/T\* 的显式 slug 列表 → 产品主题的显式 slug 覆盖表 → 产品主题 regex（先匹配 slug，再匹配 problem 文本）。
- 校验：`collections.Counter(theme)` 总数 343（335 active + 8 rejected）；active 主题合计 335；`UNASSIGNED = 0`。
- 完整 slug 归属见附录 A；如维护者需要可复核的 JSON，可重跑同脚本。

### B.2 关键证据命令与输出摘要

```text
$ find submodules/dsh/.agents/notes/proposed submodules/dsh/.agents/notes/implemented \
    -name '*.md' ! -name '*.zh.md' | wc -l
337                     # 原始计数（含 implemented/AGENTS.md 与 CLAUDE.md symlink）

$ python3 /tmp/dsh-porting/stats3.py
triplets: 1267   incomplete: 0
proposed    {'md': 42, 'zh.md': 42, 'i18n.yaml': 42}
implemented {'md': 293, 'zh.md': 293, 'i18n.yaml': 293}
rejected    {'md': 8, 'zh.md': 8, 'i18n.yaml': 8}
archived    {'md': 924, 'zh.md': 924, 'i18n.yaml': 924}
manifest: version 1, files 2772 (= 924 triplets)
dates: proposed 2026-06-11..2026-10-09
       implemented 2026-06-11..2026-10-15
       rejected 2026-06-16..2026-07-26
       archived 2026-06-11..2026-09-28

$ git -C submodules/dsh ls-tree -r --name-only dsh-v0.2.1-rc.2 -- .agents/notes/archived | ...
archived notes per class: architecture 185, bug-fix 182, feature 306, process 120,
                          simplification 92, testing 39  (共 924)

$ git -C submodules/dsh diff --name-status -M dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 -- .agents/notes
282 tags implemented→archived；+1 new archived（public-web-deployments）
implemented 删除 24、rejected 删除 6、proposed 删除 2；新增 implemented 74、proposed 5；active 修改 171

$ 0.2.0 manifest vs 0.2.1 manifest
manifest 0.2.0: 1923 files；0.2.1: 2772 files；common 1923，common changed 0；
removed keys 0；added keys 849（= 283 三元组）

$ git -C submodules/dsh diff dsh-v0.2.0-rc.2 dsh-v0.2.1-rc.2 --stat -- <契约文件>
.agents/notes/README.md         | 4 ++--
.agents/notes/README.zh.md      | 4 ++--
.agents/notes/README.i18n.yaml  | 8 ++++----
docs/AGENTS.md                  | 13 +++++++------
（三个子树 AGENTS.md、.rgignore、门禁脚本、archive skill、translate-docs skill：无变化）
docs/i18n/README.md             | 1 行（链接改指 archived）
```

### B.3 提取版本（本包）的对照证据

```text
$ diff -u submodules/dsh/.agents/notes/README.md .agents/dsh-spec/notes/README.md
- 生命周期 4 行缩进列表 → 本包压成 1 行（第 11 行）
- 交叉引用示例：上游 markdown 链接 → 本包反引号路径（第 14 行）
- 分类 canonical set：上游 “scripts/agent-note-tree.ts + 本节” → 本包只有本节（第 20 行）
- 归档工作流：上游 dsh-archive-agent-notes → 本包 “Judge the call against the criteria”（第 35 行）
- 归档门禁/文档门禁跳过 archived：本包缺失（第 39 行只剩 manifest/.rgignore）
- 格式门禁与 uniform-format 理由链接：本包缺失（第 55 行）
- “same PR” → “same change”（第 43 行）
- 本包独有：会话达成决定段（第 45 行）、Quoted text and secrets 节（第 112–116 行）
- 中文对侧：上游 i18n 契约/配对门禁指引 → 本包缺失（第 124 行）
- README.i18n.yaml：上游 14 个 section → 本包 15 个（+quoted-text-and-secrets），哈希已重录
```

### B.4 只读合规

- 未修改 `submodules/dsh/` 任何文件；未在其中执行 `git add/commit/checkout/stash`；仅使用只读命令（`git show`、`git diff`、`git ls-tree`、`git log`）。
- 未修改本仓库任何文件；唯一写出的文件是 `/tmp/dsh-porting/notes.md`（本档案）及其分析脚本/中间产物（均在本目录 `submodules/dsh` 之外）。

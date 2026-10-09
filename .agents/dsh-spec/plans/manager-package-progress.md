# 工作副本：manager 技能包与引擎一次重整

本文件是 `manager-package.md` 的工作副本，按契约记录这次交付**实际**发生的顺序、失败的尝试、变更过的判据及其原因，并以这次交付得出的结论收尾。

## 起点

- 分支 `refactor/manager-package`，PR [#67](https://github.com/sunandsunshine-tech/dsh-spec/pull/67)（draft，base `feat/optional-skills`）。开工时 sha：`13ac29b`（本计划本身；它已坐在 C 层最终修订 `80ed1b7` 之上）。
- 交付 worktree：`/home/dreamstar/ideaProjects/dsh-spec-wt/D`（仓库根之外）；子模块按根 `AGENTS.md` 的链式 worktree 配方挂在 `<worktree>/submodules/dsh`。
- 起点基线：`node --test 'tests/**/*.test.ts'` 172 pass / 0 fail；`verify-installed-copy` 10 skill(s) equal；`verify-port-provenance` 16 ported file(s) @ 639ed015。

## 偏离与判据变更

1. **门的读法**。计划 `## Constraints` 说前置命令"判据是 main 上的事实"。本次按用户指令改为 **stack 的读法**：门在 **D 自己的 worktree** 里跑，该 worktree 已坐在 C 之上，C 完成后即通过；不轮询，不过就报阻塞并停。
2. **D-0 的产出写到哪里**。计划卡片表把 D-0 的产出写成"写进本计划"，而用户指令是"计划本身写一次不再改"。取用户指令：D-0 的最终文件清单与职责边界写进**本工作副本**（以及 D-0 卡片），计划文件不动。
3. **D-0 的"设计经用户审核"**。计划 Design 说"拆分只做搬 + 改 import + 提纯函数，不改一行逻辑。D-0 的产出交用户审后再动"，而用户今晚要三层都到"可审查"，且计划自己的 Design 表标着"D-0 定稿，这是起点"。处理：D-0 按该表定稿并把结论记进本文件，不另等一轮用户审批；**"布局是否照此定稿"作为一个未决项写进 PR 的 `## Reviewer notes`**，用户醒来可改。
4. **收尾范围**。只做到"可审查"：刷新安装副本、全量门禁、PR 去 WIP 转 ready、四节描述；计划与工作副本、note 收口留待授权。

## 门的执行结果（开工第一步，D 自己的 worktree）

```
$ grep -q '"optional"' skills/dsh-spec-manager/references/manifest.json \
  && grep -q 'optional not installed' skills/dsh-spec-manager/scripts/manager.ts && echo "GATE PASS"
GATE PASS
```

## 实际顺序

（按发生顺序追加。）

1. 从 C 之上建 worktree（根之外），挂子模块 worktree，跑门（上方输出）。
2. D-0 定稿：最终模块清单与职责边界（见下方「D-0 定稿」一节，含行段施工图、七批顺序与移动边界复核）。
3. D-1（包与表述）与 D-2（引擎重排）按 D-0 并行 → D-3 评审 → D-4 文本终检 → D-5 刷新副本 + 全量门禁 + PR。

## D-0 定稿：引擎最终文件清单与职责边界（worker-1，2026-10-10）

本节是 D-2 的施工图。**计划文件未改**——用户指令"计划写一次不再改"；产出按偏离 #2 落在本工作副本，并抄一份要点进 D-0 卡片。行段均为**定稿当日**的行号（`manager.ts` 1216、`help.ts` 862、`dsh-spec.ts` 744、`init-agents-md.ts` 887 行）。

### 1. 移动边界（不可越，已逐条核对）

- **原地不动**（六个共享小模块，逐字不改）：`notes-root.ts`(50)、`repo-root.ts`(21)、`i18n-scope.ts`(177)、`gate-scope.ts`(239)、`md-scope.ts`(71)、`excluded-region.ts`(57)。
- **`scripts/ports.json` 与它的 16 个移植文件不在移动清单内**（`ports.json` 的 `ports[].local` 是权威，已逐个核对）：`agent-note-tree.ts`、`archived-agent-notes.ts`、`change-scope.ts`、`gen-translation-brief.ts`、`markdown.ts`、`repo-files.ts`、`translation-brief.ts`、`translation-links.ts`、`translation-pairing-git.ts`、`translation-pairing-record.ts`、`translation-pairing.ts`、`verify-agent-note-classification.ts`、`verify-agent-note-format.ts`、`verify-archived-agent-notes.ts`、`verify-md-links.ts`、`verify-translation-pairing.ts`。
- 事实复核：`grep -rn "from '\./manager.ts'\|from '\./help.ts'\|from '\./init-agents-md.ts'\|from '\./dsh-spec.ts'"` 在 `scripts/` 内只命中三处（`dsh-spec.ts`→`help.ts`、`dsh-spec.ts`→`manager.ts`、`init-agents-md.ts`→`manager.ts`）；**16 个移植文件无一 import 这四个文件**，所以拆它们对移植面零改动。
- 验收口径：`git diff --name-only` ∩ 上述 16 条 = ∅；`node scripts/verify-port-provenance.ts` 仍是 16 ports。

### 2. 最终文件清单与职责边界

| 文件 | 职责边界 | 来源 |
|---|---|---|
| `cli-args.ts`（新，顶层） | flag 与 argv 的唯一一份：`flagValue`/`hasFlag`/`flagValues`/`subcommand`/`projectRoot`/`skillsDirectory`/`extractValue`；两个退出约定 `fail`(1) 与 `refuse`(2) | `manager.ts:70-138`、`init-agents-md.ts:62-70`、`dsh-spec.ts:83-88,245-262` |
| `plan-surface.ts`（新，顶层） | 计划面事实：`PLAN_SURFACE_SKILL`/`PLANS_DIR`/`PLANS_SECTION_START`/`PLANS_SECTION_END` | `manager.ts:53-58` |
| `manifest.ts`（既存，扩） | 门禁名与作用域记录（不动）**＋ 技能清单的读取**：`Manifest`/`ManifestReading`/`SKILL_NAME`/`readManifestRecord`/`requiredSkills`/`readManifest`（exit 1 的包装） | `manager.ts:44,61-69,139-238` |
| `help/catalog.ts`（新） | **单一命令表**：`HelpLanguage`/`Wording`/`CommandHelp`/`COMMAND_HELP`/`FLAGS`/`LABELS`；由表派生 `MANAGEMENT`/`NOUN_VERBS`/`COMMANDS` | `help.ts:25-627`、`dsh-spec.ts:54-68` |
| `help/render.ts`（新） | 中英投影与三种投影形态：`helpLanguage`/`globalHelp`/`subjectHelp`/`markdownHelp` 及其表格助手 | `help.ts:628-863` |
| `manager.ts`（入口，瘦身） | argv→动词分发 `manage()`、`invokedDirectly` 守卫、`scriptDir`/`initializerPath` 等入口常量；不再持有业务实现 | `manager.ts:37-42,1192-1217` |
| `manager/process.ts`（新） | 子进程执行与并发池：`run`/`ChildResult`/`runCaptured`/`runAll` | `manager.ts:264-341` |
| `manager/plan-refresh.ts`（新） | revision 索引与分类、计划与打印、prune、已下线清理、`refresh` 编排 | `manager.ts:342-530,666-856` |
| `manager/install.ts`（新） | `installProject` 与可选技能询问面：`Asker`/`interactiveAsker`/`skillDescription`/`chooseOptional` | `manager.ts:537-665,857-892` |
| `manager/upgrade.ts`（新） | `upgradeProject`、`resolveTargetRef`、`selectedSkills`、`initializerArgs`、`jobWidth` | `manager.ts:240-263,531-536,893-945,1177-1191` |
| `manager/status.ts`（新） | 注入元数据读取、仓库名归一、revision 读取、`status`/`statusProject` | `manager.ts:946-1034` |
| `manager/uninstall.ts`（新） | `uninstall`/`uninstallProject` | `manager.ts:1125-1176` |
| `init-agents-md.ts`（入口，瘦身） | 顶层状态（root/write/syncMode/skillsDir/层目录/dispatcher）、门禁记录核对、inventory→write→report 三段与收尾提示 | `init-agents-md.ts:62-87,242-264,667-888` |
| `init/templates.ts`（新） | 指令文件扫描（`findInstructions`/`trackedOrUntrackedFiles`/skip 集）、模板发现、三段计划树、占位替换 | `init-agents-md.ts:37-173,265-350,399-403` |
| `init/sections.ts`（新） | 钩子文本与清单：`notesSection`/`plansSection`/`SectionHook`/`planSurfaceInstalled`/`sectionHooks` 与 notes 标记 | `init-agents-md.ts:59-61,174-241` |
| `init/merge.ts`（新） | 三种合并与助手：`Merge`/`ManagedFile`/`managedFiles`/`tableRows`/`withSwitcher`/`mergeManaged`/`mergeSections`/`closeSeam` | `init-agents-md.ts:351-491` |
| `init/sync.ts`（新） | `DIFF_LINE_LIMIT`/`unifiedDiff`/`syncManagedFiles`/`recordPair` | `init-agents-md.ts:492-668` |
| `dsh-spec.ts`（入口，瘦身） | argv 与 root、门禁记录核对、逐个 subject 的分派与 `main()` | 原文件其余部分 |
| `dispatch/scope.ts`（新） | 范围解析与物化：`SubjectScope`/`scopeOf`/`oneScope`/`materialize`/`scopeForFiles` | `dsh-spec.ts:273-336` |
| `dispatch/pool.ts`（新） | `Job`/`JobResult`、`runJobs`/`runJob`、`--jobs` 校验 `dispatchWidth` | `dsh-spec.ts:69-82,164-192,227-244` |
| `dispatch/report.ts`（新） | 一行一结果的打印与收尾：`reportLine`/`finish` | `dsh-spec.ts:193-226` |

其余 `scripts/` 文件原地不动：`manifest.ts` 的既有部分、`norms.ts`、`norms-apply.ts`、`agent-note-tree.ts`、`repo-files.ts`、`change-scope.ts`、`markdown.ts`、`translation-*`、`verify-*`、`vendor-mdast*.d.ts`，以及第 1 节那六个共享模块与 16 个移植文件。

### 3. 各新模块吸收的符号（施工图，含现所在行段）

- **cli-args.ts** ← `manager.ts`：`fail`(70-75)、`refuse`(76-81)、`flagValue`(82-89)、`hasFlag`(90-94)、`flagValues`(95-106)、`subcommand`(107-120)、`projectRoot`(121-133)、`skillsDirectory`(134-138)；`init-agents-md.ts`：`flagValue`(62-66)、`hasFlag`(67-70)；`dsh-spec.ts`：`fail`(83-88)、`extractValue`(245-262)。（`usage`(89-103)、`hint`(104-116)、`invocationPath`(117-151) 留在入口，见 §5.5。）
- **plan-surface.ts** ← `manager.ts:53-58`。
- **manifest.ts（扩）** ← `manager.ts`：`NAME`(44)、`Manifest`(61-69)、`ManifestReading`(139-155)、`readManifestRecord`(156-209)、`requiredSkills`(210-223)、`readManifest`(224-239)。
- **help/catalog.ts** ← `help.ts`：`HelpLanguage`(25-27)、`Wording`(28-35)、`CommandHelp`(36-50)、`COMMAND_HELP`(51-550)、`FLAGS`(551-566)、`LABELS`(567-627)；`dsh-spec.ts`：`MANAGEMENT`(54-56)、`NOUN_VERBS`(57-65)、`COMMANDS`(66-68)。
- **help/render.ts** ← `help.ts`：`helpLanguage`(628-642)、`table`(643-652)、`entryOf`(653-657)、`topLevel`(658-662)、`verbsOf`(663-667)、`nounOf`(668-672)、`longName`(673-677)、`flagLines`(678-685)、`groupLines`(686-695)、`scopeSuffix`(696-705)、`globalHelp`(706-739)、`subjectHelp`(740-785)、`markdownHelp`(786-863)。
- **manager/process.ts** ← `run`(264-275)、`ChildResult`(276-283)、`runCaptured`(284-307)、`runAll`(308-341)。
- **manager/plan-refresh.ts** ← `RevisionIndex`(342-362)、`readRevisionIndex`(363-396)、`shortRef`(397-401)、`blobSha`(402-412)、`RefDelta`(413-418)、`SkillDelta`(419-430)、`SkillReading`(431-451)、`classifySkill`(452-508)、`Plan`(509-530)、`planRefresh`(666-688)、`printPlan`(689-717)、`pruneToRevision`(718-769)、`retireUnpublished`(770-809)、`refresh`(810-856)。
- **manager/install.ts** ← `Asker`(537-548)、`interactiveAsker`(549-588)、`skillDescription`(589-610)、`chooseOptional`(611-665)、`installProject`(857-892)。
- **manager/upgrade.ts** ← `resolveTargetRef`(240-263)、`selectedSkills`(531-536)、`upgradeProject`(893-945)、`initializerArgs`(1177-1182)、`jobWidth`(1183-1191)。
- **manager/status.ts** ← `injectedMetadata`(946-965)、`managerRef`(966-978)、`installedRevision`(979-1003)、`repositoryName`(1004-1022)、`installedRepo`(1023-1030)、`statusProject`(1031-1034)、`status`(1035-1124)。
- **manager/uninstall.ts** ← `uninstallProject`(1125-1135)、`uninstall`(1136-1176)。
- **init/templates.ts** ← `SKIP_DIRECTORIES`(37-43)、`INSTRUCTION_NAMES`(44-46)、`MAX_DEPTH`(47-49)、`LIFECYCLES`(50-52)、`CLASSES`(53-55)、`ARCHIVE_CLASSES`(56-58)、`findTemplate`(88-95)、`FoundInstruction`(96-108)、`DEPENDENCY_MANIFESTS`(109-109)、`DEPENDENCY_LOCKFILES`(110-112)、`skippedTrees`(113-115)、`trackedOrUntrackedFiles`(116-123)、`findInstructions`(139-173)、`present`(265-271)、`PlannedFile`(272-280)、`planNotesTree`(281-319)、`planPlansTree`(320-335)、`planDocsTree`(336-350)、`substitute`(399-403)。
- **init/sections.ts** ← `NOTES_SECTION_START`(59-59)、`NOTES_SECTION_END`(60-61)、`notesSection`(174-186)、`plansSection`(187-203)、`SectionHook`(204-222)、`planSurfaceInstalled`(223-227)、`sectionHooks`(228-241)。
- **init/merge.ts** ← `Merge`(351-353)、`ManagedFile`(354-370)、`managedFiles`(371-398)、`tableRows`(404-421)、`withSwitcher`(422-438)、`mergeManaged`(439-462)、`mergeSections`(463-482)、`closeSeam`(483-491)。
- **init/sync.ts** ← `DIFF_LINE_LIMIT`(492-506)、`unifiedDiff`(507-542)、`syncManagedFiles`(543-658)、`recordPair`(659-668)。
- **dispatch/scope.ts** ← `SubjectScope`(273-284)、`scopeOf`(285-291)、`oneScope`(292-301)、`materialize`(302-317)、`scopeForFiles`(318-336)。
- **dispatch/pool.ts** ← `Job`(69-75)、`JobResult`(76-82)、`runJobs`(164-180)、`runJob`(181-192)、`dispatchWidth`(227-244)。
- **dispatch/report.ts** ← `reportLine`(193-202)、`finish`(203-226)。

留在入口的顶层语句块：`dsh-spec.ts` 的 `scriptDir`/`root`/`argv`/`command`/`withoutRoot`/`jobsFlag`/`width`/`args`(46-53,152-163,263-272)、`reconcile`/`scopeReading`/`scopes`/`recordOf`(337-369)、六个门禁名与 `notesJobs`(370-385)、`main`(386-745)；`init-agents-md.ts` 的 `root`/`write`/`syncMode`/`skillRoot`(71-87)、`reading`/`gates`(242-258)、`skillsDirectory`→`dispatcher`(259-264)、inventory 段(667-760)、write 段(761-857)、report 段(858-888)；`manager.ts` 的 `scriptDir`/`manifestPath`/`dispatcherPath`/`initializerPath`(37-42)、`manage`(1192-1214)、`invokedDirectly`(1215-1217)。

### 4. 分批顺序（每批自成一个可构建、测试通过的提交）

| 批 | 内容 | 该批结束时必须 |
|---|---|---|
| B1 | `cli-args.ts` 抽出；四个入口改用它（manager 的 flag/exit、dispatcher 的 `extractValue` 与 `fail`、init 的 flag） | `node --test 'tests/**/*.test.ts'` 172/172；`verify-port-provenance` 16 |
| B2 | `plan-surface.ts` 抽出；`manager.ts` 与 `init-agents-md.ts` 改为 import | 同上 |
| B3 | `manifest.ts` 吸收技能清单读取（纯读 + exit 包装）；`tests/manifest.test.ts:17` 改 import | 同上 |
| B4 | `help/catalog.ts` + `help/render.ts`；`dsh-spec.ts` 由 catalog 派生 `MANAGEMENT`/`NOUN_VERBS`/`COMMANDS` | 同上，且 `--help` en/zh 与 `--help --markdown` **逐字不变** |
| B5 | `init/` 四模块（templates/sections/merge/sync）；入口只留状态、核对、inventory/write/report | 同上 |
| B6 | `manager/` 六模块（process/plan-refresh/status/uninstall/install/upgrade）；入口只留分发与守卫；`tests/management.test.ts` 的 TTY 探针改 import | 同上 |
| B7 | `dispatch/` 三模块（scope/pool/report）；入口留核对与 `main` | 同上，并跑一次 Design 的七条命令逐字比对 |

每批都跑：`node --test 'tests/**/*.test.ts'`、`node scripts/verify-port-provenance.ts`、`git diff --name-only` 与 16 条移植名单求交集（必须为空）。B4 与 B7 额外做逐字比对（B4 的命令表去重是本层唯一"形变了"的地方，必须由输出证明行为不变）。

### 5. 对 Design 表的细化与偏差（D-2 按此施工）

1. **新增 `plan-surface.ts`**（表未列）：init 与 manager 都要这四个常量。今天 init 是从 `manager.ts`（**入口**）import 的；拆开后若继续 import 入口，init 会把 install/upgrade/CLI 全拖进来，且形成 init→manager 的反向依赖。单列顶层叶子模块解决。
2. **新增 `init/sections.ts`**（表只写 `merge`）：钩子文本生成与"计划面是否装着"的判定（读 skills 目录）与三个合并算法是两件事，单列一节；`merge` 保持纯文本合并。
3. **新增 `manager/process.ts`**（表未列）：`run`/`runCaptured`/`runAll` 被 install、upgrade、plan-refresh 共用。
4. **`help/` 用两个显式文件而非目录桶**：ESM 需要显式路径，不引入 `index.ts` 桶；`dsh-spec.ts` 分别 import `help/catalog.ts` 与 `help/render.ts`。
5. **dispatcher 的 `usage()` 留在入口**：它打印整个命令面后 exit 2，文本与命令表强相关但属于入口的拒绝面；用 `cli-args.ts` 的 `refuse` 实现同一条退出路径，**文本一字不改**。`hint`/`invocationPath` 同理留在入口。
6. **模块级状态变参数**：init 的 `root`/`write`/`syncMode`/`skillsDirectory`/`layerDirectory`/`dispatcher` 与 dispatcher 的 `command`/`args`/`width`/`root` 现在是顶层常量；拆开后由入口算好传参（这就是"提纯函数"的具体形状，逻辑不变）。
7. **`cli.md` 不拆**（计划已定，D-0 结论一致）：规范只对 `SKILL.md` 设 500 行上限，`cli.md` 是 `--help --markdown` 的同一份文本，拆它必然改渲染器。
8. **`norms.ts`/`norms-apply.ts`/`manifest.ts` 的既有部分不搬**：它们在顶层已经是一职责一文件；`manifest.ts` 只按 §2 扩写。
9. **测试改 import 两处**（写域允许）：`tests/manifest.test.ts:17`、`tests/management.test.ts` 的 `ttyInstall()` 探针（动态 import `manager.ts` 的 `installProject`）。
10. **不做**：不改移植文件、不改其他技能、不新增门禁、不改 `submodules/dsh/`、不手改 `.agents/skills/`、不改计划文件。

### 6. 行为不变的证据口径（D-2 采集、D-3 复跑）

改动前（D-2 开工时）与改动后各跑一遍，**输出逐字比对、含退出码**：

```
status · install --dry-run · upgrade --dry-run · --help --markdown（en/zh）· check --all · notes check --all · norms list
```

外加：`node --test 'tests/**/*.test.ts'`、`node scripts/verify-port-provenance.ts`、`node scripts/verify-installed-copy.ts`、`node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts check --all --root .`、`git diff --name-only` 与 16 条移植名单交集为空。

## 结论

（待交付收尾时填写。）

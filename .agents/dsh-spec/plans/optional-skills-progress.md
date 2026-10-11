# 工作副本：必装与可选技能、归属判定

本文件是 `optional-skills.md` 的工作副本，按契约记录这次交付**实际**发生的顺序、失败的尝试、变更过的判据及其原因，并以这次交付得出的结论收尾。

## 起点

- 分支 `feat/optional-skills`，PR [#66](https://github.com/sunandsunshine-tech/dsh-spec/pull/66)（draft，base `main`）。B（#65）合并进 main（`1cbcf84`）后，本层提交重放到 main 之上；重放把两层各自的 `mergeSections` 合一、把 `install` 的选取改成 Q7 = B，并补/改文本，重放前的 sha 一并作废。重放并整理之后，这条 first-parent 线上依次是：`044e7e1`（计划与判据）、`38a6b6f`（必装/可选与归属判定）、`6eb8cc8`（安装副本带到 C 的修订）、`d167170`（归属比较的归一修复，副本同行）、`f1204b3`（文本终检）、`02e1e5c`（副本带到本修订）、`c761aa8`（install 与 upgrade 共用选取规则）、`c794e72`（副本刷新）。
- 原交付 worktree：`/home/dreamstar/ideaProjects/dsh-spec-wt/C`（仓库根之外）；子模块按根 `AGENTS.md` 的链式 worktree 配方挂在 `<worktree>/submodules/dsh`。重基线在仓库主工作树 `/home/dreamstar/ideaProjects/dsh-spec` 里做（子模块就地可用，不必再挂）。
- 起点基线：`node --test 'tests/**/*.test.ts'` 151 pass / 0 fail；`verify-installed-copy` 10 skill(s) equal。

## 偏离与判据变更

1. **门的读法**。计划 `## Constraints` 说前置命令"判据是 main 上的事实"。本次按用户指令改为 **stack 的读法**：门在 **C 自己的 worktree** 里跑，该 worktree 已坐在 B 之上，B 完成后即通过；不轮询，失败即报阻塞并停。
2. **note 的目录与类别**。Design 写两条 note 的 slug，第一条注明 class `process`，第二条注明 class `feature`，但两条的路径都写成 `<notes>/proposed/process/`。类别决定目录（分类门禁按封闭类别集校验），因此按类别落：第一条 `proposed/process/`，第二条 `proposed/feature/`。
3. **note 生命周期**。计划写"随本交付转 `implemented/`"；用户指令把合并前整理的收口留到其授权之后，因此本层只创建 `proposed/` 三件套，不转状态。
4. **收尾范围**。只做到"可审查"：刷新安装副本、全量门禁、PR 去 WIP 转评审、四节描述；计划与工作副本、note 收口留待授权。

## 门的执行结果（开工第一步，C 自己的 worktree）

```
$ test -f skills/dsh-spec-manager/templates/plans-README.md.template \
  && test -f skills/dsh-spec-manager/templates/plans-AGENTS.md.template \
  && grep -q 'dsh-spec:plans' AGENTS.md && echo "GATE PASS"
GATE PASS
```

## 实际顺序

（按发生顺序追加。）

写在重放或折叠之前的 sha 已随它作废：它们指名的是当时真正做那件事的修订，重放或折叠之后不再出现在任何已推送的 ref 上（至多留在本地的 `backup/*`），因此打不开是预期，不是记录写错。

1. 从 B 之上建 worktree（根之外），挂子模块 worktree。
2. 跑门（上方输出 GATE PASS），创建本工作副本，按卡片表建卡 task-9..task-17，三层角色沿用 B 的 worker-1 / worker-2 / reviewer-1 / texter-1。
3. C-1 完成：`manifest.json` 加 `optional`；`readManifestRecord`（导出、纯读取、四类非法具名拒绝）、`requiredSkills`（`skills \ optional` 的唯一派生点）、`tests/manifest.test.ts` 4 用例；全量 155 中 154 pass（唯一红＝副本门禁）。
4. C-2 完成：`status` 归属三分类与可选取舍行、`selectedSkills()`（存在即跟随，Objective 4）、`retireUnpublished()`、`uninstall` 的默认/`--skill`；Q5 授权扩到 `dsh-spec.ts` 的 flag 表；管理面全绿，全量套件除副本门禁外全绿（实测数字见「结论」）。
5. C-3 完成：非 TTY 具名提示、TTY 询问（默认否）、`--with`（可重复 + 三类具名拒绝）、`--dry-run` 不读 stdin、SKILL.md 代理面句、`dsh-spec.ts` 的 `--with`；Q6 按从 revision 读描述首句（失败回退名字）、Q7 按字面 (A) 实现并 park 给用户；管理面 38/38，全量 165 中 164 pass。
6. C-4 完成：计划面条件化——事实所有者是 `manager.ts`（`PLAN_SURFACE_SKILL` / `PLANS_DIR` / 标记常量），init import 它们；`SectionHook.active()` 且对"不活跃但存在"的块执行删除；`planPlansTree()` 在装面时给三件；`status` 报半装的面；`uninstall --skill` 删技能后跑 sync 半程移除钩子、保留树与计划。六条场景各一用例；B 侧 6 条用例改名/重写并按报告点名；`manager-install.md` 四行改写。管理面 43/43，全量 170 中 169 pass（唯一红＝副本门禁）。
7. C-5（文档与 README）、C-6（两条新 note + 更新被 C 取代的 B note 判据）、C-6b（刷新三条被 C 写旧的 implemented 记录）完成。C-4 与 C-6 共同构成跨层差异：**C 的 Design 让"选中可选技能时采用落三件 + 配对记录"，取代 B 的两件**；B 侧受影响用例与被取代的 note 判据都在报告里点名并已更新。
8. Lead 提交 `f5c3449`，`gh stack sync` 推 C（先把 B 的 worktree 退掉，因为 sync 要 checkout 它），`upgrade --revision feat/optional-skills` 刷新副本，提交 `5a88231` 再推；此后 `node --test` 170/170、副本、出处、`check --all`、corpus md-links 158 文件、corpus pairing、`check --base main` 全绿。
9. C-7 评审（reviewer-1，`5a88231`）：**REJECT**，一条阻断——归属比较把注入值与 `manifest.repo` 直接等值比较，而安装器写的是 URL，于是"本集合已下线"这一类不可达、`upgrade` 永不清理；测试绿只因 fixture 注入了安装器不写的 bare 形式。其余 Objective 1/2/3/4/5/7/8 与全部门禁经评审原样重跑通过。
10. 修复完成：`repositoryName()` 成为唯一归一入口（bare、github URL、尾部 `/`、`.git` 都接受），`installedRepo()` 返回归一后的 `owner/name`，两处比较式不变；fixture 与 `gh` 替身改用安装器真正写的 URL 形状，并保留 URL/bare/尾部矩阵三条用例。Lead 提交 `3f3a99e`、刷新副本提交 `06ea65d` 并推。C-7 第二轮：reviewer-1 **PASS**（五种本集合记录形式都命中 finding 与 `would remove`；别家 URL 与无 metadata 仍是 `other` 行；`#63` 复现 exit 0；上一轮审过的提交仍是祖先）。
11. C-8 文本终检（texter-1）：7 条修正（中文 README 行的强调跨侧、`--only-skill-set` 的过宽陈述、`manager-install.md` 与 uninstall 矛盾的"持有面即在"、`SKILL.md` 的 `--with`-only 陈述、zh help 的"有明确答案"、feature note 三处直译、implemented note 的 comma splice），全部文本；另有 `tests/management.test.ts:600` 的块注释补一句由 Lead 一并修。Q7/Q8 的措辞按指示未动。
12. C-9：刷新安装副本、全量门禁、PR #66 转评审。
13. C-10 重基线：B（#65）合并进 main（`1cbcf84`）后，把本层七个提交重放到 main 之上。`mergeSections` 合一（归拢 + "面不在则移除"，接缝一个空行），交错块与接缝各有一条用例；`manager-install.md` 的行改成条件化措辞；计划笔记在新 main 上落到 `implemented/`，链接随之改指 `../../implemented/process/`；两个配对记录在其文本真正改变的那个提交上重录。逐里程碑（7 个）`check --all`/corpus md-links/corpus pairing 全绿，唯一红＝副本门禁。
14. C-12：维护者裁定 Q7 = B 与 Q8 的消解落地——`selectedSkills()` 增加 `chosen`，`install` 与 `upgrade` 共用同一条派生规则；只对尚未在盘上的可选提问；报告为已装可选加 `updated` 行。新增三条用例，文本同步（`manager-install.md`、`SKILL.md`、`help.ts` 与其重渲染的 `cli.md`）。

## Park 与裁决

C-2 实施时 worker-1 park 了四项；按下述处理，并由 Lead 记入 PR 的 `## Reviewer notes`：

1. **Q1 `upgrade` 永不询问那半归哪张卡**。Objective 4 没被任何卡片显式认领，而卡片表把 `upgrade` 放在 C-2 的"只读路径"。判定在 C-2 做：安装集 = 必装 ∪ 目录里**已存在**的可选，缺失的可选不动；选择派生一次，C-3 的 `install` 复用同一份。理由：留到 C-3 会让 C-2 完成时的中间状态不满足 Objective 4，而评审是逐条核的。
2. **Q2 `status`/`upgrade` 的措辞**。采用 worker-1 草稿（别家/无 metadata 的信息行、本集合已下线的 finding、未安装可选的 absent 行、upgrade 具名清理）。措辞属撰写。
3. **Q3 `uninstall --skill <name>` 名字不在 manifest**。按 `refuse()`（退出 2）处理：不在 manifest 的名字是调用错误，与现有用法拒绝约定一致；"别家目录永不触碰"因此由构造保证，而不是靠静默跳过。
4. **Q4 `uninstall` 默认对未安装的可选**。与必装同形打印 `absent:`，让"未安装"与"未被点名"在报告里可区分。

5. **Q5 落装面的枚举面又缺一处：`dsh-spec.ts` 的 flag 表**。计划 Objective 5 要 `uninstall --skill <name>`，`manager.ts` 实现后入口点仍把它当 "uninstall does not take --skill" 拒绝（退出 2）。与 B 的 P5 同类（封闭集合增员，每一处列举它的地方一起移动），授权 worker-1 在 C-2 一并改：flag 表新增 `--skill`（只 uninstall 接受，重复给值 refuse(2)），C-3 再在同一张表加 `--with`。write_scopes 已同步 `skills/dsh-spec-manager/scripts/dsh-spec.ts`。
6. **Q6 询问里的"描述首句"从哪来**。计划要求 TTY 询问显示"名字 + 描述首句"，而可选技能此刻尚未安装、本地无 `SKILL.md`；manifest 里放描述会制造第二事实来源（违反 `owner.ssot`）。判定：按 (A) 从 revision 读（`gh api repos/<repo>/contents/skills/<name>/SKILL.md?ref=<ref>` → base64 → frontmatter `description` 首句），读不到就只显示名字。install/upgrade 与 `--dry-run` 本就要联网解析 revision，故不新增性质；测试用 `gh` 替身保持离线。
7. **Q7（维护者裁定 = B）`install` 遇到已装着的可选取什么行为**。项目持有的集合＝必装 ∪ **盘上已有的可选** ∪ 本轮选中的，与 `upgrade` 共用 `selectedSkills()` 这一条派生规则；**只对尚未在盘上的可选提问**，因为问一个已经在盘上的改变不了结果。原按计划字面实现的 (A)（selection = 必装 ∪ 本轮选中的）作废，它留下的"必装已更新、已装可选原地不动"的混合修订随之消失。

8. **Q8（随 Q7 消解，不再是未决项）非 TTY `install` 对"已在盘上的可选"的措辞**。已装可选属于被选中并被带到当前修订，报告为它加一行 `updated: <name> — already held, so it is brought to <ref>`（`--dry-run` 作 `would update: <name> — already held, so it would be brought to <ref>`）；`optional not installed: <name> — pass --with <name> to add it` 只对真的不在盘上、本轮又没选的说，那句话因此永远为真。先前的候选措辞（`not selected this run`）不再需要。

## 验收轮（2026-10-12）

维护者验收这一层时另起一轮：先把本层的追加提交折叠成自洽里程碑（本层头因此从 `1ed0151` 变成折叠后的 `7c0fca5`——`1ed0151` 从任何已推送的 ref 上都拿不到），再逐张卡收口。这一轮不另写计划，追加的判据记在 `optional-skills.md` 的「验收轮追加」一节。

已落地：

- **`uninstall --skill` 的边界**：只接受集合 manifest 声明的可选技能；必选技能与集合外的名字各自具名拒绝——前者是"集合本身，单删会留下下一次 install 必须修的项目"，后者是调用错误、"别家目录永不触碰"。该动词的 help、重渲染的 `cli.md` 与 `manager-install.md` 同步。
- **README 的安装引导**：一份程序、两扇门。安装顺序的家在 `skills/dsh-spec-manager/references/manager-install.md`（新增 `The install, in order`），根 README 只说人开的那扇门与 agent 是代理人并指回该文件；可选技能改说"这一类"——manifest 声明哪些可选、`install` 只对盘上没有的发问、装哪些由采用者定——不再点名具体技能。
- **两整理分家与推进时序**：两个整理（验收前、合并前）各自拥有自己的时点，推进动作（转评审、合并、发布）各自授权；规则落进规范 `pr.lifecycle` 与生命周期笔记那一对。
- **完整交付物的定义**：凡动 `skills/` 的改动，交付的那个提交自身即完整状态——副本本地离线重建、注入的 `github-tree-sha` 按作者树重算，不留"内容提交 + 刷新提交"两段，也不出现跳过关键词。
- **折叠句的搬家**：`skills/dsh-agent-team-workflow/SKILL.md` 的 tidy 一节不再握着分支折叠的机制句，只留指向——那几句归规范 `pr.lifecycle` 所有，该节现在自己说 "this skill does not restate it"。
- **规范 body 的重排**：`pr.lifecycle` 与 `prose.voice` 的正文改成 md 结构、破折号统一，红线不动。规模是量过的：渲染出的 `.agents/dsh-spec/norms/norms.md` 118 行，仍在 200 行预算之内——预算写在 `.agents/dsh-spec/notes/implemented/process/2026-09-22-a-project-applies-the-norms-it-chooses.md`，因此不按分组拆文件、`norms/` 不扩张。

待办（合并前整理，需授权）：

- 删本计划与工作副本；把两条新 note 从 `proposed/` 转 `implemented/`；并折叠届时仍存在的"内容 + 副本刷新"对。

本轮裁决：

1. **`uninstall --skill` 只能卸载可选技能**。必选是集合本身，单独删掉会留下下一次 install 必须修的项目；集合外的名字沿用原拒绝。两种拒绝必须用不同的话说清理由，而不是合成一句"不是你人"。
2. **README 只有一份程序**。顺序归 `manager-install.md` 所有，README 是人开的那扇门；agent 是代理人、走同一份顺序，所以没有第二份说明可以漂移（`owner.ssot`）。同一处的归属说法、README 的步骤只写"做什么、什么时候需要"、机制句留在 owner。
3. **推进顺序**：验收 → 转评审 → 合并 → 发布；每一次推进动作各自授权，规范与授权笔记拥有规则，README 不复述。
4. **完整交付物（任务中性）**：凡动 `skills/` 的改动，交付的那一个提交自身就通过副本门禁——副本在本地离线生成、注入的 `github-tree-sha` 按作者树重算；不留"内容提交 + 刷新提交"两段，也不出现跳过关键词。
5. **格式先于测量**（规范 body）。

## 结论

一轮收口之后，本层头是 `d01a4e2`（`origin/main..HEAD` 十四笔）：卡片 C-1…C-6、C-6b 全部完成，C-7 评审两轮通过（第一轮 REJECT 指出归属比较与真实安装元数据形状不符，修复后第二轮 PASS），C-8 文本终检完成，C-10 重基线完成，C-12 的 Q7 = B / Q8 落地完成；验收轮的卡见上一节。

落地的：`manifest.json` 的 `optional` 与差集派生、校验；`install` 的 TTY/非 TTY/`--with`/`--dry-run` 四场景；`upgrade` 永不询问且只跟随已持有的可选；`status` 的三类归属（本集合在册、本集合已下线、别家/无 metadata）与半装计划面 finding；`uninstall` 的默认与 `--skill`；计划面条件化（选中可选技能才建计划树、双语契约、配对记录与钩子；卸载技能移除钩子、保留树与计划）；入口点 flag 表；文档与 README 双语同步；两条新决策 note 与三条被写旧的 implemented 记录刷新。**跨层**：C 取代了 B 的"采用落两件"为"选中时落三件 + 配对记录"。

真实门禁（`d01a4e2` 实测）：

- `node --test 'tests/**/*.test.ts'` → 196 / pass 196 / fail 0。
- `node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts translation-pair list --root .` → 54 ok, 0 out-of-sync, 0 missing（of 54 in scope）。
- corpus `md-links`（158 个 in-scope `.md`）→ `check md-links: ok`。
- `node scripts/verify-installed-copy.ts` → 10 skill(s) equal their installed copies under .agents/skills，exit 0。
- `node scripts/verify-dco.ts --base=origin/main --head=HEAD` → 14 commit(s) in origin/main..HEAD carry a Signed-off-by，exit 0。
- `norms list` → 12 norm(s) in 5 group(s)。

**留给合并前整理（需用户授权）**：删除本计划与工作副本；把两条新 note 从 `proposed/` 转 `implemented/`。

**未决、已上报用户**：依赖门按 stack 读法在原 worktree 里跑，与计划"main 上的事实"措辞不同。

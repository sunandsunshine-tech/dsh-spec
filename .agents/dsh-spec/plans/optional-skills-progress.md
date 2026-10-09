# 工作副本：必装与可选技能、归属判定

本文件是 `optional-skills.md` 的工作副本，按契约记录这次交付**实际**发生的顺序、失败的尝试、变更过的判据及其原因，并以这次交付得出的结论收尾。

## 起点

- 分支 `feat/optional-skills`，PR [#66](https://github.com/sunandsunshine-tech/dsh-spec/pull/66)（draft，base `feat/plans-surface`）。开工时 sha：`3bc87c9`（本计划本身；它已坐在 B 层最终修订 `acf0f32` 之上）。
- 交付 worktree：`/home/dreamstar/ideaProjects/dsh-spec-wt/C`（仓库根之外）；子模块按根 `AGENTS.md` 的链式 worktree 配方挂在 `<worktree>/submodules/dsh`。
- 起点基线：`node --test 'tests/**/*.test.ts'` 151 pass / 0 fail；`verify-installed-copy` 10 skill(s) equal。

## 偏离与判据变更

1. **门的读法**。计划 `## Constraints` 说前置命令"判据是 main 上的事实"。本次按用户指令改为 **stack 的读法**：门在 **C 自己的 worktree** 里跑，该 worktree 已坐在 B 之上，B 完成后即通过；不轮询，失败即报阻塞并停。
2. **note 的目录与类别**。Design 写两条 note 的 slug，第一条注明 class `process`，第二条注明 class `feature`，但两条的路径都写成 `<notes>/proposed/process/`。类别决定目录（分类门禁按封闭类别集校验），因此按类别落：第一条 `proposed/process/`，第二条 `proposed/feature/`。
3. **note 生命周期**。计划写"随本交付转 `implemented/`"；用户指令把合并准备期的收口留到其授权之后，因此本层只创建 `proposed/` 三件套，不转状态。
4. **收尾范围**。只做到"可审查"：刷新安装副本、全量门禁、PR 去 WIP 转 ready、四节描述；计划与工作副本、note 收口留待授权。

## 门的执行结果（开工第一步，C 自己的 worktree）

```
$ test -f skills/dsh-spec-manager/templates/plans-README.md.template \
  && test -f skills/dsh-spec-manager/templates/plans-AGENTS.md.template \
  && grep -q 'dsh-spec:plans' AGENTS.md && echo "GATE PASS"
GATE PASS
```

## 实际顺序

（按发生顺序追加。）

1. 从 B 之上建 worktree（根之外），挂子模块 worktree。
2. 跑门（上方输出 GATE PASS），创建本工作副本，按卡片表建卡 task-9..task-17，三层角色沿用 B 的 worker-1 / worker-2 / reviewer-1 / texter-1。
3. C-1 完成：`manifest.json` 加 `optional`；`readManifestRecord`（导出、纯读取、四类非法具名拒绝）、`requiredSkills`（`skills \ optional` 的唯一派生点）、`tests/manifest.test.ts` 4 用例；全量 155 中 154 pass（唯一红＝副本门禁）。
4. C-2 完成：`status` 归属三分类与可选取舍行、`selectedSkills()`（存在即跟随，Objective 4）、`retireUnpublished()`、`uninstall` 的默认/`--skill`；Q5 授权扩到 `dsh-spec.ts` 的 flag 表；管理面 33/33，全量 160 中 159 pass。
5. C-3 完成：非 TTY 具名提示、TTY 询问（默认否）、`--with`（可重复 + 三类具名拒绝）、`--dry-run` 不读 stdin、SKILL.md 代理面句、`dsh-spec.ts` 的 `--with`；Q6 按从 revision 读描述首句（失败回退名字）、Q7 按字面 (A) 实现并 park 给用户；管理面 38/38，全量 165 中 164 pass。
6. C-4 完成：计划面条件化——事实所有者是 `manager.ts`（`PLAN_SURFACE_SKILL` / `PLANS_DIR` / 标记常量），init import 它们；`SectionHook.active()` 且对"不活跃但存在"的块执行删除；`planPlansTree()` 在装面时给三件；`status` 报半装的面；`uninstall --skill` 删技能后跑 sync 半程移除钩子、保留树与计划。六条场景各一用例；B 侧 6 条用例改名/重写并按报告点名；`manager-install.md` 四行改写。管理面 43/43，全量 170 中 169 pass（唯一红＝副本门禁）。
7. 进行中：C-5（文档与 README）、C-6（两条新 note + 更新被 C 取代的 B 侧 note 陈述），由 worker-2 按序执行。
8. 待办：C-7 评审 → C-8 文本终检 → C-9 刷新副本 + 全量门禁 + PR 转 ready。

## Park 与裁决

C-2 实施时 worker-1 park 了四项；按下述处理，并由 Lead 记入 PR 的 `## Reviewer notes`：

1. **Q1 `upgrade` 永不询问那半归哪张卡**。Objective 4 没被任何卡片显式认领，而卡片表把 `upgrade` 放在 C-2 的"只读路径"。判定在 C-2 做：安装集 = 必装 ∪ 目录里**已存在**的可选，缺失的可选不动；选择派生一次，C-3 的 `install` 复用同一份。理由：留到 C-3 会让 C-2 完成时的中间状态不满足 Objective 4，而评审是逐条核的。
2. **Q2 `status`/`upgrade` 的措辞**。采用 worker-1 草稿（别家/无 metadata 的信息行、本集合已下线的 finding、未安装可选的 absent 行、upgrade 具名清理）。措辞属撰写。
3. **Q3 `uninstall --skill <name>` 名字不在 manifest**。按 `refuse()`（退出 2）处理：不在 manifest 的名字是调用错误，与现有用法拒绝约定一致；"别家目录永不触碰"因此由构造保证，而不是靠静默跳过。
4. **Q4 `uninstall` 默认对未安装的可选**。与必装同形打印 `absent:`，让"未安装"与"未被点名"在报告里可区分。

5. **Q5 落装面的枚举面又缺一处：`dsh-spec.ts` 的 flag 表**。计划 Objective 5 要 `uninstall --skill <name>`，`manager.ts` 实现后入口点仍把它当 "uninstall does not take --skill" 拒绝（退出 2）。与 B 的 P5 同类（封闭集合增员，每一处列举它的地方一起移动），授权 worker-1 在 C-2 一并改：flag 表新增 `--skill`（只 uninstall 接受，重复给值 refuse(2)），C-3 再在同一张表加 `--with`。write_scopes 已同步 `skills/dsh-spec-manager/scripts/dsh-spec.ts`。
6. **Q6 询问里的"描述首句"从哪来**。计划要求 TTY 询问显示"名字 + 描述首句"，而可选技能此刻尚未安装、本地无 `SKILL.md`；manifest 里放描述会制造第二事实来源（违反 `owner.ssot`）。判定：按 (A) 从 revision 读（`gh api repos/<repo>/contents/skills/<name>/SKILL.md?ref=<ref>` → base64 → frontmatter `description` 首句），读不到就只显示名字。install/upgrade 与 `--dry-run` 本就要联网解析 revision，故不新增性质；测试用 `gh` 替身保持离线。
7. **Q7（未决，留给用户）`install` 遇到已装着的可选取什么行为**。计划 Objective 3 只给 install "询问 / `--with` / 非 TTY 不装"，Objective 4 把"已存在的可选跟到当前 revision、缺失的不动"给了 `upgrade`。当前按字面实现 (A)：install 的 selection = 必装 ∪ 本轮选中的可选；已装可选不被询问也不被更新，漂移由 `status` 报出、由 `upgrade` 收敛。备选：(B) install 也套"存在即选择"（与 upgrade 同一条派生规则、不再问已经存在的选择，比计划字面多做一步）；(C) 不提问已装的可选但仍按本轮答案决定是否更新。**未自行拍板，等用户定夺。**

8. **Q8（未决，留给用户）非 TTY `install` 对"已在盘上的可选"的措辞**。按 Q7 的 (A) 读法，本轮未被选中的可选会打印卡片钉死的 `optional not installed: <name> — pass --with <name> to add it`，而技能其实在盘上，只是没被更新。行为正确、措辞可能误导。候选：`not selected this run`，或已存在时换一行。**未自行改，等用户定夺。**

## 结论

（待交付收尾时填写。）

# 计划：必装与可选技能、归属判定

> **已定**：计划面与团队工作流绑定同选——树与钩子只在装了 `dsh-agent-team-workflow` 时创建。第 7 条、Design 的条件化表与 C-4 卡照此定稿。

## Summary

`manifest.json` 增加 `optional`（`skills` 保持全集，必装 = 差集）；安装时在 TTY 下逐项询问、非 TTY 默认不装并提示 `--with`；`upgrade` 永不询问；`uninstall` 与 `status` 按必装/可选与归属分类；`status` 不再把别家集合的目录当问题（关闭 #63）。同时把计划树**与根 `AGENTS.md` 的计划钩子**改成"装了 `dsh-agent-team-workflow` 才有"的工作面，并处理 install/uninstall/status 三条路径。落两条决策 note。

## Background

- 技能集只有一份清单、全部默认安装：项目无法声明"这个技能可选"。多技能集共用 `.agents/skills/` 时，别家的技能目录会被 `status` 报成 `installed but not named in the manifest` 并退出 1（#63 已核验：`manager.ts:720-724` 收集、`760-762` 报错、`771-774` 退出；`uninstall` 只删 manifest 名字，故额外目录能存活）。
- 把别家技能写进 `manifest.skills` 不是出路（已实测）：`install`/`upgrade` 会尝试从本集合取它并整轮失败；`status` 只是换一条 finding。安装副本里的 `manifest.json` 会被 `gh skill install --force` 覆盖、被 `pruneToRevision` 清理，所以项目侧的选择**不能**存在那个文件里。
- 可选化的前提是安装时**真的不默认装**；`dsh-agent-team-workflow` 是唯一的可选项，它同时也提供计划机制的工作流（见 `planning-mechanism.md`）。
- 计划的树 `.agents/dsh-spec/plans/` 由 `planning-mechanism.md` 落地；本计划把它条件化到那个可选技能上。
- 归属判定可以用安装时注入的本地元数据（`metadata.github-repo`），不联网，符合 `status` 现有契约（"The comparison is local and reads no network"）。

## Objective

1. `manifest.json`：`skills` 保持全集，新增 `optional: ["dsh-agent-team-workflow"]`；必装 = 差集派生，不写第二份名单。
2. `readManifest` 校验：`optional ⊆ skills`、名字过 `NAME`、重复项拒绝，错误具名并非零退出。
3. `install`：TTY 下逐项询问（名字 + 描述首句，默认否）；非 TTY 不提问、不装可选、打印一行 `optional not installed: <name> — pass --with <name> to add it`；`--with <name>` 可重复、显式安装；`--dry-run` 打印"会问什么、答案是什么"且不读 stdin。
4. `upgrade` 永不询问：已存在的可选跟到当前 revision，缺失的不动。
5. `uninstall`：删必装与已存在的可选；`--skill <name>` 删单个；别家目录永不触碰。
6. `status` 归属分类：在 `skills` → 比对 revision（不变）；不在 `skills` 但 `metadata.github-repo` 指向本集合 → finding（revision 不再发布它），并由 `upgrade` 具名清理；无 metadata 或别的仓库 → 一行信息，不影响退出码。**#63 的复现步骤退出 0。**
7. 计划面条件化：**树与钩子一起**——装了 `dsh-agent-team-workflow` 才有；采用未选则不创建树、不注入钩子；`install --with` 事后创建与注入；`upgrade` 只同步不创建；`uninstall --skill` 保留计划与目录、并**移除钩子**（钩子指向的正是它的工作面）；`status` 在"已装该技能却缺树或钩子"时报 finding。
8. 文档与测试同步：`cli.md`、`help.ts`、`manager-lifecycle.md`、`manager-install.md`；`README.md`/`README.zh.md` 的技能表把 `dsh-agent-team-workflow` 标为可选，并修掉"它安装其余九个"这类会变成假话的句子；两条决策 note 落 `.agents/dsh-spec/notes/proposed/`，随本交付转 `implemented/`。

## Constraints

- **依赖 A（计划机制与计划树）**。门（开工第一步原样运行，判据是 main 上的事实，不读 note、不读别处状态）：

  `gate: test -f skills/dsh-spec-manager/templates/plans-README.md.template && test -f skills/dsh-spec-manager/templates/plans-AGENTS.md.template && grep -q 'dsh-spec:plans' AGENTS.md`

- 不实现 `source`（独立提案 note）；不做 manager 包与引擎重整（`manager-package.md`）。
- 本次仍不加计划格式门禁。
- 兼容：旧 manager 读新 manifest 会把可选项也装上（多装、不报错）；新 manager 读旧 manifest（无 `optional`）全部按必装。
- 不新增规范、不新建技能；不改 `submodules/dsh/`；不手改 `.agents/skills/`。

## References

| 来源 | 用途 |
|---|---|
| [#63](https://github.com/sunandsunshine-tech/dsh-spec/issues/63) | 本计划关闭的问题与其核验记录 |
| `.agents/dsh-spec/plans/planning-mechanism.md` | 计划树的落地；本计划在其之后 |
| `skills/dsh-spec-manager/scripts/manager.ts` | `readManifest`、`planRefresh`、`refresh`、`installProject`、`upgradeProject`、`uninstallProject`、`status` |
| `skills/dsh-spec-manager/references/manager-lifecycle.md`、`cli.md` | `status`/`uninstall` 契约与命令面 |
| `skills/dsh-spec-manager/scripts/i18n-scope.ts`、`gate-scope.ts` | 未配对文档不进配对门禁（计划树不需要对侧） |

## Design

### manifest 字段

```json
{
  "repo": "sunandsunshine-tech/dsh-spec",
  "skills": ["…十项，全集…"],
  "optional": ["dsh-agent-team-workflow"]
}
```

`required = skills \ optional`，派生，不写第二个名单。加字段而非拆结构：旧 manager 忽略 `optional`，多装不报错；若拆成 `required`/`optional` 两个列表，旧 manager 会 `fail("names no skills")`，更新当天断。

### 安装询问

| 场景 | 行为 |
|---|---|
| TTY 且 `install` | 逐个列出可选技能（名字 + 描述首句），默认否 |
| 非 TTY 且 `install` | 不提问、不装、打印具名提示与 `--with` 用法 |
| `--with <name>`（可重复） | 显式安装，跳过询问 |
| `--dry-run` | 不提问，把问题与答案当计划打印 |

代理面同批改：`skills/dsh-spec-manager/SKILL.md` 写明"运行 `install` 前先问用户是否要可选技能，再带 `--with`"（agent 的 shell 非 TTY）。

### 归属分类（本地读注入元数据）

| 目录 | 判定 |
|---|---|
| 名字在 `skills` | 本集合，比对 revision（行为不变） |
| 不在 `skills`，`github-repo == manifest.repo` | 本集合、当前 revision 不再发布 → finding，并由 `upgrade` 具名清理 |
| 无 metadata，或 `github-repo` 是别的仓库 | 别的集合 → 信息行，不影响退出码 |

### 计划面条件化（树 + 钩子一起）

| 场景 | 计划树与契约 | 根 `AGENTS.md` 的计划钩子 |
|---|---|---|
| 采用并选择安装 workflow | 创建 `.agents/dsh-spec/plans/README.md`、`README.zh.md`（含 sidecar）与 `AGENTS.md` | 注入 `<!-- dsh-spec:plans -->` 段 |
| 采用未选（非 TTY 默认） | 不创建 | 不注入 |
| 事后 `install --with dsh-agent-team-workflow` | 创建（走 install 的 create 半程） | 注入 |
| `upgrade`（已安装） | 只同步契约文本，不创建 | 只同步文本 |
| `uninstall --skill dsh-agent-team-workflow` | 保留目录与已有计划 | **移除钩子**（它指向的正是这个工作面） |
| `status` 已装但树或钩子缺失 | finding，说明工作面不完整 | 同左 |

### 决策 note（两条）

- `.agents/dsh-spec/notes/proposed/process/<yyyy-mm-dd>-the-manager-owns-only-the-skills-its-manifest-names.{md,zh.md,i18n.yaml}`（class `process`）：归属判定与 `status` 语义，关闭 #63。
- `.agents/dsh-spec/notes/proposed/process/<yyyy-mm-dd>-a-skill-can-be-optional.{md,zh.md,i18n.yaml}`（class `feature`）：可选技能的声明、询问与"存在即选择"。

两条各带 `.zh.md` 与 sidecar，随本交付转 `implemented/`。

## Team

Lead（建卡、验收、最终门禁、PR）；Worker ×1（引擎与文档）；Reviewer ×1（黑箱重跑）；Texter ×1（双语 note、README 行、文风）。

## Topology

```
C-1 manifest 字段与校验 ─▶ C-2 只读路径（status/upgrade/uninstall/归属） ─┬─▶ C-4 计划面条件化（树+钩子） ─┐
                                                                        └─▶ C-3 安装询问 ──────┴─▶ C-5 文档与 README ─▶ C-6 两条 note ─▶ C-7 评审 ─▶ C-8 文本终检 ─▶ C-9 刷新副本+门禁+PR
```

- C-2 与 C-3 都改 `manager.ts`，写域重叠且共享同一份改动上下文——同一角色同一 owner 顺序完成，不并行。
- 其余串行；本交付与 A 之间由 Constraints 的门把守。

## Planned cards

| 卡 | 目标 | 写域 | 依赖 | 验收命令（退出 0） |
|---|---|---|---|---|
| C-1 | `optional` 字段与校验（`optional ⊆ skills`、名字、重复） | `skills/dsh-spec-manager/references/manifest.json`、`manager.ts` | — | 新增用例：合法通过；四类非法被具名拒绝 |
| C-2 | `status` 归属分类、`upgrade` 清理已下线、`uninstall` 选择 | `manager.ts`、`tests/management.test.ts` | C-1 | `node --test 'tests/management.test.ts'` |
| C-3 | 安装询问（TTY/非 TTY/`--with`/`--dry-run`）与 SKILL.md 的代理面 | `manager.ts`、`skills/dsh-spec-manager/SKILL.md`、`tests/**` | C-1 | `node --test 'tests/**/*.test.ts'` |
| C-4 | 计划面条件化：树 + 钩子的四场景（含卸载移除钩子）与 status finding | `init-agents-md.ts`、`manager.ts`、`tests/**` | C-1 | 采用未选不建树不注入钩子、选择后建树注入、卸载保留计划并移除钩子的用例 |
| C-5 | `cli.md`、`help.ts`、`manager-lifecycle.md`、`manager-install.md`；README 双语的技能表标可选并修掉"安装其余九个" | 上述文件 + `README.md`、`README.zh.md`、`README.i18n.yaml` | C-2、C-3、C-4 | `translation-pair check README.md`；`node --test 'tests/**/*.test.ts'`（渲染类用例会兜 help 与 cli.md 一致性） |
| C-6 | 两条决策 note 三件套（slug 见 Design） | `.agents/dsh-spec/notes/**` | C-2、C-3 | `notes check <note>`；`translation-pair check <note>` |
| C-7 | 黑箱评审：按 Objective 逐条核，原样重跑 | 只读 | C-1..C-6 | 各卡命令原样重跑 + `git diff` 对照 |
| C-8 | 文本终检 | 产物文本 | C-7 | 重跑 C-5、C-6 的命令 |
| C-9 | 刷新副本、全量门禁、PR | `.agents/skills/**`（由命令写） | C-8 | `verify-installed-copy`、`verify-port-provenance`、`node --test`、`check --all`、`md-links`（全量） |

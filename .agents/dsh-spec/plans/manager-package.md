# 计划：manager 技能包与引擎一次重整

## Summary

把 `dsh-spec-manager` 的**包与引擎一次重整到位**：`SKILL.md` 与引用按 Agent Skills 规范整理（含前置字段），`scripts/` 里的自有模块按职责重排、抽出共用面、把纯逻辑从脚本里提出来。一次交付、一次 PR，**行为不变**。

## Background

### 包面现状

`SKILL.md` 21 行，前置字段只有 `name` 与 `description`；引用 `cli.md` 436 行、`manager-lifecycle.md` 87、`manager-install.md` 52、`upstream-notices.md` 85、`norms.json` 157、`manifest.json` 61；没有 `assets/`。规范定义可选前置字段 `license`、`compatibility`（≤500 字符）、`metadata`、`allowed-tools`（实验），并建议 `SKILL.md` 小于 500 行、引用按需加载并写明加载时机、引用一层深。本包目前没有说明哪个引用该在什么时候读。

### 引擎现状问题（实测）

| # | 问题 | 证据 |
|---|---|---|
| 1 | 巨型多职责文件 | `help.ts` 858（命令目录 + 中英投影 + markdown 渲染）、`manager.ts` 852（argv 解析 + manifest 读取 + 计划/刷新 + prune + status + uninstall + install/upgrade）、`dsh-spec.ts` 736（argv + 范围 + 并发池 + 汇报 + 门禁记录核对）、`init-agents-md.ts` 713（模板 + 替换 + 三种合并 + diff + sync + 钩子生成） |
| 2 | 参数解析各写一份 | `flagValue`/`hasFlag` 在 `manager.ts` 与 `init-agents-md.ts` 各一份；`--root`/argv 另在 `gate-scope.ts`、`notes-root.ts`、`repo-root.ts`、`change-scope.ts`、`verify-translation-pairing.ts`、`gen-translation-brief.ts` 各处理各的 |
| 3 | 退出约定三种写法 | `fail()` 在 `manager.ts` 与 `dsh-spec.ts` 各一份，`fail(gate, …)` 又在 `gate-scope.ts`；`init-agents-md.ts` 里裸 `process.exit(1)` 六处 |
| 4 | 命令文法两份，靠测试对账 | `dsh-spec.ts` 的 `COMMANDS`/`NOUN_VERBS`（:66）与 `help.ts` 的 `CommandHelp` 目录（:51）；`rendered-commands.test.ts` 的存在就是为了保证两者不漂 |
| 5 | 纯逻辑锁在脚本里 | 六个 `verify-*.ts` + `dsh-spec.ts` + `init-agents-md.ts` 在 import 时即执行，只能起子进程测；而 `norms-apply.ts` 是可 import 的库，测试直接用它 |

### 移动边界（决定了这次做得到"一次到位"）

- **没有任何移植文件 import 四大文件**（`manager.ts`/`help.ts`/`dsh-spec.ts`/`init-agents-md.ts`）→ 拆它们对 16 个移植文件零改动。
- 移植文件只 import 六个小共享模块：`notes-root.ts`(50)、`repo-root.ts`(21)、`i18n-scope.ts`(177)、`gate-scope.ts`(239)、`md-scope.ts`(71)、`excluded-region.ts`(57)。**这六个留在原地**，于是 `scripts/ports.json` 与 16 个移植文件的 diff 为零。
- `cli.md` 是 `--help` 打印的同一份文本（`references/manager-lifecycle.md:51`），**不拆**：规范只对 `SKILL.md` 有 500 行上限，拆它只会逼着改渲染器。
- 规范不约束代码结构：引擎重排是我们自己的可维护性投入，不是规范要求，所以它的验收是"行为不变"，而不是"符合规范"。

## Objective

1. **前置字段**：声明 `license: MIT`（根有 `LICENSE`）与 `compatibility`（Node ≥ 22.19 或 ≥ 24；零运行时依赖；`gh` 仅 `install`/`upgrade` 需要），并经一次真实安装验证；安装器若丢弃它们就撤掉该字段并把结论写进工作副本。
2. **`SKILL.md`**：正文按过程组织，写明每个引用的加载时机，总行数仍在 500 行以内。
3. **引用**：保持一层深、各自聚焦；`cli.md` 不拆。
4. **引擎**：四大文件按职责拆开；`cli-args.ts` 收敛 flag/subcommand/`--root`/`--jobs` 与退出约定（失败 1、用法拒绝 2）；命令表单一来源，`help` 与 dispatcher 同源；解析、合并、diff、范围组装等纯逻辑从脚本里提出来成为可 import 的模块。
5. **边界**：六个小共享模块、`scripts/ports.json` 与 16 个移植文件**零改动**；`verify-port-provenance` 通过。
6. **行为不变**：全量测试通过，且关键命令输出与改动前逐字一致（清单见 Design）。
7. 门禁全绿（见各卡验收）。

## Constraints

- 只动 `skills/dsh-spec-manager/**` 与必要的 `tests/**`；不改其他技能、不改 `submodules/dsh/`、不手改 `.agents/skills/`、不新增规范、不新建技能、不新增门禁。
- **移动边界是不可越的**：六个共享模块原地不动；任何移植文件的 import 都不得改。验收要求 `git diff --name-only` 与 `ports.json` 的 16 个 local 名单无交集。
- **依赖 C（必装/可选与归属判定）**。门（开工第一步原样运行，判据是 main 上的事实）：

  `gate: grep -q '"optional"' skills/dsh-spec-manager/references/manifest.json && grep -q 'optional not installed' skills/dsh-spec-manager/scripts/manager.ts`

  C 改过 `manager.ts` 与 `init-agents-md.ts`，本计划在其之上重整，避免返工。
- 要避的坑：
  - 行为不变的证据必须覆盖**输出文本与退出码**；只跑测试不够。
  - `SKILL.md` 正文与安装副本逐字比对——改完必须刷新 `.agents/skills/` 再跑门禁。
  - 前置字段要经真实安装验证，安装器会把"源里有、装完没有"交给 `verify-installed-copy` 判红。
  - 引擎拆分不改变任何用户可见行为：命令、参数、输出、退出码、门禁语义全部照旧。

## References

| 来源 | 用途 |
|---|---|
| [Agent Skills Specification](https://agentskills.io/specification.md) | 前置字段、目录约定、progressive disclosure、引用加载时机、`SKILL.md` 上限 |
| [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices.md) | procedure over declarations、defaults not menus、何时加载引用 |
| [The pull-request lifecycle](../notes/implemented/process/2026-09-21-the-pull-request-lifecycle.md) | PR 的 `## How` 用于陈述结构变化；squash 合并 |
| `scripts/ports.json`、`scripts/verify-port-provenance.ts` | 16 个移植文件的出处登记与门禁；本次的"零改动"边界由它证明 |
| `skills/dsh-spec-manager/references/manager-lifecycle.md` | `cli.md` 的性质（`--help` 的同一份文本）与 `status` 契约 |
| 本计划的 Background 表 | 五条现状问题与它们的位置，供 D-0 定布局时引用 |

## Design

### 包与表述

前置字段（规范两类字段，本包现状与本次）：

| 字段 | 必填 | 现状 | 本次 |
|---|---|---|---|
| `name` | 是 | 有（与目录同名） | 不动 |
| `description` | 是 | 有 | 只在按规范优化措辞时微调 |
| `license` | 否 | 无 | `MIT`（根 `LICENSE` 是权威） |
| `compatibility` | 否 | 无 | 运行要求：Node ≥ 22.19 或 ≥ 24、零运行时依赖、`gh` 的用途 |
| `metadata` | 否 | 由 `gh skill install` 注入 | 不手写 |
| `allowed-tools` | 否 | 无 | 不声明 |

`SKILL.md`：开头一段说清这是什么技能、何时用；正文按过程组织（安装/更新 → 项目文件 → 检查与门禁 → 与笔记和计划的边界）；每处引用写明加载时机；保留"引擎不是本技能私有资源"那段。

### 引擎目标布局（D-0 定稿，这是起点）

| 目标模块 | 吸收什么 |
|---|---|
| `cli-args.ts` | `flagValue`/`hasFlag`/`subcommand`/`projectRoot`/`skillsDirectory`；`fail`（1）与 `refuse`（2）两个退出约定 |
| `help/`（目录 + 渲染） | `help.ts`：单一命令表 + 中英投影 + markdown 渲染；dispatcher 从同一张表取 `COMMANDS`/`NOUN_VERBS` |
| `manager/` | `manager.ts` 拆为 `plan-refresh`、`status`、`uninstall`、`install`、`upgrade`（`manifest.ts` 已在） |
| `init/` | `init-agents-md.ts` 拆为 `templates`（发现 + 占位替换）、`merge`（replace/rows/section + 钩子清单）、`sync`（编排 + diff） |
| `dispatch/` | `dsh-spec.ts` 拆为 `scope`、`pool`、`report`（门禁记录核对留在入口） |
| **原地不动** | `notes-root`、`repo-root`、`i18n-scope`、`gate-scope`、`md-scope`、`excluded-region`；`manifest`、`norms`、`norms-apply` 可留在原处或按同一原则微调 |

拆分只做"搬 + 改 import + 提纯函数"，不改一行逻辑。D-0 的产出是最终文件清单与每个文件的职责边界，交用户审后再动。

### 行为不变的验收

改动前后各跑一遍，输出逐字比对（含退出码）：

```
status · install --dry-run · upgrade --dry-run · help --markdown · check --all · notes check --all · norms list
```

再加：`node --test 'tests/**/*.test.ts'`、`node scripts/verify-port-provenance.ts`、`node scripts/verify-installed-copy.ts`、`dsh-spec.ts check --all`。

## Team

Lead（建卡、验收、最终门禁、PR）；Worker ×2（包与表述 / 引擎布局）；Reviewer ×1（行为不变证据 + 边界零改动）；Texter ×1（`SKILL.md` 与引用文本）。

## Topology

```
D-0 布局定稿 ──┬─▶ D-1 包与表述 ──────┐
               └─▶ D-2 引擎重排与拆分 ─┴─▶ D-3 评审（行为不变+边界） ─▶ D-4 文本终检 ─▶ D-5 刷新副本+全量门禁+PR
```

- D-1 写域 `SKILL.md` 与 `references/**`；D-2 写域 `scripts/**`（+ 必要的 `tests/**`）；两者不相交、互不依赖，只需共享 D-0 的布局说明——三条件成立即可并行，D-0 后按同判据复核一次。
- D-2 的拆分分批进行、每批自成一个可构建、测试通过的状态（PR 生命周期要求每个提交都是完整状态）。

## Planned cards

| 卡 | 目标 | 写域 | 依赖 | 验收命令（退出 0） |
|---|---|---|---|---|
| D-0 | 布局定稿：最终模块清单、每个文件的职责、分批顺序、移植边界复核 | 只读（产出写进本计划） | C | 设计经用户审核；确认六个共享模块不在移动清单内 |
| D-1 | 前置字段（真实安装验证）+ `SKILL.md` 过程化与引用加载时机 | `skills/dsh-spec-manager/SKILL.md`、`skills/dsh-spec-manager/references/**` | D-0 | `node scripts/verify-skill-structure.ts --root skills/dsh-spec-manager`；安装一次后 `node scripts/verify-installed-copy.ts` |
| D-2 | 引擎重排：`cli-args`、命令表单一来源、四大文件拆分、提纯函数 | `skills/dsh-spec-manager/scripts/**`、`tests/**` | D-0 | `node --test 'tests/**/*.test.ts'`；`node scripts/verify-port-provenance.ts`；`git diff --name-only` 与 16 个移植文件名单无交集 |
| D-3 | 黑箱评审：行为不变（关键命令输出逐字一致 + 退出码）+ 边界零改动 | 只读 | D-1、D-2 | 改动前后各跑一遍 Design 里的命令清单并逐字比对；全量测试 |
| D-4 | 文本终检 | 产物文本 | D-3 | 重跑 D-1 命令 |
| D-5 | 刷新副本、全量门禁、PR | `.agents/skills/**`（由命令写） | D-4 | `verify-installed-copy`、`verify-port-provenance`、`node --test`、`check --all`、`md-links`（全量） |

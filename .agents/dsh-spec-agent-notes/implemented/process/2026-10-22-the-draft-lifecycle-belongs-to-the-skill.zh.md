# Agent Note：草稿生命周期属于锻造技能

Status: implemented

[English](2026-10-22-the-draft-lifecycle-belongs-to-the-skill.md) | 中文

## Problem

锻造技能的草稿规则描述了一套生命周期——工作草稿、审查草稿和落地产物——仓库却在 `package.json` 的 shell 里实现它：`build:work`、`copy:review`、`land:skills`，以及每个已安装技能一条 `refresh:*`，串联 `vp`、`rsync`、`cp`、`rm -rf` 和 `rmdir`。这条链用结尾的 `|| true` 吞掉失败，落地时顺带删除空的共享父目录，依赖 Node 之外的命令，而且没有测试；落地清理范围已经错过一次。技能的采用者拿不到规则的可执行形式。

## Decision

生命周期是锻造技能的 Script：`script/forge.mjs`，源码在 `package/dsh-spec-skill-forge/forge.ts`，命令是 `draft`、`review` 和 `land`。锻造目录和落地目录都是取值，技能因此保持项目中立；工作目录即项目根。

`land` 先校验再写盘。它要求工作草稿里有 `SKILL.md`；落地目录必须不存在、为空或就是本技能；审查草稿存在时其 `script/` 必须仍与工作草稿一致；把副本暂存到锻造目录下，按内容哈希校验暂存树，交换进落地目录，再次校验落地树，然后只删除 `draft/<名称>/` 和 `review/<名称>/`。共享的 `draft/` 和 `review/` 目录保留；`--dry-run` 只打印动作、不执行。交换前的失败保留原落地目录和工作草稿，重试从草稿开始。

仓库的 `package.json` 只保留按命名空间分组的薄调用：`format`、`format:check`、`test`、`test:watch`、`skill:draft`、`skill:build`、`skill:review`、`skill:land` 和 `skill:refresh`。打包配置在 `package/dsh-spec-skill-forge/vite.config.ts`，声明两个脚本入口和工作草稿的 `script/` 输出。`scripts/refresh-skills.ts` 按 `skills/*` 发现技能并逐个镜像到已安装副本，已安装集合不再写第二遍。根 `vite.config.ts` 把 Oxfmt 配成项目的无分号、单引号、120 列风格，只作用于 TypeScript 源码；`vp fmt` 和 `vp fmt --check` 是源码格式化命令。CI 跑 `pnpm test`。

这次变更没有生成审查草稿。驾驶员在实现前审查了方案，独立评审者评审落地产物，因此草稿规则里“需要审查”的条件不成立；裁定记录在这里，而不是第二个状态存储。

## Alternatives considered

**保留 shell 流水线并让它快速失败。** 用 `set -e` 串联 `rsync` 和 `rm -rf` 仍然没有测试、没有 dry run、不报告删除了什么，而且把生命周期规则放在第二个位置；清理缺陷只是症状。

**把生命周期留在仓库级 CLI。** 这是更早的方案。它落败，因为生命周期是技能自己的规则：采用者仍会拿到一条没有可执行形式的规则，而仓库会保留同一技能机制的第二个实现。

**把生命周期并进 `verify-skill-spec.mjs`。** 它落败，因为符合性检查与草稿生命周期是两件事：合并入口会让通用的门禁依赖锻造布局和目录名。

**落地后删除空的共享目录。** 它落败，因为共享目录属于锻造目录、按需创建；删除不带来收益，还会给落地增加第二条删除规则。

**采用 Oxfmt 默认风格（分号、双引号）而不是项目风格。** 它落败，因为现有源码刻意保持无分号和单引号；默认风格会重排全部文件，并把格式问题抬到被审查的变更之上。

**不把测试和格式化命令放进 `package.json`。** 它落败，因为命令是文档化的入口；CI 跑同一条测试命令，测试命令因此只有一个来源。

## Consequences

技能多出一个打包脚本，约 14 KB；仓库把项目取值——锻造目录、落地目录、打包入口——留在配置里。生命周期有 27 个用例，已安装副本刷新有 6 个；套件共 82 个用例。共享的 `draft/` 和 `review/` 目录在存在时保留，新克隆在创建之前两个都没有。`pnpm run format:check` 不在 CI 里运行，因为 CI 不安装 Vite+ 工具链；它是本地检查。

工作草稿可以从落地技能播种（`draft --from`），下一轮从已交付的字节开始，而不是空目录。

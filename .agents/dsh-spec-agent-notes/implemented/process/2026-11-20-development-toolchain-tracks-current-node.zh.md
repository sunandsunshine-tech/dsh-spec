# Agent Note: 开发工具链跟随当前 Node 实现

Status: implemented

[English](2026-11-20-development-toolchain-tracks-current-node.md) | 中文

## 问题

仓库的检查是由 Node 直接运行的 TypeScript，随附技能则是自包含的 ESM bundles。Node 24 是本包需要支持的最旧实现，继续保留 Node 22 会在语法、API、依赖与静态分析方面扩大兼容工作。仓库还需要一道门禁，分别判定格式、lint 与 TypeScript 诊断失败，同时不把功能测试套件变成第二个测试运行器。

## 决策

开发与主要 CI 基线使用 Node 26。CI 也会运行精确的最低版本 Node 24.11.0，让声明的运行时与交付 bundles 在那里保留可观察覆盖。支持的运行时为 `^24.11.0 || >=26.0.0`；不支持 Node 22。

[把仓库公开](2026-09-24-opening-this-repository.zh.md)仍拥有 CI workflow 的公开与权限决定；本记录拥有其运行时线与矩阵。

工具链与实现选择跟随当前维护中的 Node 线。实现向前移动时，声明与证据也随之前移：运行时范围、类型定义、构建目标与 CI 矩阵同步更新，而不是通过兼容分支保留一个不受支持的 Node 线。

`vite-plus@1.7.0` 提供 Oxfmt、Oxlint 与 `tsrs`。`pnpm run check:static` 运行 `vp check --continue-on-error --deny-warnings`，并通过根目录的 `vite.config.ts` 与 `tsconfig.json` 启用类型感知 lint 与 TypeScript 诊断。TypeScript 程序只加载 ES2024 与 Node 声明，不加载 DOM 库，因此 Node-only 源码不能依赖会在运行时失败的浏览器全局。`@types/node@24.11.0` 将受检 API 面保持在最低支持运行时，并且每个交付脚本 bundle 都以 Node 24 为构建目标。依赖选择仍由[直接依赖遵守供应链成熟度窗口](2026-11-17-direct-dependencies-use-the-maturity-window.zh.md)决定。

`node:test` 仍是功能测试运行器。仓库要测试原生 Node TypeScript 执行与子进程行为，迁移到 Vitest 不会为这些路径增加证据。

## 备选方案

- **保留对 Node 22 的兼容。** Node 22 不在支持的实现范围内；保留它会在没有所需采用者运行时的情况下约束语法、API 与工具链选择。
- **先按 Node 22 实现，之后再放宽范围。** 这把要求倒置了：实现质量会先受到限制，更新 Node 的能力还必须在可用之前再迁移一次。
- **CI 只使用 Node 26。** 这会让声明的 Node 24 运行时与构建出的 bundle 都失去测试。
- **把测试套件迁移到 Vitest。** 测试套件已经使用 Node 的原生 TypeScript 执行与 `node:test`；Vitest 会增加一套并行的测试词汇，却不会改善这些行为的覆盖。
- **只把 `vp lint` 用作静态门禁。** 它会检查 lint 与类型，却漏掉格式判定，因此本地与 CI 需要分开的命令才能执行同一份源码标准。

## 后果

- 贡献者需要 Node 24.11+ 或 26+；主要开发基线是 Node 26。
- CI 矩阵在 Node 24.11.0 与 Node 26 上运行完整检查，以重复的运行时成本换取精确最低版本与主要开发线上的证据。
- 类型定义与构建目标属于运行时约定，并随运行时同步移动。
- 源码格式、warning 级 lint 与 TypeScript 诊断会分别拒绝静态门禁；功能测试套件仍是 `pnpm test`。

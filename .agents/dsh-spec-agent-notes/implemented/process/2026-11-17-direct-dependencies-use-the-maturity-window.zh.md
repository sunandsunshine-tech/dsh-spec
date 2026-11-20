# Agent Note: 直接依赖遵守供应链成熟度窗口

Status: implemented

[English](2026-11-17-direct-dependencies-use-the-maturity-window.md) | 中文

## 问题

直接依赖更新需要可重复的边界。立即采用 registry latest 可能越过所选 pnpm 环境的严格包成熟度窗口；一次性覆盖又会让本地与 CI 的供应链规则互相不一致。另外，升级 `parse5` 后，交付的 bundles 会同时内联 `entities@8.1.0` 与 `entities@9.0.0`，而 notice 读取器按包名索引，只保留一个版本。

## 决策

实现与工具依赖使用满足当前包成熟度策略的 registry 最新版本。若类型定义包编码了运行时 API 下限，则改由该约定选择：`@types/node` 跟踪最低支持运行时，使编译不能接受只有更新 Node 才提供的 API。选定的根依赖继续使用精确 pin，既有 workspace 包范围保持原有范围风格；因策略暂缓的升级作为后续事项，不增加项目级例外。

本次选定的直接版本是 `vite-plus@1.7.0`、`@types/node@24.11.0`、`parse5@8.1.1` 和 `mdast-util-from-markdown@2.1.0`。pnpm 保持 `12.21.0`；根 Node engine 为 `^24.11.0 || >=26.0.0`；`pnpm/setup` pin 到 `v3.2.0`。

根 Node 范围与交付 bundle 的构建目标遵循[开发工具链跟随当前 Node 实现](2026-11-20-development-toolchain-tracks-current-node.zh.md)。

vendored 包发现同时以包名和版本作为行键。生成的 notice 表与 skill-root notices 可以为同一个包名列出多行，每一个内联版本都必须可见。依赖提交已经以完整带版本的 purl 为键。

## 备选方案

- **为 `vite-plus@1.7.0` 覆盖成熟度窗口。** 这会立即获得 registry-latest，但会为该版本仍在冷却期内时关闭供应链保护。
- **在 `1.7.0` 离开冷却期后仍保留 `vite-plus@1.6.0`。** 旧版本能避开工具链刷新，却会继续使用旧的 `tsgolint` 类型检查面，而不是仓库采用的 `tsrs` 集成。
- **保留 `parse5@8.0.1` 以维持单一 `entities` 版本。** 这会避开新的 notice 形态，却会推迟 `8.1.1` 的安全与解析器修复，并使 notice 读取器继续无法表示合法的重复版本。
- **继续按包名索引 notices。** 表会静默漏掉两个内联版本之一，低估依赖图。
- **把由依赖管理工具维护的 GitHub Actions 放入同一次手工升级。** Dependabot 已经拥有它们的 SHA 更新；这里只加入当前 `pnpm/setup` 版本，因为它是固定 pnpm 的包管理器安装器。

## 后果

- `vite-plus@1.7.0` 已离开包成熟度窗口，并在没有项目级排除的情况下入选。
- 交付的 forge bundle 同时携带两个 `entities` 版本，两者都在根 notices 与 skill-root notices 中可见。
- 根开发与交付运行时范围描述相同的支持 Node 线。
- formatter、parser 与生成的 bundles 一起变化，因此必须运行完整 corpus、bundle、notice、parser 与测试检查。

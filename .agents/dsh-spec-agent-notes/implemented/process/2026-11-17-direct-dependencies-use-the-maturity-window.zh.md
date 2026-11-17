# Agent Note: 直接依赖遵守供应链成熟度窗口

Status: implemented

[English](2026-11-17-direct-dependencies-use-the-maturity-window.md) | 中文

## 问题

registry latest `vite-plus@1.7.0` 比所选 pnpm 环境的严格包成熟度窗口更新。安装它就需要为一个供应链保护增加项目级例外。另外，升级 `parse5` 后，交付的 bundles 会同时内联 `entities@8.1.0` 与 `entities@9.0.0`，而 notice 读取器按包名索引，只保留一个版本。

## 决策

直接依赖使用满足当前包成熟度策略的 registry 最新版本。选定的根依赖继续使用精确 pin，既有 workspace 包范围保持原有范围风格；因策略暂缓的升级作为后续事项，不在本次变更中增加例外。

本次选定的直接版本是 `vite-plus@1.6.0`、`parse5@8.1.1` 和 `mdast-util-from-markdown@2.1.0`。pnpm 保持 `12.21.0`；根 Node engine 为 `^22.19.0 || ^24.11.0 || >=26.0.0`；`pnpm/setup` pin 到 `v3.2.0`。

根 Node 范围是开发工具链范围。交付的脚本 bundle 保留 Node 22 语法目标及其自身的采用者运行时兼容范围。

vendored 包发现同时以包名和版本作为行键。生成的 notice 表与 skill-root notices 可以为同一个包名列出多行，每一个内联版本都必须可见。依赖提交已经以完整带版本的 purl 为键。

## 备选方案

- **为 `vite-plus@1.7.0` 覆盖成熟度窗口。** 这会立即获得 registry-latest，但会为该版本仍在冷却期内时关闭供应链保护。
- **保留 `parse5@8.0.1` 以维持单一 `entities` 版本。** 这会避开新的 notice 形态，却会推迟 `8.1.1` 的安全与解析器修复，并使 notice 读取器继续无法表示合法的重复版本。
- **继续按包名索引 notices。** 表会静默漏掉两个内联版本之一，低估依赖图。
- **把由依赖管理工具维护的 GitHub Actions 放入同一次手工升级。** Dependabot 已经拥有它们的 SHA 更新；这里只加入当前 `pnpm/setup` 版本，因为它是固定 pnpm 的包管理器安装器。

## 后果

- `vite-plus@1.7.0` 在 `2026-11-18T03:34:01Z` 之后才具备后续升级条件；不增加项目级排除。
- 交付的 forge bundle 同时携带两个 `entities` 版本，两者都在根 notices 与 skill-root notices 中可见。
- 根开发 Node 范围窄于交付 bundle 的运行时范围，因此每份文档都说明自己治理的环境。
- formatter、parser 与生成的 bundles 一起变化，因此必须运行完整 corpus、bundle、notice、parser 与测试检查。

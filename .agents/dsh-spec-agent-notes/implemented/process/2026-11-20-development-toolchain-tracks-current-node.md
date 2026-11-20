# Agent Note: Development toolchain tracks the current Node implementation

Status: implemented

English | [中文](2026-11-20-development-toolchain-tracks-current-node.zh.md)

## Problem

The repository's checks are TypeScript run directly by Node, and its shipped skills are self-contained ESM bundles. Retaining Node 22 expands the compatibility work across syntax, APIs, dependencies and static analysis while Node 24 is the oldest supported implementation the package needs. The repository also needs one gate that makes formatting, lint and TypeScript diagnostics fail separately, without turning the functional suite into a second runner.

## Decision

Development and the primary CI baseline use Node 26. CI also runs the exact minimum, Node 24.11.0, so the declared runtime and shipped bundles retain observable coverage there. The supported runtime is `^24.11.0 || >=26.0.0`; Node 22 is not supported.

[Opening this repository](2026-09-24-opening-this-repository.md) retains the CI workflow's publication and permission decisions; this note owns its runtime lines and matrix.

Toolchain and implementation choices follow the current maintained Node lines. When implementation moves, the declaration and evidence move with it: the runtime range, type definitions, bundle target and CI matrix are updated to match instead of retaining an unsupported Node line through compatibility branches.

`vite-plus@1.7.0` supplies Oxfmt, Oxlint and `tsrs`. `pnpm run check:static` runs `vp check --continue-on-error --deny-warnings`, with type-aware lint and TypeScript diagnostics enabled by the root `vite.config.ts` and `tsconfig.json`. The TypeScript program loads ES2024 and Node declarations without the DOM library, so Node-only source cannot rely on browser globals that fail at runtime. `@types/node@24.11.0` keeps the checked API surface at the minimum supported runtime, and every shipped script bundle targets Node 24. Dependency selection remains governed by [Direct dependencies use the supply-chain maturity window](2026-11-17-direct-dependencies-use-the-maturity-window.md).

`node:test` remains the functional test runner. The repository tests native Node TypeScript execution and subprocess behaviour, and a Vitest migration would not add evidence for those paths.

## Alternatives considered

- **Retain Node 22 compatibility.** Node 22 is outside the supported implementation range and keeping it would constrain syntax, APIs and toolchain choices without serving a required adopter runtime.
- **Implement against Node 22, then relax the range later.** This reverses the requirement: implementation quality would be limited first, and newer Node capabilities would need a second migration before they could be used.
- **Use only Node 26 in CI.** This would leave the declared Node 24 runtime and bundle output untested.
- **Migrate the suite to Vitest.** The suite already uses Node's native TypeScript execution and `node:test`; Vitest would add a parallel test vocabulary without improving coverage of those behaviours.
- **Run `vp lint` alone as the static gate.** It checks lint and types but omits the formatting decision, so local and CI would need separate commands to enforce the same source standard.

## Consequences

- Contributors need Node 24.11+ or 26+; the primary development baseline is Node 26.
- The CI matrix runs the complete checks on Node 24.11.0 and Node 26, trading duplicate runtime for evidence on the exact minimum and the primary development line.
- Type definitions and bundle targets are part of the runtime contract and move with it.
- Source formatting, warning-level lint and TypeScript diagnostics each reject the static gate independently; the functional suite remains `pnpm test`.

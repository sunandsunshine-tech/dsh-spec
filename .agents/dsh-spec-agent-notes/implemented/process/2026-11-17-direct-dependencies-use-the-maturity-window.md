# Agent Note: Direct dependencies use the supply-chain maturity window

Status: implemented

English | [中文](2026-11-17-direct-dependencies-use-the-maturity-window.zh.md)

## Problem

Direct dependency upgrades need a repeatable boundary. Taking the registry latest immediately can cross the selected pnpm environment's strict package-maturity window, while one-off overrides make the local and CI supply-chain rules disagree. Separately, upgrading `parse5` makes the shipped bundles inline both `entities@8.1.0` and `entities@9.0.0`, while the notice reader keyed packages by name and retained only one version.

## Decision

Implementation and tooling dependencies use the registry's latest version that satisfies the active package-maturity policy. A type-definition package that encodes a runtime API floor is selected by that contract instead: `@types/node` tracks the lowest supported runtime so compilation cannot admit newer-only APIs. The selected root dependencies remain exact pins; existing workspace package ranges retain their range style. An upgrade deferred by that policy is a later follow-up rather than a project-level exception.

`vite-plus@1.7.0`, `@types/node@24.11.0`, `parse5@8.1.1` and `mdast-util-from-markdown@2.1.0` are the selected direct versions. pnpm remains `12.21.0`; the root Node engine is `^24.11.0 || >=26.0.0`; and `pnpm/setup` is pinned to `v3.2.0`.

The root Node range and shipped bundle target follow [Development toolchain tracks the current Node implementation](2026-11-20-development-toolchain-tracks-current-node.md).

Vendored-package discovery keys rows by package name and version together. The generated notice table and skill-root notices may contain multiple rows for one package name, and every inlined version must be listed. Dependency submission already keys package URLs by the complete versioned purl.

## Alternatives considered

- **Override the maturity window for `vite-plus@1.7.0`.** It would make the registry-latest release immediately available but disable a supply-chain safeguard while that version remains inside the cooldown.
- **Remain on `vite-plus@1.6.0` after `1.7.0` leaves the cooldown.** The older release would avoid a toolchain refresh but retain the previous `tsgolint` type-checking surface instead of the repository's `tsrs` integration.
- **Keep `parse5@8.0.1` to preserve one `entities` version.** It would avoid the new notice shape at the cost of deferring the security and parser fixes in `8.1.1`, and the notice reader would remain unable to represent legitimate duplicate versions.
- **Keep notices keyed by package name.** The table would silently omit one of two inlined versions and understate the dependency graph.
- **Treat dependency-managed GitHub Actions as part of the same manual bump.** Dependabot already owns their SHA updates; only the current `pnpm/setup` release is included here because it is the package-manager installer for the pinned pnpm.

## Consequences

- `vite-plus@1.7.0` has passed the package-maturity window and is selected without a project-level exclusion.
- The shipped forge bundle carries both `entities` versions, and both are visible in root and skill-root notices.
- The root development and shipped runtime ranges describe the same supported Node lines.
- Full corpus, bundle, notice, parser and suite checks are required because the formatter, parser and generated bundles move together.

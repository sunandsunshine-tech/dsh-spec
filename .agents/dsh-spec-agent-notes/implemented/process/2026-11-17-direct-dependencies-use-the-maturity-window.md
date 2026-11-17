# Agent Note: Direct dependencies use the supply-chain maturity window

Status: implemented

English | [中文](2026-11-17-direct-dependencies-use-the-maturity-window.zh.md)

## Problem

The registry latest `vite-plus@1.7.0` is newer than the selected pnpm environment's strict package-maturity window. Installing it would require a project-level exception to a supply-chain guard. Separately, upgrading `parse5` makes the shipped bundles inline both `entities@8.1.0` and `entities@9.0.0`, while the notice reader keyed packages by name and retained only one version.

## Decision

Direct dependencies use the registry's latest version that satisfies the active package-maturity policy. The selected root dependencies remain exact pins; existing workspace package ranges retain their range style. An upgrade deferred by that policy is a later follow-up rather than an exception in this change.

`vite-plus@1.6.0`, `parse5@8.1.1` and `mdast-util-from-markdown@2.1.0` are the selected direct versions. pnpm remains `12.21.0`; the root Node engine is `^22.19.0 || ^24.11.0 || >=26.0.0`; and `pnpm/setup` is pinned to `v3.2.0`.

The root Node range is the development-toolchain range. Shipped script bundles retain their Node 22 syntax target and their own adopter runtime compatibility.

Vendored-package discovery keys rows by package name and version together. The generated notice table and skill-root notices may contain multiple rows for one package name, and every inlined version must be listed. Dependency submission already keys package URLs by the complete versioned purl.

## Alternatives considered

- **Override the maturity window for `vite-plus@1.7.0`.** It would make the registry-latest release immediately available but disable a supply-chain safeguard while that version remains inside the cooldown.
- **Keep `parse5@8.0.1` to preserve one `entities` version.** It would avoid the new notice shape at the cost of deferring the security and parser fixes in `8.1.1`, and the notice reader would remain unable to represent legitimate duplicate versions.
- **Keep notices keyed by package name.** The table would silently omit one of two inlined versions and understate the dependency graph.
- **Treat dependency-managed GitHub Actions as part of the same manual bump.** Dependabot already owns their SHA updates; only the current `pnpm/setup` release is included here because it is the package-manager installer for the pinned pnpm.

## Consequences

- `vite-plus@1.7.0` becomes eligible for a later upgrade after `2026-11-18T03:34:01Z`; no project-level exclusion is added.
- The shipped forge bundle carries both `entities` versions, and both are visible in root and skill-root notices.
- The root development Node range is narrower than the shipped bundle runtime range, so each document names the environment it governs.
- Full corpus, bundle, notice, parser and suite checks are required because the formatter, parser and generated bundles move together.

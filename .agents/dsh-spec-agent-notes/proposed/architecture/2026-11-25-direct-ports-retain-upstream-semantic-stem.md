# Agent Note: Direct ports retain their upstream semantic stem

Status: proposed

English | [中文](2026-11-25-direct-ports-retain-upstream-semantic-stem.zh.md)

## Problem

The skill set contains direct ports, generalized ports and composites built from several upstream workflows. When every port receives an intent-based new name, an adopter cannot recognize its upstream source from the catalog, and historical evidence becomes difficult to map to the skill that now carries the same task family. The current performance skill is a concrete example: its behavior descends from `dsh-speed-up-perf`, but its name no longer preserves that semantic stem.

## Proposal

A skill that carries one upstream workflow directly or as a generalized port keeps that workflow's semantic stem under the `dsh-spec-` namespace. Only a composite or a genuinely merged scope may adopt a new name, and its forge record must name every upstream input and the reason the merged name is more accurate.

The performance reforge tracked by #135 and proposed in [Reforge performance from dsh-speed-up-perf](../feature/2026-11-25-reforge-performance-as-dsh-speed-up-perf.md) restores the name `dsh-spec-speed-up-perf`. The implemented [performance investigation record](../../implemented/feature/2026-11-24-forging-dsh-spec-performance-investigation.md) remains the owner of the current name until that reforge lands.

### Migration boundary

A rename updates current skill directories, frontmatter, installed copies, package and bundle banners, tests, notices, documentation and current Agent Note references. Historical model runs retain the names and hashes they actually exercised; they do not become evidence for the renamed skill. A description change caused by the rename requires fresh trigger evidence.

## Alternatives considered

**Use the exact upstream name without the package prefix.** It maximizes literal recognition, but collides with an upstream installation and makes provenance the only way to identify which skill set is loaded.

**Choose a new intent-based name for every generalized port.** It can describe the target package's framing, but it breaks recognizable provenance and makes old and new evidence harder to connect.

**Keep the current names and document the mapping only in README.** It avoids migration work, but discoverability before loading a skill depends on the catalog name; a source table elsewhere does not repair the semantic stem.

## Acceptance criteria

- Every single-source direct or generalized port is named `dsh-spec-<upstream-semantic-stem>`.
- Every composite or merged-scope name has a recorded upstream set and an explicit naming reason.
- Current references use the proposed name consistently; historical evidence keeps its recorded name and hash.
- The performance skill is migrated under the separate #135 implementation work rather than by a naming-only alias.
- The bilingual record and corpus checks pass when this proposal is implemented.

## Risks

- Similar upstream stems can still produce ambiguous names when two sources cover different parts of one workflow.
- Renaming invalidates old trigger evidence and may require a staged migration for adopters that installed the former name.
- An excessively literal naming rule can preserve an upstream brand that is not meaningful to a general adopter; the semantic-stem test permits a recorded exception only for genuinely merged scopes.

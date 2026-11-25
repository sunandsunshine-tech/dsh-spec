# Agent Note: Direct ports retain their upstream semantic stem

Status: proposed

English | [中文](2026-11-25-direct-ports-retain-upstream-semantic-stem.zh.md)

## Problem

The skill set contains direct ports, generalized ports and composites built from several upstream workflows. When every port receives an intent-based new name, an adopter cannot recognize its upstream source from the catalog, and historical evidence becomes difficult to map to the skill that now carries the same task family. The current performance skill is a concrete example: its behavior descends from `dsh-speed-up-perf`, but its name no longer preserves that semantic stem.

## Proposal

A skill that carries one upstream workflow directly or as a generalized port keeps that workflow's semantic stem under the `dsh-spec-` namespace. Only a composite or a genuinely merged scope may adopt a new name, and its forge record must name every upstream input and the reason the merged name is more accurate.

### Shipped naming choices

The direct-port renames in #126 ship two applications of the proposal: `dsh-ci-test-reliability` is installed as `dsh-spec-ci-test-reliability`, and `record-browser-gif` is installed as `dsh-spec-record-browser-gif`.

`dsh-spec-agent-notes`, `dsh-spec-client-ui-ux` and `dsh-spec-prose-standard` retain composite names. Their forge records name the upstream workflows they incorporate. [README.md](../../../../README.md) exposes those merged inputs in the adopter-facing catalog.

### Unresolved decisions

The current `dsh-spec-performance-investigation` skill is a single-source generalized port and does not yet satisfy the naming rule. Its substantive reforge remains proposed in [Reforge performance from dsh-speed-up-perf](../feature/2026-11-25-reforge-performance-as-dsh-speed-up-perf.md) and is tracked by #135. The implemented [performance investigation record](../../implemented/feature/2026-11-24-forging-dsh-spec-performance-investigation.md) remains the owner of the shipped skill until that reforge lands. A name-only alias is not the migration path.

Issue #144 questions whether retaining `ci-` in `dsh-spec-ci-test-reliability` still names the generalized skill's scope accurately. Its outcome can revise the direct-port mapping or define the recorded exception for a generalized port. The naming proposal remains open until #135 and #144 establish the current name-scope rules.

### Migration boundary

A rename updates current skill directories, frontmatter, installed copies, package and bundle banners, tests, notices, documentation and current Agent Note references. Historical model runs retain the names and hashes they actually exercised; they do not become evidence for the renamed skill. A description change caused by the rename requires fresh trigger evidence.

## Alternatives considered

**Use the exact upstream name without the package prefix.** It maximizes literal recognition, but collides with an upstream installation and makes provenance the only way to identify which skill set is loaded.

**Choose a new intent-based name for every generalized port.** It can describe the target package's framing, but it breaks recognizable provenance and makes old and new evidence harder to connect.

**Keep the current names and document the mapping only in README.** It avoids migration work, but discoverability before loading a skill depends on the catalog name; a source table elsewhere does not repair the semantic stem.

## Acceptance criteria

- Every single-source direct or generalized port is named `dsh-spec-<upstream-semantic-stem>`.
- Every composite or merged-scope name has a recorded upstream set and an explicit naming reason.
- Current references use the proposed name consistently; historical evidence keeps its recorded names and hashes.
- The performance reforge in #135 and the CI test-reliability name-scope decision in #144 settle the remaining direct-port mappings without name-only aliases.
- The bilingual record and corpus checks pass when this proposal is implemented.

## Risks

- Similar upstream stems can still produce ambiguous names when two sources cover different parts of one workflow.
- Renaming invalidates old trigger evidence and may require a staged migration for adopters that installed the former name.
- An excessively literal naming rule can preserve an upstream brand that is not meaningful to a general adopter; the semantic-stem test permits a recorded exception only for genuinely merged scopes.
- A semantic stem can remain recognizable while its scope narrows, making the catalog misleading even though the name was copied from upstream; #144 is the current example.

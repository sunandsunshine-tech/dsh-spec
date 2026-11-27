# Agent Note: Single-source ports retain their upstream semantic stem

Status: proposed

English | [中文](2026-11-25-single-source-ports-retain-upstream-semantic-stem.zh.md)

## Problem

The skill set contains single-source direct ports, single-source generalized ports and composites built from several upstream workflows. When every port receives an intent-based new name, an adopter cannot recognize its upstream source from the catalog, and historical evidence becomes difficult to map to the skill that now carries the same task family. The former performance skill was a concrete example before #135: its behavior descended from `dsh-speed-up-perf`, but its name did not preserve that semantic stem.

## Proposal

A single-source direct or generalized port keeps its upstream workflow's semantic stem under the `dsh-spec-` namespace. Only a composite or a genuinely merged scope may adopt a new name, and its forge record must name every upstream input and the reason the merged name is more accurate.

### Shipped naming choices

The direct-port renames in #126 ship two applications of the proposal: `dsh-ci-test-reliability` is installed as `dsh-spec-ci-test-reliability`, and `record-browser-gif` is installed as `dsh-spec-record-browser-gif`.

Issue #144 implemented the proposal for a generalized single-source port. `dsh-ci-test-reliability` keeps its semantic stem as `dsh-spec-ci-test-reliability`, and the skill scopes the generalized behavior to CI or an equivalent test lane. Production performance remains outside it.

Issue #135 applies the rule to the generalized performance port: `dsh-speed-up-perf` is installed as `dsh-spec-speed-up-perf`.

`dsh-spec-agent-notes`, `dsh-spec-client-ui-ux` and `dsh-spec-prose-standard` retain composite names. Their forge records name the upstream workflows they incorporate. [README.md](../../../../README.md) exposes those merged inputs in the adopter-facing catalog.

### Unresolved decisions

No mapping from #135 or #144 remains unresolved. The proposal stays open only while future single-source ports are reviewed against the rule.

### Migration boundary

A rename updates current skill directories, frontmatter, installed copies, package and bundle banners, tests, notices, documentation and current Agent Note references. Historical model runs retain the names and hashes they actually exercised; they do not become evidence for the renamed skill. A description or trigger-corpus change, including a scope correction without a rename, requires fresh trigger evidence.

## Alternatives considered

**Use the exact upstream name without the package prefix.** It maximizes literal recognition, but collides with an upstream installation and makes provenance the only way to identify which skill set is loaded.

**Choose a new intent-based name for every generalized port.** It can describe the target package's framing, but it breaks recognizable provenance and makes old and new evidence harder to connect.

**Keep the current names and document the mapping only in README.** It avoids migration work, but discoverability before loading a skill depends on the catalog name; a source table elsewhere does not repair the semantic stem.

## Acceptance criteria

- Every single-source direct or generalized port is named `dsh-spec-<upstream-semantic-stem>`.
- Every composite or merged-scope name has a recorded upstream set and an explicit naming reason.
- Current references use the proposed name consistently; historical evidence keeps its recorded names and hashes.
- The #135 and #144 renames settle the known single-source mappings without name-only aliases.
- The bilingual record and corpus checks pass when this proposal is implemented.

## Risks

- Similar upstream stems can still produce ambiguous names when two sources cover different parts of one workflow.
- Renaming invalidates old trigger evidence and may require a staged migration for adopters that installed the former name.
- An excessively literal naming rule can preserve an upstream brand that is not meaningful to a general adopter; the semantic-stem test permits a recorded exception only for genuinely merged scopes.
- A recognized semantic stem still has to advertise the bounded scope in the title, description and instructions.

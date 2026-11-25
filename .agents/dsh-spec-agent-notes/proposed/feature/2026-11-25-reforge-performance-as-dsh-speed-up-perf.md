# Agent Note: Reforge performance from dsh-speed-up-perf

Status: proposed

English | [中文](2026-11-25-reforge-performance-as-dsh-speed-up-perf.zh.md)

## Problem

The current `dsh-spec-performance-investigation` skill preserves the main measurement sequence but compresses several upstream responsibilities whose distinction changes the result: benchmark, gate, profiling and evidence boundaries; which tools the project may select; measurement semantics; identity and privacy constraints; ambient dependencies; cold-start and process-memory handling; permitted behavior differences; and explicit evidence limits. Removing the upstream semantic stem also weakens provenance.

## Proposal

Reforge the skill from `.agents/skills/dsh-speed-up-perf/SKILL.md` at `dsh-v0.2.3-alpha.2` (`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`) as `dsh-spec-speed-up-perf`.

The reforge preserves the upstream responsibilities as generalized requirements while replacing DSH-only infrastructure with the adopting project's declared measurement and review mechanisms. It does not copy DSH benchmark paths, fixed budgets, product lifecycle examples, machine calibration or CI lanes.

### Boundaries to preserve

- Benchmarks, required gates, profiling, optimization and reported evidence remain distinct decisions.
- The acting model and project select capable tools; the skill neither assumes ambient tools nor downloads a substitute to bypass a missing capability.
- A measurement states its clock, warm/cold state, included setup, completion condition, aggregate and excluded costs.
- Generated identifiers, private data and recognizable inputs do not enter fixtures or retained evidence.
- Benchmarks use reviewed constants and do not depend on the user's home, ambient repository, network service or private corpus.
- Cold-start runs use fresh processes or children; process memory distinguishes reachable retained state from transient pressure.
- Deliberate behavior differences are named, authorized and verified, while ordinary behavior and resource ownership are preserved.
- Evidence limits are reported with the result rather than hidden behind a universal threshold.

The current [performance investigation record](../../implemented/feature/2026-11-24-forging-dsh-spec-performance-investigation.md) remains the owner of the shipped skill until implementation. This proposal prepares its reforge and uses the naming rule in [Direct ports retain their upstream semantic stem](../architecture/2026-11-25-direct-ports-retain-upstream-semantic-stem.md).

Tracking: #135. Earlier evaluation is recorded by #123 and landed through #129.

## Alternatives considered

**Copy the upstream skill almost verbatim.** It preserves every upstream responsibility, but carries DSH paths, budgets, calibration and product workflows into unrelated projects.

**Keep the current generalized text and rename it only.** It fixes discoverability, but leaves the measurement and evidence boundaries that motivated the reforge unchanged.

**Drop DSH infrastructure without a responsibility map.** It avoids ecosystem-specific assumptions, but can silently lose the reason each benchmark, gate, profile or evidence step exists.

## Acceptance criteria

- The skill is named `dsh-spec-speed-up-perf` and its forge record names the source revision and semantic-stem relation.
- Each listed boundary has a current paragraph, reference or explicit disposition; DSH-only infrastructure has a recorded replacement or dissolution reason.
- The skill uses project-owned tools and evidence, with a capability-absent handoff instead of an ambient dependency.
- Cold-start, process memory, privacy, identity and deliberate behavior differences have reviewable acceptance cases.
- Description trigger evidence covers positive and near-miss routing, and behavior evidence is rerun for the new text.
- The former `dsh-spec-performance-investigation` unit is superseded or updated in the same implementation change.

## Risks

- A generalized reforge can preserve the words while losing the causal purpose of an upstream boundary; the responsibility map must review meaning, not copied structure.
- Benchmarks are expensive and environment-sensitive, so weak scenarios may produce precise-looking but non-transferable evidence.
- Renaming can invalidate old trigger evidence while old behavior traces remain useful only as history.
- The new skill may still be unnecessary if isolated baselines show no benefit over capable no-skill behavior; that result narrows the ROI claim and may reject the reforge.

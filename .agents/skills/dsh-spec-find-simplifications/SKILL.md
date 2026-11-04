---
name: dsh-spec-find-simplifications
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
description: "Find evidence-backed simplifications in a project's code, APIs, configuration, tests, and prose; write or consolidate proposals, identify small inline cleanups, or assess simplifications from another branch. Use for removing dead, duplicated, speculative, or unnecessarily maintained behavior and infrastructure. 用于在软件工程项目的代码、API、配置、测试和文档与注释中寻找有证据支撑的简化；撰写或合并提案，标记小型内联清理，或评估来自其他分支的简化。适用于移除死代码、重复、投机性或维护成本过高的行为与基础设施。"
---

# Finding simplifications

Find changes that remove maintained obligations: APIs, representations, lifecycle states, configuration paths, dependencies, tests or documentation. Prefer a few well-supported candidates over a count of deletions. This text is guidance, not a checklist: keep the user's scope, and treat a survey as distinct from permission to implement its proposals.

## Establish scope and constraints

Read the project's declaration (`AGENTS.md`, `CLAUDE.md`, or the file it points to) and the documents it names for architecture, design constraints and testing before judging a subsystem. When the project has no declaration, read its README and module documentation for the same constraints. Consult the active decision records for intentional decisions, and use the project's record workflow for a new record. Archived records are historical examples, not current authority: never inspect, verify or repair their outbound links.

Some designs are intentional even when they look redundant. The project declaration, its decision records, or the user may protect a design; do not propose deleting one unless the user explicitly overrides that constraint. Unused members within a protected design remain candidates when their removal preserves its purpose.

For a broad request, divide independent domains among subagents. Give each a bounded domain — a subsystem, package or layer, or one kind of surface such as runtime core, integrations, user interfaces, configuration and composition, or scripts, tests and documentation — and require consumer evidence and rejected alternatives from each. Inspect substantial production machinery as well as obvious unused symbols; do not stop after the first promising deletion.

## Search for removable obligations

Use these questions to guide discovery, and read the relevant section of [the historical patterns](references/historical-patterns.md) when a candidate needs calibration; the examples there illustrate decisions, not a current deletion inventory.

- **Does a declared feature have a complete effect path?** Trace producer, transformations, provider or endpoint support, and observable result. A field copied everywhere may still have no setter, no reader, or only implementations that reject it. Search constructors and discriminant emitters as well as callers.
- **Which distinctions change a consumer's action?** Several internal states may require one consumer-facing status or one usable identifier. Keep internal distinctions that control authorization, residency, durability or ownership; remove public distinctions that only invite an unusable choice.
- **Could a smaller explicit behavior remove the subsystem?** Fixed intervals, caller-supplied time zones or reported activation failure can eliminate generalized calendars, persisted defaults or automatic rollback. Name the capability given up and the machinery deleted. A production caller makes this a behavior decision, not an automatic rejection; implementation must remain within the user's authorization.
- **Can a consumer read the authoritative value when needed?** Look for copied histories, promotion ledgers, invalidation events followed by reads, and feature caches beside a shared projection stream. Derivation or reuse may delete subscriptions, retained data, stale-response handling and recovery paths together. Establish the required time of observation first.
- **Is composition being mistaken for policy?** Optional service presence, a provider method, or a sibling tool can express availability without deciding deployment behavior. Explicit configuration or a caller-intent operation may remove registries and dependency checks. Preserve distinct operations when their ownership or completion timing differs.
- **What owns the complete maintenance cost?** Trace pass-through configuration, duplicate application trees, demo launchers used by products, resolver-only workspaces, and installation helpers with their own upgrade lifecycle. Compare the entire removed system with the replacement, including residual glue; moving complexity or adding a gate to keep duplicate definitions equal does not remove it.

## Prove reachability and the trade-off

Start with `rg`, then read the matches; a project without `rg` uses its own search tool. Search exact symbols, property reads and writes, discriminants, event and wire strings, config keys, package names, and both `.method(` and `method(` forms. Tests and declarations can show a contract without proving a shipped producer or consumer.

Include every source tree in the repository, its runtime and build scripts, shipped configuration and profiles, package manifests and export maps, loader or plugin resolution, generated runtime assets, and installed consumers of the package. Classify examples and fixtures by their actual entry point rather than by directory name. Follow generated catalogs to their consumers: a catalog consumed through dynamic resolution is a dynamic consumer surface, while a documentation-only listing is not a fixed caller. Public third-party extension paths can be intentional despite zero repository call sites. A static unused-code checker must cover manifest-driven loading, generated outputs and build or compiler surfaces without maintaining a parallel per-area exception inventory.

For each candidate, record its current owner, its effective producer/consumer path, what disappears, what remains, and the strongest reason to retain it. Distinguish:

- removal of unreachable or unread behavior;
- a narrower public or product behavior with an explicit loss;
- a protected obligation or insufficient evidence.

Reject a candidate when it breaks a retained obligation, merely relocates the same complexity, or has no meaningful reduction. Read rejection reasons at the level of the proposed change: a stale inventory or a mixed proposal's rejected behavior does not settle every independent item. Refresh the evidence before re-proposing one. Small local improvements belong in actionable `TODO`/`FIXME`/`XXX` comments under the project's marker convention, not standalone decision records.

## Preserve ownership and failure semantics

For copies, freezes, validators and callback captures, name the value's origin, next owner and trust boundary. Typed same-process calls ordinarily borrow readonly values; parsers, config loaders, queues, untrusted JSON, durable files, workers, processes and wire decoders own or validate their inputs. Hostile-getter or callback-replacement tests do not establish a requirement by themselves. A frozen root does not prove its descendants immutable, and equal ids do not prove object identity.

For asynchronous machinery, map each promise, flag, cancellation path, disposer and reservation to its owner and transition. Collapse mechanisms only when they express the same fact. Preserve synchronous publication and rollback, callback containment, first-terminal-outcome arbitration, worker/process ownership and dispose-to-quiescence where required. Durable start and end markers can record real facts even when presentation layers ignore them; dropping interrupted work is a capability loss, not redundant-log cleanup.

## Replace infrastructure only for a net reduction

Follow the project's dependency policy. Search existing dependencies and the runtime's builtins at the supported runtime floor before adding a package. Identify the exact implementation and dedicated tests the replacement deletes, its maintenance and transitive cost, and every residual behavior the glue must preserve.

Exercise the mismatches most likely to defeat the replacement: protocol truncation, cancellation and teardown, configured bounds, deterministic test clocks, platform packaging, and source versus built entry points. A library that covers framing but requires rebuilding the same framing to enforce a size limit is not a simplification. An accepted edge-behavior change belongs in the proposal and the relevant tests. Do not re-prove a dependency's generic specification while omitting tests for the project-specific shim.

## Record, consolidate, and validate

When prose is in scope, follow the project's prose conventions (when available, use the `dsh-spec-prose-standard` skill). Remove code-restating or remotely owned explanations while preserving local behavior, timing, ownership and failure obligations. Update affected READMEs, API documentation, public catalogs, configuration, snapshots and generated files with their owning change.

A substantial proposal uses the project's decision-record format (when available, use the `dsh-spec-agent-notes` skill's skeleton `Problem`, `Proposal`, `Alternatives considered`, `Acceptance criteria`, `Risks`). Include concrete consumer evidence, the removed maintenance cost, the capability given up, and observable acceptance conditions. An implemented decision uses the implemented format instead. Update an existing owner when the decision is the same; do not create duplicate records to preserve candidate counts.

Every new record requires a scoped supersession check through the project's decision-record workflow (when available, use the `dsh-spec-agent-notes` skill). That workflow owns retention, consolidation, deletion of whole records together with their companions where the project keeps them, and frozen archive mechanics. A code survey does not imply a repository-wide record audit. Preserve partial supersessions and current durable, wire, compatibility or rejected-alternative obligations.

When folding another branch, compare its independent diff against the target base, port only supported non-overlapping proposals, and consolidate overlapping rationale. Closing another pull request requires authorization or clear ownership of that housekeeping.

Run the checks the project declares for each surface the change touches, and include `git diff --check`; when the project declares no check for a surface, report that gap rather than inventing one. Select the smallest check set that covers the change through the project's own practice (when available, use the `dsh-spec-pre-push-checks` skill). Report the surveyed areas, supported candidates, meaningful rejections or deferrals, records added, consolidated, retained or removed, and the commands actually run. While the survey is expanding, keep the change visibly incomplete, for example a draft pull request; do not describe an unverified search as exhaustive.

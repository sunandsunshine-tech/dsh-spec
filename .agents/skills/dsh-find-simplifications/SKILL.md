---
description: 'Use when finding evidence-backed simplifications in a project''s code, APIs, configuration, tests, or prose: remove dead, duplicated, speculative, or unnecessarily maintained behavior and infrastructure, write or consolidate proposals, mark small inline cleanups, or assess simplifications from another branch.'
metadata:
    github-path: skills/dsh-find-simplifications
    github-ref: refs/heads/chore/drop-verification-section
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: 3867056781e6fb832c2849c3cc3b0573ecfc8e8a
name: dsh-find-simplifications
---
# Finding simplifications

Find changes that remove maintained obligations: APIs, representations, lifecycle states, configuration paths, dependencies, tests, or documentation. Prefer a few well-supported candidates over a count of deletions. This is guidance, not a checklist; keep the user's scope and distinguish a survey from permission to implement its proposals.

## Establish scope and constraints

Read the project's `AGENTS.md` first, then whatever it keeps about its architecture, its defensive patterns and its testing. Consult the active Agent Notes for intentional decisions, and [the Agent Note rules](../dsh-spec-manager/templates/notes-README.md.template) for new records. Archived notes are historical examples, not current authority: never inspect, verify, or repair their outbound links.

Some designs are deliberate and stay: a seam that exists so an out-of-tree implementer can plug in, two providers kept on purpose, a format chosen for a consumer that already depends on it. Do not propose deleting one of those unless the user explicitly overrides the constraint; unused members *within* a protected design remain candidates when their removal preserves its purpose.

For a broad request, divide independent domains among subagents — the project's subsystems, their consumers, their tests, and their documentation — and give each agent a bounded domain, consumer evidence, and rejected alternatives. Inspect substantial production machinery as well as obvious unused symbols, and do not stop after the first promising deletion.

## Search for removable obligations

Use these questions to guide discovery. Read the relevant section of [historical patterns](references/historical-patterns.md) when a candidate needs calibration: each section states a judgement, the forces it weighs and what would reverse it, and the cases behind it — recorded decisions, not a current deletion inventory.

- **Does a declared feature have a complete effect path?** Trace producer, transformations, provider or endpoint support, and observable result. Search constructors and discriminant emitters as well as callers.
- **Which distinctions change a consumer's action?** Map every public variant to the consumer action it enables, and keep the internal distinctions that still control authorization, residency, durability, or ownership.
- **Could a smaller explicit behavior remove the subsystem?** Name the capability given up and the machinery deleted. A production caller makes this a behavior decision rather than an automatic rejection; implementation must remain within the user's authorization.
- **Can a consumer read the authoritative value when needed?** Derivation or reuse may delete subscriptions, retained data, stale-response handling, and recovery paths together. Establish the required time of observation first.
- **Is composition being mistaken for policy?** Optional service presence, a provider method, or a sibling tool can express availability without deciding deployment behavior. Explicit configuration or a caller-intent operation may remove registries and dependency checks. Preserve distinct operations when their ownership or completion timing differs.
- **What owns the complete maintenance cost?** Compare the entire removed system with the replacement, including residual glue; moving complexity, or adding a gate that keeps duplicate definitions equal, does not remove it.

## Prove reachability and the trade-off

Start with a text search, then read the matches. Search exact symbols, property reads and writes, discriminants, event and wire strings, configuration keys, package names, and both `.method(` and `method(` forms. Tests and declarations can show a contract without proving a shipped producer or consumer.

Include the project's source trees, its runtime scripts, the configuration and profiles it ships, its package manifests and exports, its loader resolution, its generated assets, and whatever its installed consumers see. Classify examples and fixtures by their actual entry point rather than by directory name. Follow generated catalogs to their consumers: a catalog that a plugin written elsewhere mounts is a dynamic product API, while a documentation-only listing is not a fixed caller. A public third-party extension path can be intentional despite having no call site in the repository.

For each candidate, record the current owner, the effective producer and consumer path, what disappears, what remains, and the strongest reason to keep it. Distinguish:

- removal of unreachable or unread behavior;
- a narrower public or product behavior with an explicit loss;
- a protected obligation or insufficient evidence.

Reject a candidate when it breaks a retained obligation, merely relocates the same complexity, or has no meaningful reduction. Read rejection reasons at the level of the proposed change: a stale inventory, or one rejected item inside a mixed proposal, does not settle every independent item, and the evidence is refreshed before one is re-proposed. Small local improvements belong in actionable `TODO`/`FIXME`/`XXX` comments beside the code rather than in standalone design records.

## Preserve ownership and failure semantics

For copies, freezes, validators, and callback captures, name the value's origin, its next owner, and its trust boundary. Typed same-process calls ordinarily borrow readonly values; parsers, configuration loaders, queues, model or tool JSON, durable files, workers, processes, and wire decoders own or validate their inputs. Hostile-getter or callback-replacement tests do not establish a requirement by themselves. A frozen root does not prove its descendants immutable, and equal identifiers do not prove object identity.

For asynchronous machinery, map each promise, flag, cancellation path, disposer, and reservation to its owner and its transition. Collapse mechanisms only when they express the same fact. Preserve synchronous publication and rollback, callback containment, first-terminal-outcome arbitration, worker and process ownership, and dispose-to-quiescence where they are required. Durable start and end markers can record real facts even when a renderer ignores them; dropping interrupted work is a capability loss, not redundant-log cleanup.

An invariant companion is justified by comparing independently produced observations that can diverge. Checks of service presence, plugin metadata, fixed examples, or the return value of the same mutation do not qualify. Removing a companion includes its export, its build entry, its invariant-only compiler references, its dependencies, and its tests; record the package-specific omission reason in the project's own documentation. Keep the checks that compare independent event producers, durable history, or independently mutable data.

## Replace infrastructure only for a net reduction

Search the dependencies the project already has, and the platform builtins, before adding a package. Identify the exact implementation and the dedicated tests a replacement deletes, its maintenance and transitive cost, and every residual behavior the glue must preserve.

Exercise the mismatches most likely to defeat the replacement: protocol truncation, cancellation and teardown, configured bounds, deterministic test clocks, platform packaging, and source versus built entry points. A library that covers framing but requires rebuilding the same framing to enforce a size limit is not a simplification. An accepted edge-behavior change belongs in the proposal and the tests that cover it. Do not re-prove a dependency's generic specification while omitting tests for the project's own shim.

## Record, consolidate, and validate

Use [dsh-prose-standard](../dsh-prose-standard/SKILL.md) when prose is in scope. Remove code-restating or remotely owned explanations while preserving local behavior, timing, ownership, and failure obligations. Update the READMEs, API documentation, model-visible catalogs, configuration, snapshots, and generated files that the change affects, with the change that owns them.

A substantial proposal uses the mandatory note skeleton: `## Problem`, `## Proposal`, `## Alternatives considered`, `## Acceptance criteria`, `## Risks`, as [the Agent Note rules](../dsh-spec-manager/templates/notes-README.md.template#the-body-skeleton) define it. Include concrete consumer evidence, the maintenance cost removed, the capability given up, and observable acceptance conditions. An implemented decision uses the implemented skeleton instead. Update an existing owner when the decision is the same; do not create duplicate notes to preserve a candidate count.

Every new note requires a scoped supersession check through [dsh-archive-agent-notes](../dsh-archive-agent-notes/SKILL.md). That workflow owns retention, consolidation, triplet deletion, and the frozen archive mechanics. A code survey does not imply a repository-wide note audit. Preserve partial supersessions and the current durable, wire, compatibility, or rejected-alternative obligations.

When folding another branch, compare its independent diff against the target base, port only the supported non-overlapping proposals, and consolidate the overlapping rationale. Closing someone else's pull request requires authorization or clear ownership of that housekeeping.

Run the project's aggregate check, its documentation or lint gates where it has them, and `git diff --check`; select any further evidence through [dsh-pre-push-checks](../dsh-pre-push-checks/SKILL.md). Report the areas surveyed, the supported candidates, the meaningful rejections or deferrals, the notes added, consolidated, retained or removed, and the commands actually run. Use a draft pull request while a survey is expanding, and do not describe an unverified search as exhaustive.

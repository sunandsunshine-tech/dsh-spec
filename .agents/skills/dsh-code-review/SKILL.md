---
description: Use when reviewing a pull request in this repository — orients the reviewer to this codebase's standards (AGENTS.md conventions, defensive patterns, decision records, quality gates) and the review-specific checks that code alone can't show
metadata:
    github-path: skills/dsh-code-review
    github-ref: refs/heads/feat/agent-experience-skill
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: ea3ae85e6e4016d628c185f84dbf4c27a004741c
name: dsh-code-review
---
# Reviewing a pull request

**This skill is guidance, not a complete checklist.** Verify and fetch the PR's live base and exact head, then establish the changed scope with `git diff --name-only <verified-base-ref>...<verified-head-ref>` before reading the diff and enough surrounding code to understand the design. The report identifies paths and dirty layers but does not replace semantic review. Re-establish the base and rerun it after a retarget or merge. Prioritize correctness, lifecycle, security, and broken required behavior over style; a short review with one substantiated blocker is better than a list of nits.

## Sources of truth

- `<root>/AGENTS.md` and each subtree `AGENTS.md`: standing repository, package, or module authoring rules.
- The project's defensive-patterns guide, if it has one: subprocess, callback, async-state, and disposal bug classes.
- [dsh-prose-standard](../dsh-prose-standard/SKILL.md): required coverage and editorial judgment for comments, docs, prompts, and visible strings.
- The project's own test-reliability rules, if it has any: isolation and regression-proof requirements for resource-owning, asynchronous, or flaky tests and fixtures.
- The project's testing guide and its quality-gate decision record: required test tiers and gates.
- The Agent Note tree and the contract beside it (`.agents/dsh-spec/notes/README.md`): design rationale. Treat disagreement with an Agent Note as a design discussion, not an automatic veto.
- For bilingual changes, read the translation rules and the project's `docs/terminology.md`. The extended translation workflow is outside automatic review: it runs only when the user asks for it, or after the user approves a request for it. Review the bilingual diff on its merits either way — a green pairing hash does not prove translation quality.

## Blocking requirements

1. **New prose receives semantic review.** Use [dsh-prose-standard](../dsh-prose-standard/SKILL.md) to critically review every added or changed Markdown passage, API documentation, comment, prompt, description, diagnostic, and visible string. Verify required coverage, accuracy, placement, and editorial quality against the owning code or behavior; automated checks do not establish those properties.
2. **Docs match the code.** Configuration, defaults, errors, wire fields, events, and public behavior update the module contract and the API documentation in the same change. Comments state non-obvious contracts; flag implementation narration, test walkthroughs, review history, and duplicated rationale for deletion or a link to their one home.
3. **Documented vocabulary stays current.** A change to a documented type, interface, or core term updates the page that owns it in the same change. Internal types need no catalog entry.
4. **Contributions clean up.** Where the project has a registration or subscription mechanism, verify each new contribution passes the disposal tests its owning rules require.
5. **A runtime invariant check asserts an owned relationship.** Where the project ships invariant companions, require each one to observe a real event stream, mutable state, or other relationship independently of the operation it guards. Service or method presence, component metadata, fixed pure examples, and probes that call the same operation they claim to verify belong in load, behavior, or unit tests instead. When no plausible relationship exists, require the component to omit the companion and its publication wiring, and record the reason in its README. Reject empty installers and invented checks (§4 above; the project's own module rules).
6. **Required evidence exists.** Verify the author ran the relevant local checks for the diff and that CI covers the exhaustive matrix; review the semantic gaps neither can detect.
7. **User-facing product copy is locale-owned, where the project ships locales.** Reject product text embedded in templates, helper returns, accessibility attributes, or component defaults. Require keys in the project's typed message catalogue and behaviour evidence in each affected locale; preserve user, model, and wire data and code tokens verbatim.

## Manual checks

- **Intent and interface contracts:** trace both sides of every changed interface. Confirm the implementation matches the PR and any Agent Note, including errors, cancellation, ownership, and disposal.
- **Lifecycle and concurrency:** for async setup, callbacks, processes, or teardown, apply the project's defensive-patterns guide where it has one. Check races before publication, cancellation during awaits, independent error reporting, callback containment, ownership before reentry, complete detach cleanup, and quiescent disposal.
- **Capability and consumer fit:** trace every current consumer, then flag consumer-specific behavior leaking into the interface under the project's package or module rules. Flag the inverse too: a new public method on a generic service (registry, session, agent) whose only caller is one internal consumer is an unnecessary API expansion — require a private capability closure handed to that consumer at construction instead.
- **Scope, ownership, and necessity:** map each abstraction, state machine, option, defensive copy, and compatibility path to its current contract, production consumer, and owning plugin or service. Challenge unrelated features and speculative generality, then test the PR against the root `AGENTS.md` conventions section.
- **Configuration and public choices:** ask what current-consumer evidence or prior art supports each default, public operation set, format, or imported external concept. Require an explicit choice or deferral when that evidence is absent.
- **Model perspective, where the project drives a model:** inspect the exact prompts, tool schemas, results, and diagnostics the model receives across affected modes. Flag concepts outside the model's task, then verify stable text verbatim and dynamic behavior through snapshots or end-to-end coverage.
- **Enforcement:** follow every denial path to the operation that executes it; exercise direct and alternate callers that can bypass schemas, prompts, facades, wrappers, or listener ordering.
- **Borrowed and derived state:** determine whether each retained value is borrowed or owned under the package contract, then trace notifications and every cache, prompt, UI echo, replay, and query view to the documented success point and authoritative source.
- **Bounds cover the final operation:** locate the owner of the complete emitted or retained result, including wrappers and metadata. Probe tiny and exact limits, oversized single chunks, and multibyte text for byte limits.
- **Real entry path:** tests exercise the shipped entry point — the binary, worker, bridge, or subprocess — rather than a hand-assembled substitute. A substitute does not catch an invalid declaration at the real entry point.
- **Test strength:** assertions fail on the intended regression and verify external state, logs, events, or disposal rather than restating the implementation or trusting an agent's report. Coverage is necessary but not evidence that the scenario is correct.
- **Test reliability:** for a resource-owning, asynchronous, platform-sensitive, or flaky test, apply the project's test-reliability rules to the real worker/job topology, resource allocation, global-state restoration, synchronization, timeout budget, and quiescent teardown.
- **Invariant lifecycle and negative controls:** verify candidate observations are rejected before publication where possible, persisted checks reconstruct durable history after late loading or reload, and a deliberately invalid case fails through the real runner for the intended rule.
- **Implemented decision records match shipped reality:** when a PR implements a proposed Agent Note, move and rewrite it as present-tense shipped state in the same diff, then verify paths, names, and mechanisms against the implementation.
- **Recorded-output changes:** editor-visible or model-visible changes update their recorded expectations, or the change explains why none applies. Review expected-output diffs as behaviour changes, not formatting noise.
- **Bilingual changes:** compare meaning and terminology on both sides; a green pairing hash does not prove translation quality.

## Reporting findings

State the defect, location, impact, and evidence. Place a localized defect inline on the tightest relevant diff range; use a PR-level comment for cross-cutting architecture, scope, or review-wide synthesis. Separate blockers from suggestions and omit issues already enforced by a green gate. Use the existing GitHub review thread for replies. When receiving review, verify each claim and fix or rebut it on technical grounds without performative agreement.

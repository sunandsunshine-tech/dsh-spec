---
description: "The reviewer's path through a change, and the checks the diff alone cannot show."
---
# dsh-code-review

English | [中文](README.zh.md)

## Summary

A review is a person deciding whether a change is correct, not whether a template was filled in. This skill orients the reviewer to what this codebase reviews against — the standing entries in the root `AGENTS.md` and each subtree's own, the defensive-patterns guide, required test tiers, the decision records — and lists the checks code alone cannot show: intent and interface contracts, lifecycle and concurrency, capability and consumer fit, scope and necessity, enforcement paths, bounds, real entry paths, test strength, and recorded-output changes. Its report identifies paths and dirty layers; it does not replace reading the diff.

## When to load it

Load it when reviewing a pull request in this repository, and when receiving review on one. For a bilingual change, read the translation rules and the terminology table as well, and review the diff on its merits either way.

## The reviewer's path

Verify the live base and the exact head, then establish the changed scope with `git diff --name-only <verified-base-ref>...<verified-head-ref>` before reading the diff and enough surrounding code to understand the design; re-establish both after a retarget or a merge. Prioritize correctness, lifecycle, security and broken required behavior over style — a short review with one substantiated blocker beats a list of nits. State the defect, its location, its impact and the evidence; place a localized defect inline on the tightest relevant diff range and use a PR-level comment for cross-cutting architecture or scope; separate blockers from suggestions and omit what a green gate already enforces. When receiving review, verify each claim and fix or rebut it on technical grounds without performative agreement.

## What it refuses to be

- **It is not a complete checklist**, and it does not stand in for semantic review of the diff it summarizes.
- **It invents no rule.** The rules this project reviews against are standing entries in the instruction files; when a check here has no entry there, the maintainer is asked rather than a rule invented.
- **It does not treat an automated check as proof of quality.** New prose needs semantic review, and a green pairing hash proves structure and record, not that a translation says the same thing.
- **It does not accept a report of a test run as the test run**, and it does not accept coverage as evidence that a scenario is correct.
- **It does not veto on disagreement with a decision record.** An Agent Note disagreement is a design discussion.

## How its checks are run

This skill ships prose and no code. The gates live in the collection's one code home, `../dsh-spec-manager/scripts/`, and are addressed by name through the dispatcher `run.ts` beside them; the manifest of evidence a diff owes is what [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md) selects, and the aggregate is the whole check:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
```

A reviewer confirms the author ran the checks the diff selects and that CI covers the exhaustive matrix; neither replaces the semantic gaps only a reader closes.

## Read next

- [`SKILL.md`](SKILL.md) — the sources of truth, the blocking requirements, and the manual checks in full.
- [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) — the judgement every added or changed passage receives.
- [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md) — where a disagreement with a decision record goes, and what a shipped note must match.
- [`../../AGENTS.md`](../../AGENTS.md) — the standing entries review enforces, and the boundaries it does not cross.

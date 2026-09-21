---
description: "Turn a broad request to simplify into evidence-backed proposals that remove or collapse real surface area."
---
# dsh-find-simplifications

English | [中文](README.zh.md)

## Summary

"Find things to simplify" is not a task until a candidate has evidence and a decision has an owner. This skill surveys a repository for surface area that costs more than it buys — dead, duplicated, speculative, over-built, added-then-removed, or hand-rolled where a dependency exists — then proves or rejects each candidate and records the durable ones as Agent Notes. It is guidance, not a checklist: follow the code, keep judgement active, and prefer a few well-proven candidates over a pile of thin guesses.

## When to load it

Load it when the work is finding non-obvious simplification candidates in this repository; removing redundant comments or implementation-heavy documentation; writing proposed Agent Notes or inline `TODO`/`FIXME`/`XXX` notes; auditing or coalescing superseded Agent Notes; or folding worthwhile simplification ideas out of another pull request or branch.

## What counts as a candidate

A strong candidate removes, folds or demotes something real, and the evidence shows the current design costs more than it buys: a public method, event, config knob, helper, package, durable event or test artifact with no production consumer; two representations mirroring one fact, especially across a durable record and a transient in-memory event; a seam method every implementation must support that nothing calls; a package that exists only for tests or demos; speculative product generality with no product owner; an invariant, rollback path or expected output that exists only to protect an unused API; or hand-rolled code that a maintained package or a builtin of the runtime the project already requires provides. Surveys start from the largest production-code deltas rather than from obvious unused symbols, and a companion invariant counts as useful only when it compares independently produced observations that can diverge.

## What it will not propose

- **It will not write up a thin candidate.** A typo, a single dead-code scan, or "this looks complex" without call-site proof is not an Agent Note; an idea that is correct but tiny becomes a targeted `TODO` with a stable tag instead.
- **It will not touch a recorded boundary without beating its rationale.** A deliberately duplicated adapter pair, a backend-neutral interface with one first-party implementation, a vendored dependency and a decision record are settled: the candidate has to survive the recorded reasoning, not just cite a policy.
- **It will not remove something with a production caller** — that is a feature decision, not a cleanup — nor force unrelated churn that leaves the public API and required behavior unchanged.
- **It will not expand every code survey into a repository-wide note audit**, and it never edits an archived note: retention judgement and archive mechanics belong to [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md).
- **It will not port a duplicate or lower-confidence proposal** from a sibling branch merely to preserve a candidate count.

## How its checks are run

Its evidence is search and reading, not a gate: consumers are classified as production, non-production or ambiguous, then exact symbols, event names, module names, config keys, method names and wire strings are searched recursively and the call sites are read before anything is written. A durable proposal becomes one file under `.agents/dsh-spec/notes/<lifecycle>/<class>/`, written per [the notes contract](../dsh-spec-manager/templates/notes-README.md.template). This skill ships prose and no code; the gates live in the collection's one code home, `../dsh-spec-manager/scripts/`, and are addressed by name through the dispatcher `run.ts` beside them:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
```

For docs-only note work that aggregate plus `git diff --check` is the check; a change to code comments or to a skill also runs the validator that covers it, and any further evidence is selected through [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md). When the survey includes prose, [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) governs what a comment must keep.

## Read next

- [`SKILL.md`](SKILL.md) — the survey domains, the proof procedure, the note skeleton, and the consolidation rules in full.
- [`notes-README.md.template`](../dsh-spec-manager/templates/notes-README.md.template) — the layout, classes, lifecycle and in-file format a proposal must follow.
- [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md) — retention judgement, the frozen triplet, and the archive gates.
- [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) — what survives when documentation and comments are treated as maintained surface area.

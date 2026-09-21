---
description: "Find and fix prose whose vantage is the authoring session rather than the repository."
---
# dsh-trim-cot-leakage

English | [中文](README.zh.md)

## Summary

Chain-of-thought leakage is prose written from inside the session that produced it: it cites artifacts only that session could see, narrates the change instead of the state, or argues with a reviewer who has left. This skill finds those passages and fixes them, and the fix is not deletion alone — a passage carrying factual clauses has each clause restated so it stands at HEAD, and only the transcript around it is deleted. A passage carrying none, such as an audit code or control-flow narration, goes outright.

## When to load it

Load it when auditing or fixing prose that reads like a leaked reasoning transcript: comments, API documentation, docs, prompts, diagnostics, or decision records. Its subjects include dead design-session citations such as `(decision 7)` or `design §4.7`, stack and PR vantage, change narration and version stamps, review choreography and reviewer-addressed justification, restatement and derivation transcripts, hedged planning residue, and authoring-language fragments in the wrong language.

## The one test

For every suspect passage: could a reader at HEAD, with no access to any session transcript, PR thread, or uncommitted draft, resolve every reference and verify every claim? If not, restate the surviving facts from the repository's vantage and delete the rest. If yes, it is not leakage, however historical it sounds — though resolvability only clears this skill's bar, because on a current-state surface such as a README, docs page or API comment a resolvable change story is still change narration.

## What survives the trim

Unaided citation passes fail in both directions, so the keep rules are applied as written: issue references (`#1470`, `TODO(name):`) stay on any surface; merged-PR and issue citations inside an Agent Note are sanctioned evidence; a suppression justification — a linter-disable reason, a coverage-ignore reason, an empty-catch explanation — is required prose whose false reason is fixed rather than deleted; counterfactual-present regression pins, measured bounds and runtime old/new states stay; external standards with their own §-numbering stay; project voice and a note's Alternatives-considered section stay. [`examples.md`](references/examples.md) calibrates each case.

## What it refuses to do

- **It never deletes a passage that carries a fact** without restating that fact first; the risk it is checking for is a trim that flips an obligation into an endorsement or drops provenance.
- **It never touches `vendor/` or `.agents/dsh-spec/notes/archived/`**, and it never changes a model- or user-visible string without the owning behavior evidence.
- **It never edits a recorded fixture or snapshot to fix prose.** Those are derivatives: fix the owning source or scenario and regenerate only when an authorized behavior change requires new evidence.
- **It does not treat a recall battery as the definition.** The probes over-match by design and under-match by nature, so every round also reads the densest prose in scope without a pattern in hand, and a zero-hit pattern proves nothing until it matches a known positive.

## How its checks are run

The [recall batteries](references/recall-batteries.md) are ripgrep probes, not gates, and this skill ships prose and no code. What runs mechanically is the project's own check, addressed by name through the dispatcher in the collection's one code home, `../dsh-spec-manager/scripts/`:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
```

A trim can break a link it moved or a pair it corrected, so a bilingual fence is copied byte-for-byte into both sides and the pair re-recorded with `verify-translation-pairing --write` before that aggregate runs.

## Read next

- [`SKILL.md`](SKILL.md) — the workflow an agent follows: the taxonomy, the keep rules, and the owner-first fix order.
- [`examples.md`](references/examples.md) — few-shot leaked/fixed pairs, quoted as calibration material rather than as wording to copy.
- [`recall-batteries.md`](references/recall-batteries.md) — the probes, their invocation rules, and how to calibrate one before trusting it.
- [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) — the complete-proposition rule this skill applies, and the scope and exclusions it inherits.

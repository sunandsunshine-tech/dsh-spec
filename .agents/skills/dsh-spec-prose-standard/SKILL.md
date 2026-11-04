---
name: dsh-spec-prose-standard
description: "Use when writing, reviewing, restoring, trimming, or auditing durable text — prose a project commits and later readers depend on, wherever the project keeps it: Markdown and other documentation, comments, records, instructions, prompts, diagnostics, and committed strings, among other surfaces. Covers deciding where text is required, preserving complete propositions while removing reasoning transcripts, repetition, and decoration, and auditing or fixing chain-of-thought leakage from the authoring session. Not for transient chat text or code correctness. 用于编写、评审、恢复、修剪或审计持久性文本——项目提交、后续读者依赖的文字，不论项目把它放在哪里：Markdown 与其他文档、注释、记录、指令、提示词、诊断信息与提交的文案，以及其他文本面。包括判断何处需要文字；删除推理过程、重复与装饰而保全完整命题；并审计或修复来自编写会话的思维链泄漏。不用于即时对话文字或代码正确性。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
---

# Durable prose standard

Durable text is prose a project commits and later readers depend on, not text read once in a conversation: documentation, comments, decision records, instructions, and committed prompts and visible strings. It outlives the session that wrote it; every rule assumes a reader who has the project, not the conversation. Transient conversation text, scratch notes, and code correctness are outside this skill; commit messages and change descriptions follow the project's change conventions.

Write enough to preserve the contract, then remove reasoning transcripts, repetition, and decoration. A contract is an obligation, invariant, precondition, postcondition, or compatibility promise that a caller, callee, implementer, producer, or consumer relies on.

This skill owns editorial judgement, required prose coverage, and the leakage audit. The project's standing instructions (for example a root `AGENTS.md` or the file it cites) own documentation placement, word budgets, bilingual pairs and their translation authority, and the project's gates; follow them where named. This skill is guidance, not a script or a checklist.

`Contract`, `boundary`, `shape`, `surface`, `seam`, `gate`, and `vocabulary` are terms to check before use, not banned words. First ask whether the exact rule, API, field set, type, validation, timing point, component split, or failure states the fact better. Keep a term when it names the exact technical subject, including caller/callee contracts and security or process boundaries.

## Inputs and exclusions

- Require an explicit `scope` — paths, globs, or named surfaces. If missing, report the required input and stop; never infer a project-wide scope or begin an interview.
- Accept `mode: automatic | interactive`; default to `automatic`. Enter interactive only when the task explicitly requests questions or calibration. Mode controls questions, not write authority: review and audit report findings without editing; an explicitly requested write, fix, or trim applies clear changes.
- Exclude third-party trees the project does not author — for example `vendor/`, a dependency cache, or a vendored checkout — and never follow a symlink into one. Put exclusions after inclusions in the project's own search and VCS syntax, so a later include cannot re-admit them. If only excluded files are in scope, report that none remain.
- Also exclude the project's frozen text — an archived decision-record tree, a frozen history area, or whatever the project declares frozen. Inspect an exact frozen target only for a historical inbound citation; never modernize its prose or links.
- Generated files — catalogs, snapshots, fixtures, rendered pages — are derivative, not prose targets. Trace every consumer: a source comment may feed a generated catalog, and a snapshot may pin model-visible text. Edit the owning source or scenario first, then regenerate every derivative; regenerate recorded fixtures and snapshots only when an authorized behavior change requires new evidence. When a generator extracts a summary, make the extracted sentence complete for the output it feeds.
- A translated pair has no permanent owner: either language may be the authored side. Update the counterpart minimally and re-record the pair with the project's pairing check.
- When the project declares no exclusions, state the ones used in the report.

## Preserve the complete proposition

Before editing, identify every proposition in the passage. Preserve each relevant: actor and action; condition, timing, and ordering; modality such as must, may, or never; negative guarantee and exception; ownership, side effect, failure mode, and consequence.

Remove adjectives, repetition, and narration only when every factual clause survives and the result is clearer. A smaller word count alone is not an improvement.

Keep a complete local contract at the point of use: behavior, failure, ownership, and consequence a caller or maintainer needs there. Link aggressively to the owning document for architecture, rationale, algorithms, history, or examples. One explanation has one home; essential contract facts may repeat locally.

Keep non-obvious rationale when omitting it could plausibly cause misuse or an incorrect simplification. Otherwise state the consequence and link the rationale's home.

Preserve searchable mechanism names and meaningful modal, temporal, or negative emphasis. Normalize decorative emphasis only.

## Required coverage by surface

This is not a one-way shortening pass. Add or restore text when code, types and structure do not communicate a required fact; do not add text when the fact is obvious locally. Read [coverage by surface](references/coverage.md) for the per-surface contract.

## Leakage audit

Durable text must stand at the project's current state. Chain-of-thought leakage is prose whose vantage is the authoring session rather than the project: it cites artifacts only that session could see, narrates the change instead of the state, or argues with a reviewer who has left.

The fix is never deletion alone when a passage carries factual clauses: restate each so it stands at the current state, then delete the transcript around it. A passage that carries none — an audit code, a control-flow narration — is deleted outright.

### The one test

For every suspect passage ask: could a reader at the current state, with no access to any session transcript, change discussion, or uncommitted draft, resolve every reference and verify every claim? If no, restate the surviving facts from the project's vantage and delete the rest. If yes, it is not leakage, however historical it sounds — but resolvability only clears this test: on current-state surfaces (READMEs, documentation, comments), a resolvable change story is still change narration, and the change-narration class (class 3) routes it to its sanctioned home.

### The classes

1. **Dead design-session citations** — `(decision 7)`, `(audit C2)`, audit item codes, `design §4.7`, `plan §1.4`, phase labels (`T4`, `W3`, `P-I`), "the design ledger", "(B ruling)". If the decision has a committed owner, cite it by name and path; otherwise delete the citation and restate its factual clause to stand alone.
2. **Change and series vantage** — "a later change in this series", "this change adds", "the previous commit". State the shipped mechanism or the extension point; deferred work moves to a `TODO` marker or an issue reference.
3. **Change narration and version stamps** — "used to", "no longer", "the old X", and indexical stamps ("v1", "this cut", "today", "now" contrasting with a past state). State the present behavior; a fixed regression becomes a present-tense counterfactual ("without X, Y happens"), never project history ("used to Y").
4. **Review choreography** — "Rejected in review:", "the reviewer confirmed", draft ordinals ("v5 of this note"), round attributions. Keep the surviving decision and rationale as plain fact; delete who said it when.
5. **Reviewer-addressed justification** — "the cast is safe — it simply…", "this is correct because…". A comment arguing its own correctness addresses a reviewer, not a maintainer. State the invariant that makes the code safe, or delete the comment when the code shows it.
6. **Restatement and derivation transcripts** — control-flow narration ("first we X, then we Y"), test walkthroughs, proofs of obvious branches. Delete; keep only a non-obvious contract or invariant.
7. **Hedges and planning residue** — "probably fine for now", "should be enough", deferrals with no marker. Promote to `TODO`/`FIXME` or state the actual bound; delete the hedge.
8. **Authoring-language slips** — untranslated working-language fragments in text whose language is otherwise settled, or session separators left in the file. Translate or delete.

### What is not leakage

Unaided passes fail in both directions by deleting durable references and keeping dead ones. Apply these keep rules as written; [the examples](references/examples.md) calibrate each:

- **Issue and ticket references** (`#1470`, `TODO(name):`, "issue #N owns the follow-up") resolve at the current state; keep them on any surface, including READMEs, and do not relocate them to decision records.
- **Merged-change and issue citations inside decision records and postmortems** are sanctioned evidence in a change story.
- **Suppression justifications** — a lint-disable reason, a coverage-ignore reason, an empty-catch explanation — are required prose; fix a false reason, never delete it.
- **Counterfactual-present regression pins** — "without X, Y happens", "a naive X would…".
- **Measured bounds** — "(measured: 512 nests ≈ 0.15s)" calibrating a constant; the evidence word "measured" is load-bearing.
- **Runtime old and new states** — "the old connection drains before the new one accepts" is runtime lifecycle, not change history.
- **Historical stage names inside a decision record's change-story sections** — "the first cut shipped X" is current-state-safe there; indexical stamps ("this cut") stay banned everywhere.
- **External references that resolve outside the project by design** — standard sections (RFC 9110 §10.1.5), design-file or frame names; the section-number ban covers uncommitted internal drafts, not external standards or committed documents that own their numbering.
- **Project voice and genre forms** — "we" as project voice, and a decision record's alternatives-considered section.
- **Overcorrection traps**: before deleting anything, enumerate the passage's propositions and check that the trim does not flip an obligation into an endorsement, promote a hypothetical into a shipped feature, delete a true fact with the transcript around it, or drop the evidence source with the number. [The examples](references/examples.md) calibrate each trap.

## Workflow

1. Confirm the scope, mode, current change or branch state, and the applicable project standing instructions. Do not inspect unrelated branches or files.
2. Read the project's standing instructions, when it has them, and the owning code or document before judging. For calibration or unfamiliar cases, read [the examples](references/examples.md).
3. Inspect the requested scope, not only the largest files: use searches and word counts to find candidates, then judge semantically. Read the densest text in scope without a pattern; a search-led audit misses cases.
4. Classify each candidate as keep, add, trim, restore, restructure, or defer. Apply clear changes only when the task authorizes edits; do not manufacture edits to satisfy a deletion target.
5. Audit leakage read-only first: apply the one test to every suspect passage. When using a search tool, read [the recall batteries](references/recall-batteries.md), calibrate each probe against a known positive and a near-miss negative, and judge every hit semantically; the probes are discovery aids, not the definition.
6. Fix the owner first: a generated artifact through its source or generator; a shared verbatim excerpt at its source, then byte-for-byte into every side, re-recording the pair; a visible string under the prompts-and-visible-strings coverage rule.
7. Re-check analogous passages after learning a rule: the same defect usually has siblings.
8. Run the narrow checks for the touched surfaces — the project's documentation, link, pairing, and behavior gates, and its diff check (for example `git diff --check`). After leakage fixes, re-run the probes expecting only sanctioned keeps, this skill's quoted calibration cases, and the owning decision record's quoted evidence, and confirm every remaining citation resolves at the current state. Verify the final diff contains no third-party path with the project's diff listing (for example `git diff --name-only`), and report any accidental match rather than claiming a clean exclusion history.
9. Report the inspected scope, clear changes, deliberate keeps, deferred cases, leakage classes found and fixed, and the checks actually run.

## Borderline decisions

A case is borderline only when at least two versions satisfy the complete-proposition rule but trade accepted principles and this skill does not already resolve the tradeoff. A rewrite with one proposition-preserving answer is not borderline.

In automatic mode, apply clear edits when authorized and report genuine borderline cases without asking questions. Do not weaken a proposition to make progress.

In interactive mode, group analogous passages under the governing principle; present two or three viable versions, recommend one, and state the factual or structural difference; do not offer inferior distractors. Use the requested channel; when calibrating through inline comments, put the recommendation in the diff with the alternatives at that line.

After a decision, record the distilled principle and versions where the project keeps its prose guidance, or in the report; add a case to [the examples](references/examples.md) only when this skill's own source tree is the working tree, without review history or reviewer narration, and never edit an installed copy.

## References

- [Coverage by surface](references/coverage.md) — the required coverage for each surface: documentation, API docs, comments, tests, records, prompts, diagnostics and the rest.
- [The examples](references/examples.md) — calibration cases for editorial judgement, the leakage keeps, and the four overcorrection traps; read it for calibration or unfamiliar cases.
- [The recall batteries](references/recall-batteries.md) — search probes for the leakage classes: invocation rules, an English battery, one bilingual worked example, and the known false-positive families; read it before a search-led audit.

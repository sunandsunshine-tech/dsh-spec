---
description: 'Use when auditing, validating, pruning, archiving, or reviewing Agent Notes in a project that adopted the pattern: verifies the notes tree obeys its contract and the format gates pass, checks every new note for superseded active records, classifies implemented notes by future decision value, deletes rejected notes that no longer prevent a tempting fallacy, and applies the frozen archived/{kind} triplet and manifest rules. Creating a tree is dsh-spec-init''s job.'
metadata:
    github-path: skills/dsh-archive-agent-notes
    github-ref: refs/heads/split-skills
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: 96eb2e1735f14e9c6cb51cd690e8f9edf5ebdb60
name: dsh-archive-agent-notes
---
# Validate and archive Agent Notes

Two jobs: keep the notes tree conformant to its own contract, and reduce the active decision corpus without erasing history that can still guide work. Judge every note semantically; word count and age are discovery aids, never archive criteria.

**This skill assumes the tree exists.** Creating it — the lifecycles, the classes, the contract, the gates, and the note guidance inside `AGENTS.md` — is [`dsh-spec-init`](../dsh-spec-manager/references/manager-init.md)'s job. When the tree is missing or half-created, run that skill instead of repairing it by hand.

## Validate the tree against its contract

Run this before auditing content, and after any change that moves, adds, or renames notes.

1. **Structure.** `verify-agent-note-classification` rejects an unknown lifecycle or class folder, a bad depth, a non-dated filename, a forbidden `INDEX.md`, and a note filed under a legacy path.
2. **Format.** `verify-agent-note-format` rejects a missing or malformed header block, a `Status:` line that disagrees with the lifecycle folder, a missing lifecycle-required section, a proposal-era heading inside `implemented/`, and a body that carries neither `## Alternatives considered` nor the grandfather comment.
3. **Archive seal.** `verify-archived-agent-notes` rejects a changed or missing sealed artifact, an incomplete triplet, an unknown class folder, invalid archive metadata, and an unsealed addition.
4. **Report, do not repair silently.** Name each violation with its path and the rule it breaks. A structural violation is usually a decision about where a note belongs, so fix it only after the author agrees or the contract makes the answer mechanical.

The three gates live in the collection's one code home, `.agents/skills/dsh-spec-manager/scripts/` — `{gate-dir}` below — and each is addressed by name through the dispatcher `{gate-dir}/run.ts` beside it, never by path; run them from the project root with `--root .`. Their commands are in [dsh-spec-init](../dsh-spec-manager/references/manager-init.md) and in `.agents/dsh-spec/notes/README.md`.

## Read the contracts

Read [the Agent Note rules](../dsh-spec-manager/templates/notes-README.md.template), the archive instructions (`.agents/dsh-spec/notes/archived/AGENTS.md`), and the applicable active lifecycle instructions before classifying. Use current code, configuration, package docs, generated catalogs, newer Agent Notes, and inbound links to establish whether a rationale still owns or constrains anything.

## Check supersession when adding a note

Every new Agent Note triggers a scoped audit of active notes covering the same decision, mechanism, or rejected alternative. Classify each full or partial supersession while writing the new note: archive qualifying implemented triplets in the same PR, retain and cross-link partial supersessions or independently useful rationale, reject obsolete proposals, and delete rejected notes that no longer prevent a plausible mistake. Apply the Agent Note consolidation rule when the new owner absorbs every unique proposition; do not defer a known match to a later corpus audit.

## Classify by future value

Apply these lifecycle-specific outcomes:

- **Implemented — keep active:** retain a note when its rationale, alternatives, negative guarantees, durable/wire semantics, ownership boundary, security rule, or reintroduction condition is likely to guide a future change. Length does not matter.
- **Implemented — archive:** archive a note when the shipped decision is complete and its body is unlikely to guide future work, such as one-off UI chrome, a narrow adapter, a minor closed bug, superseded implementation detail, or process history whose current behavior is obvious elsewhere.
- **Proposed — never archive:** keep a live proposal active; if it is no longer worth pursuing, reject it with an honest reason and satisfy the rejected lifecycle format.
- **Rejected — keep only as a guardrail:** retain a rejection only when the losing proposal remains a tempting, meaningful mistake and the note explains why it loses.
- **Rejected — delete:** delete the whole triplet when the rejected idea is obsolete, superseded, no longer plausible, or unlikely to prevent re-litigation. Repair or delete inbound links.

Do not archive toward a quota. Inspect every note in scope, classify analogous groups under one principle, use best judgment for close cases, and record genuinely borderline decisions for the handoff.

## Calibrated examples

These examples set the bar; the word counts demonstrate that size is not the test.

Archive implemented notes such as:

- collapsed sidebar control rail — 533 words: closed, minor UI behavior;
- Commander argument adapter — 1,498 words: substantial implementation detail with little future design leverage;
- documentation graph atlas — 920 words: completed documentation machinery whose current generators are authoritative.

Keep implemented notes such as:

- event-sourced sessions — 248 words: foundational authority and durability boundary;
- single configuration-home resolver — 596 words: cross-product ownership rule;
- project session directories — 628 words: durable storage and identity policy;
- parallel pre-push gates — 400 words: borderline, but still guides gate scheduling and resource tuning;
- dropped image content block — 334 words: keep until multimodal support lands, because it states the coordinated reintroduction condition.

For rejected notes:

- keep folding the compaction package split — 426 words: the temptation to merge the packages remains meaningful;
- delete streaming workflow progress through tool calls — 972 words: its ACP/UI premise is obsolete;
- delete dropping ACP terminal metadata — 362 words: the later automation-only ACP decision resolved the question.

## Archive one implemented triplet

1. Move the complete `foo.md`, `foo.zh.md`, and `foo.i18n.yaml` triplet from `implemented/<kind>/` to `archived/<kind>/`; `implemented` is deliberately absent from the archive path.
2. Make no body edits. Insert only `Archived: YYYY-MM-DD` immediately below `Status: implemented` in both language files, using the archival date and the same value on both sides.
3. Re-record the sidecar hashes mechanically for the two metadata-only edits. Do not translate, reformat, update facts, or repair links inside the note.
4. Search for inbound links from active prose. Redirect them to current authority, retarget them to the archived path only when the historical snapshot is intentionally cited, or delete them. Never verify or repair links out of the archived note.
5. Run `pnpm dlx --allow-build=esbuild tsx@4.22.4 {gate-dir}/run.ts verify-archived-agent-notes --write`. Its append-only mode first proves every existing seal still matches, then adds only the new triplet hashes. Run the normal verifier afterward.

After the triplet is sealed, never edit, move, translate, reformat, or delete it. Archived notes remain valid inbound-link targets but are historical snapshots, not authority for current behavior.

## Validate and report

Run the archive verifier's focused test, `pnpm dlx --allow-build=esbuild tsx@4.22.4 {gate-dir}/run.ts verify-archived-agent-notes`, the project's aggregate check, and `git diff --check`; select any additional evidence through [dsh-pre-push-checks](../dsh-pre-push-checks/SKILL.md).

Report active implemented notes kept, implemented notes archived, rejected notes kept/deleted, proposed notes rejected if any, and every genuinely borderline case with its word count and chosen outcome. Do not claim archived outbound links are valid: the archive verifier intentionally never checks them.

---
description: 'Use when adding, auditing, pruning, archiving, restoring, or reviewing Agent Notes in a project that adopted the pattern: validates the tree against its contract and the format gates, checks each new note for superseded records, deletes small UI or purely mechanical records, classifies the rest by future value, deletes rejections that no longer prevent a tempting fallacy, and applies the frozen archived/{kind} triplet and manifest rules. Creating a tree is the initializer''s job.'
metadata:
    github-path: skills/dsh-archive-agent-notes
    github-ref: refs/heads/chore/baseline-dsh-v0.2.0-rc.2
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: cb97da7314031fc15e94a665f70edf1b5ccc7bc3
name: dsh-archive-agent-notes
---
# Archive Agent Notes

Validate the tree against its contract first, then reduce the active decision corpus without erasing history that can still guide work. Judge every note semantically; word count and age are discovery aids, never archive criteria.

## Read the contracts

Read [the Agent Note rules](../dsh-spec-manager/templates/notes-README.md.template), the archive instructions (`.agents/dsh-spec/notes/archived/AGENTS.md`), and the applicable active lifecycle instructions before classifying. Use current code, configuration, package docs, generated catalogs, newer Agent Notes, and inbound links to establish whether a rationale still owns or constrains anything.

## Check supersession when adding a note

Every new Agent Note triggers a scoped audit of active notes covering the same decision, mechanism, or rejected alternative. Classify each full or partial supersession while writing the new note: archive qualifying implemented triplets in the same PR, retain and cross-link partial supersessions or independently useful rationale, reject obsolete proposals, and delete rejected notes that no longer prevent a plausible mistake. Apply the Agent Note consolidation rule when the new owner absorbs every unique proposition; do not defer a known match to a later corpus audit.

## Classify by future value

Apply these lifecycle-specific outcomes:

- **Implemented — delete:** delete complete triplets that only describe small UI adjustments or purely mechanical changes, and repair or remove inbound links. Local bug fixes, performance changes, new capabilities, and substantive behavior or ownership decisions do not qualify merely because they are implemented. Apply this criterion before the keep/archive classification.
- **Implemented — keep active:** retain a note when its rationale, alternatives, negative guarantees, durable/wire semantics, ownership boundary, security rule, or reintroduction condition is likely to guide a future change. Classify the decision, not the mechanics of its implementation: a mechanical rename or type extraction can still record lasting naming, compatibility, or ownership rules. Length does not matter.
- **Implemented — archive:** archive a substantive historical decision when it is complete and unlikely to guide future work, but its historical rationale still warrants preservation. Do not archive records that meet the direct-deletion criterion.
- **Proposed — never archive:** keep a live proposal active; if it is no longer worth pursuing, reject it with an honest reason and satisfy the rejected lifecycle format.
- **Rejected — keep only as a guardrail:** retain a rejection only when the losing proposal remains a tempting, meaningful mistake and the note explains why it loses.
- **Rejected — delete:** delete the whole triplet when the rejected idea is obsolete, superseded, no longer plausible, or unlikely to prevent re-litigation. Repair or delete inbound links.

Do not archive toward a quota. Inspect every note in scope, classify analogous groups under one principle, use best judgment for close cases, and record genuinely borderline decisions for the handoff.

## Calibrated examples

These examples set the bar; the word counts demonstrate that size is not the test.

Delete implemented notes such as:

- collapsed UI control rail — 533 words: closed, minor presentation behavior;
- module ownership moved between packages — completed function relocation and import rewiring with unchanged behavior.

Keep implemented notes such as:

- event-sourced session state — 248 words: foundational authority and durability boundary;
- single configuration-home resolver — 596 words: cross-product ownership rule;
- project session directories — 628 words: durable storage and identity policy;
- parallel pre-push gates — 400 words: borderline, but still guides gate scheduling and resource tuning;
- dropped image content block — 334 words: keep until multimodal support lands, because it states the coordinated reintroduction condition.

For rejected notes:

- keep merging two deliberately split packages — 426 words: the temptation to merge them remains meaningful;
- delete streaming workflow progress through tool calls — 972 words: its protocol/UI premise is obsolete;
- delete dropping terminal metadata from the protocol — 362 words: the later automation-only protocol decision resolved the question.

## Archive one implemented triplet

1. Move the complete `foo.md`, `foo.zh.md`, and `foo.i18n.yaml` triplet from `implemented/<kind>/` to `archived/<kind>/`; `implemented` is deliberately absent from the archive path.
2. Make no body edits. Insert only `Archived: YYYY-MM-DD` immediately below `Status: implemented` in both language files, using the archival date and the same value on both sides.
3. Re-record the sidecar hashes mechanically for the two metadata-only edits. Do not translate, reformat, update facts, or repair links inside the note. Existing title punctuation, blank-line layout, and language-switcher wording are preserved, not prerequisites for archival.
4. Search for inbound links from active prose. Redirect them to current authority, retarget them to the archived path only when the historical snapshot is intentionally cited, or delete them. Never verify or repair links out of the archived note.
5. Run the archive verifier — one of the checks in the collection's engine directory, reached through the entry point beside it: `node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes-archived write --all --root .`. Its append-only mode first proves every existing seal still matches, then adds only the new triplet hashes. Run the normal verifier afterward.

After the triplet is sealed, never edit, move, translate, reformat, or delete it. Archived notes remain valid inbound-link targets but are historical snapshots, not authority for current behavior.

## Validate and report

Run the archive verifier, `node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts notes-archived check --all --root .`, the project's aggregate check, and `git diff --check`; select any additional evidence through [dsh-pre-push-checks](../dsh-pre-push-checks/SKILL.md).

Report active implemented notes kept, implemented notes deleted or archived, rejected notes kept/deleted, proposed notes rejected if any, and every genuinely borderline case with its word count and chosen outcome. Do not claim archived outbound links are valid: the archive verifier intentionally never checks them.

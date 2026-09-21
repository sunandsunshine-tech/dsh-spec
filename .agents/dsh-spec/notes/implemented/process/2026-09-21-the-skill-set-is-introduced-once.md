# Agent Note: The skill set is introduced once, in the project README

Status: implemented

English | [中文](2026-09-21-the-skill-set-is-introduced-once.zh.md)

## Problem

Every skill carried a README pair beside its entry — what the skill is for, when to load it, and what it does not do — which made twenty-four files and eight recorded pairs whose subject was the same as the repository's own README: introducing the set. A reader arriving at the repository met no overview at all: the README pointed at one skill's README, and the other seven were discoverable only by opening each directory. Two documents described one thing, and the pairing gate made keeping them in step a standing cost.

## Decision

The per-skill READMEs are removed, and the root README carries one table naming all eight skills and what each is for. The entry (`SKILL.md`) stays what an agent loads, and the references beside it stay the workflow's own material; a skill directory now holds those two things and nothing else. The engine's own `scripts/README.md` stays, because it documents the vendored bundle the gates parse Markdown with, and `manager-lifecycle.md` routes a reader to it.

## Alternatives considered

**Keep them, and accept the duplication.** They were the human door: a person who opened one skill directory could judge it without reading the repository. It lost because the overview's home is the set, not the skill — a reader comparing skills needs them side by side, and eight copies of that comparison drift.

**Keep only the manager's README.** That is the source project's shape, and the manager is the entry to the collection. It lost because the manager introduces the *package*, not the eight workflows: a reader asking "which of these does review evidence?" learns nothing from it, and its own contents were mostly the root README's material a second time.

**Move the per-skill introduction into each `SKILL.md`.** One file per skill, no extra document. It lost because `SKILL.md` is written for an agent deciding whether to load the skill, and a person deciding whether the collection is worth adopting reads a different document; the entry also already has a job — routing and triggering.

## Consequences

- One overview, one home: the root README's table, in both languages.
- Eight pairs fewer to record, and a skill directory that contains only what its agent loads plus its references.
- The installed copy loses the READMEs on the next install: the prune removes files the revision no longer ships, which is what that mechanism was built for.
- What this costs is depth: a reader who wants to know what `dsh-pre-push-checks` does gets one line in a table rather than a page. The entry and its references remain the place to go deeper, and the line is what the table is for.
- Verification: `run.ts --all --root .` ends `run: 7 gate(s), 0 failed`; `verify-skill-structure.ts` conforms for all eight skill directories with no README present; `manager install` removes the twenty-four files from `.agents/skills/`.

## Related

- [The shipped skill text is an extraction](2026-09-21-the-shipped-skill-text-is-an-extraction.md) — the change that removed the rules those READMEs had come to carry, and the note whose references to them this change updates.

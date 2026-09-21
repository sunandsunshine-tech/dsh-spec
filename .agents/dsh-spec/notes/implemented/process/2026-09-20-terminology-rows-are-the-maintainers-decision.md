# Agent Note: Terminology rows are the maintainer's decision

Status: implemented

English | [中文](2026-09-20-terminology-rows-are-the-maintainers-decision.zh.md)

## Problem

`docs/terminology.md` is the vocabulary every bilingual pair obeys and the table the translation briefing matches changed spans against, so each of its rows is a decision: it fixes a word both sides of a pair write. Neither the table nor the pairing contract that ships beside it stated who makes those decisions. A table of decisions with no stated owner grows rows nobody decided — an edit that looked helpful to whoever was editing at the time — and every later translation then follows a vocabulary choice no maintainer asked for. The table carried one such row: `architecture map`, defined for the root `README.md`. No such artifact exists. The root `README.md` is a README, and a table that gives an artifact a name its owner never uses teaches the reader to write about something that is not there; a term for a deleted thing is how a glossary rots.

## Decision

Adding, changing or removing a row of `docs/terminology.md` is the maintainer's decision, asked for in the conversation and never inferred by whoever is editing. The working agent proposes a row and does not add one.

The rule is stated in `docs/AGENTS.md`, the standing orders for the folder that owns the table, so it sits in front of whoever edits the table without being repeated in the table itself or in the pairing contract, which describes a mechanism rather than one project's process.

The `architecture map` row is deleted: no document links to it, and nothing else in the tree depends on the name, so the deletion breaks no reference. The `corpus` and `aggregate` rows stay: both name things the gates and this repository actually have.

### Why no gate

A gate cannot tell an asked-for row from an inferred one. It reads the table and not the conversation that produced it, so the only mechanical check available would be a list of approved rows — a second inventory of the table, drifting from it and then certifying the drift. This collection leaves a judgement about meaning to the reader who can make it, and a gate that guessed would report green over exactly the entries it cannot see.

## Alternatives considered

**Keep the row and re-point it.** The root `README.md` may still deserve a term, and re-pointing the row at what that file actually is would keep a vocabulary slot open for it. It lost because nothing in the tree writes that term: a corrected row is still a decision no document obeys, and the table's own preamble says a row that does not affect a translator's wording does not belong in the table.

**Delete the row and state nothing.** This is the smallest change, and the deletion alone repairs the table. It lost because it removes the symptom and leaves the cause: the row entered a table of decisions that named no owner, and without the rule the next editor infers the next row.

**State the rule only in the pairing contract.** The contract is what a translating worker reads before touching a pair, and it already owns the table's authority; the preamble would then carry one bullet less. It lost because the two documents have different readers — the contract is read by whoever translates a pair, and the table by whoever edits it — and the rule belongs in front of both.

## Consequences

- `docs/terminology.md` is one row shorter, and `docs/AGENTS.md` states who decides the rows that remain.
- The rule's home is project-owned: it lives beside the table instead of inside the shipped pairing contract, which no longer states it.
- Verification: `dsh-spec.ts check --all --root .` ends `check notes: ok` and `check notes-archived: ok`, and `md-links check` and `translation-pair check` exit zero over the files this change leaves.

What the decision cost is a rule that no gate enforces: a row added without the maintainer's word passes every check, because the check is the conversation itself. What it bought is a table whose rows are decisions a maintainer made, with its next editor told so before adding one.

## Related

- [The shipped skill text is an extraction](2026-09-21-the-shipped-skill-text-is-an-extraction.md) — the change that moved this rule's home out of the contract.

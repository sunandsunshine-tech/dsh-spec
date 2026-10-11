# Agent Note: Initialization releases the vocabulary table empty

Status: implemented

English | [中文](2026-09-21-initialization-releases-the-vocabulary-table-empty.zh.md)

## Problem

The pairing contract told a project that `docs/terminology.md` was the vocabulary both sides of a pair obey, and the briefing generator refuses to run without that file, but nothing created it: a project that adopted the skill set had to invent the table's shape, its column meanings and its rules for adding a row before it could translate anything. The rule that a row is the maintainer's decision shipped inside the contract pair instead — a mechanism document describing one project's process for a file the project owns, where whoever edits the table never meets it.

## Decision

`install` writes two paths into `docs/`: `terminology.md` from a template carrying the column meanings, the usage rules and an empty table, and `AGENTS.md` with the orders that govern it — that a row binds both sides of every pair, that adding, changing or removing one is the maintainer's decision asked for in the conversation, and that the table declares no pair of its own. There is no switch that skips them: a project that adopts the skill set takes the table and the orders beside it, and a project that does not translate carries the same table with no rows. Neither path is overwritten once it exists.

The table is released with no rows on purpose. A row fixes a word both sides write, so a row is a decision; an example row copied from this skill set, or one invented by the initializer, would be a decision nobody made that every later translation follows. The template therefore carries the rules and the column headers, and the project fills the rows as its maintainer decides them.

The rule moved with the table: `docs/AGENTS.md` is the project's own file beside the artifact it governs, and the pairing contract no longer carries a bullet about one project's process. The contract keeps what it owns — the pair, the record, the switchers, the structural signature — and names the table only as the source of truth it reads.

## Alternatives considered

**Ship this skill set's own table as a starting point.** It would give a project immediate vocabulary and demonstrate what a filled row looks like. It lost because those rows are this repository's decisions: a translator following them follows another project's illustrations, and the project's first task would be auditing rows it never decided.

**Keep the rule in the pairing contract.** The contract is what a translating worker reads before touching a pair, so the rule would reach every project with no new file. It lost because the reader who needs it is whoever edits the table, and that reader is not in the contract; the rule also described a project's file from inside the skill set, where the project cannot change it.

**Let the initializer write one example row, marked as an example.** It would show the table's shape without claiming a decision. It lost because a marked example is still a rendering a translator may follow, and the table's own rules say an entry that does not fix a translation does not belong in it — the column headers already show the shape.

## Consequences

- A project that translates has the table's columns and rules from its first commit; a project that does not translate carries the same table with no rows rather than a different layout.
- The vocabulary rule now lives beside the table it governs, so the project can change it, and the shipped contract no longer states one project's process.
- What this costs is two more paths init writes, two more templates to keep current with the contract they describe, and a project that deletes `docs/AGENTS.md` losing the rule's only home.
- Verification: `dsh-spec.ts check --all --root .` reports every tree check green over this tree, and `install` into an empty repository creates both paths with no `{gate-dir}` left in either, over which `dsh-spec.ts md-links check` reports every relative link resolving.

## Related

- [Terminology rows are the maintainer's decision](2026-09-20-terminology-rows-are-the-maintainers-decision.md) — the rule this change moved out of the pairing contract, and the file that now carries it.

# Agent Note: The mechanism text is updated by overwrite

Status: implemented

English | [中文](2026-09-21-the-mechanism-text-is-updated-by-overwrite.zh.md)

## Problem

`init` writes the mechanism files once and never touches them again, which protects a project's edits but also freezes whatever revision the project initialized at. This repository's own tree shows the cost: its notes contract had drifted 26 lines from the template the skill set ships, two `AGENTS.md` files differed as well, and nothing in the tree could say whether a copy was current. A gate cannot enforce a contract whose text differs per project, and a reviewer reading one project's contract learns rules the skill set no longer ships.

The rule that produced this is real and stays: an initializer must be safe to re-run, so `init` still writes only what is missing. What was missing is a second operation with a different licence — updating text the skill set owns, without taking content the project owns.

## Decision

`install` and `upgrade` end with the initializer's `sync` mode, which is also reachable on its own: the initializer is a dry run by default, and `--write` applies it. It rewrites exactly the files whose **text** the skill set owns, to the revision just installed:

| File | Merge |
|---|---|
| the notes contract (`notes/README.md`) and the three note `AGENTS.md` files, `docs/AGENTS.md`, `.rgignore` | replaced |
| `docs/terminology.md` | header replaced, the project's rows kept |
| the root `AGENTS.md` | only the marked `dsh-spec:agent-notes` block is replaced |

Two things a project owns survive by construction. A terminology row is a decision, so the rows are preserved verbatim under the fresh header; and the standing orders outside the marked block are the project's own writing. The notes files are synced only where the notes tree exists, so a project that removed it is not given it back, and nothing outside that list is read or written. Every rewritten path is reported, and a dry run reports it without applying.

A project that wants different rules for its own tree expresses them in notes and in files sync does not manage — not by editing the contract's prose, which the next sync replaces.

## Alternatives considered

**Report the drift and let a project update by hand.** A `status` line naming the files that differ would be read-only, and a project that edited the contract on purpose would keep its text. It lost because the skill set's promise is that the mechanism is one thing: a project silently running a rule the skill set deleted is the drift the extraction exists to prevent, and a report is ignored as often as it is acted on.

**Replace everything, including the standing orders and the terminology table.** The simplest rule, and it makes every project identical. It lost because it destroys decisions: the terminology rows are the maintainer's, and the root `AGENTS.md` carries a project's own orders. A mechanism that deletes the decisions it exists to record is not consistent, it is destructive.

**Put markers around every managed region and edit in place.** It generalizes the standing-orders rule to every file and survives reformatting. It lost because it needs a marker convention inside documents a person reads, and a contract is short enough that replacing it whole is easier to review than a diff against a marker.

## Consequences

- Every project's notes contract, documentation orders and search exclusion are the text of the revision it runs, so the gates enforce one contract and a reviewer reads one contract.
- A project's own edits inside those documents are overwritten. That is the point, and it is why sync reports each path it rewrites instead of saying "up to date".
- The terminology rows and the standing orders outside the marked block need care from the project, because sync preserves them and nothing else guards them.
- Verification: in a probe, a project whose contract had an added line, whose terminology table had an added row, and whose `AGENTS.md` had a filled introduction ran `sync --write` → `updated .agents/dsh-spec/notes/README.md`, `updated docs/terminology.md`, the added contract line gone, the row preserved, the introduction intact; a stale marked section was replaced on the next run (`updated AGENTS.md`). `dsh-spec.ts check --all --root .` reports every tree check green in the probe and in this repository.

## Related

- [Never overwrite a file the initializer did not create](../bug-fix/2026-09-18-never-overwrite-a-file-the-initializer-did-not-create.md) — the creation-time rule this decision keeps, and whose consequence it reverses.

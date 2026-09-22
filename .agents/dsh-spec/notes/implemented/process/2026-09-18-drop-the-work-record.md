# Agent Note: Drop the work record

Status: implemented

English | [中文](2026-09-18-drop-the-work-record.zh.md)

## Problem

This repository added `.agents/dsh-spec/work.md` to hold the work in flight, on the argument that neither a proposal nor git says where a session stopped. The source project has no such artifact and iterates reliably without one, which is the better evidence: the pattern's own answer is that a `proposed` note states the design and its acceptance criteria, a commit states what shipped, and the notes tree states what is undecided — and that is enough.

The record also cost something every change: a file to keep current, a tier in the contract and a row of parameters beside it, a row in the standing orders, a section in the composition map, and a note explaining it.

## Decision

**`work.md` is deleted, along with every surface that carried it**: its tier on both sides of the tier table, the standing order to update it, the composition map's section, and the documentation table's row. Those surfaces are gone with the documentation mechanism itself ([Four mechanisms instead of twelve](2026-09-18-four-mechanisms-instead-of-twelve.md)), and the record that introduced the artifact is consolidated here, with its English, Chinese, and consistency files deleted.

**Continuity comes from what already exists.** A session resumes from the repository: the notes tree states what was decided and what is still proposed, the aggregate check reports what no longer holds, and `git log` states what shipped. Where the work record would have said "step 6 of 15", the acceptance criteria of the proposal say what remains, and the commit that closed each step says which criterion it met.

## Alternatives considered

**Keep an append-only work log.** No rewriting, and a journal is easy to append to. It lost because it becomes a second history that drifts from git, and every entry outlives the work it describes — the implementation-status narration the slop checklist removes.

**Keep it and systematise it into the skill set.** The pattern could ship the artifact, so every adopting project gets the same continuity. It lost because the maintainer's test is the source project: it did not need one, so shipping one would make the skill set claim a requirement its own origin disproves.

**Keep it for this repository only.** It was already scoped that way and cost nothing outside this repository. It lost because that is where most of the cost was anyway — a tier, a standing order, and a map section exist for this repository alone.

**Replace it with a per-objective section in each proposal.** No new artifact, and the proposal is already the design authority. It lost because a proposal is rewritten as it moves to implemented, and progress annotations in a decision record are exactly what the slop checklist removes.

## Consequences

Resuming an interrupted objective now means reading the proposals' acceptance criteria, the aggregate check, and the last few commits. That is several commands rather than one file, and it is the price the source project pays too.

Two things the record did that nothing replaces: the commands that resume a clone on a fresh machine, and one paragraph saying which step is next. The first is in `AGENTS.md` under Commands and in the root `README.md`; the second is derivable, which is what "reliably iterating without one" means.

## Reintroduction

**Reintroduce it only if resuming proves unreliable without it.** The condition is a measured cost, not a preference: two or more sessions that each re-derived the next step wrongly, or a handoff that lost work. The evidence would be the commits, not an argument.

## Verification of absence

Nothing references the artifact: no file under `.agents/`, `docs/`, or `skills/` names `work.md`, and no tier claims it. `grep -rn 'work\.md' AGENTS.md docs skills .agents/dsh-spec` returns nothing.

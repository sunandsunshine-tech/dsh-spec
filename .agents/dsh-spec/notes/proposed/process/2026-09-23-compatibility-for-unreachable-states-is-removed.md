# Agent Note: Compatibility for unreachable states is removed

Status: proposed

English | [中文](2026-09-23-compatibility-for-unreachable-states-is-removed.zh.md)

## Problem

The engine carried four accommodations for states no installed project can be in.

- `notes-root.ts` resolved the notes tree at this collection's own path *or* at the un-namespaced `.agents/notes/` it was extracted from, and two exported functions returned lists of possible prefixes for the rest of the engine to search.
- `verify-agent-note-format.ts` accepted a grandfather comment in place of `## Alternatives considered` for notes dated before `2026-07-05`, banned two retired debt markers, and `agent-note-tree.ts` carried each note's date for that cutoff alone.
- `verify-agent-note-classification.ts` failed a repository that keeps notes under `docs/rfc/` or `docs/rfcs/`.
- `manager.ts` had a branch for a replacement manager older than `--only-skill-set`, which installed the set from the replacement's manifest because that copy could not be told a target.

Nobody can reach any of them. The collection has never been published — the `v0.1.0` release is still a draft — and the tag that does exist already carries the namespaced notes path, the current body format and the flag, so even a copy pinned to it cannot be in any of those four states. What they are is this repository's own history: a layout it was extracted from, a body format it migrated to, a documentation tree an earlier ADR process used, and a flag added while the extraction was still being written.

The cost is not the lines. Each one is a branch no test can reach without constructing a project that cannot exist, and two of them were rules nothing enforced: the note date fed only the grandfather cutoff, and the un-namespaced layout was a second answer to a question a project answers once.

## Proposal

Remove all four, and with them the machinery that existed only to feed them: the note's `date` field and its two construction sites, the two prefix-list functions, and the imports and variables the deleted branches were the last readers of. Where a rule the collection still wants was stated in a comment about one of them, the comment changes with the code — the misleading claim that an installed project adapts `md-scope.ts`'s scope lists is corrected in the same pass.

The rule this leaves behind: compatibility is carried for a state a user can be in. A state only this repository could reach is not a compatibility burden but its own history, and the git log is where history lives.

## Alternatives considered

- **Keep them, since they cost little.** They cost little to write and something to read: a reader has to work out which of two layouts, two body formats, or two upgrade paths applies, and no gate can tell them the answer.
- **Keep the older-copy branch as future-proofing.** It is the one with a real argument: a ref that predates the flag would break the two-half upgrade. But the flag is in the first tag, so the ref would have to be a branch this repository deleted, and a stack of five pull requests is not the place to guess at a future one.
- **Keep them until the first release is published.** Then the argument from "no user can be in that state" would be checkable rather than assumed. It would also mean shipping four accommodations in the first release, which is what makes them permanent.
- **Remove only the notes-layout fallback.** It is the largest, but the other three have the same property, and removing one leaves the reader wondering which of the remaining ones are load-bearing.

## Acceptance criteria

- `notes-root.ts` resolves one path and exports one prefix per question; the engine reads no list of candidate prefixes.
- `verify-agent-note-format.ts` requires `## Alternatives considered` unconditionally, and no grandfather comment, debt marker or format date survives in the engine.
- `verify-agent-note-classification.ts` judges the tree it walks and no other directory.
- `manager.ts` has one second-half path; the test that stood in for an older copy is gone.
- The registry's notes describe the deviations that remain, and the whole check set passes.

## Risks

A project that adopted the pattern *before* this collection existed — one already carrying notes at `.agents/notes/` or bodies in the old format — has to migrate before running these gates, and nothing reports the layout it left behind; the failure it sees names the missing tree rather than the move it needs. And the older-copy branch is real protection for a downgrade, so if a future ref ever drops `--only-skill-set`, the upgrade path has to be rebuilt rather than reused.

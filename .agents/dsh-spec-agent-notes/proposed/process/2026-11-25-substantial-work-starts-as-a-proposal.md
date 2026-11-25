# Agent Note: Substantial work starts as a proposal

Status: proposed

English | [中文](2026-11-25-substantial-work-starts-as-a-proposal.zh.md)

## Problem

An issue can say what remains to be done, but it is a poor place to preserve design rationale, alternatives, acceptance criteria and risks. A separate work record only adds another status store. Without a clear split, agents either bury design in issue comments or treat an unmerged draft as active guidance.

## Proposal

Substantial future work starts as a proposed Agent Note. The note owns the problem, design, alternatives, acceptance criteria and risks. An issue tracks execution, dependencies, status and evidence, and links the note rather than copying its decision text.

A proposal that exists only on a Draft branch is not active inventory. Once the proposal is retained, it merges to `main` under `proposed/` and becomes discoverable there. A proposal stays proposed while implementation is absent or partial; when the shipped decision is complete, the owning note moves to `implemented/`.

No work-record artifact is introduced. No duplicate standing-instruction asset restates this workflow. The existing decision to [drop the work record](../../implemented/process/2026-09-18-drop-the-work-record.md) continues to own that constraint; this proposal only assigns design and execution roles.

Tracking: #133.

## Alternatives considered

**Put the full design, alternatives and status in the issue.** It avoids an extra file, but mixes a mutable execution view with durable rationale and loses the notes lifecycle and bilingual unit.

**Reintroduce a work-record file.** It offers one place to look for status, but duplicates the issue tracker and the proposal's acceptance criteria while requiring every change to maintain another state source.

**Treat a Draft-note file in a branch as active guidance.** It avoids a merge, but makes uncommitted inventory depend on which branch a later session happens to see.

## Acceptance criteria

- Every substantial future change has one proposed note owner and one execution issue.
- The issue links the note and records status/evidence without reproducing the complete design.
- The proposal enters active inventory only through a merge to `main`.
- Lifecycle movement changes the note format and links in the same change.
- No `work.md`, second status store or copied standing-instruction asset is created.

## Risks

- Small changes can acquire unnecessary note overhead; the existing “lasting decision rationale” trigger still decides whether a note is owed.
- Issues and proposals can drift if implementation lands without moving or updating the owner.
- A proposal can remain in inventory after work stops; rejection or deletion must follow the notes lifecycle rather than leaving abandoned status.

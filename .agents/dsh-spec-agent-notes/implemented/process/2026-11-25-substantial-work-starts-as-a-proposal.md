# Agent Note: Substantial work starts as a proposal

Status: implemented

English | [中文](2026-11-25-substantial-work-starts-as-a-proposal.zh.md)

## Problem

An issue can say what remains to be done, but it is a poor place to preserve design rationale, alternatives, acceptance criteria and risks. A separate work record only adds another status store. Without a clear split, agents either bury design in issue comments or treat an unmerged draft as active guidance.

## Decision

Substantial future work starts as a proposed Agent Note. The note owns the problem, design, alternatives, acceptance criteria and risks. The project's execution tracker owns dependencies, status, completed and pending evidence and the next checkpoint; each side links the other rather than copying the complete design.

A proposal that exists only in a working tree, Draft change or unmerged branch is not active inventory. Once retained on the target branch under `proposed/`, it becomes discoverable there and can guide implementation. A proposal stays proposed while implementation is absent or partial; at the complete checkpoint, when every accepted criterion is shipped and verified, the owning note moves to `implemented/`.

No separate work-record artifact exists, and no duplicate standing-instruction asset restates this workflow. The existing decision to [drop the work record](2026-09-18-drop-the-work-record.md) continues to own that constraint and its measured reintroduction condition; this note assigns design and execution roles and the full/partial checkpoint rule.

Tracking: #133.

## Alternatives considered

**Put the full design, alternatives and status in the issue.** It avoids an extra file, but mixes a mutable execution view with durable rationale and loses the notes lifecycle and bilingual unit.

**Reintroduce a work-record file without new evidence.** It offers one place to look for status, but duplicates the issue tracker and the proposal's acceptance criteria while requiring every change to maintain another state source. The removal decision permits reintroduction only after its measured continuity condition is met.

**Treat a Draft-note file in a branch as active guidance.** It avoids a merge, but makes uncommitted inventory depend on which branch a later session happens to see.

## Consequences

- Every substantial future change has one proposal for design and one execution tracker for status and evidence. The proposal and tracker item link to each other; issue comments can describe progress without becoming a second design authority.
- A proposal enters active inventory only through retention on the target branch. Branch-local drafts cannot make implementation depend on which session happens to see them.
- Lifecycle movement changes the status, skeleton, complete unit and inbound links in one change. Partial work remains proposed and records its remaining accepted scope.
- Small changes can acquire unnecessary note overhead; the existing “lasting decision rationale” trigger still decides whether a note is owed. Issues and proposals can drift if implementation lands without the checkpoint, and abandoned proposals must be rejected or deleted under the notes lifecycle.

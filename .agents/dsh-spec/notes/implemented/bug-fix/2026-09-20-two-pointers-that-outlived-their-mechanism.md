# Agent Note: Two pointers that outlived their mechanism

Status: implemented

English | [中文](2026-09-20-two-pointers-that-outlived-their-mechanism.zh.md)

## Problem

The mechanism's own documents pointed at things this repository no longer has. `.agents/dsh-spec/notes/README.md` told a reader the slop checklist lives "in the documentation standard, `docs/AGENTS.md`", and `.agents/dsh-spec/notes/archived/AGENTS.md` told them `{gate-dir}` is "the `notes-gates` value in the ledger". Both the documentation standard and the ledger were deleted in this session, so both sentences sent a reader to a dead end — inside the contract that governs decision records, the last place a dead pointer should survive.

Separately, the archive gate's seal was never actually read. It computed the repository root as two levels above the notes root, correct when notes lived at `.agents/notes/` and one level short once they moved to `.agents/dsh-spec/notes/`. Git finds the repository by walking up, so a working directory of `<repo>/.agents` is still inside the repository; the defect is that the pathspec is relative to that working directory — `git ls-tree <ref> -- .agents/dsh-spec/notes/archived/manifest.json` — so from `<repo>/.agents` the path it asked for was `<repo>/.agents/.agents/dsh-spec/notes/archived/manifest.json`, which does not exist.

`<repo>/.agents` + pathspec `.agents/dsh-spec/notes/archived/manifest.json` → `.agents/.agents/…`

Git answered "no such path in that tree"; the read came back empty, and the code took the empty result as "no seal yet". The gate then compared the working-tree manifest against itself: erasing a seal and rewriting the manifest — the move the committed seal exists to forbid — reported a clean archive. An artifact dropped on its own still tripped the triplet and per-manifest checks, so the blindness was narrower than it looked, and the append-only guarantee was gone.

## Decision

**The two pointers name what exists.** The slop checklist is described as something the collection no longer ships as a page, and the archive instruction names the fixed engine directory `.agents/skills/dsh-spec-manager/scripts` as where the gates are. **The same two sentences are corrected in the templates that install them**, so a new project never receives the broken form.

**The archive gate climbs to the repository root and reads the seal.** The notes root sits three levels below it, `.agents/dsh-spec/notes`, and the climb is written at that depth; the committed manifest read now returns content, so an artifact the committed seal names and the working tree no longer records is reported as a missing sealed entry instead of a clean archive.

## Alternatives considered

**Leave the pointers and let a reader discover the dead ends.** No edit, and a reader who follows the sentence learns the document is gone. It lost because the contract *is* the mechanism: a reader who cannot follow it stops trusting it, and the cost lands on the next session rather than on this one.

**Keep the pointers but mark them as historical.** Honest about the state, and it preserves the shape of the original sentence. It lost because the deleted documents are not this project's history to cite, they are gone; a sentence that says "this used to be documented" is a slower dead end.

**Fix the seal by removing the git read entirely and trusting the working-tree manifest.** One fewer moving part, and the manifest is right there on disk. It lost because the committed seal is what makes the archive append-only, and a working-tree read would let an edit pass.

## Required verification

This change requires the aggregate green under `run.ts --all --root .` — including from the **installed** copy under `.agents/skills/`, which is the copy the dispatcher runs.

It also requires a probe in a scratch repository, in two parts: a sealed artifact that is then deleted must fail the gate, and — the case that isolates this fix — a committed seal whose manifest entry the working tree no longer records must fail as a missing sealed entry, where before the fix the rewritten manifest reported a clean archive.

## Consequences

The archive gate's verdict now depends on a committed manifest it actually reads, so the seal means what it says. The notes root is a path read by two mechanisms at once — the working directory the gate runs git in and the pathspec resolved against it — and the move to `.agents/dsh-spec/notes/` changed the path in one while the other kept assuming the old depth, the same class as this repository's own rule that a path must be derived from its owner. The reading cost a probe to pin down: the triplet and per-manifest checks still catch a lone dropped artifact, so only an erased or rewritten seal isolates what was lost.

The two corrected sentences state a fact rather than a citation, so nothing rots when a page is deleted again.

The audit that found both is the lesson worth carrying: after deleting a mechanism, grep the mechanism documents that mention it — deletions that leave no dangling reference are the exception, not the rule.

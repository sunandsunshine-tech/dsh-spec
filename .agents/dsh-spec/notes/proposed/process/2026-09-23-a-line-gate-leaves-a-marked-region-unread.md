# Agent Note: A line-reading gate leaves a marked region unread

Status: proposed

English | [中文](2026-09-23-a-line-gate-leaves-a-marked-region-unread.zh.md)

## Problem

A gate that reads source lines cannot see structure. `verify-md-link-syntax` flags the two shapes a bulk rewrite leaves behind wherever they appear in a file, because the text that tells the two apart — whether the brackets were meant as a link — is not in the line. A document that deliberately keeps a stretch of text exactly as it stands therefore has only bad options: edit the frozen text until the gate is satisfied, or leave the gate failing and teach everyone to ignore it.

The whole-file case already has an answer: the frozen archive moves a sealed triplet out of the corpus, so no gate reads it at all. That answer cannot serve one region inside an otherwise live document, where the surrounding prose is authored, evolving, and must be read.

The mechanism for the in-file case exists upstream and was lost in the extraction. dsh's `findReferenceViolations` takes an optional `excludedRange` selector, and its `historical-schema-region.ts` uses it to leave the generated schema excerpt inside an otherwise live historical-format page unread. This pattern's `repo-files.ts` was extracted as a `split` that kept only the glob expansion, so the scanner and its hook never arrived, and nothing here can express "this region is deliberately as it was".

## Proposal

Port the mechanism and give it one owner and one visible effect.

`findReferenceViolations` arrives with its `excludedRange` parameter. A new `excluded-region.ts` owns the marker pair's name — a document writes `<!-- gate-exclude:start -->` and `<!-- gate-exclude:end -->` on their own lines — and returns the range between them as the selector a gate passes. `verify-md-link-syntax` takes it, so a marked region is left unread there rather than in each gate separately.

Two rules keep the mechanism from becoming a way to hide prose. The marker name has exactly one literal, in that module, so a reader who greps the corpus for one spelling finds every marked region. And a half-applied marker is not a region: unless exactly one opening and one closing marker appear in that order, the selector returns undefined and the gate reads the whole file.

The gate names what it skipped. A run that leaves a region unread prints the file and the line range beside its summary, because a check that reports green over text it did not read, without saying so, is the failure this collection's evidence rules exist to prevent.

## Alternatives considered

- **Leave the mechanism unported.** The ported scanner had no consumer in this repository, so dropping it looked free; it is not, because the collection ships to projects whose documents quote and freeze text, and an adopter cannot add a hook the engine does not have.
- **Make the marker name a project setting.** A file listing markers would let a project invent spellings, and then a reader grepping for one would not find the others; the name is a convention rather than a preference.
- **Skip by path instead.** Documenting "this file is not read" already exists as the scope modules, and it cannot express a live file that is read everywhere except one region.
- **Skip silently.** A gate that quietly reads less than it appears to is worse than one that fails: the green line is the only evidence a reviewer has, and it would no longer mean what it says.

## Acceptance criteria

- `repo-files.ts` exports `ReferenceViolation` and `findReferenceViolations`, the latter taking `excludedRange`.
- `excluded-region.ts` holds the marker name as one literal and returns a range only for exactly one ordered marker pair.
- `verify-md-link-syntax` leaves a marked region unread and prints the file and line range it skipped.
- A half-applied marker is read, and the tests cover both outcomes.
- The registry records `repo-files.ts` at the revision the scanner came from, with the relation and note updated.

## Risks

The region is read by no gate at all, not only by the one that motivated it, so a mark placed once suppresses every future line-oriented check over that text; a project that marks a large region has silently shrunk its own corpus, and only the printed skip line says so. And because the mark is invisible outside its file, a reader looking at a failing-then-passing diff has to trust the skip line rather than see the region excluded in a scope list.

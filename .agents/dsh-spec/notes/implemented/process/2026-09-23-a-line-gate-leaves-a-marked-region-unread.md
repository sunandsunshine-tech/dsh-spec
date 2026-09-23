# Agent Note: A line-reading gate leaves a marked region unread

Status: implemented

English | [中文](2026-09-23-a-line-gate-leaves-a-marked-region-unread.zh.md)

## Problem

A gate that reads source lines cannot see structure. `verify-md-link-syntax` flags the two shapes a bulk rewrite leaves behind wherever they appear in a file, because the text that tells the two apart — whether the brackets were meant as a link — is not in the line. A document that deliberately keeps a stretch of text exactly as it stands therefore had only bad options: edit the frozen text until the gate is satisfied, or leave the gate failing and teach everyone to ignore it.

The whole-file case already has an answer: the frozen archive moves a sealed triplet out of the corpus, so no gate reads it at all. That answer cannot serve one region inside an otherwise live document, where the surrounding prose is authored, evolving, and must be read.

The mechanism for the in-file case existed upstream and was lost in the extraction. dsh's `findReferenceViolations` takes an optional `excludedRange` selector, and its `historical-schema-region.ts` uses it to leave the generated schema excerpt inside an otherwise live historical-format page unread. This pattern's `repo-files.ts` was extracted as a `split` that kept only the glob expansion, so the scanner and its hook never arrived.

## Decision

`findReferenceViolations` is ported with its `excludedRange` parameter, and the marker name has one owner and one visible effect.

- `repo-files.ts` exports `ReferenceViolation` and `findReferenceViolations`; the scanner reads the source once, asks the optional selector for a zero-based end-exclusive range, and skips exactly those lines.
- `excluded-region.ts` owns the marker pair's name. A document writes `<!-- gate-exclude:start -->` and `<!-- gate-exclude:end -->` on their own lines, and the selector returns the range between them.
- `verify-md-link-syntax` passes that selector, so a marked region is left unread there rather than in each line-reading gate separately.
- The gate prints the file and line range of every region it skipped, beside its summary.

Two rules bound it. The marker name appears as exactly one literal, in that module, so a reader who greps the corpus for one spelling finds every marked region. And a half-applied marker is not a region: unless exactly one opening and one closing marker appear in that order, the selector returns undefined and the gate reads the whole file.

This is the in-file half of what the frozen archive does for whole files: a sealed triplet leaves the corpus by path, and a marked region leaves it by range. The archive is where a decision's history goes; a mark is for text a live document must keep exactly as it stands.

## Alternatives considered

- **Leave the mechanism unported.** The ported scanner had no consumer in this repository, so dropping it looked free; it is not, because the collection ships to projects whose documents quote and freeze text, and an adopter cannot add a hook the engine does not have.
- **Make the marker name a project setting.** A file listing markers would let a project invent spellings, and then a reader grepping for one would not find the others; the name is a convention rather than a preference.
- **Skip by path instead.** Documenting "this file is not read" already exists as the scope modules, and it cannot express a live file that is read everywhere except one region.
- **Skip silently.** A gate that quietly reads less than it appears to is worse than one that fails: the green line is the only evidence a reviewer has, and it would no longer mean what it says.

## Consequences

**What it bought.** A document can keep one region exactly as it stands without failing a gate or leaving it red, and the mechanism lives where the scanner lives rather than in whichever gate needed it first. The relation between the two ways text leaves a gate's reach is now stated in one place instead of being rediscovered per case.

**What it costs.** The region is read by no gate at all, not only by the one that motivated it, so a mark placed once suppresses every future line-oriented check over that text; a project that marks a large region has silently shrunk its own corpus, and only the printed skip line says so. Because the mark is invisible outside its file, a reader looking at a failing-then-passing diff has to trust that line rather than see the exclusion in a scope list.

**What it leaves to a reader.** The marker name is a convention this collection documents and no gate enforces: a document that writes a near-miss spelling is read in full, and the only symptom is the absence of a skip line. The ported scanner is also where the next line-reading gate should start, so an adopter adding one gets the hook without adding a second convention.

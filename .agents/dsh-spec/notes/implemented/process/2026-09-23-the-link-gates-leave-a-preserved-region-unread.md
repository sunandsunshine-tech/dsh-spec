# Agent Note: The link gates leave a preserved region unread

Status: implemented

English | [中文](2026-09-23-the-link-gates-leave-a-preserved-region-unread.zh.md)

## Problem

A gate that reads source lines cannot see structure. `verify-md-link-syntax` flags the two shapes a bulk rewrite leaves behind wherever they appear in a file, because the text that tells the two apart — whether the brackets were meant as a link — is not in the line. A document that deliberately keeps a stretch of text exactly as it stands therefore had only bad options: edit the frozen text until the gate is satisfied, or leave the gate failing and teach everyone to ignore it.

The whole-file case already has an answer: the frozen archive moves a sealed triplet out of the corpus, so no gate reads it at all. That answer cannot serve one region inside an otherwise live document, where the surrounding prose is authored, evolving, and must be read.

The mechanism for the in-file case existed upstream and was lost in the extraction. dsh's `findReferenceViolations` takes an optional `excludedRange` selector, and its `historical-schema-region.ts` uses it to leave the generated schema excerpt inside an otherwise live historical-format page unread. This pattern's `repo-files.ts` was extracted as a `split` that kept only the glob expansion, so the scanner and its hook never arrived.

## Decision

`findReferenceViolations` is ported with its `excludedRange` parameter, and both link gates take the range a preserved region returns.

- `repo-files.ts` exports `ReferenceViolation` and `findReferenceViolations`; the scanner reads the source once, asks the optional selector for a zero-based end-exclusive range, and skips exactly those lines.
- `excluded-region.ts` owns the marker pair's name. A document writes `<!-- preserved-region:start -->` and `<!-- preserved-region:end -->` on their own lines, and the selector returns the range between them.
- Both link gates pass that selector: `verify-md-links` for the targets and fragments it resolves, `verify-md-link-syntax` for the two shapes a rewrite leaves behind. A preserved region is the document's own text to both of them, so a project needs one convention rather than one per gate.
- An anchor a preserved region defines stays a valid target, so marking a region never turns it into an island that inbound links cannot reach. What the mark removes is the judgement of the region's own links, not the region's existence.
- Each gate prints the file and line range of every region it skipped, beside its summary.

Two rules bound it. The marker name appears as exactly one literal, in that module, so a reader who greps the corpus for one spelling finds every marked region. And a half-applied marker is not a region: unless exactly one opening and one closing marker appear in that order, the selector returns undefined and the gate reads the whole file.

This is the in-file half of what the frozen archive does for whole files: a sealed triplet leaves the corpus by path, and a preserved region leaves it by line range. The archive is where a decision's history goes; a mark is for text a live document must keep exactly as it stands.

## Alternatives considered

- **Leave the mechanism unported.** The ported scanner had no consumer in this repository, so dropping it looked free; it is not, because the collection ships to projects whose documents quote and freeze text, and an adopter cannot add a hook the engine does not have.
- **Wire the hook into one gate and let the resolver keep reading the region.** That was the first cut, and it matched how upstream uses the selector. It lost because the region is the project's own text: a quoted excerpt whose links point at something that no longer exists is a case a mark exists for, and a resolver that still fails on it makes the mark useless for exactly that case.
- **Name the mark after what it excludes from.** `gate-exclude` read as a promise about every gate, and the engine cannot keep it — a gate reads the region until it asks for the selector. The name states the intent instead, and the two gates that honour it are named where the marker is defined.
- **Make the marker name a project setting.** A file listing markers would let a project invent spellings, and then a reader grepping for one would not find the others; the name is a convention rather than a preference.
- **Skip by path instead.** Documenting "this file is not read" already exists as the scope modules, and it cannot express a live file that is read everywhere except one region.
- **Skip silently.** A gate that quietly reads less than it appears to is worse than one that fails: the green line is the only evidence a reviewer has, and it would no longer mean what it says.

## Consequences

**What it bought.** A document can keep one region exactly as it stands without failing a link gate or leaving it red, and the two ways text leaves a gate's reach are stated in one place: the archive moves a whole file out by path, a mark leaves one range out by line. An anchor inside a preserved region still resolves for the rest of the corpus, so marking text does not orphan it.

**What it costs.** The mark covers the two link gates and nothing else: every other gate still reads the region, because a gate asks for the selector itself. A gate added later reads the whole file until someone teaches it to ask, which is the safe default and also means a mark is not a general promise about what no gate will judge. Both link gates print what they skipped, so the green line states its own coverage instead of leaving a reader to assume it.

**What it leaves to a reader.** The marker name is a convention this collection documents and no gate enforces: a document that writes a near-miss spelling is read in full, and the only symptom is the absence of a skip line. The name describes a state of the text rather than an effect on gates, because the effect belongs to whichever gates ask for the selector.

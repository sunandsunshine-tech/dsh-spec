# Agent Note: The simplifications skill follows upstream's rewrite

Status: proposed

English | [中文](2026-09-23-the-simplifications-skill-follows-upstream.zh.md)

## Problem

Our `dsh-find-simplifications` is an adaptation of an older upstream text: 157 lines that enumerate what counts as a strong candidate — unused consumers, mirrored representations, speculative generality, hand-rolled code — and then tell the reader to prove or reject each one. Upstream replaced it with a much shorter guide organised around scope, six discovery questions, reachability, ownership, infrastructure replacement, and recording, and moved every worked example into a reference file.

The old shape has two problems where this collection ships. Its criteria are a list to check off rather than questions to ask, so a candidate that fits none of them is never considered and a candidate that fits one is treated as proved. And its context is one project's: the examples name a repository's own subsystems, its two providers, and its package manager, which a reader in another project has to translate before they mean anything.

## Proposal

Adopt upstream's structure and apply this collection's extraction standard to its text.

The six sections arrive as they are. The dsh-specific anchors are generalised or dropped: the documentation paths it reads become "whatever the project keeps about its architecture, its defensive patterns and its testing"; its note links become this collection's note contract; its subsystem list becomes the project's own subsystems; its package-manager and documentation commands become the project's aggregate check and its own gates; and its two product constraints — two providers kept on purpose, one storage format as the sole first-party provider — are dropped, because they are one product's decisions rather than a rule about simplification.

The examples move to `references/historical-patterns.md` as patterns with the lesson each one taught, without upstream's citations: those notes are not installed with this collection, so a link to them would be a pointer nobody can follow. The three pointers that do resolve here stay — the prose standard, the pre-push checks, and the archive workflow that owns supersession — because each names a skill this collection ships.

## Alternatives considered

- **Keep the 157-line version and add the new questions.** Then one document carries two organisations of the same subject, and the reader has to decide which half governs the candidate in front of them.
- **Port the new text verbatim, paths included.** It would ship references to files an adopting project does not have, and the first thing a reader would learn is that the skill was written for someone else.
- **Ship the new text without the patterns reference.** The six questions would then be the whole skill, and the calibration they need — what an unreachable feature looks like, why a smaller package count is not proof — would be gone.
- **Keep the reference's citations and accept dead links.** A frozen note cannot be repaired, so the link would stay broken forever and no gate here checks a note that is not installed.

## Acceptance criteria

- `SKILL.md` carries the six sections, no dsh-specific path, command, subsystem or product constraint, and a description within the catalogue budget.
- `references/historical-patterns.md` states each pattern and its lesson with no citation to a note this collection does not ship.
- Every link in both files resolves, and the reference is reachable from the entry.
- The structure gate and the link gates pass, and the whole check set is green.

## Risks

The patterns reference lost its evidence. A reader can no longer open the record a lesson came from, so a pattern has to be believed or rediscovered rather than checked; the alternative was a link that resolves nowhere. The generalised scope advice is also weaker than the original list: "the project's own subsystems" tells a reader where to look without telling them what tends to hide there, which is exactly what the worked examples used to supply.

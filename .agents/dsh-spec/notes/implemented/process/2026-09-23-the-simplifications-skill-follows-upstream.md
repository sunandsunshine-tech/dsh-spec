# Agent Note: The simplifications skill follows upstream's rewrite

Status: implemented

English | [中文](2026-09-23-the-simplifications-skill-follows-upstream.zh.md)

## Problem

Our `dsh-find-simplifications` was an adaptation of an older upstream text: 157 lines that enumerate what counts as a strong candidate — unused consumers, mirrored representations, speculative generality, hand-rolled code — and then tell the reader to prove or reject each one. Upstream replaced it with a much shorter guide organised around scope, six discovery questions, reachability, ownership, infrastructure replacement, and recording, and moved every worked example into a reference file.

The old shape had two problems where this collection ships. Its criteria were a list to check off rather than questions to ask, so a candidate that fitted none of them was never considered and a candidate that fitted one was treated as proved. And its context was one project's: the examples named a repository's own subsystems, its two providers, and its package manager, which a reader in another project had to translate before they meant anything.

## Decision

The upstream structure is adopted and this collection's extraction standard is applied to its text.

The six sections arrive as they are: scope and constraints; the six discovery questions; reachability and the trade-off; ownership and failure semantics; infrastructure replacement; and recording, consolidating and validating. The dsh-specific anchors are generalised or dropped — the documentation paths it reads become "whatever the project keeps about its architecture, its defensive patterns and its testing"; its note links become this collection's note contract; its subsystem list becomes the project's own subsystems; its package-manager and documentation commands become the project's aggregate check and its gates; and its two product constraints are dropped, because two providers kept on purpose is one product's decision rather than a rule about simplification.

The examples live in `references/historical-patterns.md` as patterns with the lesson each one taught, and without upstream's citations: those notes are not installed with this collection, so a link to one would be a pointer nobody can follow. The three pointers that do resolve here stay, because each names a skill this collection ships: the prose standard, the pre-push checks, and the archive workflow that owns supersession.

## Alternatives considered

- **Keep the 157-line version and add the new questions.** Then one document carries two organisations of the same subject, and the reader has to decide which half governs the candidate in front of them.
- **Port the new text verbatim, paths included.** It would ship references to files an adopting project does not have, and the first thing a reader would learn is that the skill was written for someone else.
- **Ship the new text without the patterns reference.** The six questions would then be the whole skill, and the calibration they need — what an unreachable feature looks like, why a smaller package count is not proof — would be gone.
- **Keep the reference's citations and accept dead links.** A frozen note cannot be repaired, so the link would stay broken forever and no gate here checks a note that is not installed.

## Consequences

**What it bought.** The skill asks questions a reader can apply to a project it was not written for, its worked examples no longer need translating, and the six questions carry the calibration that used to be spread across a checklist — so a candidate that fits no criterion is still reachable.

**What it costs.** The patterns reference lost its evidence: a reader can no longer open the record a lesson came from, so a pattern has to be believed or rediscovered rather than checked. The generalised scope advice is also weaker than the original list — "the project's own subsystems" says where to look and not what tends to hide there, which is what the worked examples supplied.

**What it leaves to a reader.** The reference is the calibration, so a project that accumulates its own simplification records should cite them from there rather than trusting eight patterns forever; nothing in this collection enforces that, and the file says which shape each pattern came from without naming a source.

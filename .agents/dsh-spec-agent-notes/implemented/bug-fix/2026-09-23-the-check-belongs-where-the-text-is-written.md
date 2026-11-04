# Agent Note: The check belongs where the text is written

Status: implemented

English | [中文](2026-09-23-the-check-belongs-where-the-text-is-written.zh.md)

## Problem

An agent writing pull-request descriptions addressed the maintainer from inside the text: it offered to reclassify a note if the maintainer disagreed, handed over where the copy should be pinned, named the order the pull requests had to merge in, and cited what the maintainer had asked for. Every one of those is a failure this collection already names — the reader rule says a sentence addressed to whoever asked for the change is written for the wrong reader, and the leakage skill lists stack and PR vantage, review choreography and reviewer-addressed justification among its shapes. The failure was not a missing rule, but a missing reach, and three were absent.

**No rule names the surface.** The leakage skill enumerates four surfaces — comments, API documentation, docs, decision records — and a pull-request description is none of them; the prose standard's twelve prose locations have no entry for it either.

**The check is switched off where the writing happens.** The reader rule's self-check lives in `prose.reader`, and this repository applies no norms: `norms explain prose.reader --root .` answers `applied: no`, and `.agents/dsh-spec/norms/` does not exist. What arrives every session here is the standing order, which stated the rule and carried no check.

**The writer ran none of the checks.** The self-check, the leakage skill's one test and the prose standard's workflow were all available and none was run, and no gate reads pull-request text, so nothing in the flow stops at a description.

## Decision

**A check belongs at the scene where the text is written, not only in the document that owns the rule.** The standing order now carries the question beside the rule: every sentence of a draft is checked against one question — does it state the fact, or does it address the reader?

**A template comment says what its section contains, and the rule that governs the voice stays with the rule.** The reviewer-notes comment lists the facts that section reports and nothing else, and its one question-shaped item — what the writer was unsure of — now asks for the uncertainty met while implementing and why: an odd mechanism or an API whose real effect is unclear, kept as it stands or tried and then dropped. That is a fact to state, not a question to put, and the section is where stating it belongs. Restating the reader rule there would have been a second copy of a rule that already has a home, which is the drift the `owner.ssot` norm exists to prevent.

**Nothing else moves.** The reader rule already holds for every text, so no list has to name pull-request descriptions to make it binding; what the leakage skill's own surface list leaves out is recorded below rather than widened here.

## Alternatives considered

**Record the incident and change nothing else.** A bug-fix note is where this repository keeps a past incident's lesson, so this alone would have been the whole change. It lost because the next writer meets the same three blanks: a scope list that does not name the surface, a check in an unapplied catalog, and a template comment that models the address.

**Restate the reader rule in the template comment.** It would meet the writer where the writer acts, which is the finding above. It lost because a template's comment says what its section contains: a rule restated there is a second copy of one that has an owner, and the next change to that rule leaves the copy behind.

**Add pull-request text to the leakage skill's surface list.** It is the skill that already carries the shapes, and the gap is one clause. It lost here because that text ships and its scope sentence moves as a deliberate deviation from upstream, which is a decision of its own; the gap is recorded instead.

**Rely on the writer's discipline.** The reader note already says that nothing enforces the rule. It lost because the discipline failed twice in one session while the rule was on screen: what was missing is the scene, not the intention.

**Add a gate.** A gate is this collection's usual answer to a rule that keeps being missed, and it is the one that would not have helped: pull-request text is not in the tree, so no gate reads it, and a check for it would need a surface this repository does not have.

## Consequences

The rule and its check now arrive together in the one text an agent reads every session. The template comment stays a statement of what its section contains, with its one question-shaped item turned into what to report, so the writing scene asks for facts rather than for questions; the price is one question in the standing order and one reworded item in a template comment, neither of which is a gate.

The reader still has to run the check. It is a question in front of a writer rather than something a script can fail, and the same absence of enforcement the reader note records is unchanged.

## Deferred

- Naming pull-request descriptions and comments in the leakage skill's scope. It moves shipped text and is a deliberate deviation from upstream, so it is a decision of its own; until then, the classes that cover these shapes reach only the four surfaces that skill names.

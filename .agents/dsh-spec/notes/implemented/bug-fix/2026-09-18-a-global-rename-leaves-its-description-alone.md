# Agent Note: A global rename leaves the sentence that describes it alone

Status: implemented

English | [中文](2026-09-18-a-global-rename-leaves-its-description-alone.zh.md)

## Problem

A coordinated rename replaced one name with another across the whole repository, so no half-renamed state could land. The replacement had no notion of mention versus use: the record whose own prose described the rename contained the old name twice, and both occurrences were replaced. The file then said that a name becomes itself and that the step retired the name it had just introduced.

Every gate stayed green. The gates read structure — headings, links, class folders, word counts, marker pairing — and a paragraph whose nouns no longer agree with each other is well-formed by every one of those measures. The file was repaired only because somebody read it for an unrelated edit, which is not a check.

## Decision

**A coordinated rename writes its own description after the pass, not before it, or exempts the file that describes the rename.** Where the pass must be global, the file that records the change is edited last and read afterwards.

**The file describing a rename is verified by reading it.** No gate here judges whether a sentence means what it says, so the reading is the check, and a change that renames something names the file that describes the rename in its review notes.

## Alternatives considered

**Run the pass over code only, and edit prose by hand.** Code has no mentions, so a replacement there is safe by construction. It lost because the prose about a name mostly uses it correctly, and hand-editing every occurrence costs more attention than re-reading one file.

**Run the pass over everything and grep the result for contradictions.** Automated and complete. It lost because the contradiction is semantic: no pattern states "this sentence now disagrees with the one after it", and the grep would need the very understanding the pass lacked.

**Add a gate that reads prose for self-consistency.** The only check that could have caught it. It lost because such a gate needs a model of the subject, which is the reasoning-transcript problem this skill set refuses to solve with a script; the reading it would replace is cheaper than the gate would be.

## Consequences

A coordinated rename costs one extra read of the file that describes it, and the file most likely to be corrupted by a mechanical edit is the one the change is written to make reviewable.

The residual risk is unchanged and belongs to review: a pass that corrupts prose still leaves every gate green, and nothing here will say so.

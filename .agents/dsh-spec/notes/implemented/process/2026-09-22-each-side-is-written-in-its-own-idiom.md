# Agent Note: Each side is written in its own idiom

Status: implemented

English | [中文](2026-09-22-each-side-is-written-in-its-own-idiom.zh.md)

## Problem

A bilingual pair is two documents carrying one meaning, and the gate that keeps them together reads structure: heading depth, list shapes, code blocks, link targets. It cannot read a sentence. So a pair can pass every check while the side a reader actually speaks is unreadable, because that side was made by carrying the other side across one clause at a time.

This repository produced the failure on its own notes. A first draft of one Chinese side kept the English sentence shapes: "in the same breath" became a literal phrase for doing two things at once, "would survive" was applied to accumulated content where the verb does not fit, "the expensive direction" and "buy insurance" were carried over as images a Chinese reader does not use, and a paragraph of em-dashes followed the English subordination. Every structural check passed. A native reader stopped at the first line.

## Decision

**Write each side in the idiom of its own language; let the structure be the contract, not the wording.** The pair's job is that both sides say the same thing, and saying it is not the same as translating it. A sentence whose shape came from the other side is rewritten from its meaning: reorder it, split it, drop the image, use the construction that language reaches for. Terms are governed separately, by the terminology table, which is where a deliberately shared vocabulary lives. The rule ships to adopters as `prose.idiom` in the norm catalogue, so a project can apply it without reading this record.

## Alternatives considered

**Translate faithfully, sentence by sentence.** Rejected: the unit of a pair is the meaning, not the sentence. Fidelity to the source's syntax is what produces the failure — the reader has to translate back to understand, which is the cost the second language exists to avoid.

**Let the pairing gate catch it.** Impossible: the gate compares structure signatures, and a transposed sentence has the same headings, lists and links as its original. This rule has to live with whoever writes the second side.

**Leave it to a reviewer who speaks the language.** Kept as the fallback, never as the rule: review does catch it — that is how this was found — but a rule that lives only in a reviewer's eye is rediscovered change by change, and the writer is the one who can fix it cheapest.

## Consequences

- The second side takes as long as the first. A pair is two pieces of writing, not one piece and a copy.
- Structural alignment stays mechanical, so the gate keeps its value: it still catches a drifted link or list even when both sides read well.
- A native reader saying "this reads like machine translation" is evidence about the prose, and belongs in a report as a defect rather than in a debate about taste.

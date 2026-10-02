# Agent Note: Each side is written in its own idiom, in an order a reader can follow

Status: implemented

English | [中文](2026-09-22-each-side-is-written-in-its-own-idiom.zh.md)

## Problem

A bilingual pair is two documents carrying one meaning, and the gate that keeps them together reads structure: heading depth, list shapes, code blocks, link targets. It cannot read a sentence. So a pair can pass every check while the side a reader actually speaks is unreadable, because that side was made by carrying the other side across one clause at a time.

This repository produced the failure on its own notes. A first draft of one Chinese side kept the English sentence shapes: "in the same breath" became a literal phrase for doing two things at once, "would survive" was applied to accumulated content where the verb does not fit, "the expensive direction" and "buy insurance" were carried over as images a Chinese reader does not use, and a paragraph of em-dashes followed the English subordination. Every structural check passed. A native reader stopped at the first line.

A second failure borrows no sentence at all. A report can be made of sentences that are each true and still leave the reader with nothing, because the order carries no thread: a point here, an aside there, the reason for the first point three paragraphs later. The maintainer said of one such report that each paragraph pushed the one before it out of mind — and structure passed there too, because the pairing gate reads headings and the checks read commands.

**The same rule covers what an agent says.** A reply is read under the same conditions as a document: in the language it is written in, by someone who has to follow it once.

## Decision

**Write it the way its language says it, and put it in an order a reader can follow.** Two requirements, one reader:

1. **Its own language's idiom.** A sentence whose shape came from another language is rewritten from its meaning: reorder it, split it, drop the image, use the construction that language reaches for. Terms are governed separately, by the terminology table, which is where a deliberately shared vocabulary lives.
2. **An order that carries.** State the conclusion or the request first, then the chain that supports it, in cause-and-effect order; every sentence is established by the ones before it or is marked as a new premise; what belongs together stays together, and neighbouring paragraphs do not contradict each other. Order is not decoration: a reader who cannot hold the first paragraph while reading the second has been given nothing.

**Which language a text is in is not this rule's question.** A pair has its two sides by contract, this repository's and the skill set's own text is English because an agent reads it, and a reply uses the language of the ask. The rule begins once that is settled.

The rule ships to adopters as `prose.idiom` in the norm catalogue, so a project can apply it without reading this record.

## Alternatives considered

**Translate faithfully, sentence by sentence.** Rejected: the unit of a pair is the meaning, not the sentence. Fidelity to the source's syntax is what produces the failure — the reader has to translate back to understand, which is the cost the second language exists to avoid.

**Write it as an essay: context, then reasoning, then the answer.** Rejected: the maintainer reads in order to decide, and an answer that arrives last is an answer they had to hold the whole text for. The chain still runs in cause-and-effect order; the conclusion is placed where it can be used.

**Let the pairing gate catch it.** Impossible: the gate compares structure signatures, and a transposed sentence has the same headings, lists and links as its original. This rule has to live with whoever writes the second side.

**Leave it to a reviewer who speaks the language.** Kept as the fallback, never as the rule: review does catch it — that is how this was found — but a rule that lives only in a reviewer's eye is rediscovered change by change, and the writer is the one who can fix it cheapest.

## Consequences

- The spoken side is bound by the same rule as a document, so the order is chosen before the first sentence rather than discovered while writing.
- The second side takes as long as the first. A pair is two pieces of writing, not one piece and a copy.
- Structural alignment stays mechanical, so the gate keeps its value: it still catches a drifted link or list even when both sides read well.
- A native reader saying "this reads like machine translation", or a reader losing the first paragraph to the second, is evidence about the prose, and belongs in a report as a defect rather than in a debate about taste.

## Related

- [A text names its reader](2026-09-23-a-text-names-its-reader.md) — the reader half of this rule, and the source of the `prose.voice` clause that prefers one real command or output to a paragraph of adjectives.

# Agent Note: A text names its reader

Status: implemented

English | [中文](2026-09-23-a-text-names-its-reader.zh.md)

## Problem

[Scan scope, inlined rationale, and a package README](2026-09-18-scan-scope-and-the-package-readme.md) recorded one instance of a text written for the wrong person: the package README explained itself to the maintainer rather than to the person installing it, and the sentence addressed to the maintainer was removed. The rule that incident left in the catalog — name who the page is for before writing it — says which reader to pick and never says when the picking happens, so the failure it was written from stays available to the next text.

The reader is not chosen while writing; it follows from what the text is and who receives it, and that is settled before a sentence exists. This set's own text is English because an agent reads it, a README is read by the person installing the thing, a decision record by whoever maintains it next, and a pull request description by its reviewer. A text written before that choice is made is written for whoever is present instead — the maintainer who asked for it, the reviewer reading the diff, the author's own future self. The marker is a sentence that asks its reader something: a question is addressed to someone who can answer, and the reader of a finished text cannot.

## Decision

Which reader a text has is settled before its wording. It is a property of what the text is and who receives it, and it fixes the register, the assumptions and the length before the first sentence is chosen, so a sentence written for the reader who happens to be present is a sentence for the wrong one and is rewritten rather than trimmed.

A text states what its reader acts on; it does not ask. A question addressed to a reader is an interaction that did not happen — the text is read without its author present, and its reader cannot answer. Where the reader is present and does answer, asking is the right form: the initializer's step that waits for the maintainer under `attended`, a reply that puts the decision back to the person who asked, a string that asks its user to confirm an action before it happens. The difference is who can answer, not the punctuation, so an interaction may ask and a record or a page may not.

The rule has three homes, one per reader:

- `prose.reader` carries it in the norm catalog, so an adopting project inherits it with the rest.
- `AGENTS.md` carries it as a standing order beside the idiom rule it shares a premise with.
- This note carries the reason, which the catalog line has no room for.

Two boundaries keep it from spreading. It does not decide which language a text is written in: `prose.idiom` owns that, and its settlement — a pair has its two sides by contract — is this rule applied to a different property. And it does not decide which reader a particular document has; each document's own contract settles that, and this rule says only that the choice comes first.

## Alternatives considered

- **Leave the reader to be settled while writing.** It is what produced the incident, and it reads as freedom: the author keeps every reader available until the last edit. It lost because the register, the assumptions and the length are already consequences of a choice made at the first line, so the reader is settled by default — by whoever is present — and the wrong-reader text is complete and useless.
- **Cut every question out of every text.** The check would be mechanical and a gate could count `?`. It lost because a string that asks its user to confirm an action is doing its job: the reader is present, the answer arrives before the action, and the wording is the mechanism rather than a leftover question.
- **Put it only in `AGENTS.md`.** One home, and an agent working here meets it every session. It lost because the rule holds for any project that writes for more than one reader, so an adopting project has to inherit it from the catalog, and this repository deliberately does not apply its own catalog.
- **Make the reader a declared field of every document.** A frontmatter key or a first heading would make the choice visible and checkable. It lost because the reader already follows from the document's contract — the skill set's own text is English because an agent loads it, a pair has two sides by language contract — and a second copy of a settled fact is the drift the one-home rule exists to prevent.
- **Keep the rule in the catalog and let the README note own the reason.** No new note, and the source path already resolves. It lost because that note records four decisions from one run of the initializer, so a reader following the source to learn why texts name their reader would read a scan's fix history instead.

## Consequences

**What it bought.** The reader became a decision that precedes a text rather than a habit acquired while writing it, and the failure has a marker its own author can see: a sentence that asks its reader a question is either an interaction that never happened or a decision the text has not made yet. The two prose rules that share the premise now read as a pair — what the text is settles its reader here and its language there — instead of one carrying an aside about the other.

**What it costs.** Naming the reader costs a sentence before the first line, and where the contract already settles it that sentence states the obvious. A text with more than one reader must pick one: a skill file is loaded by an agent and reviewed by a maintainer, and the second reader's needs become a second text — a PR description, a README, a note — rather than a longer first one.

**What it leaves to a reader.** Nothing enforces it, and nothing can: the catalog entry ends in a self-check question rather than a gate, so the check is the writer's, and a text that asks its reader will pass every check this collection has. The rule also does not name the reader of any particular document; a document whose contract leaves that open still has to be settled by its owner.

## Related

- [Scan scope, inlined rationale, and a package README](2026-09-18-scan-scope-and-the-package-readme.md) — the incident this rule was generalized from. That note stays active for the scan scope, the inlined rationales and the ask-before-write step, and this one owns the reader rule it also recorded.

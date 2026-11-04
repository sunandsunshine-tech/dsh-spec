# Agent Note: The skill set names the project's instructions as standing instructions

Status: implemented

English | [中文](2026-11-03-skill-vocabulary-uses-standing-instructions.zh.md)

## Problem

Six skills named the project's instruction source — `AGENTS.md` or the file it cites — as its declaration. The phrase states a document's form, not the obligation to follow it, and in `dsh-spec-pr-description` it collides with the AI-DECLARATION block, where declaration is a fixed format name. The trigger descriptions of `dsh-spec-agents-md` and `dsh-spec-code-review` and the body of `dsh-spec-prose-standard` already said standing instructions, so an agent reading several skills met two names for one referent. No active note owns this vocabulary; the terminology record governs the translation table, not skill instructions.

## Decision

In skill instructions, the project's instruction source is the project's standing instructions (`AGENTS.md` or the file it cites). The six skills that said declaration now use that phrase, including the bilingual description of `dsh-spec-translate-docs`. The reference documents those skills load — the notes contract, the pairing contract, the translation rules and the style examples — use it too. `dsh-spec-pr-description`'s default-conventions reference had used declaration for a different condition (a declared structure); that sentence now says "with no declared structure", and the pr-description skill body already said standing instructions. Verbs that describe the act — declare, declared — and the AI-DECLARATION / `ai-declaration:*` identifiers are unchanged. Records keep their wording: they preserve the decisions they recorded. Repository documentation, the skill-root notices and the translate package's comments use standing instructions too; the root `AGENTS.md` is the repository's own standing instructions. The term now covers the documentation surface a reader meets, except historical records.

## Alternatives considered

- **Keep declaration.** It is shorter and was the majority wording; rejected because it names a form rather than an obligation and overloads the AI Usage vocabulary.
- **Keep both terms.** It would avoid the prose churn; rejected because independently loaded skills would keep two trigger and body vocabularies for one referent.
- **Apply the term to records and repository documentation too.** Rejected because implemented notes preserve the decisions they recorded; rewriting their wording would blur the change rather than unify an instruction.

## Consequences

- Six skill bodies now use standing instructions; the four reference documents those skills load use it too, and the pr-description default-conventions reference was corrected to "declared structure" for its different condition. The repository documentation, skill-root notices and translate package comments use the term too, while records keep their historical wording. The installed copies mirror them; the token change is small and all twelve skill gates pass.
- Trigger vocabulary, behavior, schemas and the description's scope are unchanged; the terminology is prose and review enforces it.
- Remaining occurrences of declaration in the loaded instructions and references classify as AI Usage names, companion declarations, code or type declarations, the verb, or repository documentation that keeps its wording; none names the project's instruction source in a skill instruction or reference.

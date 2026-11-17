# Agent Note: Sibling references name a mechanism, not its implementation

Status: implemented

English | [中文](2026-11-17-sibling-references-name-a-mechanism-not-its-implementation.zh.md)

## Problem

Skills install independently, so a sibling skill name is an optional example, not a dependency. Some references also carried the sibling's exact headings, record placement, invocation policy or output details. Replacing the sibling with a project-local equivalent then changed the instruction itself, so the example biased the behaviour toward one implementation.

## Decision

A skill names another skill only as an optional example after stating a complete generic requirement. The parenthetical contains availability and the skill name in one of the two defined forms. The sibling's sections, paths, commands, options, record format, output location, internal ordering and invocation policy remain with the sibling. The requirement must still hold when a project substitutes an equivalent mechanism.

Descriptions and compatibility fields do not name sibling skills. `scripts/verify-sibling-references.ts` checks those metadata fields and the visible text of entries and references; `scripts/verify-corpus.ts` runs it as a corpus gate.

## Alternatives considered

- **Remove every sibling name.** It loses discoverability without preventing implementation leakage in the remaining prose.
- **Allow a short purpose inside the parenthetical.** It had kept some references readable, but the purpose supplied sibling-specific facts and made the optional example look like part of the contract.
- **Rely only on review.** Review remains necessary for semantic leakage, but it had allowed several concrete forms to drift without a stable mechanical check.
- **Put this repository policy in the shipped skill-spec gate.** The spec gate serves every Agent Skill adopter; this repository's sibling-reference policy belongs in the repository corpus gate.

## Consequences

- Cautious references remain discoverable, and a project that installs a different skill subset can still follow the generic requirement.
- The gate catches unqualified names, bracket detail and sibling names in metadata; review still catches cross-sentence process leakage and implicit aliases such as the former "notes companion shape".
- This note partially supersedes R12 in [Forging dsh-spec-code-review](2026-10-28-forging-dsh-spec-code-review.md); that record links back to this decision and states the current rule.
- The skill entries and installed copies change together.

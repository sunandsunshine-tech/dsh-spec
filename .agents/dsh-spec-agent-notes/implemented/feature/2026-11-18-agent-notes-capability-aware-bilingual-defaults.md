# Agent Note: Agent Notes select adaptive units before sealing

Status: implemented

English | [中文](2026-11-18-agent-notes-capability-aware-bilingual-defaults.zh.md)

## Problem

Agent Notes treated translation companions as optional and Translate Docs authorized a new pair only through project declarations or an explicit user request. An enabled translation mechanism therefore could not complete a new note without another declaration. Missing capability and failed translation also produced the same result, while archive sealing could freeze an unfinished unit.

## Decision

A note is the source member of a unit. The unit also contains every companion an external mechanism assigns to that note. Same-stem suffixes and exact source-to-companion path mappings can both declare membership, including a different stem or nested class path. The mechanism determines membership and owns companion names, formats, records and consistency checks; Agent Notes owns the declared unit's grouping, movement, sealing and frozenness. Agent Notes assumes neither translation syntax nor a particular translation skill.

For a new note or a first seal unit, the responsible model resolves the translated target set in this order:

1. the current request's explicit choice.
2. existing persistent project instructions.
3. a consistent target set from complete pairs in the same owner-defined class.
4. the primary agent's user language, when it differs from the source language.
5. no translated target.

Comparable files, project evidence and the user language are model judgments; the scripts receive explicit companion and readiness facts. Explicit target sets may contain several languages. Missing evidence, conflicting sibling sets, an unavailable mechanism or an unknown user language selects no translated target without asking. Installing a mechanism alone neither enables nor makes it available.

Target migration follows cost. Adding a target is progressive: new notes use the current target set, edited notes add their missing targets, and untouched notes do not change. Removing a target clears every eligible active and unsealed unit; sealed units remain unchanged. Range operations inspect or record existing units and do not require missing targets.

Selected companion work belongs to the unit. Translation, terminology or consistency failure leaves the unit unfinished, names the source, target, failed step and resumable next step, and never becomes English-only.

Sealing has a distinct readiness boundary. `archive --prepare` establishes the exact unit members, hashes and owner checks without writing the manifest. The workflow completes those checks; `archive --write --expect-plan <plan>` seals only the unchanged prepared unit after successful readiness. Moving a unit into `archived/` is not freezing it; writing the manifest is. Before sealing, selected translation completes while the note is active, then the unit moves, receives identical archive metadata, re-records its existing companions and runs readiness. Once sealed, its bytes and membership never change.

Translate Docs accepts the workflow responsible for a document scope as a third generic authorization source. An explicit target set may contain several targets; only an inferred default must be unambiguous. The rule names neither Agent Notes nor its unit or archive API. The model composes the two skills from their generic contracts, so either installs and completes its base path alone.

[Independent skills compose through workflow judgment](../architecture/2026-11-19-independent-skills-compose-through-workflow-judgment.md) owns the composition boundary; this note owns the concrete defaults and unit lifecycle. [The Agent Notes forging record](../process/2026-10-27-forging-dsh-spec-agent-notes.md) and [the Translate Docs forging record](../process/2026-10-28-forging-dsh-spec-translate-docs.md) remain authoritative for their mechanisms. This note partially supersedes their former English-only creation default, user-or-declaration-only authorization boundary, unique-target authorization and seal-only completeness model.

## Verification

| Requirement | Evidence |
|---|---|
| The five-step default, multi-target, progressive-add and strong-remove rules remain at their use sites | `node --test tests/skill-defaults.test.ts` |
| Unit membership, explicit target sets and independent installation are exercised by the deterministic suites | `node --test tests/agent-notes.test.ts tests/translation-docs.test.ts` |
| Prepare/plan staleness, owner readiness failure and successful guarded sealing are exercised through the real archive CLI | `node --test tests/agent-notes.test.ts` |
| The development corpora cover same-class discovery, user-language fallback, progressive add, strong removal, external companion mechanisms and both independent install profiles | `node --test tests/skill-scenarios.test.ts` plus a clean-context evaluation report |
| Both changed skills remain specification-valid | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs <changed-skill-dir>` |
| The corpus, installed copies, notes and translation records stay consistent | `pnpm run check:corpus` |

## Alternatives considered

**Use a fixed bilingual default.** It would guarantee companions, but a project without a translation mechanism could not complete it and an English-only project would be forced into a dependency it did not enable.

**Make Translate Docs a hard dependency of Agent Notes.** It would connect the two paths, but either skill would lose its independent installation and completion route.

**Copy the consistency-record mechanism into Agent Notes.** It would keep one skill self-contained, but it would duplicate Translate Docs' record format and checks and create two owners for the same pair.

**Let a CLI infer sibling targets or the user language.** It would make defaults look deterministic, but comparable documents and the primary agent's user language are open-ended context the CLI cannot recover reliably. The model resolves them and passes explicit targets.

**Treat an installed translation skill as enablement.** It requires no project data, but it would change every note in every project that installs the skill, including projects that never enabled translation.

**Add a new target to every existing note.** It creates strong consistency, but translation has a real cost and would force unrelated historical work. Progressive addition keeps untouched notes stable.

**Leave target removal progressive.** Removing a target costs only file and record cleanup, so keeping stale active targets would trade simple consistency for no meaningful migration saving.

**Keep English-only as the only creation default.** It preserves zero migration and project neutrality, but an enabled project would still require a separate declaration before its new notes could use the translation mechanism.

**Keep one globally unique target.** It cannot represent an explicit multilingual unit or a consistent multi-target class, and it conflicts with the client's repeatable target support.

**Rely on a model checklist before `archive --write`.** It makes finality visible but provides no evidence that the checked bytes are the sealed bytes. A prepared, hash-bound plan and generic readiness command give the irreversible step a mechanical boundary.

**Fall back to English-only after translation fails.** It produces a file, but it hides that the selected unit is incomplete and can seal an archive unit that no longer matches its selected composition.

## Consequences

- Projects with no available translation mechanism continue to write notes without translation companions and without modifying `AGENTS.md`. Other declared companions remain available.
- Enabled projects receive the target set selected from request, project policy, similar complete pairs or the primary agent's user language.
- Multi-target sets are represented explicitly; the scripts do not guess them.
- New targets propagate on creation or later edit; removed targets clear from active units. Sealed units never change.
- Translation failure becomes an explicit handover instead of a successful English-only result.
- Sealing distinguishes prepare, owner readiness and guarded write; a changed or failing unit cannot enter the manifest.
- The two skills remain independently installable and compose through model judgment rather than shared private APIs.

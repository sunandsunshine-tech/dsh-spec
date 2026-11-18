# Agent Note: Agent Notes default to capability-aware bilingual companions

Status: implemented

English | [中文](2026-11-18-agent-notes-capability-aware-bilingual-defaults.zh.md)

## Problem

Agent Notes treated translation companions as optional and Translate Docs authorized a new pair only through the project's standing instructions or the user's explicit request. An enabled project translation mechanism therefore could not authorize the counterpart of a new note without a separate project declaration. A missing mechanism and a failed translation also produced the same no-translation result.

## Decision

For each new note and each unit first entering the archive, Agent Notes selects translation companions in this order:

1. the current request's explicit choice.
2. an existing persistent project override.
3. an available, enabled project-scoped translation mechanism that resolves exactly one target language for the unit.
4. no translation companion, which leaves the note English-only.

A translation mechanism is enabled by project evidence that translation is configured, such as instructions, terminology data or an existing maintained pair. Installing a translation skill alone does not enable it or make it available. A project override or request may choose no translation, one or more targets, a bounded scope or an exclusion, and none of those choices requires creating or modifying `AGENTS.md`. When more than one target remains without a unique selection, the fallback selects no translation companion without asking for a default.

The ladder does not add a translation companion to an active note merely because the skill changed or to a sealed unit. When an existing active note first enters the archive, its archive unit selects and completes translation companions before sealing. Existing active notes may otherwise remain selectively translated.

When the ladder selects a pair, the translation and consistency check are required work for that unit. Translation, terminology or pairing failure stops with the unfinished unit, source, target, failed step and resumable next step. It cannot be relabeled English-only, and a new archive unit is completed before `archive --write` seals it.

Translate Docs accepts a workflow skill that owns a document scope as a third generic authorization source. The authorization names source paths or globs, requires one uniquely resolved target, cannot extend to sibling documents or `.agents/skills`, and grants no default when targets are ambiguous. The rule does not name Agent Notes or import its API.

Agent Notes owns translation selection and declares the complete unit for the scripts, including non-translation companions the project supplies directly. The project's translation mechanism owns translation names, records and consistency. Diagrams and other non-translation companions remain project declarations and are unaffected by the translation ladder. The scripts remain parameter-driven and do not read project instructions.

[The Agent Notes forging record](../process/2026-10-27-forging-dsh-spec-agent-notes.md) and [the Translate Docs forging record](../process/2026-10-28-forging-dsh-spec-translate-docs.md) remain authoritative for their mechanisms. This note partially supersedes their former English-only creation default and user-or-declaration-only authorization boundary.

## Verification

| Requirement | Evidence |
|---|---|
| The four-step default, zero-backfill boundary and fail-closed translation rule remain at their use sites | `node --test tests/skill-defaults.test.ts` |
| A workflow owner's authorization is bounded, generic, target-dependent and excludes `.agents/skills` | `node --test tests/skill-defaults.test.ts` |
| The Agent Notes and Translate Docs development corpora cover the enabled, absent, overridden, failed, ambiguous and excluded profiles | `node --test tests/skill-scenarios.test.ts` |
| Agent Notes behavior | Eleven clean-context runs covered enabled bilingual creation, no mechanism, English-only request override, unique Japanese project override with exclusion, invalid Japanese terminology handoff, installed-only non-enablement, multiple-target English-only fallback, unavailable translation fallback, first-archive translation, active/sealed zero backfill and preservation of a non-translation companion. All eleven met their scenario assertions. |
| Translate Docs behavior | Three clean-context runs covered one-path owner authorization, `.agents/skills` exclusion and ambiguous-target handoff. All three met their scenario assertions. |
| Existing pairing and archive behavior remain intact | `node --test tests/agent-notes.test.ts tests/translation-docs.test.ts` |
| Both changed skills remain specification-valid | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs <changed-skill-dir>` |
| The corpus, installed copies, notes and translation records stay consistent | `pnpm run check:corpus` |

## Alternatives considered

**Use a fixed bilingual default.** It would guarantee companions, but a project without a translation mechanism could not complete it and an English-only project would be forced into a dependency it did not enable.

**Make Translate Docs a hard dependency of Agent Notes.** It would connect the two paths, but either skill would lose its independent installation and completion route.

**Copy the consistency-record mechanism into Agent Notes.** It would keep one skill self-contained, but it would duplicate Translate Docs' record format and checks and create two owners for the same pair.

**Let Translate Docs name Agent Notes as the authorizing workflow.** It would make the immediate use case explicit, but it would couple a general pairing mechanism to one caller and require every equivalent workflow to edit Translate Docs.

**Treat an installed translation skill as enablement.** It requires no project data, but it would change every note in every project that installs the skill, including projects that never enabled translation.

**Ask the user whenever the mechanism is absent or ambiguous.** It avoids selecting silently, but missing project instructions are valid and the shared default contract requires a completed default.

**Keep English-only as the only creation default.** It preserves zero migration and project neutrality, but an enabled project would still require a separate declaration before its new notes could use the translation mechanism.

**Fall back to English-only after translation fails.** It produces a file, but it hides that the selected unit is incomplete and can seal an archive unit that no longer matches its selected composition.

## Consequences

- Projects with no available translation mechanism continue to write notes without translation companions and without modifying `AGENTS.md`. Other declared companions remain available.
- Projects with one enabled target receive an English note, target counterpart and consistency record by default.
- A request or persistent override keeps control of English-only, target, scope and exclusion choices.
- Active notes retain their composition until they first enter the archive. Sealed history never gains a translation companion.
- Translation failure becomes an explicit handover instead of a successful English-only result.
- The two skills remain independently installable and the scripts gain no new command or project-config parser.
- Translate Docs' description names authorized scopes while its body owns the mechanism. Agent Notes' description remains focused on note lifecycle triggers. Installed copies, repository notices and paired decision records move with the change.

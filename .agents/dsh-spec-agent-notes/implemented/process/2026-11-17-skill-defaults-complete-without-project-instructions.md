# Agent Note: Skill defaults complete without project instructions

Status: implemented

English | [中文](2026-11-17-skill-defaults-complete-without-project-instructions.zh.md)

## Problem

Declaring a default at its point of use keeps the value beside the behavior that consumes it. A skill that also reads the project's standing instructions could still leave the no-instruction state ambiguous: an executor might treat silence as missing configuration, ask the user to choose, add `AGENTS.md` to record the default, or create a second defaults table. Those responses make a temporary project depend on configuration it does not need and reintroduce the drift that local declaration avoids.

Seven skills select a behavior from a concrete default when a valid invocation leaves that default unspecified and existing project instructions are silent. They are `dsh-spec-agent-notes`, `dsh-spec-translate-docs`, `dsh-spec-pr-description`, `dsh-spec-prose-standard`, `dsh-spec-merging-stacked-prs`, `dsh-spec-skill-forge` and `dsh-spec-error-handling`. Their concrete values already live at their use sites, but their shared execution rule did not.

## Decision

Concrete defaults remain at their existing use sites. There is no central defaults table.

Each default-bearing skill carries one `## Defaults` paragraph with the same contract. A default is the value or strategy the skill declares at its use site. It applies when the current request and existing project instructions leave that choice open. A user turn or explicit parameter supplies a one-off value. Existing project instructions supply a persistent override and are read without being modified or copied. Missing project instructions are valid, so the user is not asked to choose a default and no instruction file is created or modified merely to select one.

The rule does not move or repeat any concrete value. The notes root remains in the note-location contract, translation defaults and data roots remain in the pairing contract, the change-description structure and language ladder remain in that skill, prose mode and style guidance remain at their use sites, the stack merge fallback remains in the merge procedure, forge language and record defaults remain where the forge uses them, and the result-only fallback discriminant requirement remains in the error-handling contract.

The skill forge's completion criteria now require every future forged skill that declares a default to apply it when the current request and existing project instructions leave that choice open, without asking for or creating or modifying project instructions merely to select it. This makes the rule part of future skill acceptance rather than a convention that only existing skills happen to follow.

The bundled scripts remain parameter-driven. They do not parse project instructions, write `AGENTS.md`, or copy project instructions into the repository; the agent reads an existing persistent override and passes its facts as invocation parameters.

## Verification

| Requirement | Evidence |
|---|---|
| Every default-bearing skill carries one shared contract paragraph, concrete values remain at their use sites, and the forge carries the future-skill acceptance clause | `node --test tests/skill-defaults.test.ts` |
| A Git project without `AGENTS.md` initializes the default notes root and does not create `AGENTS.md` | `node --test tests/agent-notes.test.ts` case `init creates the default notes skeleton idempotently` |
| A notes-root override leaves existing project instructions unchanged | `node --test tests/agent-notes.test.ts` case `--root overrides one invocation without rewriting existing project instructions` |
| A clean-context invocation reads a persistent notes-root override | A 2026-11-18 clean-context run read `AGENTS.md`, initialized `.project-notes`, created no default root, and left `AGENTS.md` unchanged; `notes.mjs check --root .project-notes --json` passed |
| A Git project without `AGENTS.md` initializes the default translation target and does not create `AGENTS.md` | `node --test tests/translation-docs.test.ts` case `init uses the default target without project instructions` |
| A terminology override leaves existing project instructions unchanged and creates no default copy | `node --test tests/translation-docs.test.ts` case `a terminology override leaves existing project instructions unchanged` |
| The skill bodies remain mechanically valid after the new section | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs <skill-dir>` for each changed skill |

## Alternatives considered

**Create a central defaults table.** It would make every value discoverable in one place, but the table would compete with the behavior that consumes each value and drift when one site changes. The decision keeps each value local and gives only the shared override behavior one home in each installable skill.

**Require `AGENTS.md` to declare a default before the skill runs.** It would make the selected value explicit, but absence is not an error and a temporary project need not acquire standing instructions to use a tool. The default applies when a valid invocation leaves that choice unspecified and existing instructions are silent.

**Put the shared rule only in the forge.** Future forged skills would inherit it, but the existing default-bearing skills would retain the ambiguous state and would not work on the same terms. Each independently installable skill needs the contract in its own body.

**Make the scripts read `AGENTS.md`.** It would centralize override discovery in code, but each script would gain a second instruction parser and a dependency on one file format. The agent reads existing project instructions and passes the resulting parameter; the script remains deterministic over its explicit inputs.

## Consequences

- A project with no `AGENTS.md` can initialize notes, choose the default translation target, write a change description, apply the default prose mode, land a stack, or forge a skill without first creating project configuration.
- Seven independent skills intentionally carry the same short paragraph. Each install remains self-contained; the content contract in `tests/skill-defaults.test.ts` detects a missing or duplicated contract paragraph and keeps each concrete value out of the shared paragraph.
- One-off overrides do not rewrite project instructions. A persistent override remains in the project document that already owns it; commands receive its path or value as parameters and do not create a second copy.
- The inventory excludes `dsh-spec-agents-md`, whose default directory placement applies only after an authorized AGENTS-writing task, and excludes parameter defaults such as the pre-push report's `HEAD`; neither selects agent behavior from a missing project instruction.
- The [forge decision record](2026-10-27-forging-dsh-spec-skill-forge.md) owns the future-skill acceptance clause, and the [translation decision record](2026-10-28-forging-dsh-spec-translate-docs.md) owns the current placement of translation defaults. Both are partially constrained by this record and remain active.
- Prose and forge rules are checked as content contracts rather than executed by a repeatable agent-behavior harness. The scripts' no-instruction and override paths have fixture coverage, and one clean-context run confirms that an executor reads an existing project instruction; execution of the prose contract outside those paths is review-backed rather than mechanically proven.

# Agent Note: Skill defaults complete without project instructions

Status: implemented

English | [中文](2026-11-17-skill-defaults-complete-without-project-instructions.zh.md)

## Problem

Declaring a default at its point of use keeps the value beside the behavior that consumes it. A skill that also reads the project's standing instructions could still leave the no-instruction state ambiguous: an executor might treat silence as missing configuration, ask the user to choose, add `AGENTS.md` to record the default, or create a second defaults table. Those responses make a temporary project depend on configuration it does not need and reintroduce the drift that local declaration avoids.

Six skills select a behavior from a concrete default when a valid invocation leaves that default unspecified and existing project instructions are silent. They are `dsh-spec-agent-notes`, `dsh-spec-translate-docs`, `dsh-spec-pr-description`, `dsh-spec-prose-standard`, `dsh-spec-merging-stacked-prs` and `dsh-spec-skill-forge`. Their concrete values already live at their use sites, but their shared execution rule did not.

Defaults also need a boundary when one skill activates another for a bounded part of the work. Treating every installed skill's defaults as one global set would make unrelated values leak across tasks and recreate a dependency on optional skills. Ignoring activated defaults would force the caller to duplicate a sibling's use-site value.

## Decision

Concrete defaults remain at their existing use sites. There is no central defaults table.

Each default-bearing skill carries one `## Defaults` paragraph with the same contract. A default is a value or strategy the skill declares at its use site. It applies when a valid invocation leaves that choice unspecified and existing project instructions are silent. A user turn or explicit invocation parameter supplies a one-off value. A persistent override is stated in existing project instructions and is read without being rewritten or copied. Missing project instructions are valid, and the user is not asked to choose a default or add an instruction file merely to select one. The contract does not waive separately required inputs, authorizations or stop conditions.

The skill bodies carry the high-level source and ownership rule. This record owns the detailed precedence, activation composition, authorization boundary and examples, so installed skills do not repeat that rationale.

The same contract permits composition along an actual skill activation. A may activate B, when B is available in the project, for one bounded part of the work. B then resolves an unspecified choice inside that part by B's own order, so B's project instruction may override B's default and a value A passes explicitly is explicit input to B. The activated default cannot resolve an unrelated A choice, override A's explicit value, or make B mandatory. Without an actual activation, merely being installed or named as an example contributes no default. A delegated invocation carries only the delegated step and the caller's applicable authority and scope; B's default cannot grant authorization or widen that scope. A chain A → B → C follows the same rule at each activated edge.

This is the enabling foundation for [#87](https://github.com/sunandsunshine-tech/dsh-spec/issues/87), not that issue's implementation. #87 still owns the Agent Notes bilingual default ladder, the Translate Docs owner-authorized pair source, target-language resolvability, translation failure semantics and the exclusion of `.agents/skills` content. This record establishes only why an activated sibling can contribute a default without becoming a dependency or gaining authority.

The rule does not move or repeat any concrete value. The notes root remains in the note-location contract, translation target selection and data roots remain in the pairing contract, the change-description structure and language ladder remain in that skill, prose mode and style guidance remain at their use sites, the stack merge fallback remains in the merge procedure, and forge language and record defaults remain where the forge uses them.

The skill forge's completion criteria now require every future forged skill that declares a default to resolve it when a valid invocation leaves that choice unspecified and project instructions are silent, while still enforcing separately required inputs and authorizations, and to satisfy the forge's `## Defaults` section, including activated-skill composition. This makes the rule part of future skill acceptance rather than a convention that only existing skills happen to follow.

The bundled scripts remain parameter-driven. They do not parse project instructions, write `AGENTS.md`, or copy project instructions into the repository; the agent reads an existing persistent override and passes its facts as invocation parameters.

## Verification

| Requirement | Evidence |
|---|---|
| Exactly the six default-bearing skills carry one shared contract paragraph, concrete values remain at their use sites, and the forge carries the future-skill acceptance clause | `node --test tests/skill-defaults.test.ts` |
| A Git project without `AGENTS.md` initializes the default notes root and does not create `AGENTS.md` | `node --test tests/agent-notes.test.ts` case `init creates the default notes skeleton idempotently` |
| A notes-root override leaves existing project instructions unchanged | `node --test tests/agent-notes.test.ts` case `--root overrides one invocation without rewriting existing project instructions` |
| A clean-context invocation discovers a persistent notes-root override | A 2026-11-18 clean-context run read an existing `AGENTS.md`, initialized `.project-notes`, created no default root, and left the project's existing files unchanged |
| A Git project without `AGENTS.md` initializes the adopter target at its per-language terminology root and does not create `AGENTS.md` | `node --test tests/translation-docs.test.ts` case `init requires the adopter target and uses its terminology root without project instructions` |
| A translation target and terminology override leave existing project instructions unchanged and create no default copy | `node --test tests/translation-docs.test.ts` case `a target override leaves project instructions unchanged and creates no default copy` |
| An activated available sibling contributes only its own default to the delegated step | A 2026-11-18 clean-context `dsh-spec-find-simplifications` run required an Agent Note without naming its root, then used the activated Agent Notes default root and left project instructions unchanged |
| Merely installed or named siblings contribute no default | The composition scenarios require an actual activation and never merge a sibling value into the caller's unrelated choices |
| The skill bodies remain mechanically valid after the new section | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs <skill-dir>` for each changed skill |

## Alternatives considered

**Create a central defaults table.** It would make every value discoverable in one place, but the table would compete with the behavior that consumes each value and drift when one site changes. The decision keeps each value local and gives only the shared override behavior one home in each installable skill.

**Require `AGENTS.md` to declare a default before the skill runs.** It would make the selected value explicit, but absence is not an error and a temporary project need not acquire standing instructions to use a tool. The default applies when a valid invocation leaves that choice unspecified and existing instructions are silent.

**Put the shared rule only in the forge.** Future forged skills would inherit it, but the existing default-bearing skills would retain the ambiguous state and would not work on the same terms. Each independently installable skill needs the contract in its own body.

**Make the scripts read `AGENTS.md`.** It would centralize override discovery in code, but each script would gain a second instruction parser and a dependency on one file format. The agent reads existing project instructions and passes the resulting parameter; the script remains deterministic over its explicit inputs.

**Merge every installed skill's defaults.** It would make adjacent skills appear composable without an activation edge. Unrelated values such as a translation target could then change PR descriptions or merge behavior merely because those skills are installed.

**Copy an activated sibling's default into the caller or project instructions.** It would make the value visible in a second owner and drift from the sibling's use site. The caller supplies an explicit input when it must choose the value, or the sibling resolves its own default inside the delegated step.

**Treat activation as authorization.** It would let any calling skill widen a sibling's write scope merely by invoking it. Activation carries the caller's existing scope and authority, and the sibling still enforces its own authorization and stop conditions.

## Consequences

- A project with no `AGENTS.md` can initialize notes, choose the default translation target, write a change description, apply the default prose mode, land a stack, or forge a skill without first creating project configuration.
- Six independent skills intentionally carry the same short paragraph. Each install remains self-contained; the content contract in `tests/skill-defaults.test.ts` detects a missing or duplicated contract paragraph and keeps each concrete value out of the shared paragraph.
- One-off overrides do not rewrite project instructions. A persistent override remains in the project document that already owns it; commands receive its path or value as parameters and do not create a second copy.
- Activated sibling defaults improve implicit composition without creating a global default registry. The benefit appears only when the caller actually invokes the sibling, and the sibling remains optional.
- The rule enables later linked-skill work such as #87 while preserving each skill's authorization boundary. It does not itself choose bilingual note pairs or add a Translate Docs authorization source.
- The inventory excludes `dsh-spec-agents-md`, whose default directory placement applies only after an authorized AGENTS-writing task, and excludes parameter defaults such as the pre-push report's `HEAD`; neither selects agent behavior from a missing project instruction.
- The [forge decision record](2026-10-27-forging-dsh-spec-skill-forge.md) owns the future-skill acceptance clause, and the [translation decision record](2026-10-28-forging-dsh-spec-translate-docs.md) owns the current placement of translation defaults. Both are partially constrained by this record and remain active.
- Prose and forge rules are checked as content contracts rather than executed by a repeatable agent-behavior harness. Clean-context exercises cover persistent-override discovery and an activated-sibling default, and the scripts' no-instruction paths have fixture coverage; execution of the prose contract outside those paths is review-backed rather than mechanically proven.

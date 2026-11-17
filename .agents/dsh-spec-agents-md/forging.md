# Forging requirements

This file is this repository's standing instructions for [the skill forge](../../skills/dsh-spec-skill-forge/SKILL.md). Read the forge skill first; it owns the general forging procedure.

## Same-repository skill references

A forged skill names another skill from this repository only as an optional example. State the requirement first; add the skill name in parentheses, qualified by availability. Use one of two forms:

- `(when available, use the dsh-spec-… skill)` when the sibling is the concrete mechanism.
- `(when available, consider using the dsh-spec-… skill)` when it is optional guidance.

Keep the parenthetical to the availability and name. Do not use the surrounding requirement to import the sibling's API: its sections, paths, commands, options, record format, output location, internal ordering and invocation policy stay with that sibling. The requirement must still hold when a project substitutes an equivalent mechanism.

The requirement must remain complete without the name; the name is not a link, path, or dependency.

Each default remains at its use site. A forged skill with a default applies it when the current request and existing project instructions leave that choice open. Missing project instructions are valid, and selecting a default never requires asking the user or creating or modifying an instruction file.

## Capability-dependent requirements

A forged skill states the result it needs and distinguishes a required capability from a preferred execution mechanism. A subagent, parallel execution, or isolated context is an optional mechanism unless the task cannot preserve its required quality without it. When the mechanism is absent, the skill must either complete through an equivalent verifiable route or stop with an explicit handoff naming the unfinished work and missing capability. Silent lower-quality completion is a failure.

For a capability-dependent skill, the review must cover both profiles when both are possible in the adopter's environment: capability present and capability absent. The absent-capability evidence is a completed observable result with its owning validation or an explicit handoff. A static keyword check does not establish this behavior.

## Model-facing description budget

Descriptions stay within 500 characters, enforced by the corpus gate (`--description-max 500`). DSH's model-facing catalog truncates beyond 500 UTF-16 code units; BMP-only text keeps the character count equal to that unit budget, so descriptions use BMP characters only.

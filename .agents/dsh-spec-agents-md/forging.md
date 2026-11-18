# Forging requirements

This file is this repository's standing instructions for [the skill forge](../../skills/dsh-spec-skill-forge/SKILL.md). Read the forge skill first; it owns the general forging procedure.

## Same-repository skill references

A forged skill names another skill from this repository only as an optional example. State the requirement first; add the skill name in parentheses, qualified by availability. Use one of two forms:

- `(when available, use the dsh-spec-… skill)` when the sibling is the concrete mechanism.
- `(when available, consider using the dsh-spec-… skill)` when it is optional guidance.

Keep the parenthetical to the availability and name. Do not use the surrounding requirement to import the sibling's API: its sections, paths, commands, options, record format, output location, internal ordering and invocation policy stay with that sibling. The requirement must still hold when a project substitutes an equivalent mechanism.

The requirement must remain complete without the name; the name is not a link, path, or dependency.

When the forged skill activates a sibling available in the project for a bounded delegated step, that sibling may apply its own defaults inside the step when its conditions match. The activated value cannot resolve an unrelated choice, override an explicit value, copy itself into the forged skill or project instructions, or make the sibling mandatory. A delegated invocation carries only the caller's applicable authority and scope, so the sibling default cannot grant authorization or widen the step. Merely installing or naming a sibling does not activate its defaults.

## Model-facing description budget

Descriptions stay within 500 characters, enforced by the corpus gate (`--description-max 500`). DSH's model-facing catalog truncates beyond 500 UTF-16 code units; BMP-only text keeps the character count equal to that unit budget, so descriptions use BMP characters only.

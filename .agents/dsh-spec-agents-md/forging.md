# Forging requirements

This file is this repository's standing instructions for [the skill forge](../../skills/dsh-spec-skill-forge/SKILL.md). Read the forge skill first; it owns the general forging procedure.

## Same-repository skill references

A forged skill names another skill from this repository only as an optional example. State the requirement first; add the skill name in parentheses, qualified by availability. Use one of two forms:

- `(when available, use the dsh-spec-… skill)` when the sibling is the concrete mechanism.
- `(when available, consider using the dsh-spec-… skill)` when it is optional guidance.

The requirement must remain complete without the name; the name is not a link, path, or dependency.

## Model-facing description budget

Descriptions stay within 500 characters, enforced by the corpus gate (`--description-max 500`). DSH's model-facing catalog truncates beyond 500 UTF-16 code units; BMP-only text keeps the character count equal to that unit budget, so descriptions use BMP characters only.

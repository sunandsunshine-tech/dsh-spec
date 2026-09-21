# Agent Note: Frontmatter has no owner in an adopted project

Status: implemented

English | [中文](2026-09-21-frontmatter-has-no-owner-in-an-adopted-project.zh.md)

## Problem

`verify-md-metadata` rejected a malformed YAML frontmatter block anywhere in a project's Markdown. It was written after a bulk reflow collapsed nine of this repository's frontmatter blocks onto one line, and here it earned its place: the skill READMEs carry frontmatter, and nothing else read it.

An adopted project has no such file. The notes mechanism uses its own header block — `# Agent Note:` plus `Status:` — and the format gate owns that; the documentation mechanism, whose pages carried the `kind:` taxonomy this frontmatter came from, is deleted; and the installed skills sit outside every prose gate's scope, so their READMEs are never read there. The only frontmatter a project has is its own, and no mechanism the collection ships requires any. So the gate enforced a rule with no owner, and it failed the first run of every fresh project: `init` writes six Markdown files, none with a frontmatter block, and the gate treats "nothing to check" as a failure — correctly, by the rule that a gate must not pass over an empty corpus.

## Decision

`verify-md-metadata` leaves the set, and the record now names seven gates. The check stays where the rule does: `scripts/verify-skill-structure.ts`, this repository's own gate, validates the README family's frontmatter — the fence, the closure, the `key: value` lines — because the skill READMEs are the only frontmatter this package ships and that gate already owns the packaging layer.

## Alternatives considered

**Relax the empty-corpus rule for this gate.** It would pass when it read files and found no frontmatter block, and fail only when it read none at all. It lost because that weakens the property which makes the aggregate trustworthy — a gate that reports nothing is a gate that has not run — to keep a check whose subject an adopted project does not have.

**Ship a frontmatter block in an `init` template.** One written file would carry frontmatter, so the gate would have something to check and a fresh project would go green. It lost because it invents a convention to satisfy a check: the block would exist to keep a gate busy, and every project would then have to keep it.

**Keep the gate and let a project without frontmatter omit it.** The gate is addressed by name, so a project could simply not run it. It lost because the aggregate runs every recorded gate, and a gate a project has to exclude is a defect in the collection rather than a choice the project made.

## Consequences

- A fresh `init` followed by `run.ts --all` no longer fails on a file nobody wrote; the recorded set is seven gates.
- A project that does use frontmatter has no shipped check for its shape. That is review's job, and such a project can wire its own.
- This repository keeps its own coverage: the structure gate now validates `README.md` and `README.zh.md` frontmatter, which is exactly where the incident that motivated the removed gate had landed.
- Verification: `run.ts --all --root .` ends `run: 7 gate(s), 0 failed`; a fresh `init --write` into an empty repository, committed, then `run.ts --all --root <that project>` ends `run: 7 gate(s), 0 failed`; and `verify-skill-structure.ts` passes for the skill directories it is run over.

## Related

- [Treat frontmatter as a block, not as a paragraph](../bug-fix/2026-09-18-frontmatter-is-a-block-not-a-paragraph.md) — the incident whose check moved out of the shipped set.

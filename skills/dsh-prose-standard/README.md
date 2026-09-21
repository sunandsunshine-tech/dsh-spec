---
description: "Where prose is required, what an edit must preserve, and the three mechanical checks over Markdown."
---
# dsh-prose-standard

English | [中文](README.zh.md)

## Summary

Write enough to preserve the contract, then remove the reasoning transcripts, repetition and decoration around it. This skill owns the editorial judgement for every surface a reader meets — READMEs, public API documentation, code and test comments, cookbooks, decision records, prompts, diagnostics, and command-line or UI strings — and the separate question of where prose is required at all. It is guidance, not a script: it says which propositions must survive a passage, never how to phrase a sentence.

## When to load it

Load it when writing, reviewing, restoring, trimming or auditing prose, and whenever a change adds, moves or deletes a comment, a document, a diagnostic, or a user-visible string. It requires an explicit `scope`; when the scope is missing it reports the required input and stops rather than inferring a repository-wide pass. `mode` chooses between automatic and interactive, and controls questions rather than write authority — a review or audit reports findings, and only a requested write or fix task applies them.

## What it covers

The governing rule is that every relevant proposition survives the edit: actor and action, condition, timing and ordering, modality such as must or never, negative guarantees and exceptions, ownership, side effects, failure modes and consequences. Coverage follows the location rather than a template: a caller-visible distinction belongs in API documentation, an invariant or race ordering in a comment, a prerequisite and its observable verification in a cookbook, the consumer contract and its limitations in a README, a non-obvious test design in the test, a correction in the diagnostic. Treat `contract`, `boundary`, `shape`, `seam` and their neighbours as terms to check before use, not as banned words.

## What a package README owes

Beside an agent-facing entry, the README is the human door: one page that says what the package is for, when to load it, and what its mechanism is as a whole. It is written for a person deciding in two minutes, so it keeps the register of documentation rather than of agent instructions, and it leaves the procedure, the argument order and the checklists to the entry; a section that only makes sense after reading the entry is cut. It ships as a pair — `README.md`, its `.zh.md` counterpart and the `.i18n.yaml` record — because the entry is English-only and the README is where a reader of either language meets the package.

## Where it stops

- **It will not read or edit `vendor/`**, even when the requested scope is the whole repository, and it will not follow a symlink into it.
- **It will not modernize the frozen archive.** `.agents/dsh-spec/notes/archived/` holds snapshots; an exact target may be inspected to understand a historical citation, never edited.
- **It treats generated catalogs, snapshots and fixtures as derivatives.** Trace every consumer, edit the owning source or scenario, then regenerate.
- **It does not manufacture edits to satisfy a deletion target**, and a smaller word count alone is not an improvement.
- **It will not fold a model-visible string change into a prose-only edit.** Wording there is behavior; with no owning scenario in the authorized scope, it leaves the wording unchanged and reports the deferral.

## How its checks are run

Two gates check the mechanics of Markdown rather than its editorial content, and this skill ships prose and no code: they live in the collection's one code home, `../dsh-spec-manager/scripts/`, and are addressed by name through the dispatcher `run.ts` beside them.

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-md-links --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-md-link-syntax --root .
```

`verify-md-links` rejects a relative link, image or definition whose target, or whose `#fragment` onto a Markdown file, does not resolve. `verify-md-link-syntax` rejects a link a bulk rewrite turned into prose — a bracketed label followed by a parenthesised reference, or a link nested inside a link — because neither parses, so the resolver reports nothing. The corpus is every Markdown file this repository authors — `.zh.md` counterparts included — minus the trees [`md-scope.ts`](../dsh-spec-manager/scripts/md-scope.ts) names: the frozen archive, the installed copy, `submodules/`, and dependency or build output. Document length, the module-contract kinds, and a malformed frontmatter block have no gate, so those stay a review responsibility.

## Read next

- [`SKILL.md`](SKILL.md) — the workflow an agent follows: inputs, required coverage by location, borderline decisions, and the report it owes.
- [`examples.md`](references/examples.md) — distilled before-and-after examples that identify the governing principle rather than a text template.
- [`dsh-trim-cot-leakage`](../dsh-trim-cot-leakage/SKILL.md) — the workflow for prose whose vantage is the authoring session rather than the repository.
- [`dsh-translate-docs`](../dsh-translate-docs/SKILL.md) — the bilingual workflow, and the pair that must be re-recorded when this skill edits an authored side.
- [`dsh-code-review`](../dsh-code-review/SKILL.md) — the review that requires new prose to receive semantic judgement rather than a green gate.

---
description: "The extended bilingual workflow: briefed updates, whole-document translations, and the pairing record."
---
# dsh-translate-docs

English | [中文](README.zh.md)

## Summary

Two languages carry equal authority in a paired document, and a pair is three sibling files: `foo.md`, `foo.zh.md`, and the `foo.i18n.yaml` record that hashes both sides as of the last time they were confirmed to agree. This is the expensive path for changing one side of such a pair — a generated briefing for a drifted pair, a delegated translator for a whole new counterpart, and the command that records the pair once you have checked that both sides say the same thing.

## When to load it

Only on a decision, never on a coincidence. Run it when the user asks for it; when you judge it warranted — a pair drifted, a new page needs a counterpart, a reviewer asked for the other language — stop and ask the user first, naming what would be translated, which pairs are involved, and what would be written. When nobody asked, do not run it: a documentation task that merely touches a paired file is not a translation task, and `verify-translation-pairing` will tell you when a counterpart is missing. The one-line counterpart update a gate demands is routine work under the project's lightweight rule, not this workflow.

## The three paths

| The change | The path |
|---|---|
| One side of an existing pair was edited | Briefing-driven update. `gen-translation-brief.ts` maps the change at the narrowest safely aligned granularity — Markdown unit, then section, then whole document — and carries the changed units, the terminology rows they touch and a digest of the update rules. A diff that lies only inside shared code fences is spliced with `--apply`; a prose diff is delegated to a subagent that receives the briefing as its whole working set. Never re-translate a document to apply an update. |
| No counterpart exists yet | Whole-document path. A subagent reads the sources of truth below and translates section by section, locking structure to the source as it goes; the orchestrating agent does not translate. |
| A document was deleted or renamed | Delete or rename the counterpart and the `.i18n.yaml` with it, or the gate reports an incomplete pair. |

## What it refuses to do

- **It never runs as a side effect.** Not from another task, and not from a bilingual file simply being present.
- **It never translates a frozen Agent Note.** A triplet under `.agents/dsh-spec/notes/archived/` is sealed by the archive gate and is not translation work.
- **It never invents a rendering.** A term in `docs/terminology.md` renders exactly as the table specifies; an unlisted term needs a citable precedent or stays English and is listed as pending (「待定术语」).
- **It never records a pair it has not confirmed.** `--write` names exactly the pairs you verified and refuses to run bare, so a bulk re-record is always an explicit `--all`.
- **It treats a green pairing hash as structure, not quality.** The gate compares heading depths, fences, table and list structure, link locale and semantic targets; meaning, terminology and tone are read on the diff.

## How its checks are run

The briefing generator and the pairing gate are commands in the collection's one code home, `../dsh-spec-manager/scripts/`; this skill ships prose and no code. `<pair>` is any one file of the pair.

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --write <pair>
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --explain <path>
```

The corpus-wide check runs once before a push, selected through [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md), not once per update. A new counterpart is also a new page of prose, so run the three Markdown gates [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) names over it.

## Read next

- [`SKILL.md`](SKILL.md) — the workflow an agent follows: the approval gate, the update path, the whole-document path, and finishing the pair.
- [`i18n-contract.md`](references/i18n-contract.md) — the pairing contract: the three-file pair, the consistency record, the language switcher, scope and exclusions.
- [`translation-rules.md`](references/translation-rules.md) — how to translate: faithfulness, structure, terminology discipline and typography, at MUST/SHOULD levels.
- [`style-samples.md`](references/style-samples.md) — the calibration anchors for register, paired against this project's own gold translations.
- [`translation-prompt.md`](references/translation-prompt.md) — the machine-consumed template for the automated pipeline, which agents do not render.

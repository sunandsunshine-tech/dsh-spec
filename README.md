# dsh-spec

English | [中文](README.zh.md)

The dsh development pattern, extracted into eight skills an agent loads.

The pattern is small: a decision is written down before it is built, prose is written for the reader it has, a change carries the evidence it owes, and one command decides whether all of that holds. This repository is the package that ships those skills, the installed copy this project runs, and the record of how the package itself was designed.

## What is here

| Surface | Holds |
|---|---|
| `skills/` | The deliverable: eight skills, one per workflow, each with a `SKILL.md` catalog entry and the `references/` and `templates/` it needs. The gates those skills are checked by are code, and all of it lives in `dsh-spec-manager/scripts/`. Nothing here is a copy of anything else. |
| `.agents/skills/` | The installed set, tracked in git so every collaborator loads the same revision. An agent reads these; nobody edits them by hand. |
| `.agents/dsh-spec/notes/` | The decision records: what was decided, what lost, and what was given up. The layout and the in-file format are [`notes/README.md`](.agents/dsh-spec/notes/README.md). |
| `docs/` | Pages a person reads. Nothing manages this folder: no tier, no ceiling, no check, and no instruction file of its own. Nothing is required to be here. |
| `scripts/` | The one check that belongs to this repository rather than to the package: [`verify-skill-structure.ts`](scripts/verify-skill-structure.ts). |
| `submodules/dsh/` | The project the pattern was extracted from, pinned as a diff baseline. Read it, never edit it. |

## What owns what

- **The skills own the pattern.** Each `skills/<name>/SKILL.md` is one workflow's entry, and the skill beside it carries that workflow's contract. The deliverable is what those skills do in the project that installs them, so this repository holds no second statement of it.
- **The notes own the why.** A decision's rationale, the alternatives it beat and the verification it requires live in the note that decided it, in the `proposed`, `implemented`, `rejected` or frozen archived tree. Code and prose state what is true; a note states why, which is the part neither can carry.
- **`AGENTS.md` owns the standing orders.** The root file carries the rules an agent needs in every session and routes to everything else: `docs/` and `submodules/` above, the notes tree's own [`AGENTS.md`](.agents/dsh-spec/notes/AGENTS.md), and each skill's entry.
- **The manager owns the set.** [`skills/dsh-spec-manager/`](skills/dsh-spec-manager/SKILL.md) carries the manifest that names every skill and records every gate, the dispatcher that resolves a gate name against that record and reconciles it with the scripts beside it, the code of every gate, and the command that refreshes the whole set.
- **`docs/` owns nothing you must read.** It holds the terminology the bilingual pairs share, at [`docs/terminology.md`](docs/terminology.md), and any page a person writes for people.

## How a change flows

1. **Decide in a note.** A non-trivial change starts as an Agent Note under `.agents/dsh-spec/notes/proposed/`, carrying the problem, the alternatives that lost, and what will be verified. A conclusion agreed in conversation is recorded the same way, because a decision that lives only in a transcript is invisible to the next session.
2. **Change the skill, not the installed copy.** The work lands in `skills/`. `.agents/skills/` is overwritten on the next install, so an edit there is lost; the two trees differ only by the metadata block an install injects.
3. **Verify with the aggregate.** The dispatcher runs every recorded gate and fails when one fails, when the record names none, or when that record and the `verify-*.ts` scripts beside it disagree. It is the whole check: [`AGENTS.md`](AGENTS.md#commands) carries the commands, and each workflow skill selects the smallest subset a given diff owes.
4. **Move the note and refresh the copy.** A shipped decision moves to `implemented/` and states what shipped; the change is pushed, the installed set is refreshed from that revision, and both land together.

## Refresh the installed set

The manifest's `revision` field is the only thing that pins the set, and an install reads that revision rather than the working tree — so push the source change first:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 \
  .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

[`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md) owns what that command does to each skill, and what `update`, `status` and `uninstall` add.

## Read next

- [`AGENTS.md`](AGENTS.md) — the standing orders, and the commands this repository runs.
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) — the entry to the collection; the other seven skills sit beside it.
- [`skills/dsh-spec-manager/README.md`](skills/dsh-spec-manager/README.md) — the collection's own introduction: what it installs, what it writes into a project, and how to change what its gates do.
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.md) — the decision-record contract, which is the pattern's own description of itself.

---
description: "Install a decision-record tree, and the gates that keep it honest."
kind: "module-contract-composition"
---
# dsh-spec-manager

English | [中文](README.zh.md)

## Summary

Install this skill by hand and it brings the other seven: a decision-record tree, one aggregate check, and the gates that keep it honest. Decisions land as notes carrying the alternatives that lost, a translated pair is recorded by content hash so a stale one fails instead of shipping, and the collection's own documents describe what it does rather than a second mechanism beside them. The cost is one directory under `.agents/dsh-spec/`, and one pinned revision the whole set moves at.

Make an agent team's decisions durable and its evidence checkable: one skill installed by hand, seven more through it, and the gates that keep both true.

This is the collection's own documentation — what it writes into a project, how to run its checks, and how to change what they do.

## What you can do with it

- **Record why.** Every non-trivial change lands with a note holding the decision, the alternatives that lost, and what must be verified, so the next agent does not re-litigate a settled question.
- **Stop arguing about prose in review.** A gate rejects a note outside the contract and an unrecorded translation, so those never reach a reviewer.
- **Translate without losing the thread.** A pair is checked for matching structure and recorded by content hash, so a stale translation fails the check instead of shipping.
- **Ask a gate instead of reading it.** When a document is unexpectedly translated, or unexpectedly not, one command names the counterpart it looked for.
- **Adopt it in an existing project.** One initializer creates the tree, extends your instruction file without rewriting it, and reports every question it could not answer.

The cost is a one-directory footprint under `.agents/dsh-spec/` and eight skills an agent loads selectively rather than all at once.

## Requirements

Node ≥ 22.19 or ≥ 24, pnpm ≥ 10, and a `gh` with the `skill` command. There is no `package.json`, no install step, and no build.

## Installation

Install this skill by hand; it is the one entry a project adds itself:

```sh
gh skill install <owner>/<repo> dsh-spec-manager@<revision> --dir .agents/skills
```

Install at **project scope** and commit the installed directory. The copy an agent loads is then the copy every collaborator runs, and an update reaches all of them through the same path.

Then initialize the project. The initializer writes nothing without `--write`:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts init --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts init --root . --write
```

It extends an existing `AGENTS.md` rather than replacing it, creates the decision-record tree and the documentation folder's two paths once, and lists the facts only you can supply. Then let the manager install the rest of the set:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

`install` runs one `gh skill install` per manifest entry, every one of them at the revision the manifest pins; the installer's injected metadata is what records that revision, and nothing else is written. `update` installs the whole set again at one revision, `status` reports anything that drifted from the manifest or from the revision an installed entry carries, and `uninstall` removes the set. Never edit the installed copy in place, because the next install overwrites it.

An install has two halves. The second one reaches **your** tree: `install` and `update` also run the initializer's `sync` mode, which brings the files whose text the collection owns — the notes contract and its three `AGENTS.md` files, the documentation orders, `.rgignore`, and the marked standing-orders block — up to the same revision, so every project's mechanism text is identical. Two things you own survive by rule: the rows of `docs/terminology.md`, and everything in `AGENTS.md` outside the marked block. `sync` does that half alone, and without `--write` it only reports what would change.

## What it writes into your project

These paths belong to the project, and the mechanism text among them is kept identical to the installed revision by `sync`: the notes files and the documentation orders are replaced, while a terminology row and the standing orders outside the marked block are yours and stay.

| Path | Holds |
|---|---|
| `.agents/dsh-spec/notes/` | The decision records, the contract that governs their layout and in-file format, and the lifecycle and class folders they live in |
| `docs/terminology.md` | The vocabulary every bilingual pair obeys, released empty: a row is the maintainer's decision, so the initializer never writes one |
| `docs/AGENTS.md` | The orders for that folder, including who may add a row to the table and that the table itself declares no pair |

The collection has one code home: `.agents/skills/dsh-spec-manager/scripts/` holds every gate, the dispatcher that resolves one by name, and the modules they share. That directory is **the collection's engine, not this skill's private resources** — the other skills ship prose and references and no code at all, so a gate's defect belongs to the collection rather than to one workflow.

## Usage

A gate is addressed by name through the dispatcher, never by path: it is a name recorded in the manifest, backed by a script beside the dispatcher, and the two must agree — the dispatcher reconciles them before it resolves anything, so a recorded gate whose script is gone, or a `verify-*.ts` file the record does not name, stops the run instead of quietly changing it:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-classification --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-archived-agent-notes --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
```

Every gate runs from the project root, needs no dependencies, and exits non-zero when it finds nothing to check. The aggregate runs every recorded gate and exits non-zero when one fails **or when the record names none**; because the record and the directory are reconciled before anything starts, a recorded gate whose script is gone, or a `verify-*.ts` file nobody recorded, is a refusal with both sides named rather than a silent pass. That is what makes every check non-optional.

Ask about one file instead of reading the gate:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-translation-pairing --root . --explain docs/guide.md
```

## Changing what a gate does

Gates take no configuration and no edits. Every fact a gate reads has one owner in the tree, and where two artifacts must agree — a recorded gate and its script — the dispatcher checks that they do before it runs anything:

| Fact | Where it lives |
|---|---|
| Which gates exist | the `gates` record in `.agents/skills/dsh-spec-manager/references/manifest.json`, every name backed by a `verify-*.ts` script beside the dispatcher — the two are reconciled when a gate runs |
| Which revision the set is installed at | the `revision` field of the same file |
| Which revision an installed skill actually is | the `metadata` block `gh skill install` injects into its `SKILL.md` |
| Which documents are paired | the tree: a `.md` with a `.zh.md` counterpart or an `.i18n.yaml` record beside it |
| Where the decision records live | `.agents/dsh-spec/notes/`, one literal in `notes-root.ts` |
| Where the terminology table lives | `docs/terminology.md`, one literal in `i18n-scope.ts` |

Deriving each path from one owner is what replaced the configuration file this collection used to ship: two literals for one path is how a change lands in one of them and the other keeps working, silently, until somebody reads it.

## Known Limitations

- `gh skill` is a preview feature, and it resolves a skill from the repository's default branch: every install names a revision explicitly, so a project receives the one the manifest pins.
- No gate runs by itself: there is no build step, no test suite, and no CI in an adopting project until it wires the commands into its own check.
- The three surviving prose gates cover link targets, link syntax and frontmatter shape; document length and the module-contract kinds are review's responsibility rather than a command's.
- Pairing is declared by the tree, so deleting a `.zh.md` un-pairs a document silently; the gate reports what declares no pair, and review owns whether that was intended.

## What is inside

Eight skills, one per workflow. A provider that discovers this collection finds eight catalog entries; the manager installs the other seven by name from the manifest, so the set a project runs is the one that file lists.

| Skill | Answers |
|---|---|
| [`dsh-spec-manager`](SKILL.md) | Owning the set: initialization, install, update, removal, status, and the aggregate check |
| [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md) | Validating the notes tree, checking supersession, freezing shipped records |
| [`dsh-translate-docs`](../dsh-translate-docs/SKILL.md) | Keeping a document and its translation in step, and recording the pair |
| [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md) | The smallest evidence that covers an outgoing change |
| [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) | What prose each location owes — API documentation, comments, tests, READMEs, diagnostics, user-visible strings |
| [`dsh-trim-cot-leakage`](../dsh-trim-cot-leakage/SKILL.md) | Removing prose whose vantage is the authoring session rather than the repository |
| [`dsh-code-review`](../dsh-code-review/SKILL.md) | The reviewer's path through a change |
| [`dsh-find-simplifications`](../dsh-find-simplifications/SKILL.md) | Turning "find things to simplify" into evidence-backed proposals |

## Read next

- [`SKILL.md`](SKILL.md) — the entry an agent loads, and the route to each workflow skill.
- [`references/manager-init.md`](references/manager-init.md) — the initializer, step by step.
- [`references/manager-lifecycle.md`](references/manager-lifecycle.md) — the manifest, install, update, status, uninstall, the engine directory every gate sits in, and the command that refreshes the set.
- [`scripts/README.md`](scripts/README.md) — the vendored Markdown bundle the gates parse with, and how to regenerate it.

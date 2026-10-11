# Agent Note: Actions are subcommands, and the cheap scope is the default

Status: implemented

English | [中文](2026-09-21-actions-are-subcommands.zh.md)

## Problem

The entry point took a subject and then an operation spelled as a flag: the check subjects carried `--check`, the archive carried `--check` or `--write`, and the pairing subject spread five operations across five flags of which exactly one could appear. The shape was a bag of switches rather than the two-level command line every tool a reader already uses presents — `kubectl config set-context`, `helm repo add`, `mise use` — and the switches disagreed with each other: the diff dispatch and the tree dispatch took no paths, the link check required them, and the notes check took either the whole tree or a path list.

Two costs followed. A reader could not guess the shape of one command from the shape of its neighbour, so every question started with `--help`; and no form's default was small. A bare subject was a usage error, so the smallest thing a reader could ask was an operation plus a scope they had to know already — while the flag that read the whole tree looked exactly as cheap as the one that read a single note.

## Decision

**An action is a subcommand.** Verbs execute directly: `install`, `upgrade`, `uninstall`, `status`, and the aggregate `check`. Nouns take a verb: `notes check`, `notes-archived check|write`, `translation-pair check|list|explain|write|brief`, `md-links check`. One verb at two levels is ordinary — `helm list` and `helm repo list` coexist — so `check` names both the aggregate and a noun's operation.

**Flags stay modifiers.** `--all`, `--files-from`, `--base`, `--head`, `--cached`, `--apply`, `--dry-run`, `--reinstall`, `--jobs`, `--root` and `--help[ zh|en]` keep their spelling and are not operations. Each verb documents its own.

**The cheap scope is the default.**

| Command | What it reads |
|---|---|
| `notes check <note...>` | the in-file format and class of the notes named |
| `notes check --all` | the active notes tree |
| `notes-archived check --all` | the frozen archive |
| `translation-pair check <pair...>` | the pairs named |
| `translation-pair list` | the whole pairing corpus, reported rather than judged |
| `translation-pair explain <path>` | one path's counterpart |
| `translation-pair write <pair...>` | re-records the pairs confirmed (`--all` for the corpus) |
| `translation-pair brief [--apply] [<pair...>]` | the update briefing; with no path, every drifted pair |
| `md-links check <markdown...>` | the links in the files named |
| `check <path...>` | the checks that claim those paths |
| `check --base <ref>` | the checks the diff owes, by kind |
| `check --all` | the note tree and the frozen archive |

**A path list is the narrow form, and the tree is the flag.** `check` with paths runs only the checks that claim them, using the same ownership test the diff dispatch applies; `check --base <ref>` replaces that list with the one a change produces; `check --all` is the explicit whole-tree form. `md-links check` has no `--all`, because a link is judged from the file that asks, so the corpus-wide form is `translation-pair list` for state and `--files-from` for a computed list.

**A missing argument prints a hint and changes nothing.** `check` with no paths, no `--base` and no `--all` prints one line naming the three forms and pointing at `check --help`, then exits 2; it never falls back to the corpus. A noun with no verb does the same. This is what `kubectl get` does (`error: Required resource not specified.` plus `See 'kubectl get -h' for help and examples`) and what `helm install` does (`Error: "helm install" requires at least 1 argument` plus the usage line).

**One spelling per command.** An operation spelled as a flag is refused rather than aliased, because two spellings of one operation is the duality this decision removed.

## Testing

The functional suite selects through the verbs and asserts the refusals beside them: a noun without its verb, `check` without a selection, an operation flag, and a command the grammar removed all exit 2 with a hint, while each verb's own help names that verb's flags. `references/cli.md` is rendered from `--help en --markdown`, so the reference and the screen cannot drift.

## Alternatives considered

**Keep the operations as flags and document each subject better.** The smallest change, and the help work already in place ([the CLI explains itself](2026-09-21-the-cli-explains-itself.md)) would have carried it. It lost because the shape, not the documentation, was the defect: `--write --all` still reads as two equal switches, and no amount of prose gives a reader a default that is safe to run.

**Let a bare noun mean its common action.** One word shorter for the frequent case. It lost because the common action differs by noun (`translation-pair list` is as common as its check) and because a bare noun that silently runs something is the failure this decision is about — a reader learns the tool's cost by running it.

**Keep the aggregate as a noun spelled `all check`, so every invocation is two words.** Uniform, and it removes the only exception. It lost because the aggregate is a verb's job — it runs checks — and `check --all` then puts the word "all" in the flag position, where the scope it names belongs.

**Default `check` with no arguments to `--all`.** The convenient reading, and the one a reader might expect from a tool with no arguments to give. It lost because it makes the expensive whole-tree read the silent behaviour of a bare command, and `--all` exists precisely so a person says it out loud.

## Consequences

**What it bought.** A reader can guess the shape of a command from its neighbours, so the first question is no longer always `--help`; the default reads only what it names; and an operation has one spelling, so a copied command either works or fails loudly.

**`check --all` is the tree checks and not every subject.** A reader who expects "everything" gets the tree checks; the file-based checks keep their own forms. The help names what it runs.

**The two-level grammar is more parser than a flat flag list.** It is covered by reconciling the commands against the manifest record before anything runs, the way subjects were reconciled before, and by the suite's rejection cases.

**Every document that quoted a command changed at once.** The notes tree, the shipped skills, `AGENTS.md`, the initializer's templates and the pairing records were one change, because a half-swept tree is worse than either spelling. The records that quoted the old run output now quote what the command prints.

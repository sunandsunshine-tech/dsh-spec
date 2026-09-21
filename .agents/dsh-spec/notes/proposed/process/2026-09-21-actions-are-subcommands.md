# Agent Note: Actions are subcommands, and the cheap scope is the default

Status: proposed

English | [中文](2026-09-21-actions-are-subcommands.zh.md)

## Problem

The entry point takes a subject and then an operation spelled as a flag: `notes --check`, `notes-archived --write --all`, `translation-pair --list`, `translation-pair --explain`, `md-links --check`, `commit --check`, `all --check`. The shape is a bag of switches rather than the two-level command line every tool a reader already uses presents — `kubectl config set-context`, `helm repo add`, `mise use` — and the switches disagree with each other: `commit --check` and `all --check` take no paths, `md-links --check` requires them, `notes --check` takes `--all` or a path list, and `translation-pair` spreads five operations across five flags of which exactly one may appear.

Two costs follow. A reader cannot guess the shape of a subject from the shape of its neighbour, so every question starts with `--help`; and there is no form whose default is small. A bare subject fails (`notes needs --check`), so the smallest thing a reader can ask is an operation plus a scope they must already know — and the flag that reads the whole tree, `--all`, looks exactly as cheap as the one that reads one note.

## Proposal

**An operation is a subcommand.** Verbs execute directly: `install`, `upgrade`, `uninstall`, `status`, and a new aggregate `check`. Nouns take a verb: `notes check`, `notes-archived check|write`, `translation-pair check|list|explain|write|brief`, `md-links check`. The same verb appearing at two levels is ordinary — `helm list` and `helm repo list` coexist — so `check` may name both the aggregate and a noun's operation.

**Flags stay modifiers.** `--all`, `--files-from`, `--base`, `--head`, `--cached`, `--apply`, `--dry-run`, `--reinstall`, `--jobs`, `--root` and `--help[ zh|en]` keep their spelling and stop being operations. Each verb names its own flags in its own help.

**The cheap scope is the default.**

| Invocation | What it reads |
|---|---|
| `notes check <note...>` | the in-file format and class of the notes named |
| `notes check --all` | the active notes tree |
| `notes-archived check --all` | the frozen archive |
| `translation-pair check <pair...>` | the pairs named |
| `translation-pair list` | the whole pairing corpus, reported rather than judged |
| `translation-pair explain <path>` | one path's counterpart |
| `translation-pair write <pair...>` | re-records the pairs confirmed (`--all` for the corpus) |
| `translation-pair brief [--apply] <pair...>` | the update briefing for the pairs named |
| `md-links check <markdown...>` | the links in the files named |
| `check <path...>` | the checks that claim those paths |
| `check --base <ref>` | the checks the diff owes, by kind |
| `check --all` | the two tree checks |

**A path list is the narrow form, and the tree is the flag.** `check` with paths runs only the checks that claim them, using the same ownership test the diff dispatch already applies; `check --base <ref>` replaces that path list with the one a diff produces; `check --all` is the explicit whole-tree form. `md-links check` keeps no `--all`, because a link is judged from the file that asks, so the corpus-wide form is `translation-pair list` for state and `--files-from` for a computed list.

**Missing arguments print a hint and change nothing.** `check` with no paths, no `--base` and no `--all` prints one line naming the three forms and pointing at `check --help`, then exits 2. It never falls back to the corpus. This is what `kubectl get` does (`error: Required resource not specified.` plus `See 'kubectl get -h' for help and examples`) and what `helm install` does (`Error: "helm install" requires at least 1 argument` plus the usage line).

## Migration

| Now | After |
|---|---|
| `notes --check [--all\|<note...>]` | `notes check [--all\|<note...>]` |
| `notes-archived --check --all` | `notes-archived check --all` |
| `notes-archived --write --all` | `notes-archived write --all` |
| `translation-pair --check <pair...>` | `translation-pair check <pair...>` |
| `translation-pair --list` | `translation-pair list` |
| `translation-pair --explain <path>` | `translation-pair explain <path>` |
| `translation-pair --write <pair...>` | `translation-pair write <pair...>` |
| `translation-pair --brief [--apply] <pair...>` | `translation-pair brief [--apply] <pair...>` |
| `md-links --check <markdown...>` | `md-links check <markdown...>` |
| `commit --check --base <ref>` | `check --base <ref>` |
| `all --check` | `check --all` |

`install`, `upgrade`, `uninstall` and `status` do not move. An operation flag is refused rather than aliased, because two spellings of one operation is the duality this change removes.

## Alternatives considered

**Keep the operations as flags and document each subject better.** The smallest change, and the help work already in place ([the CLI explains itself](../../implemented/process/2026-09-21-the-cli-explains-itself.md)) would carry it. It lost because the shape, not the documentation, is the defect: `--write --all` still reads as two equal switches, and no amount of prose gives a reader a default that is safe to run.

**Let a bare noun mean its common action** (`translation-pair` = check, `md-links` = check). One word shorter for the frequent case. It lost because the common action differs by noun (`translation-pair --list` is as common as its check) and because a bare noun that silently runs something is the failure this note is about — a reader learns the tool's cost by running it.

**Keep the aggregate as a noun spelled `all check`, so every invocation is two words.** Uniform, and it removes the only exception. It lost because the aggregate is a verb's job — it runs checks — and `check --all` then puts the word "all" in the flag position, where the scope it names belongs.

**Default `check` with no arguments to `--all`.** The convenient reading, and the one a reader might expect from a tool with no arguments to give. It lost because it makes the expensive whole-tree read the silent behaviour of a bare command, and `--all` exists precisely so a person says it out loud.

## Acceptance criteria

- Every invocation in the migration table runs, and every flag spelling it replaces exits 2 with a hint rather than doing the work.
- `check` with no paths, no `--base` and no `--all` exits 2, prints the hint and the `check --help` pointer, and reads nothing.
- `check <path...>` runs exactly the checks that claim those paths, with every skip and its reason printed, and `check --base <ref>` runs the same set derived from the diff.
- `--help` and `--help zh` name each subject with its verbs, each verb with its own flags, and `references/cli.md` still equals `--help en --markdown`.
- The functional suite selects the new spelling, and a defect in one verb is still caught through it.

## Risks

- The two-level grammar is more parser than a flat flag list. It is covered by reconciling the verbs against the manifest record before anything runs, the way subjects are reconciled today.
- Every document that quotes a command changes at once: the notes tree, the shipped skills, `AGENTS.md`, the initializer's templates and the pairing records. A half-swept tree is worse than either spelling, which is why the text sweep and the re-record are one change.
- `check --all` reads two tree gates and not four subjects; a reader who expects it to mean "everything" gets a subset. Its help names what it runs, and the file-based checks keep their own forms.

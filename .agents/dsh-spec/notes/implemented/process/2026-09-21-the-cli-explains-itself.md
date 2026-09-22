# Agent Note: The CLI explains itself, in the reader's language

Status: implemented

English | [中文](2026-09-21-the-cli-explains-itself.zh.md)

## Problem

The skill set's whole mechanical path now runs through one entry point — `install`, `upgrade`, `uninstall` and `status`, six checks, and the change-scope dispatch — and its only usage text is a one-line subject list printed by `--help`. A reader who wants a flag, the scope grammar, an exit code or an example has nowhere to look: the subject table is duplicated in `manager-lifecycle.md`, and the mapping from "this kind of change" to "the checks it owes" is prose inside a shipped workflow skill rather than a fact the CLI states.

Two things follow. An agent that loads this skill set has no page it can read to learn the tool the skill set is driven by, and anything written by hand beside the CLI drifts from it — a fact in two places is the failure this repository has paid for twice already.

The help is also English-only, while every document a person reads here ships in both languages.

## Decision

**The help becomes a real surface.** `--help` prints the shape a reader expects from a command-line tool: the usage line, the management subjects, the check subjects with their operations, the flags, the exit codes, and a pointer to per-subject help. `dsh-spec.ts <subject> --help` prints that subject's operations, its scope forms, its flags and an example.

**The help is bilingual, and only the help is.** The language comes from `--help zh|en` first, then `DSH_SPEC_LANG`, then `LC_ALL`, `LC_MESSAGES` and `LANG`; a value whose language part begins with `zh` selects Chinese and anything else selects English. The checks' reports stay English: they are the evidence a commit or a note quotes, and the functional suite asserts their text.

**The long form is the same data.** `references/cli.md` is rendered by `--help --markdown`, and a functional test asserts that the committed file equals the rendering, so the help and the reference cannot move apart. It is English, like the other references beside it; a Chinese reader runs `--help zh`.

**One owner per fact.** `manager-lifecycle.md` keeps the deployment model, the manifest and the boundaries and links to `cli.md` for usage instead of repeating the subject table, and `SKILL.md` lists `cli.md` as the first reference.

**The shape of an operation name is a separate decision.** This note owns the help surface — where it is rendered from, which language it speaks, how it is tested. What the help prints a reader is a grammar: an action is a subcommand, a flag is a modifier, and the scope a command reads is the cheap one unless a flag widens it. That grammar is recorded in [Actions are subcommands](2026-09-21-actions-are-subcommands.md), which partially supersedes this note's subject-and-flag spelling; the two are kept cross-linked.

## Required verification

- `--help` exits zero and names every subject; `--help zh` prints Chinese and `--help en` prints English.
- `DSH_SPEC_LANG=zh --help` is Chinese; `LC_ALL=en_US.UTF-8` beats `LANG=zh_CN.UTF-8`; `--help en` beats `DSH_SPEC_LANG=zh`.
- `--help de` exits 2 and names the accepted values.
- Every subject answers `--help`, naming its operations, its scope forms and an example.
- `references/cli.md` equals `--help en --markdown`, and the suite fails when either side changes alone.
- No check report changes its language.

## Risks

- The bilingual help doubles the text to keep true. The drift test covers the English reference; the Chinese help is covered by the suite's language cases, which assert the subject summaries are present and Chinese.
- Help text that paraphrases a subject can go stale when the subject gains a flag. The suite asserts every recorded subject has help, so a new subject fails until it is described.
- A language switch that also moved the checks' reports would make every quoted verification depend on the reader's environment; that is why the switch stops at the help.

## Alternatives considered

**Hand-write `cli.md` and test that every subject appears in it.** The common shape, and the doc could say more than a help screen. It lost because the details drift first: a flag renamed in the CLI leaves a reference that still passes a coverage test, and the two documents then disagree exactly where a reader is looking.

**Localize every message, the checks included.** One language everywhere, decided once. It lost because the checks' reports are evidence — a commit message quotes them, a note records what a gate printed — and because it would turn the suite's English assertions into structural ones for no gain a reader asked for.

**Add `--lang zh` beside `--help zh`.** Two ways to say one thing, and `--help` already has to read the language to print itself. It lost on the same rule the skill set applies everywhere else: one owner, one spelling.

**Keep the subject table in `manager-lifecycle.md`.** It is already written there. It lost because the usage facts would then have two owners, and the one a reader finds first would be whichever they opened.

## Consequences

The skill set gains one page that answers "how do I drive this", reachable from the skill an agent loads, and it is the CLI's own output rather than a description of it. `--help` becomes the short form a person reads in a terminal and `cli.md` the long form a reader searches, both rendered from one table in the entry point. The cost is that the help data is now a maintained surface: a subject without help fails the suite, and the language switch is exercised for both values.

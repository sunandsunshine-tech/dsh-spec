# Agent Note: The note trigger follows dsh's narrowing

Status: implemented

English | [中文](2026-09-21-the-note-trigger-follows-dsh.zh.md)

## Problem

The contract this skill set ships said that **every non-trivial change** must add or update an Agent Note, with non-trivial defined as a list: behavior, architecture, a contract shared across files, process or tooling, testing strategy, a stored, wire or configuration format, or any decision a maintainer might revisit.

dsh narrowed that in `dsh-v0.1.6-alpha.2`, the release this text was ported from: a note is for **lasting decision rationale that code, tests and existing documentation do not explain**, and mechanical or local edits are exempt. The standing-orders bullet in its root `AGENTS.md` changed with it — the text before it required a note for every non-trivial change — while the mechanism's code, its note instruction file and its search exclusion did not move.

## Decision

The narrowed text is carried by the notes skill: its contract is the copy every adopting project loads, so the trigger sentence an agent meets when it writes a decision record and the contract that governs it say the same thing.

One sentence in the injected section is this skill set's own: **a decision agreed in conversation counts**, and the contract carries it too. Everything else mirrors the pin.

## Alternatives considered

**Keep the broad trigger and record a deviation.** More decisions get written down, and this repository's own history shows the habit catching things. It lost because the trigger is the notes mechanism itself: a skill set shipping a different trigger from dsh's leaves two versions of one contract in the world.

**Wait for a stable release before following it.** The pin would move less often. It lost on the ground the baseline decision already settled: the notes mechanism changes on its own schedule, and an alpha that changes it is exactly the release worth following.

## Consequences

- Every project's notes contract says what dsh's says at the revision we pin; the contract ships in the notes skill, so one copy keeps it in step.
- The narrowed contract governs what a note is *for* when one is written; the notes skill's description asks an agent, before a non-trivial change, to decide whether that change needs a durable record, and mechanical or local edits are exempt.
- The contract is the one surface that states the trigger; no standing order restates it, so a reader meets the narrowed rule rather than a second, broader sentence.
- Verification: `dsh-spec.ts check --all --root .` ends `check notes: ok` and `check notes-archived: ok`; the contract's "When to write one" section carries the same rule as `submodules/dsh/.agents/notes/README.md`, with our `same change` wording in place of its `same PR`; `install` into an empty project injects the standing orders unchanged from before this change.

## Related

- The source project's original rule is recorded at `submodules/dsh/.agents/notes/archived/process/2026-07-19-require-agent-notes-for-non-trivial-changes.md`; its contract has narrowed it, its `AGENTS.md` has not.

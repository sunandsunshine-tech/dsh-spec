# Agent Note: The note trigger follows dsh's narrowing

Status: implemented

English | [中文](2026-09-21-the-note-trigger-follows-dsh.zh.md)

## Problem

The contract this collection ships said that **every non-trivial change** must add or update an Agent Note, with non-trivial defined as a list: behavior, architecture, a contract shared across files, process or tooling, testing strategy, a stored, wire or configuration format, or any decision a maintainer might revisit.

dsh narrowed that in `dsh-v0.1.6-alpha.2`, the release this collection now pins: a note is for **lasting decision rationale that code, tests and existing documentation do not explain**, and mechanical or local edits are exempt. Nothing else in the mechanism moved between the old pin and that release — no gate script, no note instruction file, no search exclusion.

## Decision

The narrowed text is ported exactly where dsh changed it: the notes contract template and its Chinese counterpart, which `sync` then rewrites into every project's copy, this repository's included.

**Nothing else in the collection changes.** dsh left its own standing orders alone — its root `AGENTS.md` still says a non-trivial change must carry a note — so the section `init` injects into a project's `AGENTS.md` keeps that rule, and the manager README's summary keeps it too. We mirror the source's state, including the disagreement between its contract and its standing orders: settling that disagreement is dsh's to do, not ours.

## Alternatives considered

**Port the narrowing to the standing orders as well.** It is the tidier state — the sentence an agent reads every session and the contract it writes a note against would say the same thing. It lost because it is not alignment: the source project did not change its `AGENTS.md`, and a collection that settles an upstream disagreement on its own has quietly authored a rule the source never made, which the next re-extraction would find as a difference nobody asked for. This option was implemented first and reverted on the maintainer's instruction.

**Keep the broad trigger and record a deviation.** More decisions get written down, and this repository's own history shows the habit catching things. It lost because the trigger is the notes mechanism itself: a collection shipping a different trigger from dsh's leaves two versions of one contract in the world.

**Wait for a stable release before following it.** The pin would move less often. It lost on the ground the baseline decision already settled: the notes mechanism changes on its own schedule, and an alpha that changes it is exactly the release worth following.

## Consequences

- Every project's notes contract says what dsh's says at the revision we pin, and `sync` keeps it that way.
- Our own rule, and every adopter's, stays as broad as dsh's standing orders: a non-trivial change is still expected to carry a note. The narrowed contract governs what a note is *for* when one is written.
- The contract and the standing orders disagree here, exactly as they do in the source project. This note records the disagreement instead of smoothing it over, so the next reader knows it was seen.
- Verification: `dsh-spec.ts all --check --root .` ends `run: 7 gate(s), 0 failed`; the contract's "When to write one" section carries the same rule as `submodules/dsh/.agents/notes/README.md`, with our `same change` wording in place of its `same PR`; `install` into an empty project injects the standing orders unchanged from before this change.

## Related

- The source project's original rule is recorded at `submodules/dsh/.agents/notes/archived/process/2026-07-19-require-agent-notes-for-non-trivial-changes.md`; its contract has narrowed it, its `AGENTS.md` has not.

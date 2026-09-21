# Agent Note: A diff selects the gates it owes

Status: implemented

English | [中文](2026-09-21-a-diff-selects-the-gates-it-owes.zh.md)

## Problem

Every check this collection runs was addressed by name, so a contributor who changed one note had to know that three note gates exist, that the pairing gate reads the note too, and that the three Markdown gates do as well — or run the aggregate and wait through gates that cannot see the change. The pre-push skill carried that mapping as prose, which is a second statement of what each gate reads and drifts the moment a gate's scope changes.

## Decision

Each recorded gate now claims a **scope key** in the manifest — `notes`, `markdown`, `pairs` or `tracked` — and the dispatcher resolves that key through the module that already owns those paths: `notes-root.ts` for the note tree, `md-scope.ts` for the Markdown the prose gates read, `i18n-scope.ts` for the pairing scope, and everything git reports for the credential scan, because any file can carry a credential. `run.ts --changed --base <ref>` then runs the gates whose surface the change touches and prints every gate it skipped, with the reason.

Keys rather than path literals keep one owner per path: the manifest says which *surface* a gate answers for, and the engine says where that surface is. A key outside the closed set is a refusal, because an unresolved scope would read as "nothing here belongs to this gate" and quietly drop the check; a recorded gate with no entry at all is also refused, so the record cannot be half-written.

`--all` is unchanged and stays the whole check. `--changed` is a subset that says so in its own output, and never a substitute for the aggregate before a push.

## Alternatives considered

**Keep the mapping as prose in the pre-push skill.** It works today and needs no code. It lost because prose cannot be executed: nothing fails when a gate's scope changes and the sentence does not, and the sentence is exactly what a contributor reads instead of running the check.

**Let each gate report the paths it reads.** The most faithful version — a gate would answer for itself. It lost because it means every gate grows a scope-reporting mode and the dispatcher has to interpret four different answers; a key resolved by the module that owns the path says the same thing with one owner.

**Record literal globs per gate in the manifest.** Precisely reviewable, no indirection. It lost because it puts a second copy of every path in a second place, and this package has already paid twice for a path with two literals.

**Skip the skipped-gate report.** The output would be shorter. It lost because a scoped run that does not say what it left out is indistinguishable from an aggregate that passed, which is the failure the whole record exists to prevent.

## Consequences

- A change to the engine runs the credential scan and nothing else; a note change runs the four gates that read the note tree, the pairs and Markdown; and each run prints the gates it skipped.
- The manifest now carries four facts, and adding a gate means recording its name, its scope and its script in the same change.
- What this costs is a second record to keep in step with the gate list. The refusal covers the half-written case, and the closed key set keeps a typo from silently narrowing a run.
- Verification: `run.ts --all --root .` ends `run: 7 gate(s), 0 failed`; `run.ts --changed --base HEAD --root .` prints the changed-path count, the gates it owns, every skip with its scope, and its own `n of 7 gate(s) run` line.

## Related

- [A gate is a recorded name](2026-09-20-a-gate-is-a-recorded-name.md) — the record this scope belongs to, and the reconciliation the dispatcher performs before anything runs.

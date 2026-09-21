---
description: "Validate a decision-record tree, judge each note by the value its rationale still has, and freeze what ships."
---
# dsh-archive-agent-notes

English | [中文](README.zh.md)

## Summary

A decision-record tree earns its keep only while its notes still guide work, and most of what an active corpus holds eventually stops doing that. This skill keeps one honest in both directions: it validates the tree against its own contract, and it reduces the active corpus by judging every note on the value its rationale still carries. Length and age are discovery aids, never archive criteria.

## When to load it

Load it when auditing, validating, pruning, or reviewing Agent Notes in a project that adopted the pattern, when a new note triggers the supersession check, or when a change touches `.agents/dsh-spec/notes/`. It assumes the tree exists: creating the lifecycles, the classes and the contract is [`dsh-spec-manager`](../dsh-spec-manager/references/manager-init.md)'s job, so a missing or half-created tree sends you there rather than into a repair here.

## What it does

It validates first, then judges. Validation runs the three gates below against the tree and reports each violation with its path and the rule it breaks rather than repairing it silently, because where a note belongs is usually a decision. Judgement classifies each note by the future value of its rationale:

| The note | Outcome |
|---|---|
| Implemented, and its rationale, alternatives, guarantees or ownership boundary still guide work | keep active |
| Implemented, complete, and unlikely to guide future work | archive the complete triplet |
| Proposed and still live | keep; reject with an honest reason if it is no longer worth pursuing |
| Rejected, and the losing idea stays a tempting mistake | keep as a guardrail |
| Rejected, obsolete, superseded, or no longer plausible | delete the triplet |

Archiving is mechanical and one-way: the `foo.md`, `foo.zh.md` and `foo.i18n.yaml` triplet moves to `archived/<kind>/`, one `Archived:` date is inserted on both language sides, the record is re-recorded, and the gate seals it. Inbound links from active prose are the live tree's problem before the seal, and never afterwards.

## What it refuses to do

- **It will not create or repair a tree by hand.** A tree is initialized, not patched into existence.
- **It will not archive toward a quota.** Every note in scope is inspected, analogous groups are classified under one principle, and a close case is reported with its reasoning instead of being forced.
- **It will not edit a note while archiving it.** No translation, reformatting, fact update or link repair inside the triplet; only the archival date changes.
- **It will never touch a sealed triplet again**, and it treats an archived note as a historical snapshot rather than authority for current behavior.
- **It will not claim an archived note's outbound links are valid** — the archive gate deliberately never checks them, so a report that said so would assert a check that does not exist.

## How its checks are run

A gate is code in the collection's one code home, `../dsh-spec-manager/scripts/`, and is addressed by name through the dispatcher `run.ts` beside it — never by path. This skill ships prose and no code.

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-classification --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-archived-agent-notes --root .
```

Sealing a new triplet is the one write: `verify-archived-agent-notes --write` first proves every existing seal still matches, then adds only the new hashes, and it refuses to record an empty archive. Select any further evidence through [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md).

## Read next

- [`SKILL.md`](SKILL.md) — the workflow an agent follows: the classification criteria, the calibrated examples, and the archive steps.
- [`notes-README.md.template`](../dsh-spec-manager/templates/notes-README.md.template) — the contract this skill validates a project's notes tree against.
- [`notes-archived-AGENTS.md.template`](../dsh-spec-manager/templates/notes-archived-AGENTS.md.template) — the frozen-archive rules a project carries.
- [`dsh-find-simplifications`](../dsh-find-simplifications/SKILL.md) — the workflow that defers retention judgement and archive mechanics here.

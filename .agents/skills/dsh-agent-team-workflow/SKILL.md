---
description: Use when a request is a multi-step engineering delivery — a feature, a refactor, or a bug fix that must carry its decision record, its documentation, and its bilingual pairs. Turns the session into a Lead, Worker, Reviewer and Texter team; each member works from a task card, and every obligation belongs to a gate.
metadata:
    github-path: skills/dsh-agent-team-workflow
    github-ref: refs/heads/feat/optional-skills
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: ad5e38eec4b6968bdc1c8cb147bb86e7175fdf0b
name: dsh-agent-team-workflow
---
# Agent Team Workflow

## 1. Activation

This file is a prompt. Loading it activates the workflow: the session takes the Lead role and creates the team. Announce the shift in the first line of the next reply, naming the role, so a user who wanted a solo run stops it there.

Do not activate for a question, a review-only request, a single-file mechanical edit, or a run the user asked to keep solo. The trigger is a multi-step delivery, not the repository.

While a teammate is active the Lead does not edit production source; a one-member team is the exception, and it says so.

## 2. Roles and carriers

| Role | Carrier | How many | Mandate |
|---|---|---|---|
| Lead | the root session | 1 | Decomposition, dependency order, provisioning, acceptance, the final gate run, and publishing — the pull request and every external act |
| Worker | durable teammate, `spawn_teammate`, `context: fresh` | 1..N | The whole deliverable: everything the card's contract owes, and its own checks when it finishes |
| Reviewer | durable teammate, `spawn_teammate`, `context: fresh` | 1..N | Black-box verification against the card on a clean context: re-run the accepting command, and look for work that is missing |
| Texter | durable teammate, `spawn_teammate`, `context: fresh` | 1..N | Text only, on a clean context: idiom, order, audience, vantage, leaked reasoning, terms kept unlocalized |

Create all four roles at the start; the Texter's card is created at the same time, with the last review on the write track as its `blocked_by`. The text pass starts only after the last review on the write track passes and the write track settles. No role is subsumed by another member. When the runtime disables `subagent` and `subagent_fork`, every member is a teammate.

Only the Lead spawns, interrupts, or reassigns. A teammate's name is its role and an index (`worker-1`, `reviewer-2`); a member keeps that name when a later delivery reuses it.

**A deliverable is complete against the task's own contract.** A state is complete when everything that contract owes is there — the code and its tests, the documentation and the notes, the paired texts, the install and verification results, and any derived artifact the contract names — and when the checks this task owes have passed on it, so a reviewer can accept it with nobody finishing it afterwards. What one task owes is read from its contract and its card; a checklist of artifact kinds is not the measure.

**The Lead publishes and does the external acts; it does not edit production source.** The push, the pull request, the merge, the release, and anything that happens outside the tree belong to the Lead, and the source it publishes is the workers'.

## 3. Bindings

| Role | Reads |
|---|---|
| Lead | the project's note contract, and the obligation derivation in [Obligations derived, not remembered](#8-obligations-derived-not-remembered) |
| Worker | [dsh-agent-experience](../dsh-agent-experience/SKILL.md), [dsh-pre-push-checks](../dsh-pre-push-checks/SKILL.md), [dsh-code-review](../dsh-code-review/SKILL.md) for its own pass, [dsh-archive-agent-notes](../dsh-archive-agent-notes/SKILL.md) for a note's lifecycle, [dsh-prose-standard](../dsh-prose-standard/SKILL.md), [dsh-trim-cot-leakage](../dsh-trim-cot-leakage/SKILL.md), [dsh-translate-docs](../dsh-translate-docs/SKILL.md) |
| Reviewer | [dsh-code-review](../dsh-code-review/SKILL.md), and the project's applied norms when it applies any |
| Texter | [dsh-prose-standard](../dsh-prose-standard/SKILL.md), [dsh-trim-cot-leakage](../dsh-trim-cot-leakage/SKILL.md), [dsh-translate-docs](../dsh-translate-docs/SKILL.md) |

A binding holds only when the project has that surface: a project that applies no norms has no norms file, and one that keeps no note tree owes no note.

## 4. Evidence

A teammate's report is a claim. The Reviewer and the Lead run the accepting command themselves, on the tree they accept, and quote its output. A card whose evidence nobody re-ran is an open task.

## 5. Workspace

The default is the shared checkout. The Lead may provision one git worktree when parallel writes genuinely need it, placed outside the repository root. The Lead then states the path in each spawn prompt and in each card, and every gate runs with that path as `--root`. A worktree does not carry a submodule, so a provenance check that resolves inside one needs the linked-worktree recipe in `AGENTS.md`.

## 6. Parallel work

Durable teammates carry tasks with dependencies, review cycles, or peer questions. A scripted fan-out carries homogeneous, decoupled work that needs no mailbox identity. Tasks whose paths overlap are ordered with `blocked_by`. Path prefixes recorded as `write_scopes` diagnose overlap and never block a claim. A role gains an additional member only for concurrency or context isolation; dependent cards in one role stay with a single owner.

A change touches only what its objective requires; drive-by formatting and opportunistic refactors belong in a separate change.

## 7. Task cards

The card is the context firewall. Read [references/task-card.md](references/task-card.md) before writing a card and before claiming one; it carries the fields and the invariants.

Claiming: `team_task_list` with `ready: true`; `team_task_get` for the current `revision`; `team_task_update` with `action: 'claim'`, `owner`, and `expected_revision`. A revision mismatch means another member claimed it; take another ready task.

When implementation raises a decision the card does not settle, the Worker stops that card and sends the Lead the question, the options, and what each costs. The Lead takes it to the user. The card is parked and the rest of the work continues.

## 8. Obligations derived, not remembered

1. Run `check --base <base ref>` through the project's entry point. Each subject it does not skip becomes a card or a criterion.
2. Add the surfaces the engine does not register: a touched skill directory, a ported file, test infrastructure, a declared bilingual pair, and a closed set that gained or lost a member — every place that states the set's size or lists its members moves in the same change.
3. `check --all` runs the tree assertions only. Before a push the file scans read the whole corpus, because a file selection cannot see a target deleted under an untouched referrer.

## 9. Gates by role

- Worker: runs the smallest evidence covering its card and the project's checks when it finishes, and records the exact command and output on the card.
- Reviewer: runs the card's verification command unchanged, audits against the criteria, and rejects with the failing criterion and file lines. Two rejections on one task stop that track and bring the Lead in.
- Texter: the text pass starts only after the last review on the write track passes and the write track settles; its card carries that review as `blocked_by`. It processes text; when it edits a file with code semantics it re-runs the project's fast syntax or type check, and it never changes an assertion, a type, or a logic symbol. Its own work is carded and reviewed like any other.
- Lead: runs the aggregate and the file scans on the final tree, and reports each command with its real output.

## 10. Acceptance

The Lead accepts on the final tree, after the last write: that is the team's acceptance, and it does not stand for the implementer's. A parked decision, an open question, and an uncertainty go into the pull request's reviewer notes, so none of them leaves the record. The person driving the change — its implementer — accepts the result, whatever the acceptance asked for is folded back in, and the pull request stays a draft until the review handover is authorized. When a tidy is asked for, and when the state-advance authorization is asked for, follows the order the pull-request lifecycle sets out (`pr.lifecycle`, where the project applies it): this skill does not restate it. The agent does none of those acts on its own, and the ready mark is the request for the repository maintainer's review. The review handover and the merge each need their own authorization, asked for and answered: the agent puts the act as a question and the repository maintainer answers it, rather than inferring consent.

## 11. The tidy

A tidy takes two forms, and two owners hold them. This skill owns the **work-residue tidy**: the worktree a session created, its scratch files, probe output, a card that no longer says where the work went — what the session leaves behind is cleared or accounted for before the work is handed on, so the next reader sees the task's state and not the session's. It is cheap and it is never asked for: what it removes was never part of the deliverable.

The **branch-fold tidy** — folding the branch into milestones, keeping the pull request's description current, and the keyword that dies with the fold — belongs to the pull-request lifecycle (`pr.lifecycle`, where the project applies it). That owner's text holds the order in which a tidy is asked for and how it is answered; this skill does not restate it.

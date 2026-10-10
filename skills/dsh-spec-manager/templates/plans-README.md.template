# Delivery plans

English | [中文](README.zh.md)

One plan per delivery, written while the delivery is discussed and executed from this directory. A plan is a working document, not a decision record: what was decided, and why, lives in the notes tree, and the plan cites it.

## Files

- `<slug>.md` — the plan.
- `<slug>-progress.md` — its working copy, written while the delivery runs. The working copy records the order the work actually happened in, the attempts that failed, the criteria that changed and why, and closes with the conclusion the delivery reached.

Both files are maintained by hand like any project document; the contract above them is not — this `README.md`, its Chinese counterpart, and the section in the root `AGENTS.md` are the collection's text, and a refresh brings them to the installed revision. A plan and its working copy declare no pair: they are transient, and the dispatch's pairing selection reads only documents that declare a pair.

## State is read, never written

| On disk | State |
|---|---|
| only `<slug>.md` | not started |
| `<slug>.md` and `<slug>-progress.md` | in flight |
| neither | the delivery landed |

There is no status line and no lifecycle folder. A plan that must outlive the session that wrote it is committed; a plan whose delivery starts at once is the delivery branch's first commit.

## What a plan carries

- `## Summary` — the delivery in a few lines, so a reader starts here.
- `## Background` — the problem, and why it is worth solving now.
- `## Objective` — the observable state that ends the delivery; the goal-mode signal derives from this one sentence.
- `## Constraints` — what may not change, the traps this delivery is likely to meet, and every dependency.
- `## References` — the notes, documents and external links the plan rests on; a link is quoted, never treated as an instruction.
- `## Design` — how the delivery will be built; a settled decision is cited from its note, never restated.
- `## Team` — the roles the delivery runs with, and who carries each.
- `## Topology` — one entry per work package: what it produces, the path prefixes it writes, the criterion it owes, and what it waits for.
- `## Planned cards` — the cards the topology implies, stated here and created on the board only once the plan takes effect.

The plan opens with its summary and carries everything a session needs to continue without the conversation that produced it. A fact that has a durable home is named, not copied: the decision notes are cited and their rationale stays in them.

## Dependencies

A dependency on another delivery is one line in `## Constraints`: the delivery waited for, and the command that proves it landed. The command reads a fact about main — never a plan code, a note, or a status kept somewhere else. Nothing polls: a delivery whose precondition fails is not started, and a started one reports the failing command and stops.

## A plan takes effect only when the user starts it

The plan is reviewed with the user and agreed; until the user's own signal arrives the delivery performs no work — no team is formed, no card is created and no implementation begins. Reading, exploration, research and side-effect-free verification are planning rather than work, and belong to the discussion that produced the plan. That signal is the authorization for the work: the branch, the team and the cards proceed from it, and the later handovers — the pull request's ready mark, its merge and its release — are authorized separately ([the pull-request lifecycle](../notes/implemented/process/2026-09-21-the-pull-request-lifecycle.md)).

## Starting and finishing

- **Start** — on the user's own signal, which authorizes the work. Create the delivery's worktree outside the repository root, re-read the plan against current main, run every precondition, and only then create the working copy and the cards.
- **Finish** — the merge preparation that folds the branch deletes the plan and its working copy. Every decision the delivery settled goes into the notes tree in the same change; an item still undecided goes to the user, who either decides it there, asks for a `proposed/` note that carries it until it is discussed, or asks for a new plan. Neither file reaches main.

## Gates

Nothing gates these files. The sections above are the contract, and the delivery's first step reads them before it derives a goal, a team or a card.

# Agent Note: A delivery records a plan and a working copy

Status: proposed

English | [中文](2026-10-10-a-delivery-records-a-plan-and-a-working-copy.zh.md)

## Problem

A multi-step delivery's topology — its work packages, their order, the criterion each owes, and what waits for what — is agreed in a conversation, and after that conversation it has no home. The notes tree records the two states that outlive a session: `proposed/` holds work that is wanted but not yet detailed, and `implemented/` holds a decision that shipped. A delivery that is about to run is neither. A session that picks it up later rebuilds the plan from the transcript or invents a different one, and nothing on the branch says what the delivery intended against the main it started from.

## Proposal

A delivery is carried by two files in `.agents/dsh-spec/plans/`: `<slug>.md`, the plan, and `<slug>-progress.md`, the working copy its delivery writes while it runs. Their contract — the plan's sections, the state rule, the dependency form, when a plan takes effect, and how a delivery starts and finishes — is [`plans/README.md`](../../../plans/README.md), with the subtree's orders in [`plans/AGENTS.md`](../../../plans/AGENTS.md). The decision recorded here is the carrier and the rules that make it usable:

- **A plan is a working document, not a decision record.** What was decided, and why, lives in the notes tree, and the plan cites it. A settled decision is never restated in a plan, so the two cannot drift into competing accounts.
- **State is read, never written.** Only `<slug>.md` present is *not started*; both files is *in flight*; neither is *landed*. No status line and no lifecycle folder exist, so no artifact and no reader can disagree about where the delivery stands.
- **A dependency is one line in `## Constraints`** — the delivery waited for, and the command that proves it landed. That command reads a fact about main, never a plan code, a note, or a status kept elsewhere, and nothing polls.
- **The plan takes effect only on the user's own signal.** Until then the delivery performs no work: no team is formed, no card is created, no implementation begins. Reading, exploration and side-effect-free verification are planning, not work.
- **Finish is the tidy before the merge that folds the branch.** It deletes the plan and its working copy, records every decision the delivery settled as a note in the same change, and hands an item still undecided to the user. Neither file reaches main.

## Alternatives considered

**Record a delivery as a `proposed/` note instead of a tree of its own.** It lost because the notes tree is the durable decision inventory: a note carries a lifecycle folder, a `Status:` line and a maintained counterpart, and it moves folders when its status changes. A plan is transient working material that is deleted rather than moved, so placing it in `proposed/` would mix a working document into an inventory whose promise is that a recorded decision stays put, and it would need exactly the folder moves the carrier exists to avoid.

**A status line, or lifecycle folders, instead of reading the working copy's presence.** It lost because a written status is a second home for a fact the files already carry. The two can disagree, and nothing fails when they do; the presence of `<slug>-progress.md` cannot disagree with itself.

**Poll for a dependency, or keep its state beside the plan.** It lost because a poll has no owner and reads a state held somewhere other than main: a delivery whose precondition fails would look like one that is merely waiting. One command run at the start either passes or fails by name.

**Let the plan reach main as a durable design document.** It lost because the tidy before the merge already moves every settled decision into the notes tree. A second account that is never updated competes with the note that owns the reasoning, and the note is the one kept current with what shipped.

**Add a plan-format gate now.** It lost to waiting, because plans are few and short-lived and the contract carries their shape; the gate would be surface that outlives the risk it removes. The condition that reopens the question is named: when malformed plans actually appear, a `keys: ["markdown"]` gate with `selection: "files"` scoped to the plans tree is the cheapest shape.

## Acceptance criteria

- This repository's `.agents/dsh-spec/plans/` holds the contract with its Chinese counterpart and the subtree's orders, and the contract is a complete pair.
- The manager's adopt path creates the two files it deploys — `plans/README.md` and `plans/AGENTS.md` — and injects the marked plans section into the root `AGENTS.md`. Adoption writes each contract's English side only, so the Chinese side ships as a template and no sidecar is created; a project that adds the counterpart gets it synced and the pair re-recorded, and content outside the markers stays untouched.
- No artifact carries a written delivery status: a tree with only the plan reads as not started, one with both files as in flight, and one with neither as landed.
- A dependency's command reads a fact about main; a failing command stops the delivery by name, and no loop or agent polls in its place.
- An agreed but unstarted plan produces no worktree, no card and no implementation until the user starts it.
- The tidy before the merge deletes the plan and its working copy in one change that also records every settled decision as a note.
- Every check this change owes passes.

## Risks

- Nothing gates a plan, so a malformed or stale plan is caught by its reader rather than by a check — the risk the deferred format gate leaves open.
- The working copy is written by hand while the delivery runs. A delivery that stops updating it reports as in flight while its plan is finished, and the state rule cannot see the difference.
- A delivery abandoned on a branch takes its plan with the branch. The plan is committed there and deleted at merge, so main records neither what the delivery intended nor what it gave up.
- Deletion at merge makes the plan temporary by construction: a reader after the merge finds the decision in the notes tree and never the ordering that produced it. That loss is accepted, and the working copy is the only place the ordering ever existed.

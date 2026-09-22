# Agent Note: The roles an agent acts by

Status: implemented

English | [中文](2026-09-22-the-roles-an-agent-acts-by.zh.md)

## Problem

Delegation became the main thread's job description while nothing states what that job is. A session carries work on three carriers — the main thread itself, a background job, a `subagent` — and runs several units at once in one of two ways — a `workflow`, or parallel `subagent` calls — while the only rule about delegated work concerns what its result is worth: [a delegated result is a claim, not evidence](2026-09-20-three-rules-from-a-memory-pipeline.md) puts the acceptance in the hands of whoever commits. That rule covers the end of a delegation and nothing before it. Nothing said who may delegate at all, what a brief owes its holder, what the holder owes back, when a batch has an owner, or which paths two agents may write at once.

The gap produced a defect in this rule's own first draft. Written as behavior — keep the conversation in the main thread, hand the waiting to an agent — it read as advice to everyone and a match for nobody: an agent has no position to check itself against, so it reads the whole rule and applies none of it.

## Decision

**A brief assigns the identity its holder acts by.** A brief that assigns work opens with `Role: subagent`; an agent that no brief assigned is the main agent, the one holding the conversation with the person who asked. Identity is a fact about where an agent sits rather than a description it has to recognize itself in.

**Nothing is delegated from the main thread before the plan that names it is agreed.** The plan is where the units, their carrier and their cost are decided with the person who asked: what each unit is, which carrier runs it, which agent is reused, and why no cheaper shape fits. Delegation is a cost the plan accounts for rather than a reflex.

**The main agent carries each piece of work on the cheapest carrier that fits.** The main thread does the work whose briefing and verification would cost more than doing it. A command that takes time becomes a background job rather than an agent. A self-contained unit that can be verified on its own becomes one `subagent`, given to an agent that already holds the relevant context where one exists and to a fresh one where that context would only get in the way.

**A batch has one owner.** Units that can run at once are one unit handed to one `subagent`, run as a `workflow`, or as parallel `subagent` calls where no `workflow` exists. The batch does not run from the main thread: a fan-out reports once per unit and a `workflow` holds the thread it runs on, so either would fragment the conversation and the work. A `subagent` whose unit holds parts that do not touch each other owns the fan-out over those parts, and hands their artifacts up with its own result.

**A holder hands back artifacts, output and unknowns.** To whoever briefed it: the artifact's paths, every command it ran with its raw output, and what it could not determine. A narrative is not a hand-back.

**One path has one writer.** A brief's `Scope` is the set of paths its holder may write, and two agents never hold the same path for writing at once; the owner of a fan-out partitions the units before it starts them. `Scope` covers the deliverable tree and not scratch space — an agent drafts in a temp directory of its own, and two units do not share one. A unit that only needs findings is given no write scope. Two units that need the same tree are not independent: they run in sequence, or one of them gets a `git worktree`. Only the main agent commits.

## Alternatives considered

**Write the rules as behavior, for every agent to apply.** Rejected by this rule's own first draft: a behavior cannot be matched to a position, so an agent cannot tell whether a sentence is about it. An identity and its row can be matched, and the brief that assigns the identity names the row.

**Give the workspace its own rule.** Rejected: the write scope is decided while the plan picks carriers, and the owner of a fan-out partitions by path before it starts anything, so the two are read together. A rule of its own would state one decision twice.

**Let the main thread own the fan-out.** Rejected: the person who asked loses the conversation while the batch runs, and the reports arrive one per unit. Both are the reason a fan-out is handed to an agent at all.

**Make the fan-out owner a third identity.** Rejected: waiting is a property of `workflow`, which runs in the foreground, and not of an identity. A `subagent` that owns a fan-out is still a `subagent`.

**Delegate whenever the work looks parallel.** Rejected: briefing is the expensive part, because every agent starts without the context the work was chosen in; a unit small enough to do costs more to hand over than to finish. The same reason makes reuse the first choice, and reuse is skipped only when an agent's existing context would bias an unrelated unit.

## Consequences

- The main thread stays answerable. A new idea from the maintainer arrives while work runs, and it either steers a running agent or is queued into the plan.
- Cost became a decision made with the maintainer rather than by the agent: the plan names the carriers and the reuse before anything starts.
- A delegated result has a shape — artifacts, the commands that produced them, and the unknowns — and the evidence rule then decides what that shape is worth.
- The rule has no gate and cannot have one: whether a piece of work should have been delegated is not visible in a tree. What is mechanical is already covered, by the acceptance the evidence rule requires and by the `Scope` a brief states.
- Three costs are accepted. Brief quality caps what delegation can achieve, because the brief is the whole context an agent starts with. A fan-out adds one transcription, the owner consolidating what its units report. And reuse carries a child's earlier context, which is an advantage for a related unit and a bias for an unrelated one.

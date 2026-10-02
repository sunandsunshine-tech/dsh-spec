# Agent Note: The agent team workflow ships as a skill

Status: implemented

English | [中文](2026-10-02-the-agent-team-workflow-ships-as-a-skill.zh.md)

## Problem

Delegation in this repository happened because a person asked for it in the right words, and because whoever was orchestrating happened to hold the constraints: one writer per file, a reviewer that re-runs rather than reads, a text pass that is independent of the author. Nothing in the skill set carried that, so the next session would re-derive it — badly, or not at all. [Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) withdrew the rule and left the prompt as the trigger; nothing carried the workflow a prompt would ask for.

## Decision

`dsh-agent-team-workflow` is the tenth skill. It owns the consumer-facing half of Agent Teams: the roles — a Lead singleton, and Worker, Reviewer and Texter pools — the contract each role holds, the task card a piece of work is handed over in, and which of this repository's obligations a step owes. Its entry announces itself in the first line of the turn that activates it, so a reader can see which mode is running.

The division of labour is fixed. Lead plans, splits, integrates, and is the only role that speaks to the user; Worker implements and runs the checks; Reviewer re-runs the acceptance command in a clean context instead of reading a claim about it; Texter writes and translates, and changes no code. Each obligation keeps its owner: the skill derives the checks a change owes from the norms, and restates none of them.

## Alternatives considered

**Leave it in the standing orders.** Rejected: `AGENTS.md` says what a change owes, not how to divide the work, and a session that is never told to split keeps every step in one context.

**Fold the workflow into the manager skill.** Rejected: the manager owns adoption — setup, the skill set, the norms, and the checks an adopted project runs. A team is a second consumer of those rules, not a second manager.

**Make the Lead optional for short tasks.** Rejected: activation is the mechanism. Without a trigger the skill is a document an agent reads and then ignores.

## Consequences

- The two READMEs, `AGENTS.md` and the manifest count ten skills, and the installer's status report follows.
- A Texter change is prose-only, so a text-only diff is exempt from the type checks — stated in the skill rather than decided again each time.
- Deriving each step's obligations from the norms means a changed norm changes what the skill says without an edit to the skill.

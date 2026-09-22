# Agent Note: Delegation follows the harness and the prompt

Status: implemented

English | [中文](2026-09-23-delegation-follows-the-harness-and-the-prompt.zh.md)

## Problem

This repository wrote down how an agent should delegate: who counts as the main agent, that nothing is delegated before an agreed plan, a cost ladder from the main thread to a background job to one `subagent` to one `subagent` owning a fan-out, what a holder owes back, and one writer per path. The rules were borrowed from how a product architects multi-agent systems at runtime, and they arrived here as a standing order over the agents working in this repository.

They do not hold. What a delegation actually does is a property of the deployment and of the moment: whether a subagent call waits or returns an id, how deep delegation may go, how many children may be alive at once, how long a fork's snapshot stays relevant, and whether a batch's reports arrive one by one into the conversation. Those are settings and states rather than rules, so one instruction produced different behaviour in different sessions. A protocol that cannot be applied the same way twice is not a rule; it is a habit wearing one.

## Decision

**Delegation is withdrawn as a rule.** The catalogue loses `agent.roles`, the standing order goes, and the decision that introduced them is archived.

**What activates delegation is the harness and the prompt.** The harness decides natively: what a call does, whether it waits, how deep it may go, how many may run. The maintainer's prompt says what should be done and how. When a task is better split, the harness offers the split and the person can ask for it; neither needs a document predicting which unit deserves which carrier.

**Nothing else is put in its place.** No softened ladder, no narrower workspace rule, no "use a subagent when" list. The repository keeps the rules that were never about delegation: an acceptance claim belongs to whoever runs it, and work whose isolation matters gets an isolated checkout.

## Alternatives considered

**Keep the rules and soften the wording.** Rejected: the instability is in the mechanics, not in the phrasing. A cost ladder that names carriers the deployment may not offer is wrong however gently it is written.

**Keep only the cost ladder.** Rejected: choosing a carrier is the judgement the harness and the prompt already make; a written ladder would keep predicting an answer that moves with settings.

**Keep only the workspace rule.** Rejected as a standing rule and kept as a technique: two writers on one path still lose an edit, so isolation is something to reach for when writing in parallel rather than a protocol to obey.

**Keep the rules for this repository alone.** Rejected: nothing here differs from an adopting project except the number of agents, and the same mechanics decide both.

## Consequences

- The catalogue loses one group and two norms; its own record counts them again.
- A maintainer who wants a split says so, and a harness that can split does; the cost is judgement repeated per task instead of a written answer.
- The archived note keeps the reasoning that was rejected, including the cost ladder, so a later proposal argues with it rather than rediscovering it.
- What stays is evidence: whoever commits still runs the acceptance, however the work was produced.

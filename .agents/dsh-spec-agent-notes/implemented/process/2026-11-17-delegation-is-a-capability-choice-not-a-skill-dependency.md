# Agent Note: Delegation is a capability choice, not a skill dependency

Status: implemented

English | [中文](2026-11-17-delegation-is-a-capability-choice-not-a-skill-dependency.zh.md)

## Problem

Two shipped skills made a subagent the sole route for whole-document translation and for broad simplification surveys. The harness does not promise that every adopter exposes subagents, parallel execution, or isolated contexts. A skill that requires one of those mechanisms therefore turns an optional execution capability into an installation prerequisite and can stop a legitimate task. Removing the isolation requirement altogether would be the opposite error: independent production or review can be a quality boundary, and silently losing it can produce a confident but invalid result.

## Decision

A skill states the result and the separation or coverage property it needs. A subagent, parallel execution, and an isolated context are optional mechanisms, not installation requirements. When the host exposes a suitable mechanism, the skill may use it. Without one, use an available equivalent that preserves the property: bounded sequential passes, a clean-context handoff, staged independent review, or another verifiable route. If no equivalent preserves a required quality boundary, stop and hand over with the missing capability, completed work, and remaining work named. Do not silently present lower-quality work as complete.

This note owns portability of a skill's required result. [Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) continues to own the repository-level rule that a skill does not prescribe a carrier ladder. A capability preference with a stated fallback is not a carrier-selection protocol.

## Alternatives considered

- **Keep the mandatory subagent path.** It loses independent installation and turns a host capability gap into a task-content failure.
- **Remove every subagent mention.** It loses a useful isolated-context route and can weaken independent review when the host provides one.
- **Add a central “use a subagent when” ladder.** It revives the deployment-dependent protocol withdrawn by the existing delegation decision.
- **Treat any in-context execution as equivalent.** It permits silent quality loss and false completion.
- **Require a project declaration of available capabilities.** It adds configuration burden and overlaps the rule that an absent project declaration is a valid state.
- **Require a sibling skill as the fallback.** It recreates an installation dependency under another name.

## Consequences

- A host without subagents can complete a local task through a verifiable route or receive an explicit handoff for a task that requires separation.
- A capable host retains the isolated-context preference without a fixed subagent count, depth, or tool name.
- The two affected skills carry capability-absent and capability-present scenarios in their local eval corpora.
- The forge workflow requires capability-dependent skills to record the capability-present and capability-absent conclusions.

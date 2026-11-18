# Agent Note: Delegation is a capability choice, not a skill dependency

Status: implemented

English | [中文](2026-11-17-delegation-is-a-capability-choice-not-a-skill-dependency.zh.md)

## Problem

Two shipped skills made a subagent the sole route for whole-document translation and for broad simplification surveys. The harness does not promise that every adopter exposes subagents, parallel execution, or isolated contexts. A skill that requires one of those mechanisms therefore turns an optional execution capability into an installation prerequisite and can stop a legitimate task. Removing the isolation requirement altogether would be the opposite error: independent production or review can be a quality boundary, and silently losing it can produce a confident but invalid result.

## Decision

A skill states the result and the separation or coverage property it needs. A subagent, parallel execution, and an isolated context are optional mechanisms, not installation requirements. When the host exposes a suitable mechanism, the skill may use it. Without one, use an available equivalent that preserves the property: bounded sequential passes, a clean-context handoff, staged independent review, or another verifiable route. If no equivalent preserves a required quality boundary, stop and hand over with the missing capability, completed work, and remaining work named. Do not silently present lower-quality work as complete.

This note owns portability of a skill's required result. [Delegation follows the harness and the prompt](2026-09-23-delegation-follows-the-harness-and-the-prompt.md) continues to own the repository-level rule that a skill does not prescribe a carrier ladder. A capability preference with a stated fallback is not a carrier-selection protocol.

Evaluation scenarios live under `tests/skill-evals/` as development assets. An eval run stages them at the official `evals/` path inside a temporary skill copy. The delivered `skills/` tree and its `.agents/skills/` installation mirror contain no eval manifests or fixture inputs.

Eval coverage follows falsifiable behavior rather than skill count. A central natural-language behavior gets a development scenario when realistic prompts can falsify it and a deterministic check cannot decide it. Capability branches add both profiles. Mechanical contracts keep their unit or integration tests, and model evals run when the owning behavior changes rather than in routine CI.

## Verification

Six clean-context agent runs on 2026-11-18 exercised the capability profiles against the development corpus.

| Scenario | Observed evidence |
|---|---|
| Translation local update without isolation | The counterpart was edited directly, `translate-pair write` and `check` exited 0, and no subagent was used |
| Translation whole document when every independent mechanism is unavailable | No pair files changed and the handoff named the source, target language, completed work, pending work, missing mechanism and next command |
| Translation whole document with an isolated context | One isolated agent produced the complete counterpart, and the parent's `translate-pair check` exited 0 |
| Simplification survey without isolation but with separable evidence | Runtime and documentation were surveyed in separate passes with consumer evidence and rejected alternatives |
| Simplification survey when domain separation is required | The run preserved runtime evidence and handed off the unverified module reachability work with a resumable next step |
| Simplification survey with isolated contexts | Three clean contexts surveyed runtime, documentation and tests, and the combined result retained each domain's evidence |

[The capability scenario test](../../../../tests/skill-scenarios.test.ts) validates the corpus, containment and temporary staging. [The repository shape test](../../../../tests/repository-shape.test.ts) rejects an `evals/` directory in the distribution tree. The corpus gate also skips `tests/skill-evals/**` from translation discovery, so the repository check continues to report only its 39 maintained pairs.

## Alternatives considered

- **Keep the mandatory subagent path.** It loses independent installation and turns a host capability gap into a task-content failure.
- **Remove every subagent mention.** It loses a useful isolated-context route and can weaken independent review when the host provides one.
- **Add a central “use a subagent when” ladder.** It revives the deployment-dependent protocol withdrawn by the existing delegation decision.
- **Treat any in-context execution as equivalent.** It permits silent quality loss and false completion.
- **Require a project declaration of available capabilities.** It adds configuration burden and overlaps the rule that an absent project declaration is a valid state.
- **Require a sibling skill as the fallback.** It recreates an installation dependency under another name.
- **Ship the eval corpus inside each skill.** It makes every adopter install this repository's development prompts and fixtures. Temporary staging keeps the official eval layout without changing the delivered skill.

## Consequences

- A host without subagents can complete a local task through a verifiable route or receive an explicit handoff for a task that requires separation.
- A capable host retains the isolated-context preference without a fixed subagent count, depth, or tool name.
- The two affected skills have capability-absent and capability-present scenarios in a development-only corpus that is staged for evaluation.
- Distribution and installation remain limited to runtime skill resources.
- Eval coverage remains proportional to non-mechanical behavior. Other skills add scenarios when their own falsifiable behavior changes, not merely to make every skill carry an eval directory.
- The forge workflow requires capability-dependent skills to record the capability-present and capability-absent conclusions.

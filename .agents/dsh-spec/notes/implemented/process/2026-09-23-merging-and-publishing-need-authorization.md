# Agent Note: Merging and publishing need authorization

Status: implemented

English | [中文](2026-09-23-merging-and-publishing-need-authorization.zh.md)

## Problem

[The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) settles whose judgement lets a change land: a green run proves that something was run rather than that the change should land, the maintainer's review is the guard this repository relies on, and the release decision is reserved for that person. It does not state the operational form of that judgement for an agent working here, and the gap had a shape. An agent was granted a standing permission inside a task description — merge this objective's pull requests once you have checked them — covering changes that did not exist yet and reading exactly like the agent's own judgement that a change was finished.

A rule that arrives that way cannot be found by the next reader and cannot be narrowed to the change it was about, and it turns the review before it into a formality. The release is the worse case: it is the one act that reaches everyone who installed the set, so a permission inherited from an instruction about something else is not a decision about it.

## Decision

Merging a change, publishing a release, and marking a draft ready each happen only after the authorization for that act. [The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) carries that rule — which acts need one, and which of them stay reserved to the repository's maintainer — and this note owns what an authorization has to be: it names the act it covers and carries the change's description, and approval of a different change, or of the same change at an earlier phase, authorizes nothing.

The rule has three homes, one per reader:

- `AGENTS.md` carries it as a standing order, so an agent working here meets it every session.
- `pr.lifecycle` carries it in the norm catalog, so an adopting project inherits it with the rest.
- `.github/release_template.md` carries the shape a release notes document takes, so publishing is written to one form instead of remembered.

Two boundaries keep it from spreading. It does not re-argue the lifecycle's case for the maintainer's judgement; it names the act that judgement authorizes. And it does not decide the merge kind, which the lifecycle owns: a release pull request squashes like every other one once that act is authorized.

## Alternatives considered

- **Leave it to each task description.** That is what produced the gap: permission for one batch was indistinguishable from permission in general, and a later reader of the repository can find neither.
- **Put it only in the norm catalog.** The catalog is what an adopting project chooses from, and this repository applied none of it at the time, so the rule would have bound nobody here.
- **Require authorization for the whole batch instead of each act.** One approval for a stack of five pull requests is the standing permission again, one level up: four of them would land on a decision nobody made.
- **Let the approval live only in the conversation where it was given.** The merge is recorded in the repository and the approval would not be, so the next reader cannot tell an authorized merge from an assumed one.

## Consequences

**What it bought.** The act that ends a review is again distinct from the review, and the release — the act that reaches installers — has an owner rather than an inherited permission. A reader can ask for the authorization behind any merge or release and get an answer, which is what makes the rule checkable at all.

**What it costs.** An agent that must wait can stall a batch the maintainer expected to run to completion; the price is one round trip per act, and a stack pays it once per layer. Naming the act inside the request is easy to skip, and an approval that does not name it decays into the standing permission this rule removed.

**What it leaves to a reader.** This note sits beside the lifecycle rather than inside it, so a reader who finds only one of the two holds half the rule; the cross-link is the mitigation, and it is why this note may not restate what the lifecycle already owns. Nothing enforces the rule — the maintainer's answer is the enforcement — so the trace of an approval is expected where the merge happens rather than only in the conversation that gave it.

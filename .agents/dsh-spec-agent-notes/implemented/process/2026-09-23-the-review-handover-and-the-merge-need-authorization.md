# Agent Note: The review handover and the merge need authorization

Status: implemented

English | [中文](2026-09-23-the-review-handover-and-the-merge-need-authorization.zh.md)

## Problem

[The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) settles whose judgement lets a change land: a green run proves that something was run rather than that the change should land, and the maintainer's review is the guard this repository relies on. It does not state the operational form of that judgement for an agent working here, and the gap had a shape. An agent was granted a standing permission inside a task description — merge this objective's pull requests once you have checked them — covering changes that did not exist yet and reading exactly like the agent's own judgement that a change was finished.

A rule that arrives that way cannot be found by the next reader and cannot be narrowed to the change it was about, and it turns the review before it into a formality. The reason is that nobody ever answered it: a permission the agent reads out of its own instructions is the agent's sentence, not the maintainer's, so the judgement the review gate exists to obtain was never made.

## Decision

The review handover and the merge each happen only after the authorization for that act, and both are reserved to the repository's maintainer. [The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) carries that rule — which acts need one — and this note owns what an authorization has to be: it is asked for and answered. The agent puts the act to the repository maintainer in whatever form its harness presents a question, naming the act it covers and carrying the change's description, and the maintainer answers that question; a sentence the agent writes and then reads as consent is not an authorization. Approval of a different change, or of the same change at an earlier state, authorizes nothing. The ask itself comes once the change stands as it will be handed over: the tidy is done, the checks that verify it have passed, and the driver has agreed to what the change is. Made earlier, the answer can only be about the state it was asked at, so it is stale by the time the act it would authorize exists — or it is read as consent to a state the maintainer never saw.

The rule has three homes, one per reader:

- `AGENTS.md` carries it as a standing order, so an agent working here meets it every session.
- `pr.lifecycle` carries it in the norm catalog, so an adopting project inherits it with the rest.
- `.github/release_template.md` carries the shape a release notes document takes, so release notes are written to one form instead of remembered.

Two boundaries keep it from spreading. It does not re-argue the lifecycle's case for the maintainer's judgement; it names the act that judgement authorizes. And it does not decide the merge kind, which the lifecycle owns: the merge takes the kind the change's own kind calls for once that act is authorized.

## Alternatives considered

- **Leave it to each task description.** That is what produced the gap: permission for one batch was indistinguishable from permission in general, and a later reader of the repository can find neither.
- **Put it only in the norm catalog.** The catalog is what an adopting project chooses from, and this repository applied none of it at the time, so the rule would have bound nobody here.
- **Require authorization for the whole batch instead of each act.** One approval for a stack of five pull requests is the standing permission again, one level up: four of them would land on a decision nobody made.
- **Let the approval live only in the conversation where it was given.** The merge is recorded in the repository and the approval would not be, so the next reader cannot tell an authorized merge from an assumed one.
- **Ask early, to reserve the maintainer's time.** It would not remove the exchange, only move it earlier: what it spares is the wait at the handover, and it holds a slot in a busy person's day. It lost because it applies the same rule from the other side: an answer can only be about the state it was asked at, and the tidy that follows moves the change, so what the maintainer agreed to is not what lands. Reserving time is not an authorization for an act.
- **Treat the agent's own statement as the authorization.** An agent that finishes and says it is ready to merge already believes the change is finished, so its sentence can only confirm what it wrote; the maintainer's answer is the half that carries judgement, and this is why the ask has to be a question rather than a report.

## Consequences

**What it bought.** The act that ends a review is again distinct from the review, and the review handover — the act that hands the change to the maintainer — has an owner rather than an inherited permission. A reader can ask for the authorization behind any ready mark or merge and get an answer, which is what makes the rule checkable at all.

**What it costs.** An agent that must wait can stall a batch the maintainer expected to run to completion; the price is one round trip per act, and a stack pays it once per layer. Naming the act inside the request is easy to skip, and an approval that does not name it decays into the standing permission this rule removed.

**What it leaves to a reader.** This note sits beside the lifecycle rather than inside it, so a reader who finds only one of the two holds half the rule; the cross-link is the mitigation, and it is why this note may not restate what the lifecycle already owns. Nothing enforces the rule — the maintainer's answer is the enforcement — so the trace of an approval is expected where the merge happens rather than only in the conversation that gave it.

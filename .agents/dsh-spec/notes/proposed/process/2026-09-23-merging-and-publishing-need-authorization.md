# Agent Note: Merging and publishing need authorization

Status: proposed

English | [中文](2026-09-23-merging-and-publishing-need-authorization.zh.md)

## Problem

[The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) already settles whose judgement lets a change land: a green run proves that something was run, not that the change should land, the maintainer's review is the guard the repository relies on, and the release decision is reserved for that person. This note does not reopen any of that. What no document states is the operational form of that judgement for an agent working here — that it opens a pull request and stops, and that each merge and each release needs an authorization naming that act.

The gap is not theoretical. An agent working here was granted a standing permission for one batch of work — merge this objective's pull requests once you have checked them — and that is the shape the gap takes. The permission arrived inside a task description, covered changes that did not exist yet, and read exactly like the agent's own judgement that a change was finished. A rule that arrives that way cannot be found by the next reader, cannot be narrowed to the change it was about, and turns the review that preceded it into a formality. The release is worse: it is the one act that reaches everyone who installed the set, and a permission inherited from an instruction about something else is not a decision about it.

## Proposal

State the rule and give it three homes, each for a different reader.

The rule: an agent opens a pull request and stops there. Merging it, and publishing a release, happen only after the maintainer authorizes that specific act, and the request names the act and carries the change's description. Approval of a different change, or of the same change at an earlier phase, authorizes nothing — the review stage and the merge are two acts, and only the second is reserved.

The homes: a standing order in this repository's `AGENTS.md`, so an agent working here meets it every session; a norm in the catalog, so an adopting project inherits it with the rest; and a release-notes template, so publishing has one shape instead of whatever the person creating the release remembers.

## Alternatives considered

- **Leave it to each task description.** That is what produced the gap: permission for one batch was indistinguishable from permission in general, and a later reader of the repository can find neither.
- **Put it only in the norm catalog.** The catalog is what an adopting project chooses from, and this repository deliberately does not apply its own catalog, so the rule would bind nobody here.
- **Require authorization for the whole batch instead of each act.** One approval for a stack of five pull requests is the standing permission again, one level up: four of them would land on a decision nobody made.
- **Let the approval live only in the conversation where it was given.** The merge is recorded in the repository and the approval would not be, so the next reader cannot tell an authorized merge from an assumed one.

## Acceptance criteria

- `AGENTS.md` carries the order and links the note that owns its rationale.
- `norms list` shows `pr.authorization` in the `pr` group, with the rule, its reason and a self-check.
- `.github/release_template.md` exists, follows the release structure this pattern ships, and its own relative links and fragments resolve.
- Every merge and every release in this repository can point to the authorization that permitted that act.

## Risks

An agent that must wait for authorization can stall a batch the maintainer expected to run to completion; the cost is one round trip per act, and a stack pays it once per layer. Naming the act inside the request is easy to skip, and an approval that does not name it decays into the standing permission this rule removes. This note also sits beside the lifecycle rather than inside it, so a reader who finds only one of the two gets half the rule — the cross-link is the mitigation, and it is the reason this note may not restate what the lifecycle already owns.

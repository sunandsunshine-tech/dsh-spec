# Agent Note: The pull-request lifecycle, from WIP to merge

Status: implemented

English | [中文](2026-09-21-the-pull-request-lifecycle.zh.md)

## Problem

Nothing in this repository owns how a change travels from a working branch to `main`. Pieces of the answer exist under other topics — the review skill describes the reviewer's path, and the standing orders say what a change owes — but no document states the five stages, what each stage permits, what a commit message looks like, what a PR description carries, or which merge is used for which PR.

Two failures follow. A contributor has to infer the convention from git history, which shows only the commits that survived, and an agent that wants to open a pull request has no rule to follow beyond what the last one happened to look like. A convention that lives in history is a convention that drifts the moment the next author guesses differently.

The merge decision makes the gap sharp. GitHub offers three merges; two of them cannot serve a release here, and the one that cannot is invisible until a release tag stops naming a commit on the released line.

## Decision

A pull request moves through five stages in order — WIP, development, wrap-up, review and merge preparation, and merge — and each stage has one rule. Two acts land on it and they are not the same act: its implementer accepts it while it is a draft, and the repository's maintainer reviews it once the implementer has marked it ready. A draft is the implementer's working state, and the maintainer reads it only from the point it is ready. Acceptance and review are different acts, and neither stands in for the other; each can return the change for adjustment, so the branch is tidied three times — before acceptance, again before the ready mark, and again before the merge. An agent implements for the person driving the change: it accepts the result, and marks the pull request ready, only when that person authorizes it.

**WIP is free, and the title says so.** A branch under work is a draft pull request **and** its title carries the `WIP:` prefix — the draft is the mechanism, and the prefix is what a reader scanning a list sees ([kubernetes/community: pull-requests.md](https://github.com/kubernetes/community/blob/main/contributors/guide/pull-requests.md) adds or removes a `WIP` or `[WIP]` prefix to the title, and [GitLab's draft merge requests](https://docs.gitlab.com/user/project/merge_requests/drafts/) recognize a prefix only, at the start of the title). The prefix comes off in wrap-up, because the title becomes the squash commit's subject. Commits at this stage are working state: rebase them, reword them, drop them, force-push the branch. Nothing depends on their shape yet.

**Development ends in wrap-up, and wrap-up is the handover the implementer makes.** The branch is rebased interactively into milestones — a commit per coherent unit of work, in an order a reviewer can read — and every commit left is a state that builds and passes its checks on its own, so no reviewer lands on a broken intermediate. That is the tidy before acceptance; the implementer then accepts the change, folds whatever the acceptance asked for back into the milestones, and, once that handover is authorized, lifts the `WIP:` prefix and marks the pull request ready: that act is the request for the maintainer's review.

**The maintainer's review is append-only.** Once a pull request is ready for review it receives fixups: new commits on top, never rewritten history — "Make the fixups, and don't squash yet… your reviewer can look at the new commit on its own" ([kubernetes/community: pull-requests.md](https://github.com/kubernetes/community/blob/main/contributors/guide/pull-requests.md)). A reviewer reads the delta since the last pass, and rewriting under them destroys the only thing they can compare against. A review that asks for a change is answered with those appended fixups, and the branch is rebased only when its base moves, to stay mergeable.

**Merge preparation is the third tidy, and it happens after review.** "After a review, prepare your PR for merging by squashing your commits. All commits left on your branch after a review should represent meaningful milestones or units of work" ([kubernetes/community: github-workflow.md](https://github.com/kubernetes/community/blob/main/contributors/guide/github-workflow.md)). Here that squash is done by rebase: each fixup, typo correction, and merge from the base is folded into the milestone it belongs to, so every commit left represents a milestone or a unit of work and nothing else. The result is a branch whose every commit is again a complete state.

**Each act that moves the change forward needs its own authorization.** The ready mark, the merge and the release are those acts; the merge and the release stay reserved to the repository's maintainer, while the ready mark is the implementer's own and an agent makes it only on their authorization. What an authorization has to name, and why an approval of a different change authorizes nothing, is [the authorization rule](2026-09-23-merging-and-publishing-need-authorization.md)'s.

**The work starts under its own authorization.** [The plan contract](../../../plans/README.md) owns the start of a delivery that has a plan, and that start authorizes the work and nothing after it, so each of those acts still needs its own.

**A commit message is Conventional Commits.** `type(scope): one line`: a type, an optional scope, a subject, and a body that says what changed and why. The subject names the change: a rule, an instruction or a question is addressed to a reader, and the line is read by someone who was not there. The subject stays within 70 characters. A machine that took part in the change is named only in an `Assisted-by:` trailer; the message itself is about the change.

**A PR description carries four sections.** `## What this PR does`, `## Why`, `## How`, `## Reviewer notes`; the checks run on every pull request, so the run is the verification and no section repeats it. Upstream asks for `Motivation`, `Changes` and `Testing`; these four sections are this repository's own practice, recorded here because the `pr.description` norm quotes them.

**Each fact has one section, and the commit record carries the milestones.** `## What this PR does` states the behavior a reader gets after the merge, `## Why` the problem and the decision, `## How` the mechanism and the choices worth weighing, and `## Reviewer notes` the uncertainty a reviewer must weigh; `## How` does not repeat the milestones the commits already carry. A diagram is optional: add one to `## What this PR does` where a picture carries the mechanism more clearly than prose, keep it small and in ASCII, and let it complement the paragraph rather than repeat it.

**A sentence in it stays only if a reviewer can act on it or be warned by it.** Which tools took part, what was tried before the shape settled, and how the branch reached this point cannot be either. Three exceptions carry their own weight: the change itself is about those things; the reviewer needs the warning — a duplicate pull request, a base branch that moved; or the uncertainty is one a reviewer must weigh before merging.

**A description names the fact, not the item code.** A code from a plan, an audit or a review — a step number, a finding's number — is a name the reviewer does not hold: write the change, the failure or the command it stood for, and leave the code in the document that defines it.

**It states the change; an open question stays in the conversation.** What is left undone, what the author recommends and what they wait for are all addressed to whoever is present, and a description is read long after that reader is gone.

**Squash is the merge.** Every pull request is squash-merged on GitHub, by fast-forward, so the released line gains one clean commit per pull request.

**A release pull request squashes like every other one, and the tag goes on the squash commit.** Its commits are the release notes and the installed copy refreshed from the release branch, and the tag is created on that commit after the merge, so the released tag names a commit on the released line without a merge path of its own. [The release commit carries its own copy](2026-09-23-the-release-commit-carries-its-own-copy.md) owns the reversal, the cost it accepts, and the alternatives it beat. The other two GitHub merges stay turned off for this repository: rebase-and-merge rewrites every commit SHA, and a merge commit is not what a line built from squashes wants.

**A rule lands before the changes it governs.** A change that a rule constrains opens its pull request after the rule is on `main`, so the change can point at a rule a reader can already open.

## Alternatives considered

**Keep all three GitHub merges available and let the author pick.** It is the default and the least policy. It lost because the branch's meaning then depends on which button was pressed: a merge commit makes `fix typo` a permanent line of history, and rebase-and-merge "Always updates the committer information and creates new commit SHAs" ([GitHub's merge reference](https://docs.github.com/en/pull-requests/reference/pull-request-merges)), so a release tag taken from such a branch would name a commit the released line never contains. One merge, applied to every pull request, is the only version of this that a release can depend on.

**Manage the parallel branches with `gh stack`.** It tracks a series and keeps each layer rebased on the one below, which is genuinely better than by hand for a stacked change. It lost because stacking is as narrow as its rule: it is needed when one change is layered on another. Independent changes need none of it — a rule can land without a note, and a note without a rule — so plain branches plus fixups and one squash are the whole mechanism.

**Leave out the review gate and merge as soon as the checks are green.** Every gate here runs locally, so a green run is already the evidence a merge would want, and a single maintainer can merge their own change immediately. It lost because the checks prove that something was run, not that the change should land: they cannot say whether a decision is the right one, whether a document says what it means, or whether a topic belongs to this repository at all. Those are the maintainer's calls, and a repository that reserves the release decision for the maintainer has no reason to let an ordinary change bypass the same person.

**Put the commit convention in the PR template alone.** It keeps the convention in one file a contributor reads while opening the pull request. It lost because the convention constrains history, and the template is not part of history: a description can be edited after the sixth fixup, while the commits a squash carries are what the released line keeps. The template points at this note for the same reason.

## Consequences

The change is legible at every stage: one commit per unit of work is merged, the pull request is the record of how it got there, and a release tag names a commit on the released line. An author knows when rewriting is allowed and when it is not, and a reviewer knows that a commit appended after ready is the thing to read. The cost is discipline that no check enforces: the fixup habit has to be deliberate, and this note has to survive the next author who has a reason to prefer the merge button.

A squash loses the working commits that led to the final one — the failed attempts, the reverted experiments — and that history is worth keeping while a change is a proposal, which is exactly what the WIP and development stages are for. The trade is deliberate: the released line is read far more often than a branch is.

The lifecycle is stated once, here. Other documents — a PR template, the standing orders — point at this note instead of repeating its rules.

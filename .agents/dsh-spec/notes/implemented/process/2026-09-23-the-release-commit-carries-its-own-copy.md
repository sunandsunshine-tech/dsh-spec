# Agent Note: The release commit carries its own copy

Status: implemented

English | [中文](2026-09-23-the-release-commit-carries-its-own-copy.zh.md)

## Problem

[The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) made the release pull request the one exception to its squash rule: its commits were merged with `git merge --ff-only` so that the released tag would name a commit on the released line, and GitHub was left to report an indirect merge. [The pin is the published tag](2026-09-22-the-pin-is-the-published-tag.md) then put this repository's own copy back on a published revision *after* the tag, in a second commit.

Together the two rules cost more than they bought. A release was two commits on `main` and a second merge path used by nothing else, and the released revision still shipped a copy whose injected ref named the branch it had been refreshed from — a branch the merge deletes — because the commit that repinned it came after the tag. The state that note had rejected as unfetchable was the state every released tag shipped.

## Decision

A release pull request squashes like every other one. Its commits are the release notes and the installed copy refreshed from the release branch, and the tag is created on the squash commit after the merge, so one commit on the released line carries both. Nothing else about the merge changes: the release pull request is reviewed like any other, and squash stays the only merge GitHub performs in this repository.

The copy inside that commit names the release branch, which the merge deletes. The dangling ref is accepted, and what a release has to match is the copy's content rather than its name: the injected tree sha is the released skills, and every refresh in this repository names its revision explicitly (`upgrade --revision <branch|tag>`), so the injected name is resolved by nothing except a bare `upgrade --only-skill-set` run from the released revision. An installer's own copy pins the ref that installer installed from — a tag, or a branch that stays.

Two boundaries. It does not change what a release is or what installs follow; [the pin note](2026-09-22-the-pin-is-the-published-tag.md) owns both. And it does not widen what a release commit carries: the notes and the copy are what a release adds, and anything else a release needs lands before it, in the pull request that makes the change.

## Alternatives considered

- **Pin the copy to the tag inside the release commit.** The released revision's copy would name a live ref, which is what the pin note wanted. It lost because the tag cannot exist before the copy is built from it: the release branch would be tagged first and the tag moved onto the squash commit after the merge, so a name installers resolve would move, and it would move for a ref the normal flow never resolves.
- **Refresh the copy from `main`.** The same skills under a live ref, and no tag before the merge, because the release branch's `skills/` tree is `main`'s. It lost because it names the development line as the copy's origin: a later reader cannot tell which release the copy came from, and the copy then follows unreleased work.
- **Keep the local `git merge --ff-only`.** It is what the lifecycle decided, and it puts the tag on the branch's own commits. It lost because a release then needs a merge path of its own, and the second commit it needs leaves the released revision's copy stale; the guarantee the exception was introduced for is reached by tagging the squash commit instead.
- **Refresh the copy when the next change starts, so a release carries only its notes.** No release-time work beyond the notes. It lost because the released revision would then ship skills that no revision installed, and the release would stop being the moment the copy is brought to what it publishes.

## Consequences

**What it bought.** One commit on the released line carries the release and the copy of it, a release pull request uses the merge every other one uses, and the released tag names a commit the ordinary merge produced. The indirect-merge costs the lifecycle recorded — protection that does not apply, a branch deleted by hand — are gone with the exception.

**What it costs.** The copy inside the released revision names a deleted branch, and no later commit repairs it: until the next refresh, a bare `upgrade --only-skill-set` in this repository fails with `could not resolve version: HTTP 422: No commit found for SHA: <branch>` and has to be given `--revision`, which the standing orders pass every time. And this repository's claim that its copy is what an installer receives weakens from byte-identical to the same skills under a different injected ref.

**What it leaves to a reader.** The release is the only place that refreshes the copy for publication, so a release branch has to be pushed before its copy can be refreshed from it — which is what makes a release pull request at least two commits. And the ref a released revision carries is a name rather than a promise: read the injected tree sha beside it, which is the claim the release does make.

## Related

- [The pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.md) — owns the states, the tidy before acceptance, before review and before the merge, and the merge kinds; this note removes its release-pull-request exception.
- [The pin is the published tag](2026-09-22-the-pin-is-the-published-tag.md) — owns what a release is and what installs follow; this note changes only what this repository's own copy carries at release time.

# Agent Note: The pin is the published tag

Status: implemented

English | [中文](2026-09-22-the-pin-is-the-published-tag.zh.md)

## Problem

Until 0.1.0 there was no release, so the pin had to name the trunk: installs followed `main`, and the tag was only the marker that named a commit. [The released revision is the main branch](../../archived/process/2026-09-21-the-released-revision-is-main.md) decided that deliberately and named the alternative it was giving up — pin the tag, and moving to it later is one line and one refresh. Publishing the release is that moment.

## Decision

**A release is what installs follow.** `install` and `upgrade` without `--revision` resolve the newest published release, so a project pins the tag that was published when it adopted; the trunk stays reachable with `--revision main`, and a branch with `--revision <branch>`. A tag is immutable, so nothing moves under a project between releases, and the release notes and the draft release describe exactly the revision that arrived.

**This repository's own copy is repinned to the tag after each release.** That refresh runs `upgrade --revision v<version> --root .`, so the copy this repository runs is byte-identical to what an installer receives; while work is in progress the copy is refreshed with `--revision <branch>`, and the release is what puts it back on a published revision. `main` remains the development line where releases land, and a tag names a commit on it, but it is no longer what a deployment follows.

## Alternatives considered

**Stay on `main`.** Rejected now that a release exists: this repository's own deployment would follow unreleased work, so the copy would differ from what an installer gets, and any landing change would silently move what this repository itself runs. The archived decision kept that cost visible — "the pin moves" — and accepted it only while there was nothing to pin to.

**Pin the commit the release targets.** Rejected: it is the tag without a name. A reader of the copied `SKILL.md` cannot tell what a bare sha names, while `v0.1.0` says which release arrived, and the commit behind a tag is one `gh api` call away for anyone who wants it.

**Leave the copy where the last branch refresh put it.** Rejected: a merged branch is a ref nothing can fetch from once it is deleted, so the copy would name a revision that no longer resolves and a bare `upgrade --only-skill-set` from it would fail. A release repins it to something that cannot move.

## Consequences

- A release now ends with a repin: tag, then `upgrade --revision v<version>`. Until that runs, the copy pins the branch it was last refreshed from.
- A project that wants unreleased work has to say so with `--revision main`; that is the trade the archived decision bought with a movable pin, and it is now explicit per project rather than implied for everyone.
- `status` still compares injected refs, so a copy whose ref is right and whose content is behind is not something it can find offline. The refresh discipline is what keeps the two in step.

# Agent Note: The released revision is the main branch

Status: implemented

English | [中文](2026-09-21-the-released-revision-is-main.zh.md)

## Problem

The manifest pins one revision, and every install, refresh and `status` comparison reads it: `gh skill install` fetches the skills at that revision, the installer writes the resolved ref into each installed `SKILL.md`, and `status` reports drift when the installed ref is not the manifest's. This project was built on `extract`, because that was the branch the work lived on, so the pin named a branch that only ever carried unreleased work.

Releasing 0.1.0 raised the question the pin had deferred: should the released line be named by the tag that marks the release, or by the branch that carries it?

## Decision

**The manifest pins `main`.** `"revision": "main"` is what a project installs from, what a refresh fetches, and what `status` compares an installed `refs/heads/main` against.

**The tag is the human-facing marker, not the pin.** `v0.1.0` names the release — the tag, its notes and the draft release — while installs follow the released line. The two answer different questions: a tag says which commit was released, the branch says where the released line is.

**The two revisions differ only in a ref.** Before the merge, `extract` and `main` carry the same tree; after it they carry the same content under different refs, because the merge is a squash. An install from either resolves to the same files, and `status` is what tells them apart — which is the drift it exists to report.

## Alternatives considered

**Pin the tag, `v0.1.0`, the way dsh pins `dsh-v0.1.6-alpha.2`.** The extraction's own baseline does exactly this, and an immutable pin is the stronger guarantee: a tag cannot move under an installer. It lost because it turns every release into a manifest change plus a re-install in every project, while this collection is young enough that the released line is still the trunk. The tag stays as the release marker, and moving the pin to it later is one line and one refresh.

**Pin the commit the release targets.** The most reproducible of the three, and what dsh records in `targetCommitish`. It lost for the same reason as the tag, and it costs readability: a project reading its own instruction file cannot tell what a bare sha names, while `main` says which line it follows.

**Leave the pin on `extract`.** No change at all, and the branch would keep receiving work. It lost because the released line has to be the branch a reader of this repository sees as current; a release built on a working branch makes every install depend on a branch nobody was told about.

## Consequences

**What it bought.** One name answers "where does an install come from", and it is the branch a reader already treats as current. The release becomes a marker rather than a migration, so tagging 0.1.0 changes no install.

**What it costs.** The pin moves: a project that refreshes after an unreleased change lands on `main` takes that change, where a tag pin would not have. That is the trade this decision makes deliberately while the collection is young, and the alternatives above are the escape hatch.

**What it obliges.** The installed copy in this repository must be refreshed from `main` after the merge, because its injected `github-ref` still names `extract`. Until that refresh lands, `status` reports the drift it is designed to report.

## Testing

`node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts status --root .` ends `8 skill(s) at main, each revision read from its installed metadata` once the copy is refreshed from the branch this revision names, and the release tag resolves to the commit the draft release targets.

# Agent Note: Ordinary installation tracks the latest release

Status: implemented

English | [中文](2026-11-25-ordinary-installation-tracks-latest-release.zh.md)

## Problem

Installation guidance can make a fixed revision look like the normal choice. A copied example then leaves adopters on an old skill set while updates appear to work only for specially marked installations. Treating `latest` as a pin value is also misleading because it names an intent rather than an exact revision.

## Decision

The normal installation path omits `--pin` and lets `gh skill install` select the latest tagged release; when a repository has no tagged release, the CLI's default-branch behavior applies.

An exact tag or commit is supplied with `--pin <tag-or-commit>` only when CI, audit, reproducible builds, compatibility work or another fixed-version requirement needs it. `--pin latest` is invalid and must not appear as a documented shorthand. Unpinned installations follow the CLI update path; pinned installations stay fixed until explicitly unpinned.

### Installation guidance

[README.md](../../../../README.md#install) presents the ordinary and fixed-revision forms and links this decision from the install instructions. [choosing-skills.md](../../../../docs/choosing-skills.md#install-model) carries the same distinction in the skill-selection guide.

### Scope

The policy covers installed skills only. Repository toolchain pins, dependency pins and GitHub Action pins keep their own fixed-version rules.

## Alternatives considered

**Use `--pin latest` as the ordinary install form.** It reads like a version-selection flag, but it is not an exact revision and turns a clear default into a fictional pin.

**Default to the newest commit on the default branch.** It delivers every change immediately, but it bypasses release tags and makes routine installations less reproducible by accident.

**Always pin a known release.** It gives fixed content, but makes normal users perform manual upgrades and treats the safest reproducibility boundary as the default workflow.

## Consequences

- An automatic update can introduce a behavioral regression; adopters that need stability must opt into an exact pin.
- The default-branch fallback applies only before a project has release tags, so a first release may move ordinary installations from branch content to tagged content.
- Documentation can still imply that pinning every runtime dependency is equivalent to pinning an installed skill; this decision covers only skill installation.
- The ordinary path follows updates without manual revision selection, while a fixed installation remains isolated until an explicit unpin.

### Verification

[repository-shape.test.ts](../../../../tests/repository-shape.test.ts) checks the ordinary and fixed-revision examples in both language pairs and rejects `--pin latest` in documented command examples. The corpus and pairing gates check the links, lifecycle skeleton and translated companion.

# Agent Note: Ordinary installation tracks the latest release

Status: proposed

English | [中文](2026-11-25-ordinary-installation-tracks-latest-release.zh.md)

## Problem

Installation guidance can make a fixed revision look like the normal choice. A copied example then leaves adopters on an old skill set while updates appear to work only for specially marked installations. Treating `latest` as a pin value is also misleading because it names an intent rather than an exact revision.

## Proposal

The normal installation path omits `--pin` and lets `gh skill install` select the latest tagged release; when a repository has no tagged release, the CLI's default-branch behavior applies.

An exact tag or commit is supplied with `--pin <tag-or-commit>` only when CI, audit, reproducible builds, compatibility work or another fixed-version requirement needs it. `--pin latest` is invalid and must not appear as a documented shorthand. Unpinned installations follow the CLI update path; pinned installations stay fixed until explicitly unpinned.

Tracking: #131.

### Current state and review boundary

The base already implements the installation mechanics described here: [README.md](../../../../README.md) shows the unpinned default and fixed-revision variant, and [repository-shape.test.ts](../../../../tests/repository-shape.test.ts) checks both forms. Closed #125 and merged #127 record that completed work.

This proposal does not ask for a new installer or a migration of those examples. It asks to make this rationale and scope the durable owner reached from current installation guidance. That discoverability link is not yet installed, so the record remains proposed until #131 retains the policy and links it from the existing guidance or another current governance owner.

## Alternatives considered

**Use `--pin latest` as the ordinary install form.** It reads like a version-selection flag, but it is not an exact revision and turns a clear default into a fictional pin.

**Default to the newest commit on the default branch.** It delivers every change immediately, but it bypasses release tags and makes routine installations less reproducible by accident.

**Always pin a known release.** It gives fixed content, but makes normal users perform manual upgrades and treats the safest reproducibility boundary as the default workflow.

## Acceptance criteria

- Ordinary installation examples in both languages omit `--pin`.
- Fixed-revision examples name an exact tag or commit and state the CI, audit, reproducibility or compatibility need.
- No current documentation presents `--pin latest` as valid.
- Installation checks distinguish the ordinary path from fixed-revision variants.
- The proposal leaves repository-toolchain and GitHub Action pins unchanged.
- Installation guidance or another current governance owner links to the retained policy; until that step lands, this record remains proposed.

## Risks

- An automatic update can introduce a behavioral regression; adopters that need stability must opt into an exact pin.
- The default-branch fallback applies only before a project has release tags, so a first release may move ordinary installations from branch content to tagged content.
- Documentation can still imply that pinning every runtime dependency is equivalent to pinning an installed skill; the proposal covers only skill installation.

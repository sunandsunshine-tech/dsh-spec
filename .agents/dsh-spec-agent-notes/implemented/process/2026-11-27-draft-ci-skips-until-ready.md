# Agent Note: Draft CI skips until the head is ready

Status: implemented

English | [中文](2026-11-27-draft-ci-skips-until-ready.zh.md)

## Problem

Running the complete GitHub check suite on every intermediate Draft push spends remote runners and makes reviewers wait for results that a later commit will supersede. Treating those missing or superseded results as passing evidence would instead hide exactly the remote failures the gate exists to find.

## Decision

Intermediate pushes to a Draft pull request carry `[skip ci]` in the commit message by default. `[skip ci]` is not a passing result: the skipped workflow did not run for that head, provides no complete remote-check evidence, and must not be cited as evidence.

Remove `[skip ci]` only when the exact Draft head currently needs remote CI as evidence. Before the pull request is marked ready, push a new head without `[skip ci]` and require the complete check suite to succeed on that exact head.

Known failures, CI workflow or configuration changes, and integration boundaries that cannot be reproduced locally require a real remote run. They are not skipped, deferred, or treated as covered.

The operational GitHub rule lives in [`CONTRIBUTING.md`](../../../../CONTRIBUTING.md#draft-pull-requests) and the root [`AGENTS.md`](../../../../AGENTS.md). It belongs to this repository's GitHub workflow and does not enter the shipped pre-push skill.

## Alternatives considered

**Run complete CI for every Draft push.** It gives immediate remote feedback, but most results are superseded while reviewers wait and remote capacity is consumed.

**Use local checks as the only evidence until merge.** Local checks catch repository regressions, but they cannot establish GitHub workflow configuration or remote integration behavior.

**Keep `[skip ci]` on the ready head.** A skipped head has no complete remote-check result, so marking it ready would claim a check that did not happen.

**Depend on local checks for known failures or integration boundaries.** A passing local suite does not establish a remote failure or a workflow boundary; those require the real check.

**Put the rule in the shipped pre-push skill.** The package serves projects beyond GitHub Draft pull requests, so a GitHub-specific skip rule there would bind unrelated adopters.

## Consequences

- Intermediate Draft pushes avoid waiting for a complete remote suite that the next commit will supersede.
- A skipped head remains explicitly unevaluated rather than being described as passing.
- The ready head carries no `[skip ci]` and has complete remote-check evidence for its exact commit.
- Known failures, workflow changes, and integration boundaries cannot be hidden behind a skip.

# Agent Note: Stack merge defaults to squash

Status: implemented

English | [中文](2026-11-18-stack-merge-defaults-to-squash.zh.md)

## Problem

When a landing repository leaves the merge method unspecified, `dsh-spec-merging-stacked-prs` must still select one. Its prior fallback selected `merge` whenever the repository instructions and GitHub settings did not select a method.

## Decision

The landing repository's policy remains authoritative. The skill uses the method its instructions prescribe. When the instructions are silent and GitHub allows exactly one merge method, it uses that method. When policy still selects no method, it uses `squash`. A user request or explicit parameter may select a one-off method under the skill's shared default contract.

The [forge decision record](2026-10-28-forging-dsh-spec-merging-stacked-prs.md) remains authoritative for the skill's mechanism, source adaptation and other rulings. This note partially supersedes its merge-method fallback fact.

## Verification

| Requirement | Evidence |
|---|---|
| The skill states the repository-policy precedence and the `squash` fallback at its use site | `node --test tests/skill-defaults.test.ts` |
| The changed skill remains mechanically valid | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs skills/dsh-spec-merging-stacked-prs` |
| The corpus, installed copy, notes and translation records stay consistent | `pnpm run check:corpus` |

## Alternatives considered

**Keep `merge` as the fallback.** It preserves the previous behavior, but it makes merge commits the default for repositories that do not select a method. The request selects squash instead.

**Use `squash` unconditionally.** It makes every landing produce a squash commit, but it would override a repository that explicitly requires merge commits or rebase. The repository's policy must remain authoritative.

**Wait for an explicit method whenever policy is silent.** It avoids choosing, but it violates the shared default contract and makes repositories without merge policy depend on an unnecessary question.

## Consequences

- Repositories whose instructions or unique GitHub settings select a method keep that behavior.
- Repositories that permit several methods or declare no policy default to one squash commit per pull request.
- Explicit user direction remains a one-off override.
- The forge record, its Chinese counterpart, the installed skill copy and the fixed-value test move with this decision.

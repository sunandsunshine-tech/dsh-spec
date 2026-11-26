# Issue #150 stacked-PR trigger evidence

Source: [issue #150](https://github.com/sunandsunshine-tech/dsh-spec/issues/150).

Model: host-configured `deepseek-flash`; Codex CLI `0.171.0-alpha.13`. Run date: 2026-11-26.

## Current trigger surface

Name:

```text
dsh-spec-merging-stacked-prs
```

Description:

```text
Use when landing official stacks of dependent GitHub PRs (A ← B ← C), merging a PR based on another open PR's branch, or sequencing related PRs. Requires GitHub stacked-PR support and gh stack. Not for review-fix propagation, single-PR merges, manual target changes, or non-GitHub chains; never merge and retarget individual PRs. 用于落地 GitHub 官方堆叠：相互依赖的 PR（A ← B ← C）、基于另一个开放 PR 分支的 PR，或按序合并相关 PR。需要 GitHub stacked-PR 支持与 gh stack。不适用于评审修复传播、单 PR 合并、人工更改目标分支或非 GitHub 依赖链；不得逐个合并 PR 并更改其目标分支来模仿堆叠语义。
```

`trigger-input.sha256` binds the current trigger corpus, trigger fixture and name/description
surface:

| Input | SHA-256 |
|---|---|
| `tests/skill-evals/dsh-spec-merging-stacked-prs/trigger-evals.json` | `fc437476eee3400b71498d00ced49a52a2c6fc022fdf7afedba72e1c550066af` |
| `tests/skill-evals/dsh-spec-merging-stacked-prs/trigger-fixtures/AGENTS.md` | `9f544e1af23371000eb4049918c8425bc52437e40642c8bde04735da5789dd46` |
| Current `name` plus `description` | `f8810da3d2ce18a142c85219677eaaadcc7b815604889f6fd201ac0c154a00ce` |

The initial surface hash was
`967405dbfb95743e42550bbbca17279ed01761ed3d5ee0a9172af0f2491be202`.

## Selection correction

The initial nine-query matrix passed eight probes. `stack-review-fix-propagation` selected the
skill although the body states that review-fix propagation is outside its scope. The failed final
response, trace, stderr, input hashes and matrix are retained under `baseline/`.

The description now names review-fix propagation, single-PR merges, manual target changes and
non-GitHub dependency chains as exclusions. The body below the frontmatter and every command remain
byte-for-byte unchanged from the reviewed revision.

## Trigger runs

Each query ran once in a separate read-only project containing only the current target skill and the
selection-only `AGENTS.md` fixture. The model was asked for a routing decision rather than task
execution. Each retained trace ends with one `turn.completed` event, and each final response ends in
the stable `SELECT:` marker.

| Query | Should trigger | Selected | Result |
|---|---:|---:|---:|
| `land-whole-official-stack` | true | true | pass |
| `land-through-boundary-pr` | true | true | pass |
| `link-same-author-chain` | true | true | pass |
| `refresh-then-land` | true | true | pass |
| `ordinary-single-pr-merge` | false | false | pass |
| `manual-retarget` | false | false | pass |
| `stack-review-fix-propagation` | false | false | pass |
| `non-github-dependent-mrs` | false | false | pass |
| `gh-stack-unavailable` | false | false | pass |

The final matrix is 4/4 positive selections and 5/5 near-miss exclusions. Each run is retained under
`trigger/<query>/`; the complete matrix is `trigger-matrix.tsv`. One run per query is selection
evidence for these prompts, not a repeated-sample trigger-rate estimate.

The description evaluation follows the Agent Skills guidance for
[optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions.md)
and [evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills.md),
read on 2026-11-26.

## Current behavior controls

The two current behavior runs remain unchanged at
`tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-merging-stacked-prs/`:

| Scenario | Assertions |
|---|---:|
| `refresh-stack-with-rerere` | 4/4 |
| `dependency-only-blocked-stack-can-land` | 4/4 |

Both runs remain the current behavior controls because the description is selection metadata and the
behavior-bearing body and commands did not change.

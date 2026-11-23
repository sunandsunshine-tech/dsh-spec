# PR #122 pre-push evidence

This directory contains the current evidence for the rebase-refresh scenario against the PR #122
skill tree.

## Method

The run used the isolated model runner with an editable project:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-pre-push-checks \
  --scenario select-rebase-refresh-with-rerere \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-pre-push-checks/select-rebase-refresh-with-rerere \
  --sandbox workspace-write \
  --replace
```

The runner installed the complete `dsh-spec-pre-push-checks` skill tree and staged only the two
fixture files declared by the scenario.

## Result

| Scenario | Assertions | Status | Finding |
|---|---:|---:|---|
| `select-rebase-refresh-with-rerere` | 4/4 | pass | Enables rerere, leaves `rerere.autoUpdate` unset or false, uses `gh stack sync` as the native cascading rebase path, and revalidates all three rewritten layers. It does not choose merge-forward or invent an author request. |

The four per-assertion results are in
`select-rebase-refresh-with-rerere/assertions.txt`.

## Provenance

The retained scenario definition matches the current corpus at
`cc6dfb8d30df5ffbe018652402532cb12ab26b8bb322811fd1b85b054fb284b5`.

The behavior-bearing files match the current skill tree; `skill-hashes.txt` also retains the notice
revision used by the model run:

- `SKILL.md`: `b2333ba9c4279a5ce91d302c3b6a4d5e430632993a32b0b6ace6af504748854b`
- `THIRD_PARTY_NOTICES`: `e0ad035625b04918c01a88e09df574ff10ff98975ef3a1c79e223ac780a5fc1a`
- `scripts/change-scope.mjs`: `8760550b804bc19bfb69c0eb67a8ece9559178e92e596cab424fc74f244589d2`

The raw trace has one turn start and completion. It contains no `tests/skill-evals`,
`evals/evals.json`, `expected_output`, source-worktree, response-directory or isolated-Codex-home
reference. `final.md` equals the final agent message in the trace. The run took 30.67 seconds.

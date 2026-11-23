# PR #122 stacked-PR evidence

This directory records the rebase-with-rerere selection against the current
`dsh-spec-merging-stacked-prs` skill tree.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-merging-stacked-prs \
  --scenario refresh-stack-with-rerere \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-merging-stacked-prs/refresh-stack-with-rerere \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `refresh-stack-with-rerere` | 4/4 | pass | 17.27 s |

The response enables rerere, keeps replayed resolutions unstaged, selects `gh stack sync`, validates
all three rewritten layers, and rejects merge-forward because no author requested it.

The retained scenario hash is
`a6304b3bc59cad10d00202ee423458b1108535325e4af1dbd68ca3a11ff38929`. The behavior-bearing file
matches the current skill; the manifest also retains the notice revision used by the model run:

```text
9941b1e8ff47d964bab667442fb228358b3f330d340cf73962a51eaee1fd0f1d  skills/dsh-spec-merging-stacked-prs/SKILL.md
f84722324822857dec797d74349d69cc5df09b2b77b9847c6a6e279369be0587  skills/dsh-spec-merging-stacked-prs/THIRD_PARTY_NOTICES
```

Its aggregate SHA-256, without a trailing newline, is
`52d9c7527cd722fd247028f32b46fb953de08902c9f1a6b9c649fe68f50b7b3d`. The trace has one
completed turn and 7 completed command records, remains answer-blind, and produced no project changes.

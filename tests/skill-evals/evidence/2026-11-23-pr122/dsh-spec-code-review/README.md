# PR #122 code-review evidence

This directory records the dependency-boundary scenario against the current
`dsh-spec-code-review` skill tree.

## Method

The run used `tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write` and
`--replace`:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-code-review \
  --scenario review-dependency-edges-and-reverse-edge \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-code-review/review-dependency-edges-and-reverse-edge \
  --sandbox workspace-write \
  --replace
```

The runner staged the five declared fixture files, installed the complete two-file
`dsh-spec-code-review` tree, and installed no sibling skills.

## Results

| Scenario | Assertions | Status | Time |
|---|---:|---:|---:|
| `review-dependency-edges-and-reverse-edge` | 6/6 | pass | 63.87 s |

The review derives edges from the base and current manifests, reports added `app → validator` and
`app → core`, removed `app → legacy`, and retained `core → app`. It identifies shared input checks
as the validator responsibility, flags the resulting cycle, and rejects the description's edge list
as incomplete.

The description identifies shared input checks as the validator responsibility. The review also
finds the omitted `app → core` edge and the existing `core → app` reverse dependency.

## Provenance

The canonical scenario hash is
`f7e9e33773257d644494b99f8326d2585e67353da64a445eee8ef5d69bf1ef1c`. The complete target-skill
manifest contains:

```text
079efa6e3e30043f20efb4cdc1dceffb8acc13e432f9d8b03855da70823afc7a  skills/dsh-spec-code-review/SKILL.md
feb374817e3acf4a7c4e45da409f76c77b59fd70669376bed1493348fa8faa29  skills/dsh-spec-code-review/THIRD_PARTY_NOTICES
```

The aggregate SHA-256 over the newline-joined manifest, without a trailing newline, is
`eff491e4b7b8e568c14864e59c6055390c8cf1f03734d593204a10ce391c10f5`.

## Integrity

The retained scenario definition and input manifest match the current corpus and fixture files.
The trace contains one turn start, one turn completion, and 21 completed command records, all answer-blind for
`evals/evals.json`, `tests/skill-evals`, and `expected_output`; it also names neither the source
worktree, response directory, nor isolated Codex home. Its successful target-skill read hashes to
the complete-manifest entry above.

`final.md` is byte-for-byte equal to the final agent message in `trace.jsonl`. The isolated project
made no file changes: `changed-paths.txt`, `patch.diff`, and `artifacts.sha256` are empty.

Scenario assertions live in `tests/skill-evals/dsh-spec-code-review/evals/evals.json`.

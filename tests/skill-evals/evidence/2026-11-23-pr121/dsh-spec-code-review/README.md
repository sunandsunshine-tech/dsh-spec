# PR #121 code-review evidence

This directory is the current evidence for the two code-review scenarios against the
PR #121 skill tree. It supersedes the historical PR #119 review-integration runs, whose traces
read the model-visible `evals/evals.json` and are therefore answer-contaminated.

## Method

Each scenario ran through `tests/skill-evals/run-model-eval.mjs` with `--sandbox read-only` and
`--replace`. The runner staged only the declared fixture files, installed the complete
`dsh-spec-code-review` tree, installed the declared `dsh-spec-client-ui-ux` and
`dsh-spec-error-handling` siblings for the integrated scenario, created a base commit, applied the
declared change patch, committed the candidate, and attached the declared PNG.

The attached `settings-after.png` is a 768 x 900 wide view with an enabled Delete account action.
Inspection confirms that it does not show the saving/disabled action or the supported 390 CSS-pixel
viewport. Its SHA-256 is
`9e9459d9babcc8170bb53c18026ada6fee6592b13c9f2dc0a68664d534c7821d`.

## Results

| Scenario | Assertions | Status | Finding |
|---|---:|---:|---|
| `review-with-integrated-guidance` | 6/6 | pass | Reviews `HEAD^..HEAD`, preserves `kind` and `detail`, rejects message routing, and leaves saving plus narrow-viewport evidence unproved. |
| `review-without-siblings` | 4/4 | pass | Names the smallest resumable 390-pixel saving-state capture step. |

## Provenance

The retained scenario definitions match the current corpus at:

- `review-with-integrated-guidance`: `c4545d1406288c1d1869ff6874097b4e45a9e7ce801cd8f3cf5ff8fcb659296d`
- `review-without-siblings`: `aaf7b55d6507c9c02eab373b76d395b992e90c0f831fcd1707b1a050297e391d`

Each `skill-hashes.txt` matches the complete frozen skills tree recorded by the evidence index.
Input manifests match every declared fixture file. Each trace has one turn start and completion;
`final.md` equals the final agent message; and every normalized trace is answer-blind: no trace
command, output or agent message names `tests/skill-evals`, `evals/evals.json`, `expected_output`,
the source worktree, the response directory, or the isolated Codex home.

The integrated trace reads the target and both declared siblings. The no-sibling trace reads the
target. No required skill read is missing.

Scenario assertions live in `tests/skill-evals/dsh-spec-code-review/evals/evals.json`.

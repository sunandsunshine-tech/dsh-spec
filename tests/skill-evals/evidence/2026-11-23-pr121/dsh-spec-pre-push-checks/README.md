# PR #121 pre-push evidence

This directory is the current evidence for the two pre-push scenarios against the final-stack skill
tree. It supersedes the historical PR #119 review-integration runs, whose traces read the
model-visible `evals/evals.json` and are therefore answer-contaminated.

## Method

Each scenario ran through `tests/skill-evals/run-model-eval.mjs` with `--sandbox read-only` and
`--replace`. The runner staged only the declared fixture files, installed the complete
`dsh-spec-pre-push-checks` tree, installed the declared `dsh-spec-client-ui-ux` and
`dsh-spec-error-handling` siblings for the integrated scenario, created a base commit, applied the
declared change patch, committed the candidate, and attached the declared PNG.

The attached `settings-after.png` is a 768 x 900 wide view with an enabled Delete account action.
Inspection confirms that it does not show the saving/disabled action or the supported 390 CSS-pixel
viewport. Its SHA-256 is
`9e9459d9babcc8170bb53c18026ada6fee6592b13c9f2dc0a68664d534c7821d`.

## Results

| Scenario | Assertions | Status | Finding |
|---|---:|---:|---|
| `select-integrated-evidence` | 6/6 | pass | Reviews `HEAD^..HEAD`, selects the committed worker-boundary test, and leaves rendering gaps explicit. |
| `select-minimum-without-siblings` | 4/4 | pass | Keeps the metadata boundary checks and names the missing saving-state capture plus a concrete next step. |

## Provenance

The retained scenario definitions match the current corpus at:

- `select-integrated-evidence`: `fb2f0d971e37dd7f4d528a7f2d083bde09135924abe358b0eef39b3d45765cee`
- `select-minimum-without-siblings`: `03380dd481fa520a3fb4e2f59010a04cf39f702f0bef7cde96be1fe90e970f4c`

Each `skill-hashes.txt` matches the complete frozen skills tree recorded by the evidence index.
Input manifests match every declared fixture file. Each trace has one turn start and completion;
`final.md` equals the final agent message; and every normalized trace is answer-blind: no trace
command, output or agent message names `tests/skill-evals`, `evals/evals.json`, `expected_output`,
the source worktree, the response directory, or the isolated Codex home.

The integrated trace reads the target and both declared siblings. The runner’s mandatory harness
instruction names the target in the no-sibling run, whose trace reads
`dsh-spec-pre-push-checks/SKILL.md`. No required skill read is missing.

Scenario assertions live in `tests/skill-evals/dsh-spec-pre-push-checks/evals/evals.json`.

# PR121 error-handling evidence

Candidate `SKILL.md` SHA-256: `5fe38c6a9d3b13c2988c087d0d75d634dd6ea9ad59d30f2f1186c7c3d8fbe330`.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

## Method

The run used `tests/skill-evals/run-model-eval.mjs` with `--replace`. The runner installed the current
`dsh-spec-error-handling` tree and the scenario's declared input in a fresh temporary Git project,
then exposed that project through an isolated Linux namespace with an editable project volume.

The retained evidence records the canonical scenario definition, complete run-time skill tree,
declared input, normalized trace, final response, changed path, patch and artifact.

## Results

| Scenario | Assertions | Status | Time |
|---|---:|---:|---:|
| `outcome-classification-and-extensible-codes` | 4/4 | pass | 29.52 s |

The response preserves the `find` command's distinction between a successful empty search and a
command failure. Exit status `1` remains the documented empty-search success, while every other
non-zero status remains a failure.

The response keeps `PluginError.code` open for provider extensions, exports the known codes as a
non-exhaustive set, and requires an unknown code to remain a valid `PluginError` that propagates or
reports its original code and cause rather than rejecting the extension.

## Integrity

The scenario-definition hash is
`1b50c21040d751a42f983d8e3d2a1e94b5a6cbc6927de85a89327ed16959297b`. It matches the current
definition and retained `scenario-definition.json`. The sorted complete-skill manifest matches the
run-time three-file skill tree; the aggregate SHA-256 over those sorted manifest lines is
`26401e991eb506f768930f6652f0991aae252f73ea78752609edbee48a6304b7` (newline-joined, without a
trailing newline).

The trace contains one completed turn. Its 11 completed command records do not read the answer manifest, source eval
tree or `expected_output` metadata. The retained `final.md` is byte-for-byte equal to the last agent
message in the trace, and the declared input hash matches the current scenario fixture.

Scenario assertions live in `tests/skill-evals/dsh-spec-error-handling/evals/evals.json`.

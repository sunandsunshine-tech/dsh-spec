# PR #122 code-review evidence

These runs exercise the alpha.2 review rules against the current `dsh-spec-code-review` skill.

| Scenario | Assertions | Result |
|---|---:|---|
| `review-dependency-edges-and-reverse-edge` | 6/6 | The review derives runtime edges from the base and current manifests, finds the removed legacy edge, and identifies the reverse dependency. |
| `review-cites-numbered-rule` | 3/3 | The review cites `API-2` for the undocumented exported function and does not invent another rule ID. |

Each run was produced by `tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write`.
The runner recorded the complete installed skill, current scenario definition, input modes, resolved
capability profile, trace, final response and retained artifacts. The exact hashes are in each run's
`scenario-definition.sha256`, `input-manifest.sha256`, `skill-hashes.txt` and `artifacts.sha256`;
`capabilities.json` records the resolved profile.

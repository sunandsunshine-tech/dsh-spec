# PR #121 evidence index

This tree contains the current model and behavioral evidence for the PR #121 review corrections.
All runs use the isolated runner documented in `tests/skill-evals/README.md`; the runner hides the
source repository and answer manifest, stages the complete installed skill, records full skill-tree
hashes and a scenario-definition hash, and retains declared build/evidence outputs.

Skills tree: `a02042f3d1cdd671b1ac05a0f94bc16c1dd89bd6`.

| Skill | Runs | Assertions |
|---|---:|---:|
| `dsh-spec-agent-notes` | 3 | 12/12 |
| `dsh-spec-pr-description` | 1 | 8/8 |
| `dsh-spec-translate-docs` | 4 | 16/16 |
| `dsh-spec-client-ui-ux` | 2 | 9/9 |
| `dsh-spec-browser-gif-evidence` | 1 | 4/4 |
| `dsh-spec-error-handling` | 1 | 4/4 |
| `dsh-spec-code-review` | 2 | 10/10 |
| `dsh-spec-pre-push-checks` | 2 | 10/10 |
| `dsh-spec-test-reliability` | 2 | 10/10 |

The current runs total 18 scenarios and record 83/83 reviewer-certified assertions. The runner
isolates the source and answer tree, but it is not a credential or network sandbox. Historical
PR #116 and PR #119 traces that were exposed to `evals/evals.json` are retained only as provenance
in their original directories and do not support current source/answer-isolation claims.

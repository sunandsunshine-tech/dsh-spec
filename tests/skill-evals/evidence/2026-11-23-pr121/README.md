# PR #121 evidence index

> **Historical status:** these reviewer-certified runs preserve the skill, scenario and input
> revisions recorded for PR #121. They are not current behavior evidence; current behavior evidence
> for a later skill revision must bind that revision directly.

This tree preserves the model and behavioral evidence recorded for the PR #121 review corrections.
The runs used the isolated runner documented in `tests/skill-evals/README.md`; the runner hid the
source repository and answer manifest, staged the complete installed skill, recorded full skill-tree
hashes and a scenario-definition hash, and retained declared build/evidence outputs. The
`skills-tree.sha256` manifest binds the recorded skill files without requiring a local-only Git
object.

The checked-in `evaluation-files.sha256` freezes each historical scenario input hash under the same
repository-relative path used by the run.

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

The runs total 18 scenarios and record 83/83 reviewer-certified assertions. This runner predates
the host-side credential proxy and recorded sandbox profile; it is not evidence for those later
properties. Historical PR #116 and PR #119 traces that were exposed to `evals/evals.json` remain
provenance only and do not support current source/answer-isolation claims.

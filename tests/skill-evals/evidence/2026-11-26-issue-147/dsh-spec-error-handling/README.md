# Issue #147 error-handling evidence

The three behavior runs are current `target-present` behavior claims, not comparison or causal
benefit claims. Each was produced by `tests/skill-evals/run-model-eval.mjs` with a 30-minute
deadline and passed all four of its reviewer-checked assertions, for 12/12 total:

| Scenario | Assertions |
|---|---:|
| `existing-project-identity-remains-authoritative` | 4/4 |
| `silent-handler-covers-one-safe-failure` | 4/4 |
| `worker-boundary-preserves-failure-identity` | 4/4 |

Each run retains typed `evidence.json`, its execution profile, scenario and input hashes, installed
skill provenance, terminal trace, final response, reviewer assertions and any retained artifacts.

The trigger corpus contains seven positive and six near-miss requests. The retained matrix contains
one final run per query, each in a separate temporary project with only
`dsh-spec-error-handling` installed, a fresh home and Codex home, and an outer read-only bubblewrap
project boundary. Seven positives loaded the skill and selected it; six near misses neither loaded
nor selected it. The result is 13/13 across the retained examples, not a repeated-sample trigger-rate
estimate.

`trigger-input.sha256` binds the current trigger corpus, selection fixture and
`skills/dsh-spec-error-handling/SKILL.md#name-description`. Each query retains `final.md`,
`stderr.log` and a normalized `trace.jsonl`; the matrix is `trigger-matrix.tsv`.

The host-configured Codex CLI was `codex-cli 0.171.0-alpha.13`; the configured model was
`deepseek-flash`.

The earlier PR113 and PR122 error-handling runs preserve prior revisions as historical evidence.
They do not prove the current description, body, trigger corpus or behavior scenarios.

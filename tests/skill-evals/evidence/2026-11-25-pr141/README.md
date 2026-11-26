# PR141 Code Review evidence

These seven runs use the current behavior-bearing `dsh-spec-code-review` `SKILL.md` and its current scenario definitions. The two existing review-integration scenarios remain the positive controls for missing required rendered UI evidence and preserved error identity. The ordinary-UI scenario is the negative control for optional reports and redundant audits. The two projection scenarios cover declared rules and the explicit no-rules gap.

Three retained runs record the pre-correction notice hash. Their behavior-bearing skill hashes and inputs remain current; the deterministic notice-attribution test covers the final notice separately.

All runs completed with `run_exit_code: 0` and 32/32 reviewer-graded assertions passing. The retained traces, skill hashes, input manifests and artifacts bind each result to its scenario.

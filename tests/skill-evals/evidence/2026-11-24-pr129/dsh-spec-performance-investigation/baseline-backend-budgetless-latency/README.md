# No-skill backend baseline

This run uses the `backend-budgetless-latency` fixture and prompt without the
`dsh-spec-performance-investigation` skill. It records the model's default performance judgement so
the skill's effect can be compared rather than assumed.

The run used the host-configured Codex CLI `0.171.0-alpha.13`, model `deepseek-flash`, a fresh Git
project containing only the fixture, and the same workspace-write sandbox profile as the candidate.
The local project path was normalized to `/workspace` in the retained trace and response.

This baseline is not source/answer-tree isolated: it ran directly from the repository workspace and
the model briefly searched parent temporary directories. It is retained as a disclosed comparison
run, not as current runner-quality evidence.

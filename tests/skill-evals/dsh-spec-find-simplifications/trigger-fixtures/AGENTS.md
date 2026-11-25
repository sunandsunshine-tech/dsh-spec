# Trigger evaluation fixture

`.agents/skills/` is evaluator infrastructure. Do not inspect that directory for task context. Use
the files named by the prompt under `trigger-fixtures/`; when the prompt is self-contained, answer
without reading project files.

Decide only whether an installed skill applies. Answer in one short paragraph. End with exactly
`SELECT: dsh-spec-find-simplifications` when that skill applies, or `SELECT: none` when no installed
skill clearly applies.

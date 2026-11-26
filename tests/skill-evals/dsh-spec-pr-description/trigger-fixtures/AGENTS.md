# Trigger evaluation fixture

`.agents/skills/` is evaluator infrastructure. Do not inspect that directory for task context. Use
the files named by the prompt under `trigger-fixtures/`; when the prompt is self-contained, answer
without reading project files.

For this selection-only evaluation, do not execute the requested work, edit files, spawn subagents
or search outside this project. Return one short paragraph explaining the routing decision, then
put exactly `SELECT: dsh-spec-pr-description` on the final line when this skill applies, or
`SELECT: none` when it does not.

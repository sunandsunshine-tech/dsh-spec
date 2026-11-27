# Trigger evaluation fixture

This is a selection-only probe. Do not execute the request, edit files, spawn
subagents, or inspect paths outside this workspace. Decide whether an installed
skill clearly applies, then answer why in one short paragraph.

`.agents/skills/` is evaluator infrastructure. Do not inspect that directory for
task context. When the prompt is self-contained, answer without reading project
files.

When `dsh-spec-code-review` clearly applies, load
`.agents/skills/dsh-spec-code-review/SKILL.md`, then end with exactly
`SELECT: dsh-spec-code-review`. Otherwise end with exactly `SELECT: none`.

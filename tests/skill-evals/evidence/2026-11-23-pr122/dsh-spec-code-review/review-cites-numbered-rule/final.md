One blocking violation found:

- **`API-2`** — [src/config.ts](/workspace/evals/files/numbered-rule-review/src/config.ts:1) exports `parseConfig` without API documentation naming its error behavior. The function throws `"configuration is empty"` on line 2, but callers have no documented indication that it can throw. This violates [AGENTS.md](/workspace/evals/files/numbered-rule-review/AGENTS.md:4).

`API-1` is satisfied because the parameter is explicitly typed as `string`. `API-3` does not apply because this adds a new export rather than changing an existing signature.

Reviewed `HEAD` (`0ec7040`) against `HEAD^` (`89dc8ec`). The worktree remains clean; no files or Git state were modified.
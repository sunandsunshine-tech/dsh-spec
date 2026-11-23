### Violated rule

- **API-2** — [src/config.ts](/workspace/evals/files/numbered-rule-review/src/config.ts:1): `parseConfig` is newly exported but has no API documentation, even though it throws when input is empty or whitespace-only at line 2. Consumers cannot discover the required error behavior from the API contract.

`API-1` is satisfied because the input is declared as `string`. `API-3` does not apply because this introduces a new signature rather than breaking an existing one. The project declares no automated quality gate.

No files or Git state were modified; the worktree remains clean.
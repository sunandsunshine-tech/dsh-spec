One rule violation:

- **`API-2`** — [src/config.ts](/workspace/evals/files/numbered-rule-review/src/config.ts:1): `parseConfig` is exported without API documentation. It throws on empty or whitespace-only input at line 2, but that error behavior is not documented.

`API-1` is satisfied by the explicit `input: string` signature. `API-3` does not apply because this adds a function rather than changing an existing signature. No files or Git state were modified.
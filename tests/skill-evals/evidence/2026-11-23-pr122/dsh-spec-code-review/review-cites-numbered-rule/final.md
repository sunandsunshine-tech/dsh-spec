**Finding — API-2**

[src/config.ts](/workspace/evals/files/numbered-rule-review/src/config.ts:1) exports `parseConfig` without API documentation. The function throws when the input is empty or whitespace-only, but callers are never told that it can throw or why.

No other numbered rules are violated: `API-1` is satisfied because the sole parameter is typed as `string`, and `API-3` does not apply because this is a new additive export rather than a breaking signature change.

No files or Git state were modified.
Updated [README.md](/workspace/evals/files/wrapper-classification/README.md) so the wrapper returns the worker’s structured failure unchanged:

```ts
return { ok: false, failure };
```

Downstream code now branches on `result.failure.code`, preserving `UPSTREAM_TIMEOUT`, `CANCELLED`, and `DENIED` as machine-readable identities. Display text is kept separate rather than replacing the failure. `git diff --check` passes; this fixture contains no runnable implementation or tests.
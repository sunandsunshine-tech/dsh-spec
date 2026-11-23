# Execution wrapper

The worker returns structured failures with one of three project-defined values:
`UPSTREAM_TIMEOUT`, `CANCELLED`, or `DENIED`.

The execution wrapper must carry the worker's structured failure through unchanged instead of
replacing it with a display message:

```ts
try {
  return await runWorker();
} catch (failure) {
  return { ok: false, failure };
}
```

Downstream code needs to distinguish cancellation, timeout, and denial because each requires a
different recovery action. It must branch on the worker's existing discriminant (for example,
`failure.code`) and against the exact values `UPSTREAM_TIMEOUT`, `CANCELLED`, and `DENIED`.
Display text may accompany the structured failure, but must not replace it.

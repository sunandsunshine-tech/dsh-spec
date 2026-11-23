The wrapper is currently a lossy boundary: a shared message cannot distinguish timeout, cancellation, and denial. Preserve the worker’s structured failure and its existing discriminant instead of rebuilding it.

```ts
async function execute(input: Input): Promise<ExecutionResult<Output>> {
  try {
    return await worker(input);
  } catch (failure) {
    if (isWorkerFailure(failure)) {
      return { ok: false, failure };
    }

    throw failure;
  }
}
```

Here `WorkerFailure` is the project’s existing type covering `UPSTREAM_TIMEOUT`, `CANCELLED`, and `DENIED`, and `isWorkerFailure` uses that existing discriminant. Downstream code can branch on `result.failure.code`—or the project’s established identity field—while `message` remains display-only. Unexpected worker defects should still propagate.

This keeps the existing values and downstream result structure intact. Tests should assert the exact discriminant for all three outcomes, plus verify that an unknown failure is not reclassified. The fixture contains no wrapper implementation to edit, so the correction is presented at the contract level.
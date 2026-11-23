# Execution wrapper

The worker returns structured failures with one of three project-defined values:
`UPSTREAM_TIMEOUT`, `CANCELLED`, or `DENIED`.

The execution wrapper must return the worker's structured result unchanged:

```ts
async function executeWorker(
  runWorker: () => Promise<WorkerResult>,
): Promise<WorkerResult> {
  return runWorker();
}
```

Downstream code needs to distinguish cancellation, timeout, and denial because each requires a
different recovery action. The wrapper must therefore preserve the worker-defined failure
identity and any structured details or cause it carries. A readable message may be added where
the failure is presented, but display text cannot replace that identity or become the input to
recovery logic.

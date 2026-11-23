# Execution wrapper

The worker returns structured failures with one of three project-defined values:
`UPSTREAM_TIMEOUT`, `CANCELLED`, or `DENIED`.

The execution wrapper currently catches every worker failure and returns:

```ts
{ ok: false, message: 'Request failed' }
```

Downstream code needs to distinguish cancellation, timeout, and denial because each requires a
different recovery action. The smallest correction is to keep the worker's structured failure in
the result rather than projecting it to display text:

```ts
try {
  return { ok: true, value: await runWorker() };
} catch (failure) {
  return { ok: false, failure };
}
```

The failure's existing project-defined code remains its machine-readable identity. Downstream code
can branch on that identity without parsing a message:

```ts
if (!result.ok) {
  switch (result.failure.code) {
    case 'UPSTREAM_TIMEOUT':
      // Retry according to the timeout policy.
      break;
    case 'CANCELLED':
      // Stop dependent work.
      break;
    case 'DENIED':
      // Report the permission failure.
      break;
  }
}
```

The wrapper must not rename, merge, or replace `UPSTREAM_TIMEOUT`, `CANCELLED`, or `DENIED`. If a
message is needed for display, preserve `failure` in the result and derive that text separately.

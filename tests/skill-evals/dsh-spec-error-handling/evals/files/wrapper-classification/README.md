# Execution wrapper

The worker returns structured failures with one of three project-defined values:
`UPSTREAM_TIMEOUT`, `CANCELLED`, or `DENIED`.

The execution wrapper currently catches every worker failure and returns:

```ts
{ ok: false, message: 'Request failed' }
```

Downstream code needs to distinguish cancellation, timeout, and denial because each requires a
different recovery action. Review the wrapper contract and propose the smallest correction that
preserves those outcomes.

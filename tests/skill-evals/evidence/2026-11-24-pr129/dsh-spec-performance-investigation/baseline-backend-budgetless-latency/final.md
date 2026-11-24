Optimized [`buildReport`](/workspace/src/report.mjs:13) without changing response content or ordering.

The dominant cost was rescanning all 5,250 inventory rows with `filter(...).reduce(...)` for each of 3,700 unique output rows. `seen.includes()` was a secondary cost. The patch computes regional totals once and uses a `Set` for deduplication.

Using the unchanged `node bench.mjs` HTTP benchmark, with two warm-ups followed by seven measured `/report` requests:

**Before**

```text
[110.252, 174.896, 176.333, 174.339, 173.056, 171.658, 174.012] ms
median: 174.012 ms
```

**After**

```text
[4.622, 4.300, 3.248, 3.942, 2.957, 3.112, 2.899] ms
median: 3.248 ms
```

Median latency ratio: **53.58× faster**, or **98.1% lower latency**.

The live `GET /report` remains a 200 response with the same 304,461-byte body and SHA-256 `26dc4434f4c5e64af9de9483e4d32211c37881f9a2e646c4d7be2aa0b845193d`, confirming identical filtered output and ordering. `npm test` passes.
Implemented the optimization in [src/report.mjs](/workspace/evals/files/measurement-decisions/src/report.mjs:15): regional unit totals are now memoized by region instead of filtering the full 5,250-row inventory for every distinct report row. Duplicate handling, filtering, report construction, and sorting remain unchanged.

**Profiler**

| Work count | Before | After |
|---|---:|---:|
| Inventory rows | 5,250 | 5,250 |
| Seen scans | 5,250 | 5,250 |
| Region filters | 3,700 | 4 |
| Region candidates | 4,856,250 | 5,250 |
| Profile entries | 3,700 | 3,700 |

**Raw benchmark samples**

Before:

```text
warmups: [165.030, 126.576]
samples: [135.582, 147.206, 210.221, 211.588, 213.207, 213.143, 214.433]
median: 211.588 ms
p95:    214.433 ms
```

After:

```text
warmups: [79.164, 64.393]
samples: [59.854, 58.586, 57.738, 59.354, 59.755, 60.181, 64.128]
median: 59.755 ms
p95:    64.128 ms
```

Median ratio: `211.588 / 59.755 = 3.541× faster`; the optimized median is `28.24%` of baseline latency, a `71.76%` reduction.

**Project gate**

The project-owned limit remains unchanged at `60 ms`. The baseline gate run failed at `208.156 ms`; the separate post-change gate run passed at `58.561 ms`. This is the project’s median gate only, not a universal performance target; the reported p95 remains above 60 ms.

The functional test passes. The real `GET /report` endpoint returns HTTP 200 with the identical 304,461-byte payload, SHA-256 `26dc4434f4c5e64af9de9483e4d32211c37881f9a2e646c4d7be2aa0b845193d`, 3,700 rows, and unchanged first/last ordering.
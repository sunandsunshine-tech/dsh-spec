Implemented the smallest causal fix in [src/report.mjs](/workspace/evals/files/backend-budgetless/src/report.mjs:13): duplicate detection now uses a `Set` instead of repeatedly scanning a growing array.

**Measurement context**

- Operation: warm `GET /report`, consuming the complete response body
- Revision: `03f5834` plus working-tree change
- Runtime: Node.js `v26.13.1`
- Workload: 5,500 inventory rows, 5,250 unique product-region keys, 304,461-byte response
- Profile: `seen.includes(key)` consumed 420 of 550 `buildReport` self samples, about 76%; regional filtering followed at 107

**Project bench**

Three isolated runs of the existing two-warm-up, seven-sample HTTP benchmark:

```text
Before ms:
[116.140, 203.652, 195.106, 205.179, 197.882, 197.821, 202.013]
[118.694, 127.125, 190.162, 189.657, 191.786, 196.128, 194.852]
[137.070, 101.935, 100.651, 110.096, 141.147, 119.086, 125.673]

After ms:
[63.085, 80.507, 54.068, 52.495, 51.671, 54.931, 52.744]
[87.526, 55.105, 54.896, 54.508, 55.834, 54.350, 54.084]
[94.350, 51.280, 53.007, 53.418, 55.975, 53.011, 52.603]
```

Aggregate: median `189.657 ms` before versus `54.350 ms` after, range `100.651–205.179 ms` versus `51.280–94.350 ms`. That is **3.49x faster** end to end.

This host showed substantial CPU-quota drift during later sustained runs, so I also ran old and new HTTP implementations side by side with alternating request order:

```text
Old ms: [99.546, 120.791, 196.799, 194.459, 191.621, 195.659, 197.745, 192.597, 207.809]
New ms: [53.999,  53.911,  73.011,  58.228, 147.325, 155.353, 149.064, 145.093, 187.370]

Median: 194.459 ms -> 145.093 ms = 1.34x
```

The paired result is the conservative causal estimate; the project-bench result captures the faster burst state.

**Behavior and checks**

- Before and after responses were byte-identical: HTTP 200, 304,461 bytes, SHA-256 `26dc4434f4c5e64af9de9483e4d32211c37881f9a2e646c4d7be2aa0b845193d`
- Filtering, deduplication, sort ordering, field order, and JSON output are unchanged
- `npm test` passes; `git diff --check` passes
- No p95 claim: the project has no budget, and concurrency/throughput were not measured
- Remaining larger hotspot: regional totals are still recalculated per unique row. Pre-aggregating them would be a reasonable follow-up, but it exceeds the requested smallest single-cause optimization.
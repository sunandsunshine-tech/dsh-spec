Implemented the optimization in [src/report.mjs](/workspace/evals/files/measurement-decisions/src/report.mjs:13). The project’s 60 ms gate, filtering, and sort order were not modified.

**Measurement conditions**

- Operation: complete `GET /report` request and body read through the real HTTP server.
- Workload: 5,250 inventory rows, producing 3,700 filtered report records.
- Commands: `node bench.mjs`, `node gate.mjs`, `node profile.mjs`, `npm test`.
- Revision: `ccf950cb8ecde5d25cf9632880c5d07dceaee96c`
- Runtime/platform: Node `v26.13.1`, Linux 6.18.58.1 x86_64.
- Benchmark policy: two warm-ups and seven measured samples. Runs were serialized to avoid CPU contention.

**Raw benchmark samples, milliseconds**

Before:

```text
warm-ups: [154.482, 107.635]
samples:  [120.884, 205.435, 200.683, 200.216, 197.949, 202.131, 199.186]
median:   200.216
p95:      205.435
```

After:

```text
warm-ups: [29.150, 8.031]
samples:  [4.941, 4.392, 4.115, 3.983, 4.152, 3.267, 6.537]
median:   4.152
p95:      6.537
```

The median before/after ratio is **48.2216x**, corresponding to a **97.93% reduction**. This is local benchmark evidence, not a universal performance target.

**Project gate**

The checked-in `PROJECT_MEDIAN_GATE_MS` remains **60 ms**.

- Before: failed at `197.042 ms`.
- After: passed at `4.734 ms` on the gate’s independent benchmark run.

**Profile attribution**

Before:

```text
seenScans:       5,250
regionFilters:   3,700
regionCandidates: 4,856,250
profileEntries:  3,700
```

After:

```text
seenScans:       5,250
regionFilters:   4
regionCandidates: 5,250
profileEntries:  3,700
```

The dominant cost was recomputing regional filtering and unit totals for every unique row. The first change computes those totals once per region. That alone still produced a 62.981 ms gate rerun, so the remaining linear duplicate lookup was replaced with a `Set`. The final production response remains byte-identical:

- 304,461 bytes
- 3,700 records
- SHA-256 `26dc4434f4c5e64af9de9483e4d32211c37881f9a2e646c4d7be2aa0b845193d`
- Same first and last records
- Functional test passed

No output, ordering, or gate-value differences were authorized or introduced. Cold-start latency, concurrent load, and sustained throughput were not measured.
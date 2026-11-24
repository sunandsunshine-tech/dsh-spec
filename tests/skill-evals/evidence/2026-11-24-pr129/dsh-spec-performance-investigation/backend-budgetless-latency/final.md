**Result**

`GET /report` improved from **103.334 ms** to **4.097 ms** median, a **25.22× speedup** and **96.04% reduction**.

Both runs used the existing `bench.mjs` production HTTP path with two warm-ups and seven measured requests. The response remained byte-for-byte identical.

**Raw samples**

Before:

```text
[139.621, 103.334, 104.281, 102.495, 101.624, 101.280, 147.613] ms
median 103.334 ms, range 101.280–147.613 ms
```

After:

```text
[5.334, 5.200, 4.097, 4.513, 3.566, 3.548, 3.793] ms
median 4.097 ms, range 3.548–5.334 ms
```

Ratio: `103.334 / 4.097 = 25.222`.

**Bottleneck and change**

The original profile attributed the largest cost to repeatedly running `items.filter()` and `reduce()` for every unique product-region. After computing regional totals once, the array-based duplicate check became dominant.

In [src/report.mjs](/workspace/evals/files/backend-budgetless/src/report.mjs:13), regional totals are now accumulated in one `Map` pass, and duplicate detection uses a `Set`. First occurrence, filtering, output fields, share calculation, and the final sort comparator are unchanged. The requested profile-first workflow led to removing both confirmed quadratic scans rather than stopping after the first partial improvement.

Workload: 5,250 inventory rows producing 3,700 filtered rows. Runtime: Node v26.13.1 on Linux/WSL2, baseline revision `1360000`.

**Validation**

`npm test` passes. The optimized response has the same 3,700 rows, 304,461 bytes, first/last ordering, and SHA-256:

```text
26dc4434f4c5e64af9de9483e4d32211c37881f9a2e646c4d7be2aa0b845193d
```

These are fresh local, warm, loopback measurements. Cold startup and non-loopback network latency are excluded; no p95 budget or service-level gate was inferred.
**Final decision: optimize.** The redundant scoring loop in [filter.mjs](/workspace/evals/files/frontend-input-to-paint/src/filter.mjs:24) should be replaced, but the change cannot yet be accepted as an input-to-paint improvement because this environment has no browser.

**Input-to-paint:** not measured. `npm run measure` built successfully, then exited with `MISSING_BROWSER`. No Chrome or Chromium was available through `CHROME_PATH`, standard paths, or `PATH`. Following the investigation skill, I did not substitute jsdom or install a browser.

**Operation and workload**

- Revision: `362db14`
- Runtime: Node `v26.13.1`; browser unavailable
- Action: dispatch `light` through a real browser input event
- Completion: summary/results updated, then two animation frames
- Workload: 3,600 products, normally 900 matches before the top-200 slice
- Excluded: page load, server startup, and browser startup

**Bottleneck and component evidence**

For `light`, the current implementation performs 900 full scans of 3,600 products: 3.24 million item visits and 6.48 million category/color comparisons. The measured component comparison used 21 interleaved, warmed samples:

| Case | Current median (range) | Single-pass scoring median (range) | Improvement |
|---|---:|---:|---:|
| `light` | 19.611 ms (10.858–22.396) | 0.735 ms (0.595–1.105) | 26.7× |
| No-match control `zzzz` | 0.368 ms (0.241–1.070) | 0.405 ms (0.255–0.718) | effectively unchanged |

Raw `light` samples:

```text
current: 18.177 21.041 19.914 10.858 20.640 19.393 19.427 18.633 19.725 19.711
         17.772 19.412 19.611 17.726 19.631 19.680 17.624 22.396 19.989 18.737 21.526
candidate: 1.095 0.613 0.705 0.709 0.796 0.709 0.668 0.682 0.735 0.715 0.595
           1.105 0.674 0.974 0.846 0.787 0.737 0.698 0.779 0.736 0.781
```

The negative control was the unchanged nested-scan implementation in the same process. Reintroducing those scans restored the 19.6 ms component latency; removing them accounted for essentially the entire difference.

**Behavior and checks**

- The candidate matched the current output exactly for empty, trimmed, mixed-case, single-token, multi-token, matching, and no-match queries.
- Category/color totals are computed once per non-empty result and added as the same constant to every score, preserving ranking and ID tie-breaking.
- No cache, retained state, or invalidation concern is introduced.
- `npm test` passes.
- No production files were modified; the worktree remains clean.

The implementation decision is to add an exact large-corpus regression check, then replace the nested scoring scan with single-pass aggregation. Acceptance still requires an interleaved browser run using `CHROME_PATH=/path/to/chrome npm run measure`, with the optimization retained only if the real input-to-paint result improves beyond run noise.
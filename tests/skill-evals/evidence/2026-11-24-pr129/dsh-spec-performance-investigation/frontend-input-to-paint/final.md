Optimized and verified. The bottleneck was the scoring loop in [filter.mjs](/workspace/evals/files/frontend-input-to-paint/src/filter.mjs:14): it scanned all 3,600 products for each of 900 matches, about 3.24 million candidate visits, even though the resulting score adjustment was identical for every match. The fix computes that invariant once, reducing it to 3,600 visits without changing filtering, scores, ordering, the 200-result limit, or rendering.

## Browser measurements

Workload: real CDP `Input.insertText("light")` into `#query`; 3,600 products; 200 rendered rows. Chrome 159 headless, Node 26.13.1, starting revision `ebffcfa`, local static server. Each side used one warm-up and five samples.

| Measurement | Before | After |
|---|---:|---:|
| Filter phase, median | 25.5 ms | 0.7 ms |
| Browser script time, median | 25.919 ms | 1.033 ms |
| Browser task time, median | 30.261 ms | 5.669 ms |
| Input → first Paint event start | 23.275 ms | 4.628 ms |
| Input → first Paint completion | 24.638 ms | 6.057 ms |
| Input → first Commit | 24.943 ms | 6.384 ms |
| Double-rAF boundary samples | 29.8, 29.2, 31.3, 29.1, 29.6 ms | 25.2, 27.7, 19.9, 22.4, 24.2 ms |
| Double-rAF median | 29.6 ms | 24.2 ms |

The five traced Paint-completion samples were 24.291–25.481 ms before and 4.866–11.012 ms after; one optimized sample missed a rendering opportunity. Layout remained effectively unchanged at 1.591 ms versus 1.597 ms, and style recalculation at 0.476 ms versus 0.465 ms.

The double-rAF marker is deliberately conservative and frame-quantized; it can add a complete frame after the first paint. Browser tracing was therefore used for the actual Paint and Commit boundaries.

## Remaining boundary

No network request occurred during any measured input (`0/5` before and after). All assets were loaded before the warm-up. The remaining latency is browser frame scheduling plus roughly 2 ms of style/layout work; compositor presentation after Commit and physical display latency are outside this trace.

The measurement harness in [measure.mjs](/workspace/evals/files/frontend-input-to-paint/measure.mjs:272) now checks the visible input value, row count, summary, network activity, browser metrics, CPU profiles, and five direct browser traces. Phase timing starts from the browser event timestamp in [app.js](/workspace/evals/files/frontend-input-to-paint/src/app.js:8).

## Verification

`npm test` passes. The optimized implementation matched the original reference output across 60 item-count/query combinations, including case and whitespace normalization, repeated tokens, non-matches, and the production corpus. The browser confirmed exactly 200 visible rows and `200 visible results`. `git diff --check` and syntax checks pass. The decision is to keep the hoist; further row virtualization or search-string precomputation is not justified for this workload.
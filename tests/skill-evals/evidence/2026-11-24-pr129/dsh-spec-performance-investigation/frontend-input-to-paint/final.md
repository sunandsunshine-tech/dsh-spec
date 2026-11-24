Reduced median input-to-visible-result latency from **30.0 ms to 22.0 ms** and DOM availability from **25.8 ms to 1.1 ms**. The remaining time is browser frame scheduling/rendering, not network or application scripting.

Built and measured with `npm run measure`, using Chrome for Testing 159 via CDP `Input.insertText` against the built static app. Workload: type `light`, then wait through the visible-result update. One warm-up plus five measured samples per side.

| Phase | Baseline | Optimized |
|---|---:|---:|
| Input to visible result | 30.0 ms | **22.0 ms** |
| Event to updated DOM | 25.8 ms | **1.1 ms** |
| Script CPU | 25.7 ms | **1.0 ms** |
| Style CPU | 0.47 ms | 0.44 ms |
| Layout CPU | 1.58 ms | 1.49 ms |
| Resource requests | 0 | 0 |

Baseline visible samples were `[30.9, 31.7, 30.0, 29.0, 29.2] ms`; optimized samples were `[20.3, 22.0, 24.6, 27.0, 19.7] ms`.

The dominant phase was scripting. For `light`, the old scoring loop scanned all 3,600 products again for each of 900 matches—about 3.24 million iterations—even though the token bonus was identical for every match. [filter.mjs](/workspace/evals/files/frontend-input-to-paint/src/filter.mjs:19) now computes that token contribution once, preserving the original displayed scores, repeated-token behavior, filtering, ordering, and 200-row limit.

A controlled reintroduction of the old loop restored scripting to `25.7 ms` and total latency to `30.0 ms`. The owning test passes, syntax checks pass, and seven query fingerprints exactly match their pre-change outputs.

The remaining **20.9 ms median** (`18.7–26.1 ms`) occurs after the DOM is updated while [measure.mjs](/workspace/evals/files/frontend-input-to-paint/measure.mjs) waits through its nested `requestAnimationFrame` completion boundary. Every sample recorded zero resource requests during input, so there is no steady-state network boundary here. Results are from headless Linux Chrome with GPU disabled and loopback serving, so this is not a hardware-specific device latency claim. Further optimization would target the 200-row render path, but current evidence does not justify broadening this change.
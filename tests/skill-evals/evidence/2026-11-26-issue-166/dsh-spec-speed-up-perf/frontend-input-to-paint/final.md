Reduced warmed input-to-visible latency from **29.7 ms to 17.8 ms median**, a **40% reduction (1.67x faster)**. All samples rendered and verified 200 visible rows.

| Measurement | Before | After |
|---|---:|---:|
| Input-to-visible samples | 29.7, 25.7, 38.7, 39.2, 25.7 ms | 22.4, 19.6, 17.8, 17.0, 17.3 ms |
| JavaScript | 25.35 ms | 1.29 ms |
| Style | 0.52 ms | 0.53 ms |
| Layout | 2.07 ms | 2.14 ms |
| Browser task time | 31.30 ms | 7.25 ms |
| `filterProducts` CPU self time | 9.65 ms | 0.50 ms |

The dominant cost was score calculation. Each of 900 matching products rescanned all 3,600 products for every query token: about 3.24 million iterations for `light`. [filter.mjs](/workspace/evals/files/frontend-input-to-paint/src/filter.mjs:19) now computes category/color frequencies once per query and performs a lookup per token. Matching, score semantics, ranking, result cap, and DOM behavior remain unchanged.

[measure.mjs](/workspace/evals/files/frontend-input-to-paint/measure.mjs:162) now measures real `Input.insertText`, starts at the browser `input` event, captures script/style/layout/task metrics, CPU-profiles the filter, waits through two animation frames, and verifies the rendered result DOM. [input-behavior.test.mjs](/workspace/evals/files/frontend-input-to-paint/tests/input-behavior.test.mjs:16) also verifies the original scoring formula.

The remaining boundary is rendering, not network: search performs no request after input. Initial `/app.js` and `/filter.mjs` loads measured about 2.2 ms each and occur before interaction. After optimization, about **10.6 ms per update** remains outside measured browser task time waiting for frame scheduling; style and layout account for roughly 2.7 ms, and direct compositor paint timing was not traced.

No performance gate was added. The original nested scan served as the negative control. Chrome for Testing 145 required a temporary single-process launcher because its installed crashpad helper lacked execute permission, so the timings are comparative and observational rather than CI thresholds. `npm test`, `npm run build`, and `git diff --check` passed; no visible differences were introduced.
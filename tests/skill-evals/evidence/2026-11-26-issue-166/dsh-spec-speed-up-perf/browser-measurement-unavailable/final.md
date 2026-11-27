**Final decision: do not approve an optimization today.** The required browser measurement could not run, so there is no evidence to compare a change against.

- **Operation:** Type `light` into `#query`, then wait for the filtered results to become visible.
- **Command:** `TMPDIR=/workspace/evals/files/frontend-input-to-paint npm run measure`
- **Result:** `MISSING_BROWSER`, exit code 1. No Chrome or Chromium exists at `CHROME_PATH`, standard commands, or conventional install locations.
- **Environment:** Linux x64 WSL2, Node `v26.13.1`, npm `11.20.0`.
- **Samples/gate:** None captured; the project defines no performance gate.
- **Behavior check:** `npm test` passes.
- **Worktree:** Clean; generated build/cache artifacts were removed.

The likely bottleneck is the full product scan performed for every matched product at [filter.mjs](/workspace/evals/files/frontend-input-to-paint/src/filter.mjs:24). For a `light` query, that implies roughly 900 matched products × 3,600 candidates, about 3.24 million candidate checks per input. That remains a source hypothesis, not a measured attribution.

The existing harness also starts timing inside the `input` handler and ends after two animation frames at [app.js](/workspace/evals/files/frontend-input-to-paint/src/app.js:9), so it is an input-handler-to-visible-update approximation rather than a trace-confirmed paint timestamp.

No files were changed. To revisit the decision without violating the no-install constraint, expose an already-installed Chrome/Chromium through `CHROME_PATH`, then capture a baseline and negative control before accepting the nested-scan optimization.
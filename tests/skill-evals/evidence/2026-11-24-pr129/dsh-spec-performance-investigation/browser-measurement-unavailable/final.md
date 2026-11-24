**Final decision: no-ship today.** The actual browser input-to-paint latency is not measurable on this host because Chrome/Chromium is unavailable, so `npm run measure` exits with `MISSING_BROWSER`. The evidence strongly favors one optimization, but it lacks the required end-to-end proof.

**Operation and completion:** Typing `light` into the built search page, completing when the filtered rows and summary are visible. The current harness starts timing inside the `input` handler and stops after two animation frames, so it is also only an approximation of input-to-paint.

**Revision, runtime and workload:** `d4a1d47aecf9a169e627cd3f1fa840ba7aebe0e8`; Node `v26.13.1`; 3,600 products; 900 matches before the top-200 limit; 200 rendered rows.

**Baseline samples and aggregate:** Direct production `filterProducts` execution, component-only:

- Raw ms: `12.486, 11.807, 12.553, 12.246, 11.850, 11.899, 11.883, 12.070, 12.275, 12.467, 12.145`
- Median: **12.145 ms**
- Range: **11.807–12.553 ms**
- Three warm-ups and 11 measured samples.

**Candidate samples and aggregate:** Temporarily tested behavior-equivalent category/color count precomputation:

- Raw ms: `0.884, 0.453, 0.795, 0.700, 0.460, 0.666, 0.491, 0.698, 0.462, 0.748, 0.450`
- Median: **0.666 ms**
- Range: **0.450–0.884 ms**
- Median reduction: **18.2×**

**End-to-end result:** Unavailable. The browser harness could not launch. No input dispatch, style/layout, paint, or event-handler latency was measured, so the 18.2× figure must not be presented as an input-to-paint improvement.

**Bottleneck and change:** [filter.mjs](/workspace/evals/files/frontend-input-to-paint/src/filter.mjs:25) rescans every product for every match and token. Query `light` causes 3.24 million inner item visits and 6.48 million equality checks. The viable optimization is to count category and color frequencies once per filter call, then use constant-time lookups when scoring matches.

**Behavior and resource evidence:** The temporary candidate produced exactly the same serialized results for ten empty, case-varied, whitespace-varied, single-token, and multi-token queries. Separate category/color maps preserve behavior even if those names overlap. It introduces no cache, retained state, or lifecycle changes.

**Negative control:** Re-running the old implementation interleaved with the candidate consistently reproduced the roughly 12 ms component cost, separating it from process drift.

**Checks:** `npm test` passed `1/1`; build completed successfully; `git diff --check` passed. No product source was changed, temporary artifacts were removed, and the worktree is clean.

**Exclusions and remaining risk:** The host has no browser at `CHROME_PATH` or the standard locations in [measure.mjs](/workspace/evals/files/frontend-input-to-paint/measure.mjs:85). I did not install a substitute. Browser event delivery, scripting adjacent to the filter, DOM construction, style/layout, compositing, and paint remain unmeasured. Even with a browser, the current harness needs trace-level timing from dispatched input to a painted frame rather than starting inside [app.js](/workspace/evals/files/frontend-input-to-paint/src/app.js:8).

**Decision and follow-ups:** Hold the production optimization. When an existing Chrome/Chromium executable is supplied, first run interleaved baseline/candidate traces from input dispatch to painted frame. If the count precomputation produces a reduction beyond baseline noise without changing output, approve that change. Pre-normalizing search strings is the next candidate; debouncing is not recommended because it adds first-response latency, and virtualization is unsupported by current paint evidence.
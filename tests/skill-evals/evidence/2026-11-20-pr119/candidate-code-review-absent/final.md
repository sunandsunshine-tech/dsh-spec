**Findings**

1. **Blocker — existing failure identity and detail are discarded.** [worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:1) replaces the failure with `{ message }`, dropping the project-required `kind` identity and structured `detail` from [AGENTS.md](/workspace/project/evals/files/review-integration/AGENTS.md:4). Keep both fields intact across the worker boundary.

2. **Blocker — failure routing depends on message prose.** [worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:6) checks for `"permission"` inside `result.message`. Wording changes can misroute failures. Route on the existing `kind` value and use `detail` for structured context.

**Incomplete evidence**

The passing [consumer test](/workspace/project/evals/files/review-integration/tests/button-consumers.test.mjs:7) proves the markup classes and disabled attribute, not the rendered Settings saving state. With no screenshot or browser-control capability available, that visual state and the 390 CSS-pixel consumer appearance remain unverified.

Resume by running the app, then capturing one isolated continuous recording—or project-approved labeled screenshots—covering Search and Settings in both settled and `?saving=1` states at comparable widths. The review should remain incomplete until that evidence is inspected.
Selected minimum evidence: one focused consumer test plus two worker-boundary probes. No sibling guidance, screenshot, or browser-control capability was used.

- `npm test` PASS: `1/1` for the shared Button/Settings markup test in [button-consumers.test.mjs](/workspace/project/evals/files/review-integration/tests/button-consumers.test.mjs:6).
- Worker metadata boundary FAIL: a failure containing `kind: "permission"` and `detail: { resource: "settings" }` projects to `{ message: "Access denied" }`. [worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:1) drops the existing machine identity and structured detail.
- Kind-based routing boundary FAIL: `{ kind: "permission", message: "service unavailable" }` classifies as `"retry"` rather than `"request-access"`. [worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:6) therefore routes on message text.

The Settings state does change in generated markup: `saving` disables Delete account in [SettingsPage.js](/workspace/project/evals/files/review-integration/src/SettingsPage.js:3), and `?saving=1` reaches that state through [app.js](/workspace/project/evals/files/review-integration/src/app.js:6). The consumer test verifies markup only; it is not rendered-UI acceptance.

Unfinished check: Settings saving/disabled rendered evidence is unavailable. The declared `evidence` script targets a missing `capture-browser.mjs`, and no browser control or current-build screenshot exists. Next step: in a browser-capable isolated run, render `/?saving=0` and `/?saving=1` at the supported 390 CSS-pixel viewport, capture the required continuous recording or a declared screenshot override, and verify that Delete account becomes disabled while the shared Button remains intact across both consumers.

Working tree remains clean; no files were changed.
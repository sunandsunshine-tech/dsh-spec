Reviewed `HEAD^..HEAD` with [dsh-spec-code-review](/workspace/.agents/skills/dsh-spec-code-review/SKILL.md). Two blockers remain.

1. **[P1] Preserve worker failure identity and detail.** [worker-client.js](/workspace/evals/files/review-integration/src/worker-client.js:3) now returns only `message`, dropping `kind` and `detail`. This violates the project contract in [AGENTS.md](/workspace/evals/files/review-integration/AGENTS.md:4), prevents downstream consumers from using the stable machine identity, and makes the new boundary test fail.

2. **[P1] Classify failures by `kind`, not human-readable text.** [worker-client.js](/workspace/evals/files/review-integration/src/worker-client.js:7) uses `message.includes('permission')`. I reproduced `{ kind: 'permission_denied', message: 'Access denied' }` returning `retry`. The test at [worker-boundary.test.mjs](/workspace/evals/files/review-integration/tests/worker-boundary.test.mjs:17) misses this because its message happens to contain lowercase `"permission"`.

Rendered Settings saving-state evidence is explicitly incomplete. The shared-button changes in [button.module.css](/workspace/evals/files/review-integration/src/button.module.css:2) affect both Search and Settings, but no recording, screenshot override, rendered screenshot, or browser-control capability is available. This state is unreviewed, not passed.

The smallest resumable capture step is: start the app, set a 390 CSS-pixel viewport, open `/?saving=1`, and capture the Settings panel showing the enabled Cancel button and disabled Delete account button.

`npm test` result: 1 passed, 1 failed. Git status remains clean.
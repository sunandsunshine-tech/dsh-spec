Decision: **blocked**. The candidate regresses the declared worker-error contract, fails its own new test, and its rendered evidence does not cover all required states.

**Blockers**

1. **Worker failures lose their machine identity and are routed by display text.** [worker-client.js:3](/workspace/evals/files/review-integration/src/worker-client.js:3) drops `kind` and `detail`; [worker-client.js:7](/workspace/evals/files/review-integration/src/worker-client.js:7) then classifies by searching `message` for `"permission"`. This directly violates [AGENTS.md:4](/workspace/evals/files/review-integration/AGENTS.md:4). A negative check confirmed `permission_denied` with message `"Access denied"` becomes `retry`, while a non-permission failure mentioning permission becomes `request-access`. Message wording or localization can therefore change recovery behavior.

2. **The new boundary test is red and does not isolate the routing defect.** `node --test tests/*.test.mjs` reports one failure: the assertion at [worker-boundary.test.mjs:16](/workspace/evals/files/review-integration/tests/worker-boundary.test.mjs:16) observes the dropped `kind` and `detail`. Additionally, its message contains `"permission"` at line 11, so once projection is fixed, the existing text-based router would still pass the classification assertion. A `permission_denied` case whose message lacks that word, plus a misleading-message/non-permission-kind case, is needed to prove identity-based routing.

3. **Required rendered-state coverage is incomplete.** The declared screenshot override is valid at [change-evidence.md:3](/workspace/evals/files/review-integration/change-evidence.md:3), so a recording is not required. However, the 768×900 [settings-after.png](/workspace/evals/files/review-integration/evidence/settings-after.png) shows only normal, desktop-width states. Because the shared base selector at [button.module.css:1](/workspace/evals/files/review-integration/src/button.module.css:1) changes every button variant, [AGENTS.md:5](/workspace/evals/files/review-integration/AGENTS.md:5) requires coverage of the affected disabled and focus states and the supported 390px narrow viewport.

**Coverage**

- **Proved consumers:** source tracing finds only `SearchPage` and `SettingsPage` importing the shared button. The assembled screenshot shows both at desktop width, including primary Search, secondary Cancel, and destructive Delete account without clipping.
- **Unproved states:** disabled Delete account, genuine keyboard `:focus-visible`, and the 390px responsive layout.
- **Unproved error behavior:** identity preservation is currently failing. Non-keyword permission messages and misleading messages are not covered.
- Only a light theme is declared, so no theme variant is missing.

`git diff --check` passed. The candidate is HEAD `6077551` against base `f73f3e4`; the worktree remained clean and no files or Git state were modified.
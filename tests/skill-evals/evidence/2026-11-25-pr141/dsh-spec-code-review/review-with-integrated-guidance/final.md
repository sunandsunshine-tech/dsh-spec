Not ready to land. The change has two worker-contract blockers and incomplete required rendered-state coverage.

### Blockers

1. **Worker identity and structured detail are discarded.** [worker-client.js](/workspace/evals/files/review-integration/src/worker-client.js:1) projects only `message`, removing `kind` and `detail`. This violates the declared contract in [AGENTS.md](/workspace/evals/files/review-integration/AGENTS.md:4) and causes the new regression test to fail. `npm test` exits 1 with `{ message: 'permission problem' }` instead of the expected object containing `kind` and `detail`.

2. **Failure classification routes on display text.** [worker-client.js](/workspace/evals/files/review-integration/src/worker-client.js:6) uses `message.includes('permission')` instead of the stable `kind`. Direct probes confirmed both failure directions:

   - `permission_denied` with `"Access denied"` becomes `retry`.
   - `network_error` with `"permission service unavailable"` becomes `request-access`.

   Consumers can therefore choose the wrong recovery action. Classification must use the declared machine identity.

3. **The screenshot override does not cover all required affected states.** The 768×900 light-theme screenshot is consistent with the candidate geometry and proves the assembled desktop/default state for all three shared-button tones: Search/primary, Cancel/secondary, and Delete account/danger. It does not prove the supported 390-pixel narrow layout, the reachable disabled `saving=1` state, or an authentic focused state. [change-evidence.md](/workspace/evals/files/review-integration/change-evidence.md:3) and [AGENTS.md](/workspace/evals/files/review-integration/AGENTS.md:6) require affected consumers and states under comparable conditions. The `focus=1` data-attribute imitation would not constitute authentic focus evidence.

### Coverage summary

- Proved: both assembled consumers and all three button tones on desktop; both components resolve through `buttonMarkup`; the button-consumer test passes.
- Unproved: 390-pixel reflow, disabled appearance/touch behavior, and genuine keyboard focus.
- Worker test coverage: the added assertion correctly demands preservation of `kind` and `detail`, but the implementation fails it.
- Negative classification coverage: absent; no passing case proves that message text cannot alter classification.

The worktree remains clean, and `git diff --check` reports no formatting errors.
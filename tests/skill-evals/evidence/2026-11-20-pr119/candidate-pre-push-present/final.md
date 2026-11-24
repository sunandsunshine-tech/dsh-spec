The branch is not push-ready. The smallest defensible evidence set is one focused worker-boundary test plus reuse of the supplied screenshot, but the boundary test currently fails while the screenshot covers only the enabled state.

**Selected boundary evidence**

At [worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:1), the focused check must assert:

- `projectWorkerFailure()` preserves the existing `kind` identity and structured `detail`.
- A `permission-denied` failure with the message “Try again” routes to `request-access`.
- A `transient` failure whose message happens to contain “permission” routes to `retry`.

This proves routing uses `kind`, not display text. My focused probe failed all three cases: the projection returned neither `kind` nor `detail`, and message-based classification selected `retry`.

**Selected rendered evidence**

I inspected [settings-after.png](/workspace/project/evidence/settings-after.png). The 768×900 image shows the assembled desktop surface with both consumers: a primary Search button, secondary Cancel, and enabled destructive Delete Account button. It is byte-identical to the fixture copy.

It does not show `saving=1`; Delete Account appears enabled. Therefore the disabled appearance and behavior remain unproved. The screenshot also does not establish the project’s declared 390 CSS-pixel layout.

The consumer test passes 1/1, but [button-consumers.test.mjs](/workspace/project/evals/files/review-integration/tests/button-consumers.test.mjs:7) only checks markup and is not visual acceptance.

Before completion, rerun the focused boundary test after correcting [worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:1), then capture the missing assembled `?saving=1` Settings state from this same build under comparable conditions. The installed sibling guidance informed the evidence selection only; no generic sibling commands were substituted for repository-specific evidence.
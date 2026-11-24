The change is not ready to push: the selected test suite fails on the worker failure contract.

**Selected checks**

| Evidence | Result |
|---|---|
| `change-scope.mjs --base HEAD^ --head HEAD` | Scope confirmed: exactly [button.module.css](/workspace/evals/files/review-integration/src/button.module.css), [worker-client.js](/workspace/evals/files/review-integration/src/worker-client.js), and [worker-boundary.test.mjs](/workspace/evals/files/review-integration/tests/worker-boundary.test.mjs). |
| `git diff --check HEAD^ HEAD -- .` | Passed; no whitespace errors. |
| `npm test` | **Failed, 1 of 2 tests.** The existing button-consumer test passed. The worker-boundary test failed because the projection returns `{ message: 'permission problem' }`, dropping `kind: 'permission_denied'` and `detail.scope`. |
| [settings-after.png](/workspace/evals/files/review-integration/evidence/settings-after.png) | Inspected as the declared evidence override. The 768×900 screenshot shows both assembled consumers, with Search, Cancel, and Delete account using the shared button component. |

**Coverage still unproved**

- The worker-boundary test catches the immediate loss of `kind` and `detail`, but does not establish message-independent classification. Its message already contains `"permission"`, so restoring the projection alone could leave the text-based classifier undetected.
- There is no negative-control evidence for a permission failure with neutral message text, or a non-permission failure whose message happens to contain `"permission"`.
- Missing-worker-error fallback and downstream user-visible failure reporting were not exercised.
- The screenshot covers the wide default state only. The project’s supported 390px viewport, responsive transition, disabled action, focus-visible state, long/localized labels, and before comparison remain unproved.
- The existing consumer test confirms component reuse, not rendered geometry or visual acceptance.

No files or Git state were modified; the worktree remains clean.
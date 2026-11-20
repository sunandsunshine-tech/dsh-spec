Define this as `WRITE_OUTCOME_UNKNOWN`, a first-class uncertain-completion state rather than either success or failure.

| Contract area | Requirement |
|---|---|
| Machine identity | Stable code `WRITE_OUTCOME_UNKNOWN`, with structured details such as `operation_id`, `idempotency_key`, `resource_id`, and `commit_state: "unknown"`. Preserve the underlying cause, but never route behavior by parsing display text. |
| Unknown state | The write may or may not have committed. Clients must not claim success, assert rollback, or retry blindly. Keep the operation ID and idempotency key until authoritative reconciliation resolves the state. |
| Visible report | Show a persistent, accessible warning: **“We couldn’t confirm whether this change was completed. It may still have taken effect. Check its status before trying again.”** Identify the affected operation and provide “Check status,” not an unrestricted “Retry.” |
| Safe next action | Query the server by `operation_id`. If committed, resolve as success without retrying. If definitely not committed, retry with the same idempotency key. If status cannot be obtained, remain `unknown`, stop dependent work, and escalate rather than issuing another write. |

Only two authoritative resolutions are valid: `committed` or `not_committed`. Until one is established, the system must preserve the unresolved identity and report the uncertainty visibly.
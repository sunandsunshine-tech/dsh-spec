Use the service’s existing numeric status as the canonical machine identity. The provider adapter classifies the failure; callers and retry code must not parse messages or rediscover semantics from the raw HTTP code.

A practical contract is:

```text
ServiceFailure
  status: ServiceStatus          required, existing numeric value
  operation: string              required
  provider_http_status: 409|503  structured detail
  retry_mode: never|transient|reconcile_then_retry
  retry_after?: duration
  cause?: error
```

If the existing numeric statuses already encode retry behavior, reuse that policy and omit `retry_mode`. Do not map both HTTP statuses to one generic numeric status if their handling differs.

| Provider response | Service status | Default retry contract |
|---|---|---|
| HTTP 409 | Existing `Conflict` numeric value | `reconcile_then_retry`: do not blindly replay the request. Reconcile state first, then retry only when the operation is idempotent or uses the same idempotency key and the provider’s API explicitly treats 409 as a concurrent-operation condition. |
| HTTP 503 | Existing `Unavailable` numeric value | `transient`: retry subject to a finite budget. Honor `Retry-After`; otherwise use capped exponential backoff with jitter. Auto-retry only an idempotent operation or one carrying an idempotency key. |

The provider adapter owns conversion and must retain HTTP 409/503 and the original cause as details. The numeric status remains stable across persistence, process boundaries, retry decisions, analytics, and UI projections.

Retry logic also needs an explicit owner, cancellation support, an attempt budget, and idempotency protection. A 409 should leave the operation unresolved until reconciliation. A 503 whose retries are exhausted must remain a visible `Unavailable` failure; it must not become success or silently disappear. Neither response permits claiming that the provider-side mutation did not occur.

User-facing reports should name the operation, state the impact or uncertainty, and give a safe next step without exposing provider internals. Tests should assert the exact numeric status, preserved provider status, retry mode, retry count and backoff behavior, cancellation, idempotency-key reuse, boundary serialization, and the final visible error after exhaustion.
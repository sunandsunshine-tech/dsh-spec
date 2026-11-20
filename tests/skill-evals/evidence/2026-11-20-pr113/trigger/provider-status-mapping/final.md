Map both responses to the service’s existing numeric provider-failure status. Preserve the original HTTP status and retry decision as structured metadata so the numeric status remains backward-compatible without becoming the retry policy.

Use one owning `ProviderFailure` at the HTTP-adapter boundary:

```text
ProviderFailure {
  status: <existing numeric status>
  providerStatus: 409 | 503
  retryable: boolean
  retryAfterMs?: number
  outcome: NOT_APPLIED | APPLIED | UNKNOWN
  operation: string
  cause: original transport failure
}
```

`retryable` means “it is safe to issue this operation again,” not merely “the provider returned a transient code.”

| Provider response | Numeric status | Retry behavior | Required caller action |
|---|---|---|---|
| HTTP 409 Conflict | Existing numeric status, unchanged | Not automatically retryable by default | Refresh/reconcile state, then resubmit under a new precondition or version |
| HTTP 503 Service Unavailable | Existing numeric status, unchanged | Safe requests retry with bounded exponential backoff and jitter; honor valid `Retry-After` | Retry later; reconcile if the operation could have committed |

For 409, only retry when the provider explicitly documents the conflict as transient and safe repetition is guaranteed. Otherwise, a blind retry will usually reproduce the conflict.

For 503, retry only when the operation is idempotent or carries an idempotency key. A mutating request without that guarantee should not be transparently repeated: its commit outcome may be `UNKNOWN`. Surface that uncertainty instead of claiming failure or success.

Classification must happen before final numeric-status mapping. The retry executor reads `retryable`, not the numeric status or message text. On exhaustion, retain the last `providerStatus`, attempt count, and `retryExhausted: true`.

At service or wire boundaries, preserve `status`, `providerStatus`, `retryable`, `retryAfterMs`, `outcome`, and a correlation ID. Keep the raw cause for diagnostics but do not serialize provider bodies, credentials, or sensitive internal details. Callers must not infer failure class by parsing the message.

The visible messages should differ by cause:

- 409: “The request conflicted with current provider state. Refresh the resource and try again.”
- 503: “The provider is temporarily unavailable. Retry later,” optionally noting that automatic retries were exhausted.

Tests should assert both exact numeric mappings, preservation of 409/503, no automatic retry for 409, bounded retries and cancellation for 503, `UNKNOWN` outcome for unsafe mutations, and round-trip preservation of the portable failure fields. The existing numeric value remains a compatibility promise; the new metadata is additive.

This uses the error-contract guidance to keep the numeric discriminator stable while treating retryability, commit outcome, raw provider status, and cause as separate responsibilities.
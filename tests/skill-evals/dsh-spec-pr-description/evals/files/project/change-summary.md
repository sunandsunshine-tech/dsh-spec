# Retry cap

This is the top layer of a two-layer stack.

- Interface change: `HttpClientOptions.maxAttempts` accepts `1 | 2 | 3` and defaults to `3`.
- Behavior change: only idempotent GET and HEAD requests retry, with no retry after a non-retryable response.
- Test evidence: `npm test` passed 2 tests locally.
- The lower layer added retry telemetry and is already described there. Do not copy its work into this layer.

# Write coordinator

`WriteCoordinator` is exported from [`src/coordinator.ts`](../src/coordinator.ts). Its constructor
accepts a backend with `write(sessionId, event)` and `flushBufferedEvents()`; both backend methods
return `Promise<void>`.

`write(sessionId, event)` serializes writes within a session and preserves their submission order.
Its promise resolves after the corresponding backend write resolves. Writes in different sessions
may complete independently. Cross-session serialization is intentionally absent, so a slow backend
write in one session does not block another session.

## Disposal

Calling `dispose()` immediately places the coordinator in its closing state. Later calls to
`write()` reject with an `Error` whose message is exactly `coordinator is closing`.

On the successful path, writes accepted before disposal complete before buffered events are
flushed. `dispose()` resolves only after that flush completes. If the backend rejects the flush,
`dispose()` rejects with the same backend error.

## Write failures

If the backend rejects a write, the coordinator reports the same backend error to the caller that
submitted the write and does not retry. Writes already queued behind the failed write in the same
session reject with the same backend error without reaching the backend.

If an accepted write rejects during disposal, `dispose()` rejects with that backend error and does
not reach the buffered-event flush.

## Stability

The public API is unstable and makes no compatibility guarantee.

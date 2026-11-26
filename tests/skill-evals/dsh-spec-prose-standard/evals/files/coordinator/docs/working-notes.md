# Working notes

I started by reading the queue implementation and considered a global mutex. We rejected it during
review because an unrelated slow session would block every other session, so this change uses one
write chain per session.

The load-bearing facts for the page:

- Writes are serialized per session. Each session preserves its own ordering, and writes from
  different sessions may complete independently. The absence of cross-session serialization is
  intentional: a slow backend in one session must not block another session.
- Once disposal starts, new writes are rejected with an `Error` whose message is
  `coordinator is closing`. Already accepted writes drain first; buffered events are then flushed
  before the disposal promise resolves.
- If the backend rejects the buffered-event flush, `dispose()` rejects with that same backend error.
- If the backend rejects a write, the coordinator preserves that backend error and reports it to
  the caller that submitted the write. It does not retry. Writes already queued behind the failed
  write in the same session reject with that same backend error without reaching the backend.

I first thought the README also needed an inventory of every helper in the class. Review said to
link the source instead and keep only the caller contract. The public API is unstable and makes no
compatibility guarantee.

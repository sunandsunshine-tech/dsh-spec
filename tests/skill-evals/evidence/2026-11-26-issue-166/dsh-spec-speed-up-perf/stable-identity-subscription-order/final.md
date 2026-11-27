**Diagnosis**

The store has only collection-scoped subscriptions. Every update broadcasts one fresh snapshot to every listener:

- [store.mjs](/workspace/evals/files/stable-identity-subscription/src/store.mjs:23) rebuilds the entire `rows` array with `.map()` and clones every row.
- [store.mjs](/workspace/evals/files/stable-identity-subscription/src/store.mjs:12) clones every row again when creating the snapshot.
- [store.mjs](/workspace/evals/files/stable-identity-subscription/src/store.mjs:26) sends that full snapshot to every collection listener.

Consequently, editing `south` changes the object identity of `north` and `west` too, and delivers the complete collection. A renderer consuming this event cannot preserve unchanged memoized rows because every row reference changed.

At commit `fa12034`, using Node `v26.13.1`, `npm run diagnose` confirmed that all three rows changed identity and `retainedIdentityByRow` was false for all three. The existing test passes, but it only checks collection delivery, ordering, and whole-collection teardown.

**Smallest design**

Keep the collection listener API for compatibility, but add one per-ID listener registry and move the row renderer to it.

- `subscribeRow(id, listener)` obtains or creates `rowListeners.get(id)`, adds the listener, immediately invokes it with `{ revision, row: currentRow }`, then returns an unsubscribe closure.
- The unsubscribe deletes only that listener from its captured ID bucket and removes an empty bucket. It cannot touch another ID’s listeners.
- `updateLabel` finds the target index, shallow-copies the array, and replaces only that one row with a new object. All other row objects retain identity.
- Increment `revision` once, then synchronously notify only the target ID’s listeners in insertion order. This preserves row order, revision order, and listener-registration order.
- Snapshot iteration before notification so unsubscribing during delivery does not disrupt that update.

The collection `subscribe()` remains broad unless its consumers are also changed. Therefore, the row UI must actually subscribe per row; adding the API without switching the consumer does not fix the rerender breadth. No collection-wide row cloning is involved in the scoped path.

**Falsifiable check**

Subscribe `north`, `south`, and `west` separately and capture their initial events and original row references:

1. Immediately after subscribing, each listener count must be `north=1, south=1, west=1`. This verifies immediate initial delivery.
2. After `updateLabel('south', …)`, counts must be `north=1, south=2, west=1`.
3. IDs must still be `['north', 'south', 'west']`; `north` and `west` must be reference-equal to their originals; `south` must not be.
4. Unsubscribe `north`, edit `south` again, and require `north=1, south=3, west=1`.
5. Unsubscribe `south`, edit `north`, and require `north=1, south=3, west=1`.

The current implementation fails at the scoped API and produces broad invalidation instead. The design passes only if unrelated counts and references remain unchanged while the target row advances in revision order. This diagnoses emitted invalidation breadth; the fixture contains no browser renderer, so paint/render timing is not measured. No files were changed.
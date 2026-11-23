# Cleanup handler

The completion path removes one temporary directory, then commits a batch and notifies the owner.
A missing temporary directory is the only safe cleanup failure.

```js
try {
  await removeTemporaryDirectory()
  await commitBatch()
  await notifyOwner()
} catch (_) {
  // ignore
}
```

The project represents a missing path with the existing `ENOENT` code on its structured failure.

# Cleanup handler

The completion path removes one temporary directory, then commits a batch and notifies the owner.
A missing temporary directory is the only safe cleanup failure.

```js
try {
  await removeTemporaryDirectory()
} catch (_cleanupFailed) {
  if (_cleanupFailed.code !== 'ENOENT') {
    throw _cleanupFailed
  }

  // The directory is already absent, so cleanup leaves the owner's state valid.
}

await commitBatch()
await notifyOwner()
```

The project represents a missing path with the existing `ENOENT` code on its structured failure.

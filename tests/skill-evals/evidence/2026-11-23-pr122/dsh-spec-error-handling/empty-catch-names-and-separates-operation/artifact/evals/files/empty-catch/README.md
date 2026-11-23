# Cleanup handler

The completion path removes one temporary directory, then commits a batch and notifies the owner.
A missing temporary directory is the only safe cleanup failure.

```js
try {
  await removeTemporaryDirectory()
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error
  }
  // A missing temporary directory means cleanup is already complete.
}

await commitBatch()
await notifyOwner()
```

The project represents a missing path with the existing `ENOENT` code on its structured failure.

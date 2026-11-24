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

  // The temporary directory is already absent, so cleanup is complete.
}

await commitBatch()
await notifyOwner()
```

The project represents a missing path with the existing `ENOENT` code on its structured failure.

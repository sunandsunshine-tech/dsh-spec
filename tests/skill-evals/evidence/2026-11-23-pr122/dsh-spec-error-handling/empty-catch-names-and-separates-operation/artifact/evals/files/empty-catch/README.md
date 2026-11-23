# Cleanup handler

The completion path removes one temporary directory, then commits a batch and notifies the owner.
A missing temporary directory is the only safe cleanup failure.

```js
try {
  await removeTemporaryDirectory()
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error
  }

  // The directory is already absent, so cleanup's postcondition holds.
}

await commitBatch()
await notifyOwner()
```

Only a missing temporary directory is safe to suppress. Keep commit and
notification outside the cleanup handler so their failures propagate.

The project represents a missing path with the existing `ENOENT` code on its structured failure.

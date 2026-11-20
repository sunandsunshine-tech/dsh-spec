The smallest safe change is to stop treating cleanup, commit, and notification as one transaction:

```js
try {
  await removeTemporaryDirectory()
} catch (failure) {
  if (failure.code !== 'ENOENT') {
    throw failure
  }
  // Safe: the temporary directory is absent and nothing reads it afterward.
}

await commitBatch()
await notifyOwner()
```

Only the known missing-directory failure is ignored; unexpected cleanup failures propagate. Commit and notification failures propagate with their original identity, so callers no longer receive false success.

Use the project’s existing missing-directory discriminant rather than inspecting the message. A notification failure after a successful commit should remain identifiable as “committed, notification failed” so a retry does not repeat the commit.
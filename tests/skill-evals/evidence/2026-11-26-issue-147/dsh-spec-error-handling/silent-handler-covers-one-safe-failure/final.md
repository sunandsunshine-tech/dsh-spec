The smallest safe change is to narrow the catch to the one tolerated cleanup failure, then let commit and notification failures propagate.

```js
try {
  await removeTemporaryDirectory()
} catch (failure) {
  if (!isMissingDirectory(failure)) {
    throw failure
  }

  // Safe: this directory is no longer read after cleanup.
}

await commitBatch()
await notifyOwner()
```

`isMissingDirectory` should use the project’s existing error type or discriminant—not message parsing. If the cleanup API already treats a missing directory as success, remove the `try/catch` entirely.

This guarantees that:

| Outcome | Resulting state |
|---|---|
| Missing temporary directory | Cleanup is safely skipped; completion continues. |
| Other cleanup failure | Rejects before commit or notification are attempted. |
| Commit failure | Rejects and does not call the notifier. |
| Notification failure | Rejects after the batch was committed; the operation is not reported as fully successful. |
| Normal return | Cleanup was successful or unnecessary, the batch committed, and notification succeeded. |

This fixes the false-success behavior without adding retries or claiming transactionality. It does not guarantee rollback. In particular, a notification failure means the batch remains committed but unconfirmed as notified; that partial outcome should be visible to the caller. If commit can fail with an indeterminate outcome, the commit API’s contract must determine that state rather than the wrapper assuming rollback.
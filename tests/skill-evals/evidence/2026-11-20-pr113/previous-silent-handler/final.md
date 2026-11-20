The smallest safe change is to narrow the swallowed `catch` to cleanup only:

```js
try {
  await removeTemporaryDirectory()
} catch (_failure) {
  // Best-effort cleanup; completion does not depend on it.
}

await commitBatch()
await notifyOwner()
```

This keeps a cleanup failure from preventing the commit and lets commit or notification failures propagate instead of becoming a false success. One caveat: a notification failure happens after the commit. If callers automatically retry rejected operations, the notification error should indicate that the batch was already committed so only notification is retried, never the commit.
Split the broad `try/catch` so only cleanup remains best-effort:

```js
try {
  await removeTemporaryDirectory()
} catch (_cleanupFailure) {
  // Safe to ignore; the directory is no longer used.
}

await commitBatch()
await notifyOwner()
```

This is the smallest safe change: commit and notification failures now propagate instead of being reported as success. Since a notification can fail after the commit succeeds, the caller should also make retries idempotent to avoid duplicating the commit. See [README.md](/tmp/pr113-eval.FHwx6T/silent-handler-baseline/project/README.md:3).
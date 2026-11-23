# Cleanup handler

Removing the temporary file is best effort. Its owner has no state that depends on the file's
continued existence, and no caller can act on a failure from that removal.

```js
try {
  await unlink(tempFile)
} catch (_cleanupFailed) {
  // Cleanup failure is safe to discard: the owner does not depend on the
  // temporary file's continued existence, and no caller can act on the failure.
}
```

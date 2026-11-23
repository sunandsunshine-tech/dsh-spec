# Cleanup handler

Removing the temporary file is best effort. Its owner has no state that depends on the file's
continued existence, and no caller can act on a failure from that removal.

```js
try {
  await unlink(tempFile)
} catch (_cleanupFailed) {
  // Safe to suppress: the owner's state does not depend on the temporary file,
  // and callers cannot act on a cleanup failure.
}
```

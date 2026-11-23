# Cleanup handler

Removing the temporary file is best effort. Its owner has no state that depends on the file's
continued existence, and no caller can act on a failure from that removal.

```js
try {
  await unlink(tempFile)
} catch (cleanupError) {
  // The temporary file is unowned and not part of this owner's state, so cleanupError
  // is safe to discard.
}
```

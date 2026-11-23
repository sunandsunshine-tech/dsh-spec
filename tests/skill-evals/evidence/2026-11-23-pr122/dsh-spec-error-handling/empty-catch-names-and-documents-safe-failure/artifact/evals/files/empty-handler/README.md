# Cleanup handler

Removing the temporary file is best effort. Its owner has no state that depends on the file's
continued existence, and no caller can act on a failure from that removal.

```js
try {
  await unlink(tempFile)
} catch (cleanupError) {
  // Any `unlink` failure is tolerated: removal is best effort, the owner has no
  // state that depends on the file, and no caller can act on this failure.
}
```

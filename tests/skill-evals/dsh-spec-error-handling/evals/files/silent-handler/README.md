# Batch completion

The completion path discards every failure from three operations:

```js
try {
  await removeTemporaryDirectory()
  await commitBatch()
  await notifyOwner()
} catch (_failure) {
  // ignore
}
```

A missing temporary directory is safe to discard because nothing reads it after this point. A commit or notification failure leaves the caller with a false success, but the handler also discards those failures.

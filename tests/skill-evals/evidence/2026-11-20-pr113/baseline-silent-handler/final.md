The smallest safe change is to isolate cleanup and let commit and notification failures escape:

```js
try {
  await removeTemporaryDirectory()
} catch (failure) {
  if (!isMissingDirectoryError(failure)) {
    throw failure
  }
}

await commitBatch()
await notifyOwner()
```

This ignores only the known-harmless “directory already absent” case. Other cleanup failures stop before commit; commit and notification failures reject the handler instead of producing a false success.

The handler-level guarantee is:

- Success means cleanup was completed or unnecessary, the commit completed, and the owner was notified.
- A non-missing cleanup failure occurs before commit is attempted.
- A failed notification may occur after the commit has already succeeded. The error is now visible, but the handler does not provide all-or-nothing rollback; retry must therefore be idempotent or notification should use an outbox.

This assumes `commitBatch` itself has transactional or otherwise well-defined failure semantics. See [README.md](/workspace/silent-handler-baseline/project/README.md:3).
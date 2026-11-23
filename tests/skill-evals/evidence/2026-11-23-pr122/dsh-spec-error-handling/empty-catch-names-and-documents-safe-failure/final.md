Updated [README.md](/workspace/evals/files/empty-handler/README.md) so the cleanup handler:

- Binds the failure as `_cleanupFailed`.
- Explicitly documents why suppressing it is safe.
- Keeps the handler scoped to the single `unlink` operation.

`git diff --check` passes.
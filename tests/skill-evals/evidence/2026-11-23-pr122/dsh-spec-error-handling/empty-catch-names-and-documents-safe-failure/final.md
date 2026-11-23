Updated [README.md](/workspace/evals/files/empty-handler/README.md) so the handler binds `cleanupError` and documents that any `unlink` failure is safely tolerated because removal is best effort, owner state is unaffected, and callers cannot act on it.

`git diff --check` passes; this is the only modified file.
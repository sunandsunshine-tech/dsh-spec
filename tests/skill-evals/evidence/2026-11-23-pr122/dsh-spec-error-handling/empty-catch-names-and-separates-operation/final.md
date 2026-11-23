Updated [README.md](/workspace/evals/files/empty-catch/README.md:6) so the handler:

- Applies only to temporary-directory removal.
- Ignores only structured `ENOENT` failures.
- Rethrows every other cleanup failure.
- Leaves commit and notification outside the handler so their failures propagate.

`git diff --check` passes.
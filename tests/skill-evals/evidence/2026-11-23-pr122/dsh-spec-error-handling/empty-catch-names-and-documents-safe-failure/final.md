Updated [README.md](/workspace/evals/files/empty-handler/README.md:9) so the handler:

- Binds the caught failure as `cleanupError`.
- Explains that the unowned temporary file is not part of the owner’s state, making safe discarding explicit.

`git diff --check` passes, and only this README changed.
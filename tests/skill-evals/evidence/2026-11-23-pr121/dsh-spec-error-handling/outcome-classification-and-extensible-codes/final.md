Updated [README.md](/workspace/evals/files/outcome-and-extension/README.md) to correct both failure contracts:

- Exit status `1` remains a successful empty search result; other non-zero statuses are command failures.
- `PluginError` remains an open family. Known codes are exported as non-exhaustive, and provider-added codes require generic `PluginError` handling rather than rejection.

`git diff --check` passes.
Updated [README.md](/workspace/evals/files/outcome-and-extension/README.md:3) to:

- Classify exit status `1` as a successful empty search result, while preserving other non-zero statuses as command failures.
- Treat `PluginError` as an open family, export the shared code constants, and rethrow unknown provider codes unchanged instead of reclassifying them as `INCOMPATIBLE`.

This preserves both the documented operation outcome and compatible provider extensions. `git diff --check` passes, and only the README was modified.
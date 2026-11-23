# Search CLI and plugin failures

For the `find` command, classify results by the documented operation outcome:

- Exit status `0` is a successful search.
- Exit status `1` is a successful search with an empty result, not a command failure.
- Any other non-zero status is a command failure.

The plugin API exposes an open `PluginError` family. `LOAD_FAILED` and `INCOMPATIBLE` are shared
known codes, and the package should export their constants so consumers do not duplicate the
literals. These codes are a known subset, not an exhaustive list: third-party hosts may add codes
without changing the shared package.

Consumers should handle the shared codes they understand and rethrow any other `PluginError`
unchanged, preserving its code and any cause or diagnostic details. An unknown provider code must
not be rejected, discarded, or reclassified as `INCOMPATIBLE` merely because it is unknown.

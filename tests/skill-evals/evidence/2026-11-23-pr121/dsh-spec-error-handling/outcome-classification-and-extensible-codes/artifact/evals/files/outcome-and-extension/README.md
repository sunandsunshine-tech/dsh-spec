# Search CLI and plugin failures

## CLI result classification

The `find` command documents exit status `1` as "no matches" and tells scripts to treat that result
as an empty search result. Exit status `1` is therefore a successful search outcome, not a command
failure. Any other non-zero status is a command failure.

## Open plugin error family

The plugin API exposes a shared `PluginError` family with the built-in codes `LOAD_FAILED` and
`INCOMPATIBLE`. The package should export those codes as known values, not as an exhaustive set.
Third-party hosts may add compatible codes without changing the shared package. Consumers may give
known codes specific handling, but must preserve an unrecognized code as a `PluginError` rather than
throw merely because it is unknown.

These corrections preserve both documented operation outcomes: "no matches" remains an empty
search result, and provider-defined plugin failures remain part of the shared `PluginError` family.

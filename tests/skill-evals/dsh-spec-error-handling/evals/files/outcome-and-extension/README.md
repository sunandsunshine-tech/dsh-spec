# Search CLI and plugin failures

The `find` command documents exit status `1` as "no matches" and tells scripts to treat that result
as an empty search result. Any other non-zero status is a command failure.

The plugin API exposes a shared `PluginError` family with known codes `LOAD_FAILED` and
`INCOMPATIBLE`. The package does not export that known list, so consumers duplicate the literals.
Third-party hosts may add codes without changing the shared package. Existing consumers switch on
every currently known code and throw on anything else.

Review both failure contracts and propose the smallest corrections that preserve the documented
operation outcomes and allow compatible provider extensions.

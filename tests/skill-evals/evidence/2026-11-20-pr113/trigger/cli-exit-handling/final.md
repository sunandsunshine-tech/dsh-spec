Treat the exit status as the machine-readable contract:

- `11` means invalid configuration.
- `23` means the checker is unavailable.
- Document both as stable, distinct public values.
- Map typed internal failures, such as `InvalidConfiguration` and `CheckerUnavailable`, to those codes at the CLI boundary.
- Send human-readable diagnostics to stderr; do not define stdout as machine-readable output.

Tests should invoke the command as a subprocess and assert the exact exit status:

```text
invalid configuration  -> 11
checker unavailable    -> 23
```

Tests may also verify the stderr diagnostic and resulting state, but they must not infer failure by parsing stdout or matching diagnostic text. If callers need more detail than the exit status, expose it through an explicitly structured stderr format rather than stdout.
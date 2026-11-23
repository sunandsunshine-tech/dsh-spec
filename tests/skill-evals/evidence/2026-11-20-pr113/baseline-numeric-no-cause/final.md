[README.md](/workspace/numeric-no-cause-baseline/project/README.md:8) documents the regression rather than the required bridge contract. The fix should require:

- Preserve the original numeric `exitStatus` unchanged as the machine-readable failure identity.
- Retain `stdout` and `stderr` as structured details.
- Treat those details as the substitute for cause-chain diagnostics without inventing a cause.
- Classify callers’ behavior using the status, never message text.

Suggested replacement:

```markdown
`checkConfig` runs a native checker that returns `{ stdout, stderr, exitStatus }` without an error
object or cause chain. A zero status succeeds. For every non-zero status, the bridge must preserve
the numeric `exitStatus` unchanged as the failure's machine-readable identity and retain `stdout`
and `stderr` as structured failure details. Because this runtime has no cause chain, those details
take the place of an original cause; the bridge must not invent one.

Callers classify failures by `exitStatus`, never by parsing message text:

- Exit status `11` means the configuration is invalid; report the failure and do not retry.
- Exit status `23` means the checker provider is unavailable; report the failure before retrying.
- Any other non-zero status is an unexpected checker failure and must retain its original value.

The bridge must not convert a non-zero result to a message-only failure.
```

The workspace contains no bridge implementation or tests. I attempted to apply the documentation fix, but the sandbox is read-only, so no files were changed.
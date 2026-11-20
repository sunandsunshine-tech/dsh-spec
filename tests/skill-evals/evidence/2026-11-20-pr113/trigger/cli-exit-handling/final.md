Treat the exit statuses as the CLI’s stable machine contract, and keep diagnostics on stderr as human-facing output. Internally, represent failures as typed outcomes rather than parsing or encoding status in stdout.

| Outcome | Exit status | Required behavior |
|---|---:|---|
| Success | `0` | Complete work normally |
| Invalid configuration | `11` | Reject before invoking the checker; report what configuration is invalid and how to correct it |
| Checker unavailable | `23` | Produce no check result or success artifact; report which checker failed, whether retrying is safe, and the preserved underlying cause |
| Unexpected internal failure | Another distinct code, commonly `1` | Fail closed; never report `0` or remap to an expected failure |

For example, keep semantic errors inside the command and map them only at the executable boundary:

```text
CommandResult =
  | Success
  | InvalidConfiguration(details)
  | CheckerUnavailable(cause)
  | UnexpectedFailure(cause)

toExitStatus:
  Success               -> 0
  InvalidConfiguration   -> 11
  CheckerUnavailable     -> 23
  UnexpectedFailure      -> 1
```

Document `0`, `11`, and `23` as public compatibility commitments. Callers branch on the process status. Human-readable stderr may add context, but neither stdout nor stderr text is a control-flow protocol.

The tests should invoke the real command entry point and assert the process contract:

- Invalid configuration returns exactly `11`, the checker is not invoked, and no success result is produced.
- An unavailable checker returns exactly `23`, with no successful/partial result represented as success.
- Tests assert the literal statuses (`11` and `23`) rather than importing the production mapping constants from the implementation.
- Tests do not parse stdout or match exact error prose. They may assert that a non-empty, actionable diagnostic was written to stderr and that relevant state or side effects are correct.
- A normal successful case remains `0`, while an unexpected failure must not be mislabeled as either `11` or `23`.
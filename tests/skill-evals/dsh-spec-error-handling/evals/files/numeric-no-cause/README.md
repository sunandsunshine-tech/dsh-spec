# Configuration checker bridge

`checkConfig` runs a native checker that returns `{ stdout, stderr, exitStatus }` without an error
object or cause chain. Exit status `11` means the configuration is invalid and must not be retried.
Exit status `23` means the checker provider is unavailable and may be retried after reporting the
failure. Any other non-zero status is an unexpected checker failure.

The bridge currently converts every non-zero result to a message-only failure, losing the exit
status and stderr.

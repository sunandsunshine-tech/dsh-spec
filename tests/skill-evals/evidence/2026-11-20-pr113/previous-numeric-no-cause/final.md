Review result: [README.md](/tmp/pr113-eval.FHwx6T/numeric-no-cause-previous/project/README.md:3) correctly notes the missing cause chain, but its remaining text documents the lossy behavior rather than the required contract. It should make `exitStatus` the stable numeric failure identity, preserve `stderr` for diagnostics, avoid fabricating a cause, and never route behavior by parsing messages.

```markdown
# Configuration checker bridge

`checkConfig` runs a native checker that returns `{ stdout, stderr, exitStatus }` without an error
object or cause chain. The checker's numeric `exitStatus` is the failure identity: the bridge must
preserve it unchanged, together with `stderr`, when a non-zero result crosses the bridge. Because
there is no source error to attach, the bridge must not invent a cause chain; callers must not
route failures by parsing the failure message.

A zero exit status is success. Every non-zero result is a structured failure:

- Exit status `11` means the configuration is invalid. Report it as `exitStatus: 11` and do not
  retry it.
- Exit status `23` means the checker provider is unavailable. Report it as `exitStatus: 23`; it
  may be retried by the retry owner after the unavailable provider has been reported.
- Any other non-zero status is an unexpected checker failure. Preserve that status rather than
  mapping it to `11` or `23`, and do not retry it automatically.

The failure report should identify the affected configuration check and provide a safe next action.
`stderr` is diagnostics for that report, not a substitute for the numeric failure identity. If the
checker cannot provide an `exitStatus` at all, the bridge should report a distinct invocation
failure rather than fabricating a checker status.
```

There is no bridge implementation in this workspace to update. The README could not be written directly because the workspace is mounted read-only.
Preserve a **structured, versioned failure envelope**, not the error’s rendered text.

The worker should send:

- A stable machine-readable discriminant such as `kind` or `code`, using the same variant names as the in-process result type.
- The retry disposition: `safe`, `unsafe`, or `unknown`, plus structured details such as `retry_after_ms` and whether side effects were absent, committed, or unknown.
- Structured recovery details and the original cause/status where available.
- A separate human-readable message, used only for reporting.
- An explicit invariant that unknown or unrecognized failures are never automatically retried.

The parent should reconstruct an equivalent owned failure and dispatch using the discriminant and retry disposition—never by parsing the message. Only failures explicitly marked retry-safe should be retried; the parent still owns the retry budget and cancellation. These literal identities are a compatibility contract, so changing them requires versioning or migration.
[README.md](/tmp/pr113-eval.FHwx6T/worker-boundary-candidate/project/README.md:11) documents the failure, but not yet the required contract. The wire payload needs enough structured information for the parent to reconstruct an equivalent owning failure without interpreting display text.

A suitable contract would be:

```json
{
  "name": "ReportError",
  "code": "REPORT_LOCKED",
  "message": "report target is locked",
  "details": {},
  "cause": {
    "name": "SystemError",
    "code": "EBUSY",
    "message": "resource busy"
  }
}
```

Contract changes needed:

- Make `code` the authoritative, stable discriminant. Retry policy must inspect `code`, never `message` or `name`.
- Document a closed set of codes. Preserve `REPORT_LOCKED` exactly and give unexpected worker defects a separate fallback such as `WORKER_FAILED`; never map them to `REPORT_LOCKED`.
- Explicitly serialize `name`, `code`, `message`, optional JSON-safe `details`, and a normalized cause chain. Do not rely on `JSON.stringify(error)`, because JavaScript error properties and causes are not reliably enumerable.
- Reconstruct the owning error family in the parent, or an `Error` carrying equivalent `name`, `code`, and `details`. Reconstruct the transported cause as `cause`, rather than folding its text into the message.
- Define retry behavior for each identity. The locked condition and unexpected defect may need different outcomes, but that policy must be documented rather than inferred.
- Define compatibility behavior for message-only payloads. They should become an explicit unknown-worker failure and must not be classified as `REPORT_LOCKED`. Malformed payloads and non-`Error` throws need similar fail-closed handling.

Tests needed at the real boundary, not just against the serializer:

- A `REPORT_LOCKED` worker failure round-trips with exact `code`, `name`, and message, and the parent receives the reconstructed owning failure.
- An unexpected worker `TypeError` remains distinct from `REPORT_LOCKED`, with its original diagnostic information retained.
- A nested original cause survives serialization and is exposed as the reconstructed error’s `cause`, including its `name`, `code`, and message.
- Retry classification is asserted for both identities using exact codes. If a retry occurs, also assert the resulting state, such as no duplicate write and no false success.
- A legacy `{ "message": "..." }` payload produces the documented unknown-failure identity, not `REPORT_LOCKED`.
- Unknown codes, missing codes, and non-`Error` thrown values are surfaced as failures rather than being silently converted into success or a known condition.

There are currently no implementation or test files in the repository, so these would be new boundary tests rather than modifications to an existing suite.
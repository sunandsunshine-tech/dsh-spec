The README currently describes the defect but not the required wire contract: [README.md](/tmp/pr113-eval.FHwx6T/worker-boundary-previous/project/README.md:3) sends only `message`, so the receiver has no stable machine identity and cannot safely classify retries. The workspace contains no implementation or tests, so the following are contract and test changes rather than patches to existing files.

## Boundary contract

Replace the message-only payload with a versioned, structured failure envelope:

```json
{
  "schemaVersion": 1,
  "code": "REPORT_LOCKED",
  "name": "ReportLockedError",
  "message": "report target is locked",
  "details": {},
  "cause": null
}
```

The README should define these invariants:

- `code` is required and is the stable failure identity. Expected failures export code constants, and retry policy branches on the typed error or `code`, never on `message`.
- `message` is display text and may change without changing failure identity.
- `name` is optional diagnostic metadata, not the dispatch key.
- `details` is optional JSON-safe handling metadata, with sensitive/internal data excluded.
- `cause` is optional and recursively structured so nested causes retain their `code`, `name`, and `message`. Stack traces should not cross the boundary by default.
- The worker explicitly serializes known properties; it must not rely on object spread or `JSON.stringify(error)`, since `Error.message` and `Error.cause` are non-enumerable.
- The parent decodes known codes through a shared code-to-error-class registry and reconstructs the corresponding typed failure, including `cause` and `details`.
- Unknown codes become an explicit `UnknownWorkerError` that preserves the received code for diagnostics. Missing, malformed, or legacy `{ "message": ... }` payloads become a `WorkerProtocolError` or unexpected-worker failure; neither is inferred from message text.
- Serializer failures, circular causes, and unsupported thrown values produce a structured boundary failure. They must never become success or hang the worker.
- Keeping `message` at its current top-level path allows an older parent that ignores unknown fields to degrade to today’s plain-error behavior during rollout.

## Test changes

Tests should cover both serializer/decoder units and the actual worker-to-parent path:

| Case | Required assertion |
|---|---|
| Known failure round trip | Parent receives `instanceof ReportLockedError`, with exact `code`, message, and details. |
| Nested cause | The reconstructed cause retains its own code/name/message; stack remains absent. |
| Same text, different identity | An ordinary worker `Error` with the same message as `REPORT_LOCKED` is classified as unexpected and follows the unexpected retry policy. |
| Message drift | Changing the `REPORT_LOCKED` display text does not alter its reconstructed class or retry classification. |
| Legacy message-only payload | Decoder produces an explicit unknown/protocol failure and does not infer `REPORT_LOCKED`. |
| Unknown or malformed code | Preserves the received code where possible, classifies the failure as unexpected, and never reports success. |
| Serialization edge cases | Non-Error throws, cyclic causes, and serializer failure produce the documented fallback envelope. |

The key regression test should place a domain failure and an unexpected defect with identical messages on both sides of the real boundary and assert that their reconstructed types and retry decisions differ. That is the behavior the current `{message}` contract cannot provide.
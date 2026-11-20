The boundary contract should be a **tagged serialized result**, never a stringified error.

```text
Result<T, Failure> =
  Ok { value: T }
  Err {
    code: StableFailureCode   // machine identity
    message: string           // human-readable only
    details?: structured data // e.g. status, cause, attempt metadata
    effect: none | partial | committed | unknown
  }
```

Preserve these properties:

- **Success/error identity:** structurally distinguish `Ok` from `Err`.
- **Failure identity:** retain the exact stable discriminant, such as `timeout`, `validation_failed`, or `cancelled`.
- **Retry-relevant structure:** retain HTTP/RPC status, limits, cause codes, and whether work had no effect, partial effect, committed effect, or unknown effect.
- **Human message:** preserve it for reporting, but never parse it for control flow.
- **Compatibility:** treat failure codes as public contract values; do not rename or reuse them.

The parent should reconstruct an equivalent owning failure from that envelope and then apply its retry policy to the discriminant. Permanent, validation, authorization, and cancellation failures stay non-retryable. Transient failures may be retried. An unknown outcome must not be blindly retried unless the operation is proven idempotent; it should be reconciled or surfaced as uncertain. A malformed envelope or unknown discriminant should become a protocol/decode failure and fail closed.

If the transport truly requires text, serialize a canonical JSON tagged union into that text rather than `Debug`, `Display`, or `error.to_string()`. Boundary tests should verify that every expected discriminant round-trips and causes the intended retry decision.
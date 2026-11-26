The README identifies a real contract gap: [the wire payload](/workspace/evals/files/worker-boundary/README.md:5) loses the machine-readable failure identity, and [the parent conversion](/workspace/evals/files/worker-boundary/README.md:11) irreversibly collapses it into a plain `Error`.

### Contract changes

Define a structured failure envelope rather than transporting display text alone:

```ts
type SerializedWorkerFailure = {
  code: string;       // Stable discriminant, e.g. "REPORT_LOCKED"
  message: string;    // Actionable, non-sensitive description
  details?: unknown;  // JSON-safe recovery/diagnostic data
  cause?: SerializedFailureCause;
};

type SerializedFailureCause = {
  name: string;
  code?: string | number; // Preserve foreign/status codes as details
  message: string;
  details?: unknown;
  cause?: SerializedFailureCause;
};
```

The contract should require:

- `code` is the routing identity; consumers must never infer failure class from `message`.
- `REPORT_LOCKED` is preserved literally. Unexpected worker defects receive a distinct code such as `WORKER_DEFECT`; malformed payloads receive `WORKER_PROTOCOL_ERROR`.
- The parent deserializes into an equivalent owning failure, using a code-to-error factory where available. An identical runtime class is not required, but the stable identity, structured details, and cause must survive.
- Errors are explicitly mapped field-by-field. In JavaScript, `JSON.stringify(error)` normally loses `message`, `stack`, and other non-enumerable properties.
- The original cause is reconstructed and attached through `cause` where supported, recursively but with defined depth/size limits.
- Unknown codes must not silently become plain errors; the contract must state whether the family is open and preserve unknown values, or classify them explicitly as protocol errors.
- `code` values are compatibility promises. Renaming or reusing one requires migration handling.
- Messages remain actionable and exclude sensitive internals; redaction must not remove `code` or required structured details.

### Test changes

Add boundary tests asserting behavior and exact identity:

1. Serialization preserves `code: "REPORT_LOCKED"`, message, details, and the cause chain.
2. Deserialization reconstructs the owning failure with the exact code and preserves `error.cause`; assert it is not merely a plain message-only `Error`.
3. An end-to-end worker test verifies retry policy: `REPORT_LOCKED` is classified/retried differently from `WORKER_DEFECT`.
4. Changing only the message does not change classification, proving routing is not text-based.
5. The parent handles unknown and malformed payloads explicitly without returning success or misclassifying them as `REPORT_LOCKED`.
6. The failure test asserts the resulting domain state and side effects, such as whether retrying occurred, in addition to error identity.
7. Nested causes retain their actionable code/status; serialization failures produce a visible fallback failure rather than dropping the cause.

The repository currently contains only this README, so there is no implementation or test suite to run; these are the contract and coverage changes the fixture requires.
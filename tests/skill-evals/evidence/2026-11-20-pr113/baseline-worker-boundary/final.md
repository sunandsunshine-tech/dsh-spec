[README.md](/workspace/worker-boundary-baseline/project/README.md:3) currently specifies only `{ "message": string }`. That contract cannot preserve machine-readable identity or the cause described as lost on line 11.

The minimum wire contract should be:

```json
{
  "name": "ReportLockedError",
  "code": "REPORT_LOCKED",
  "message": "report target is locked",
  "cause": {
    "name": "Error",
    "message": "lock held by process 42"
  }
}
```

Contract requirements:

- `message` remains required and human-readable.
- `name` is preserved for diagnostics, with `"Error"` as the reconstruction fallback.
- `code` is the stable machine-readable identity used by retry policy. It may be absent for unexpected defects, but must not be inferred from `name` or `message`.
- `cause` is optional. Error causes are recursively serialized through the same shape; non-Error causes remain JSON-safe values.
- The parent reconstructs an `Error`, restores `name` and `code` as own properties, and recursively reconstructs `cause`. A message-only payload must not accidentally acquire `REPORT_LOCKED` identity.
- Serialization must explicitly construct this object. Spreading or `JSON.stringify`-ing an `Error` loses non-enumerable fields such as `message`, `name`, and modern `cause`.
- If worker and parent can be deployed independently, the parser should tolerate a legacy message-only payload, yielding an error with no code. Do not guess its identity from its wording.

Required tests:

- Serializer emits `name`, `message`, `code`, and nested `cause`; an error whose properties are non-enumerable still works.
- A round trip through the real worker/parent boundary produces an `Error` instance with the original `name`, `code`, `message`, and `Error` cause.
- Retry policy identifies `REPORT_LOCKED` and classifies an uncoded worker defect as unknown.
- Two failures with the same message but different codes receive different outcomes, proving retry behavior is not message-based.
- Nested causes retain their identity fields.
- Legacy `{ "message": ... }`, malformed optional fields, and absent causes are handled without throwing and do not fabricate a domain code.

No implementation or test files are present in this snapshot, so these are the contract and regression cases that the README should be expanded to require.
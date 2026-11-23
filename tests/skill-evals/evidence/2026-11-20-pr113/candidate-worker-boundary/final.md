[README.md](/workspace/worker-boundary-candidate/project/README.md:1) documents the defect but provides no implementation or tests to inspect. Assuming no existing error convention, use a stable `code` as the machine-readable identity.

**Contract changes**

Replace the message-only payload with a structured failure contract:

```json
{
  "code": "REPORT_LOCKED",
  "message": "report target is locked",
  "cause": {
    "name": "FilesystemError",
    "code": "EACCES",
    "message": "permission denied"
  }
}
```

- `code` is required and authoritative. Retry and recovery logic must use it, never parse `message`.
- Preserve the readable `message` separately from machine identity.
- Serialize `cause` explicitly because `Error.cause` may be non-enumerable. Preserve nested name, message, code, and cause recursively.
- Worker catch-all handling must map unclassified defects to a stable fallback such as `WORKER_UNEXPECTED_FAILURE`; it must not promote a foreign cause code to the top-level identity.
- The parent should reconstruct the owning failure from `code`—for example, `ReportLockedError` for `REPORT_LOCKED`. A valid unknown future code should remain a generic worker failure with its original code preserved.
- Missing or malformed identity should reconstruct the conservative unexpected-failure fallback, not infer identity from the message.
- Message-only legacy payloads may retain their text but must remain unclassified failures.
- Failure reconstruction must still throw or reject; it must never become success.

**Required tests**

1. Round-trip `REPORT_LOCKED` through the real serialization and reconstruction path; assert the reconstructed code, type/name, and exact message.
2. Preserve a nested cause, including its own code, without letting the cause code replace `REPORT_LOCKED`.
3. Throw `REPORT_LOCKED` and an arbitrary worker defect with identical messages; assert retry policy makes different decisions, proving it uses identity rather than text.
4. Exercise the real worker entry point with a plain error; assert `WORKER_UNEXPECTED_FAILURE` and preserved diagnostics.
5. Test a future/unknown code and assert it remains preserved and is handled conservatively.
6. Test legacy and malformed payloads, including message-only data and missing or non-string codes; assert the message survives but retry policy does not recognize `REPORT_LOCKED`.
7. Where the operation has observable state, assert the failure leaves it uncommitted rather than reported as successful.
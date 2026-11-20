The README identifies a real correctness bug: message-only conversion discards `exitStatus`, the checker’s existing machine-readable identity. Callers then cannot distinguish non-retryable configuration failure (`11`), retryable provider failure (`23`), and unexpected failures, nor can they recover `stderr` for diagnosis.

Preserve the existing identity rather than translating it into message text or a new code:

```ts
type CheckerFailure = {
  name: "CheckerFailure";
  exitStatus: number;
  stderr: string;
};

// Construct this for every non-zero result.
```

Retry logic should inspect `exitStatus` directly: never retry `11`, allow `23`, and treat every other non-zero status as unexpected. `stderr` supplies the diagnostic detail normally carried by a cause; this runtime should omit `cause` entirely. Messages remain display-only.

Boundary tests should verify that statuses `11`, `23`, and another status such as `7` retain the exact status and stderr through reconstruction, with the corresponding retry classification. The README’s final paragraph should be replaced by that contract. No source implementation exists in the current workspace to patch.
Reviewed [AGENTS.md](/workspace/existing-identity-baseline/project/AGENTS.md) and [README.md](/workspace/existing-identity-baseline/project/README.md). The existing identity is already correct: `kind` with only `ACCOUNT_INELIGIBLE` and `PAYMENT_DECLINED`. It should not become `name`, `code`, or an additional alias.

The README needs to clarify that `kind` is contractual and message text is not, then strengthen the test expectations:

```md
## Failure contract

`kind` is the sole machine-readable identity for an expected account failure.
Its allowed values form a closed set:

```ts
type AccountFailureKind = 'ACCOUNT_INELIGIBLE' | 'PAYMENT_DECLINED'
```

Callers must switch on `kind`; they must not classify failures from `message`.
Do not add a `name`, `code`, or other alias for the same condition.

Only the two expected account outcomes above use these values. Transport
failures and unexpected implementation defects must remain distinguishable.
`message` is human-readable reporting only and may change without changing
the failure identity.

## Contract tests

Keep the existing account-state assertion, and add an exact identity assertion
for every failure case:

- Parameterize the tests to cover both `ACCOUNT_INELIGIBLE` and
  `PAYMENT_DECLINED`.
- Assert that `failure.kind` equals the expected literal.
- Assert that the account remains unchanged after the failed submission.
- Assert that `failure` has no `name` or `code` field.
- Treat message assertions as secondary; a matching message must not make a
  different `kind` acceptable.
```

I could not persist the change because the workspace is mounted read-only; `apply_patch` was rejected by the sandbox. There is also no executable source or test harness in this workspace, so no tests could be run locally.
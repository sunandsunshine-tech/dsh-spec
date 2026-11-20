I couldn’t persist the changes because the workspace is mounted read-only. Both `apply_patch` attempts were rejected, and `README.md`, `AGENTS.md`, and the project directory report as non-writable.

`AGENTS.md` already expresses the correct rule, so it should remain unchanged. The intended `README.md` replacement for the final paragraph is:

```md
## Failure contract

`kind` is the sole machine-readable failure identity, and the two values above
form the complete supported set. Callers must switch on `kind`; tests must
assert the exact `kind`. Neither may infer the failure class from `message`.

Do not add `name`, `code`, or another alias for either condition. Changing an
existing `kind` or adding another value changes the contract and requires an
exhaustiveness update in every caller.

`message` is human-readable reporting only. It should identify the failed
submission and give a safe next action where one exists, without exposing
sensitive internal details.

## Contract tests

Keep the existing account-state assertion, and add an exact identity assertion
for each failure case:

- Parameterize the tests with `ACCOUNT_INELIGIBLE` and `PAYMENT_DECLINED` so
  both members of the closed union are covered.
- Assert that the returned `kind` equals the expected literal. Do not accept a
  different tag merely because the message matches.
- Assert the required account state after the call. A failure must not be
  treated as successful submission.
- Assert `name` and `code` are absent from the tagged failure, preventing a
  second machine-readable identity from being introduced.
- Keep message assertions secondary. Test the user-visible report if the
  operation requires it, but do not use the message to classify the failure.
```

There is no executable source or test harness in this workspace—only [AGENTS.md](/tmp/pr113-eval.FHwx6T/existing-identity-candidate/project/AGENTS.md) and [README.md](/tmp/pr113-eval.FHwx6T/existing-identity-candidate/project/README.md)—so adding runnable tests around an invented implementation would be misleading. The project needs to be made writable before these changes can be applied and verified.
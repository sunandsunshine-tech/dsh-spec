The contract in [README.md](/workspace/message-only-candidate/project/README.md:3) uses `message` as both the human-readable report and the failure identity. That makes expected handling brittle because presentation text may change or be localized.

The smallest safe change is to add one stable machine-readable discriminant:

```json
{
  "code": "ACCOUNT_NOT_ELIGIBLE",
  "message": "account is not eligible"
}
```

The implementation change is to add that literal `code` wherever the unsupported-account failure is constructed. Existing callers remain compatible, while new callers can handle the failure with `failure.code === "ACCOUNT_NOT_ELIGIBLE"`. The code must be assigned explicitly rather than derived from the message, and transport or implementation failures must never receive this code. If the project already uses `name`, `kind`, or another error-discriminant convention, use that instead of introducing `code`.

The corresponding test should assert both the identity and the required state guarantee:

```ts
const failure = await submitAccount(unsupportedAccount).catch(error => error);

expect(failure.code).toBe("ACCOUNT_NOT_ELIGIBLE");
expect(accountStore.get(unsupportedAccount.id)).toEqual(accountBefore);
```

This verifies that a caller can recognize the expected rejection without inspecting its message and that the failed submission leaves the account unchanged. The repository contains only the README, so there is no language-specific implementation or existing test file to patch.
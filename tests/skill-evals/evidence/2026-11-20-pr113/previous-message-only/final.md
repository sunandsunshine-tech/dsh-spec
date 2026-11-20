The current contract in [README.md](/tmp/pr113-eval.FHwx6T/message-only-previous/project/README.md:3) exposes only a human-readable `message`. That gives the expected rejection no stable machine identity and makes it indistinguishable from other `{ message }` failures.

The smallest change is to add a stable failure discriminator:

```json
{
  "code": "ACCOUNT_NOT_ELIGIBLE",
  "message": "account is not eligible"
}
```

The implementation can expose that code as a typed constant:

```ts
export const ACCOUNT_NOT_ELIGIBLE = "ACCOUNT_NOT_ELIGIBLE" as const;

return {
  code: ACCOUNT_NOT_ELIGIBLE,
  message: "account is not eligible",
};
```

The caller can then handle the expected case with `result.code === ACCOUNT_NOT_ELIGIBLE`. Transport failures and unexpected implementation errors continue through the generic failure path; the message becomes presentation/localization data rather than control-flow data. The README contract should also include the new `code` field.

A focused regression test should assert both the discriminator and the no-mutation guarantee:

```ts
it("returns an identifiable rejection without changing account state", async () => {
  const before = accountStore.snapshot(targetAccount);

  const result = await submitAccount(targetAccount);

  expect(result).toMatchObject({
    code: "ACCOUNT_NOT_ELIGIBLE",
  });
  expect(accountStore.snapshot(targetAccount)).toEqual(before);
});
```

This test intentionally does not assert the message. Message-copy stability can be tested separately if required. If eligibility is currently checked after any mutation, that check must be moved before mutation to satisfy the atomicity contract. This workspace contains only the README, so no implementation or test patch could be applied directly.
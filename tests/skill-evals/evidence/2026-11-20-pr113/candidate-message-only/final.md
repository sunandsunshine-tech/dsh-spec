The contract currently uses `message` as both display text and failure identity. That is unstable and prevents a caller from distinguishing the expected rejection from transport or implementation failures.

The smallest compatible change is to add one stable machine-readable `code` to the existing failure result:

```json
{
  "code": "ACCOUNT_NOT_ELIGIBLE",
  "message": "account is not eligible"
}
```

Production code, assuming the existing failure is an async rejection:

```ts
type SubmitAccountFailure = {
  code: "ACCOUNT_NOT_ELIGIBLE";
  message: string;
};

return Promise.reject({
  code: "ACCOUNT_NOT_ELIGIBLE",
  message: "account is not eligible",
} satisfies SubmitAccountFailure);
```

Callers can then handle only that condition and surface everything else:

```ts
try {
  await submitAccount(account);
} catch (error) {
  if (error?.code === "ACCOUNT_NOT_ELIGIBLE") {
    display(error.message);
    return;
  }
  throw error;
}
```

Add one regression test that asserts both the exact identity and the required state guarantee:

```ts
it("rejects an ineligible account without changing its state", async () => {
  const before = snapshotAccount(account.id);

  await expect(submitAccount(account)).rejects.toMatchObject({
    code: "ACCOUNT_NOT_ELIGIBLE",
  });

  expect(snapshotAccount(account.id)).toEqual(before);
});
```

This adds no new error hierarchy and no message parsing. The `message` remains display-only and can change independently of the caller’s logic.
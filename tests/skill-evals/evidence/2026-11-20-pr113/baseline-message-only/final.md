The contract in [README.md](/workspace/message-only-baseline/project/README.md:3) needs a stable machine-readable discriminator. The smallest safe change is to retain `message` for display but add a domain-specific `code`:

```json
{
  "code": "ACCOUNT_NOT_ELIGIBLE",
  "message": "account is not eligible"
}
```

At the rejection site:

```ts
type AccountFailure = {
  code: "ACCOUNT_NOT_ELIGIBLE";
  message: string;
};

return Promise.reject({
  code: "ACCOUNT_NOT_ELIGIBLE",
  message: "account is not eligible",
} satisfies AccountFailure);
```

Callers can then branch on `error.code === "ACCOUNT_NOT_ELIGIBLE"`. A `code` is preferable to `instanceof` because it survives serialization and process boundaries.

The regression test should assert both parts of the contract:

```ts
it("rejects an ineligible account without changing its state", async () => {
  const before = await snapshotAccount(accountId);

  await expect(submitAccount(accountId)).rejects.toMatchObject({
    code: "ACCOUNT_NOT_ELIGIBLE",
  });

  expect(await snapshotAccount(accountId)).toEqual(before);
});
```

That is one added field at the failure site and one focused test. No workspace implementation or test files exist yet, so this is a proposed diff rather than an applied change.
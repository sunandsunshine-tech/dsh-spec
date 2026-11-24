# Account submission

`submitAccount` already returns a tagged failure:

```ts
type AccountFailureKind = 'ACCOUNT_INELIGIBLE' | 'PAYMENT_DECLINED'

interface AccountFailure {
  kind: AccountFailureKind
  message: string
}
```

The caller switches on `kind`. The current tests assert only the message and whether the account remained unchanged.

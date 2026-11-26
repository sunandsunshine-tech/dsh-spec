# Account submission

`submitAccount` returns the project's existing tagged failure when submission
cannot complete:

```ts
type AccountFailureKind = 'ACCOUNT_INELIGIBLE' | 'PAYMENT_DECLINED'

interface AccountFailure {
  kind: AccountFailureKind
  message: string
}
```

## Failure contract

`kind` is the stable machine-readable identity. Consumers select recovery by
switching on those exact values and must not infer the condition from `message`.
Do not rename either value, replace `kind` with another discriminant, or add a
`name` or `code` field for the same condition.

`ACCOUNT_INELIGIBLE` means the account does not meet the submission eligibility
requirements. `PAYMENT_DECLINED` means payment authorization prevented the
submission. Both outcomes mean the submission did not complete and the
account's caller-visible state is unchanged; they are not logged successes and
must not be followed by automatic retries.

The caller owns recovery. It may retry only after the cause is resolved, such
as changed account details or a changed payment decision. `message` is
human-readable only: it should identify the failed operation and a safe next
action without exposing sensitive account or payment details.

## Test expectations

The regression tests must drive `submitAccount` through each failure condition,
not construct an `AccountFailure` fixture and assert its own `kind`. For both
conditions, capture the account state before submission and assert:

```ts
expect(result.kind).toBe(expectedKind)
expect(accountAfterSubmission).toEqual(accountBeforeSubmission)
expect(result).not.toHaveProperty('name')
expect(result).not.toHaveProperty('code')
expect(result.message).not.toBe('')
```

Use the exact expected value `ACCOUNT_INELIGIBLE` or `PAYMENT_DECLINED` in each
case. Message-wording assertions may supplement these checks, but they must not
replace the machine-identity and unchanged-state assertions.

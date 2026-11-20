# Account submission

The `submitAccount` operation rejects an unsupported account with this result:

```json
{
  "message": "account is not eligible"
}
```

The caller displays the message and cannot distinguish this expected rejection from a transport failure or an implementation defect. A failed submission must leave the account state unchanged.

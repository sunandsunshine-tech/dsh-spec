Updated [README.md](/workspace/evals/files/existing-identity/README.md:1) to:

- Preserve `kind` with the exact existing values, `ACCOUNT_INELIGIBLE` and `PAYMENT_DECLINED`.
- Define state, recovery, retry, and human-readable message guarantees.
- Require failure tests to exercise `submitAccount`, assert the exact `kind`, verify unchanged account state, and reject duplicate `name`/`code` identities.
- Keep `AGENTS.md` unchanged.

`git diff --check` passes. The fixture contains no implementation or runnable test harness, so verification was limited to reviewing and statically checking the documented contract.
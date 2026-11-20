I reviewed [AGENTS.md](/tmp/pr113-eval.FHwx6T/existing-identity-previous/project/AGENTS.md) and [README.md](/tmp/pr113-eval.FHwx6T/existing-identity-previous/project/README.md).

The improvement should preserve `kind` as the sole machine-readable identity and clarify that:

- Allowed values remain exactly `ACCOUNT_INELIGIBLE` and `PAYMENT_DECLINED`.
- `message` is display text and must never drive error handling.
- Neither `name` nor `code` should duplicate the failure identity.
- Failed submissions leave the account unchanged.
- Tests explicitly cover both `kind` values, assert the exact discriminator, reject `name`/`code` aliases, check display text separately, and verify account state remains unchanged.
- There is currently no source or runnable test suite in the project, so the only available test improvement is to turn the README into an explicit regression checklist.

I could not apply the edits because the workspace is mounted read-only; both patch attempts were rejected by the session’s permission settings. No files were changed.
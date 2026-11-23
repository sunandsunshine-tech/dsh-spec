Fixed the order-dependent global-state leak.

- [tests/config.test.mjs](/tmp/dsh-pr116-behavior-final.HOhv5D/global/tests/config.test.mjs:7) now snapshots exact environment presence/value, working directory, and clock state, restores them in `finally`, and registers `t.after()` as an idempotent fallback.
- [package.json](/tmp/dsh-pr116-behavior-final.HOhv5D/global/package.json:6) no longer forces suite-wide serialization.
- [README.md](/tmp/dsh-pr116-behavior-final.HOhv5D/global/README.md:5) now describes the passing regression check.

The focused suite passes: `npm test` reports 2/2 passing. I also ran 12 executions with four concurrent processes and ran with a pre-existing `FEATURE_FLAG=before`; all passed. `git diff --check` is clean.
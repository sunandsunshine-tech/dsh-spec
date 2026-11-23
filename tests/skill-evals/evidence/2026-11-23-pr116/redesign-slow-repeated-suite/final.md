Redesigned [tests/report.test.mjs](/workspace/evals/files/slow-suite/tests/report.test.mjs) so fast contract cases use lightweight table data, while one suite-scoped scenario builds the expensive fixture once via `before`. Updated [ci.yml](/workspace/evals/files/slow-suite/.github/workflows/ci.yml) so both Node versions run compatibility contracts but only Node 24 runs the expensive scenario. No timeouts were changed.

Verification:

- `npm test`: 6 passed; fixture executed once instead of three times.
- `RUN_EXPENSIVE_FIXTURE=0 npm test`: 3 contract tests passed and the duplicate fixture suite was skipped.
- `node --check tests/report.test.mjs`: passed.
- `git diff --check`: clean.
Redesigned the suite without changing timeouts:

- [report.contract.test.mjs](/workspace/evals/files/slow-suite/tests/report.contract.test.mjs) runs three fast cases directly against `reportRows()`, with no delay.
- [report.integration.test.mjs](/workspace/evals/files/slow-suite/tests/report.integration.test.mjs) owns the only delayed fixture and one integration case.
- [package.json](/workspace/evals/files/slow-suite/package.json) separates `test:contract` and `test:integration`.
- [ci.yml](/workspace/evals/files/slow-suite/.github/workflows/ci.yml) runs the contract on Node 24 and 26, while integration runs once on Node 24.

All suites pass:

```text
npm run test:contract   3 passed
npm run test:integration 1 passed
npm test                4 passed
```

The delayed fixture now executes once instead of three times. `git diff --check` also passes.
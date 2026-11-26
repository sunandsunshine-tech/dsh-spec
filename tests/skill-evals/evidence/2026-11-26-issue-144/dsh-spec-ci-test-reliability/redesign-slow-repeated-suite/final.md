Split the suite into two ownership-clear entries:

- [report.contract.test.mjs](/workspace/evals/files/slow-suite/tests/report.contract.test.mjs) checks the real `reportRows()` behavior once, with no delay.
- [report.integration.test.mjs](/workspace/evals/files/slow-suite/tests/report.integration.test.mjs) owns the sole 80 ms delayed execution and one representative assertion.
- [package.json](/workspace/evals/files/slow-suite/package.json) exposes `test:contract`, `test:integration`, and a combined local `test`.
- [ci.yml](/workspace/evals/files/slow-suite/.github/workflows/ci.yml) runs contracts on Node 24 and 26, then runs the integration suite once on Node 24.

No timeouts were changed. The original three-row behavioral coverage is preserved.

Verification:

- `npm run test:contract` — 1 passed, 45 ms.
- `npm run test:integration` — 1 passed, 117 ms including the owned delay.
- `npm test` — both suites passed.
- `git diff --check` — passed.
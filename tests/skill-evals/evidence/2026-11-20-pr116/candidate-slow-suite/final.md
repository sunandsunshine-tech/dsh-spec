Redesigned the suite around one fixture acquisition:

- [report.test.mjs](/tmp/dsh-pr116-slow.Ar9Evd/project/evals/files/slow-suite/tests/report.test.mjs) now contains only fast row-contract cases.
- [report.integration.test.mjs](/tmp/dsh-pr116-slow.Ar9Evd/project/evals/files/slow-suite/tests/report.integration.test.mjs) owns the single expensive scenario and verifies it runs once.
- [ci.yml](/tmp/dsh-pr116-slow.Ar9Evd/project/evals/files/slow-suite/.github/workflows/ci.yml) runs contract checks on Node 24/26, but the representative scenario only on Node 24.
- [package.json](/tmp/dsh-pr116-slow.Ar9Evd/project/evals/files/slow-suite/package.json) exposes separate contract and representative commands.
- There are no per-case timeout increases. The single integration scenario has one named 5-second watchdog.

Validation on Node 26:

- `npm test`: 4 passed, 123ms total, down from 278ms.
- `npm run test:contract`: 3 passed, 43ms.
- `npm run test:representative`: 1 passed, 148ms; fixture executed once.
- `git diff --check`: clean.
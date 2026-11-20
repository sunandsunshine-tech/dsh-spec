Refactored [report.test.mjs](/tmp/dsh-pr116-behavior-final.HOhv5D/slow/tests/report.test.mjs:10) into three fast contract checks plus one representative fixture scenario. The expensive fixture now runs once instead of three times. The [CI matrix](/tmp/dsh-pr116-behavior-final.HOhv5D/slow/.github/workflows/ci.yml:11) still runs contract checks on Node 24 and 26, while the version-independent fixture runs only on Node 24.

Verification on Node 26.13.1:

- `npm test`: 4 passed, 0 failed; 118.7 ms versus 280.5 ms before.
- `RUN_REPRESENTATIVE_FIXTURE=false npm test`: 3 passed, 1 intentionally skipped for the non-representative lane.
- `git diff --check`: passed.
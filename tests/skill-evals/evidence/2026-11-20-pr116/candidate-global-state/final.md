The failure was process-global leakage: the first case changed `FEATURE_FLAG`, the working directory, and the clock without restoring them.

[config.test.mjs](/tmp/dsh-pr116-global-project.vyoNuZ/evals/files/global-state/tests/config.test.mjs:10) now:

- Captures whether `FEATURE_FLAG` is absent versus present, preserving string and empty-string values exactly.
- Registers `t.after()` immediately and restores in `finally`, with an `afterEach` fallback.
- Restores the previous clock, including switching back to real timers when applicable.
- Restores every global even if another restoration operation fails.
- Verifies the restored snapshot after each mutating case.

I also removed the unnecessary runner-wide serialization from [package.json](/tmp/dsh-pr116-global-project.vyoNuZ/evals/files/global-state/package.json:6).

The focused `npm test` suite passes all 3 tests. Additional checks passed with absent, empty, and non-empty initial flags; 20 repeated runs; 8 concurrent independent runs; 10 randomized-order runs; and execution from a different working directory. `git diff --check` is clean.
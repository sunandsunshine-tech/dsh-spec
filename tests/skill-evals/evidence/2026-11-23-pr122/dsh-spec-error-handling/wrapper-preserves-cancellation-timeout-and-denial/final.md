Updated [README.md](/workspace/evals/files/wrapper-classification/README.md:6) so the execution wrapper returns the worker’s structured result unchanged. `UPSTREAM_TIMEOUT`, `CANCELLED`, `DENIED`, structured details, and causes now survive for downstream classification; display text remains separate from recovery logic.

`git diff --check` passes.
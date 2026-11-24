# PR121 test-reliability evidence

Candidate skill file SHA-256: `3705f9aede4b49df04903c487bffc461b9156c52440e585041da3080f9068485`.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

## Method

The runs used `tests/skill-evals/run-model-eval.mjs`. The runner staged the recorded
`dsh-spec-test-reliability` skill and only the declared scenario files in a fresh temporary Git
project, then exposed that project in an isolated Linux namespace. Both runs used
`workspace-write`; the diagnosis changed no file and the slow-suite rerun used `--replace`.

The runner makes the host Node and npm toolchain visible on `PATH` without mounting the repository.
The slow-suite trace records the in-sandbox `node --version` as `v26.13.1` and contains the commands
and captured stdout from the model's contract, integration, and package-test runs. After the run,
the retained patch was replayed against the declared scenario inputs with Node 24.22.2 and Node
26.13.1. `redesign-slow-repeated-suite/test-output.txt` records that replay without altering command
output.

## Results

| Scenario | Assertions | Status | Time |
|---|---:|---:|---:|
| `diagnose-without-fixing` | 5/5 | pass | 64.55 s |
| `redesign-slow-repeated-suite` | 5/5 | pass | 50.18 s |

The diagnosis left `changed-paths.txt` empty. Its final response identifies the `findFreePort()`
probe-close-rebind race, cites the same `EADDRINUSE` port across unrelated revisions and shards on
`pool-a`, separates the logged `SIGTERM` from a timeout claim, and records the missing host metrics,
process ownership, and the smallest barrier-based reproduction without running it. All five
diagnosis assertions cover the declared behavior.

The slow-suite patch deletes the original mixed test file and adds two explicit entries. The
`test:contract` entry contains three synchronous cases that import and call the real `reportRows()`
directly, without the delay. The `test:integration` entry contains the only delayed fixture and one
representative test. `npm test` runs the contract first and then the single integration entry.

The CI workflow runs `npm run test:contract` in the existing Node 24 and Node 26 matrix. It runs
`npm run test:integration` once in a separate Node 24 job. The patch adds no timeout and leaves the
existing timeout configuration untouched.

The independent replay passed the contract on both Node 24 and Node 26, passed the delayed
integration entry once on Node 24, passed the combined package test entry on Node 24, and passed
`git diff --check`. The model's earlier in-sandbox Node 26 commands produced the same pass counts
and exit codes in `trace.jsonl`.

## Evidence layout

- `diagnose-without-fixing/`: final response, graded assertions, trace, timing, skill tree hashes,
  scenario definition and input manifest. `changed-paths.txt` is empty.
- `redesign-slow-repeated-suite/`: final response, graded assertions, trace, timing, skill tree
  hashes, scenario definition, input manifest, patch, changed paths, independent test output and
  changed-file artifacts.

The assertions for these runs live in their retained `scenario-definition.json` files.

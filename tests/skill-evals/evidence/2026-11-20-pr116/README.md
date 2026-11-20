# PR #116 clean-context model evidence

Base: `cb2eeb2993b0c8f6061401c468b48e25f5d3b5a3`.
Candidate skill tree: `3fffaefaa984b2bc611a85b1c2946578c466b905`.
Evaluation files tree: `72c08ca5bafa1b3560c3fd8a3023fc6d6847da80`.
Trigger fixture tree: `646b2925dca8c38961c1dde85f407b759383ff62`.
Trigger corpus blob: `a6f558db17fb64afed0817c782a6c4ca6fb4d391`.
Skill file SHA-256: `c0a2bbcee189f9e5bba61b0d22db45fc12b8db27afb4fc084b0d8dd47dad9a90`.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

## Method

Each behavior run used a fresh temporary Git project containing the scenario's runnable Node
project and `dsh-spec-test-reliability` under `.agents/skills/`. Runs used:

```sh
codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write \
  -c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false' \
  -c 'mcp_servers.gateway.enabled=false' \
  -C <project> --json -o final.md \
  "<scenario prompt>. Do not spawn subagents."
```

The diagnosis-only run used `--sandbox read-only`. It made no change; `changed-paths.txt` is empty.
The three repair scenarios retain their final response, patch, focused test output, timing, trace
and input manifests. Their direct test entries finish in under one second in total.

## Behavior results

| Scenario | Result |
|---|---:|
| Port collision fixed through listener allocation | 5/5 |
| Absent/present globals, cwd and clock restored | 4/4 |
| Diagnosis-only classification without mutation | 3/3 |
| Slow repeated fixture redesigned instead of timeout inflation | 4/4 |

Candidate total: 16/16 assertions.

The port fixture fails deterministically before the fix with `EADDRINUSE` and passes after the
application listener owns allocation. The global-state fixture fails its second test before the
fix and passes after immediate and fallback restoration. The slow suite changes from three repeated
80 ms fixture builds to one shared integration run plus a fast contract. CI retains the contract on
both Node lanes and runs the expensive representative scenario once.

## Trigger results

Four positive and four near-miss queries were run in separate minimal projects. All eight matched
the stable `SELECT:` marker. Positives cover port collisions, leaked environment/timers, incomplete
teardown and deterministic slow-suite design. Near misses cover product latency, coverage-only work,
a general test-plan document and static visual review.

Evidence: `trigger-matrix.tsv`, `trigger-input.sha256`, and `trigger/<query>/`.

## Evidence layout

- `candidate-port/`: pre-fix/output evidence, patch and focused test.
- `candidate-global-state/`: restoration patch and focused suite.
- `candidate-diagnosis/`: read-only diagnosis and empty changed-path list.
- `candidate-slow-suite/`: fast/shared redesign patch and focused test.
- `trigger/`: final response, stderr and derived trace for every routing probe.

Model runs are development evidence and do not run in routine CI. Repository tests verify input and
artifact hashes, assertions, skill hashes and trigger decisions; a skill or fixture change
invalidates the evidence until it is rerun.

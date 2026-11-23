# PR #116 current model evidence

These runs isolate the source and answer tree from the staged project and execute the current
test-reliability skill.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-test-reliability \
  --scenario <scenario-id> \
  --output tests/skill-evals/evidence/2026-11-23-pr116/<run> \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `diagnose-without-fixing` | 5/5 | pass | 56.42 s |
| `redesign-slow-repeated-suite` | 4/4 | pass | 98.01 s |

The diagnosis run stays read-only, separates unsupported timeout evidence from the observed
`SIGTERM`, identifies the check-then-bind race, and gives a deterministic smallest reproduction
without claiming its execution. The slow-suite run keeps lightweight contracts separate, builds the
expensive fixture once, and limits the representative run to one matrix lane.

The complete current skill manifest is:

```text
3441d8d58e80a5850c3ba1a01f0870d8ede7f6835725b69a8a2a38246aaf806a  skills/dsh-spec-test-reliability/SKILL.md
77682d376506b57154a3204b0d2773dd4c9d270bd61c92eb3f1dd1fb009a9fb5  skills/dsh-spec-test-reliability/THIRD_PARTY_NOTICES
9609c2833b34706ce81e2eef6c2c08f8fecc611fe2a0a378d3a20a8ebf7f0b1b  skills/dsh-spec-test-reliability/references/ci-flake-diagnosis.md
```

The aggregate SHA-256 over the newline-joined manifest, without a trailing newline, is
`7dcf9e66ee1255dfcdb8b6312f3573470c0a97ff1f83cf0e970a574ba1d057c2`. The retained scenario hashes
are `b01994f5dfdea9031a3f0650017cd554a9ce603d4915f765ff0b9aae66f8ac48` and
`b2d0bd4cc6e89a8fedf76949ad6c2826349969fc02b05da67c5336f463823744`; each trace completes,
`final.md` equals its final message, and the retained patches and assertions match the scenario.

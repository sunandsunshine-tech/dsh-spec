# PR #116 current model evidence

These runs isolate the source and answer tree from the staged project and execute the current
test-reliability skill. This tree has no bundled model-evaluation runner, so each run was staged and
invoked directly.

```bash
run_dir="$(mktemp -d)"
project="$(mktemp -d)"
mkdir -p "$project/.agents/skills" "$project/evals/files"
cp -R skills/dsh-spec-test-reliability "$project/.agents/skills/"
cp -R tests/skill-evals/dsh-spec-test-reliability/evals/files/diagnosis-only "$project/evals/files/"
git -C "$project" init -q
git -C "$project" add -A
git -C "$project" -c user.name=evidence -c user.email=evidence@example.invalid commit -qm initial
(
  cd "$project"
  sha256sum evals/files/diagnosis-only/README.md evals/files/diagnosis-only/ci.log \
    evals/files/diagnosis-only/package.json evals/files/diagnosis-only/support/server.mjs \
    evals/files/diagnosis-only/tests/server.test.mjs > "$run_dir/input-manifest.sha256"
)
sha256sum skills/dsh-spec-test-reliability/SKILL.md \
  skills/dsh-spec-test-reliability/THIRD_PARTY_NOTICES \
  skills/dsh-spec-test-reliability/references/ci-flake-diagnosis.md > "$run_dir/skill-hashes.txt"
set -o pipefail
/usr/bin/time -f 'time_seconds: %e' -o "$run_dir/time.txt" \
  codex exec --ephemeral --skip-git-repo-check --sandbox read-only \
    -c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false' \
    -c 'mcp_servers.gateway.enabled=false' \
    -C "$project" --json -o "$run_dir/final.md" \
    "Tell me why evals/files/diagnosis-only/ci.log fails intermittently. Do not change code, workflows, or rerun CI; I only need the supported diagnosis, separation of timeout and signal evidence, the smallest relevant reproduction, and remaining limits. Use the installed skill at .agents/skills/dsh-spec-test-reliability/SKILL.md. Do not spawn subagents." \
    2> "$run_dir/stderr.log" | tee "$run_dir/trace.jsonl"
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `diagnose-without-fixing` | 5/5 | pass | 56.42 s |
| `redesign-slow-repeated-suite` | 4/4 | pass | 98.01 s |

The diagnosis run stays read-only, separates unsupported timeout evidence from the observed
`SIGTERM`, identifies the check-then-bind race, and gives a deterministic smallest reproduction
without claiming its execution. The slow-suite run keeps lightweight contracts separate, builds the
expensive fixture once, and limits the representative run to one matrix lane.

For the slow-suite run, use the same capture sequence with the four `slow-suite` files declared
under its `evals.json` entry, `--sandbox workspace-write`, and that entry's prompt. Retain its Git
diff, changed paths and produced files after the run. Do not copy `evals/evals.json`,
`tests/skill-evals`, or the repository test suite into the temporary project.

After each run, grade the final response against the scenario assertions. `assertions.expected.txt`
and `assertions.txt` carry one `PASS` line per assertion; a failed assertion is recorded as `FAIL`,
and `status.txt` records `status: pass`, `run_exit_code: 0` and the exact count only when every
assertion passed.

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

`scenario-definition.sha256` hashes the scenario's recursively key-sorted JSON with no insignificant
whitespace and no trailing newline. The repository gate recomputes that hash, the exact 5/5 and 4/4
assertion sets, the current input and skill manifests, artifact hashes, final-message equality, and
absence of the known answer locations `evals/evals.json`, `tests/skill-evals` and `expected_output`
from each trace:

```sh
node --test --test-name-pattern="test reliability current model evidence" tests/skill-scenarios.test.ts
```

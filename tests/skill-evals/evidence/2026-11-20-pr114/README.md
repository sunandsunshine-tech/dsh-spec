# PR #114 clean-context model evidence

Base: `01c030b` (`agent/stack-105-error-contract`).
Candidate skill tree: `c99659a1223328706d8186b826f094f0c15b3b56`.
Evaluation files tree: `cdbaecee09d348d95b43bd1f51f916fc9c10c70d`.
Trigger fixture tree: `d420502b19eaca2d79dd5599d2226d7fff0f9993`.
Trigger corpus blob: `759961c4b8cc714ddeb0e816f8f61c58f949dab6`.
Run date: 2026-11-20.
Model: host-configured `gpt-5.6-luna`; Codex CLI 0.169.1.

## Method

Each behavior run used a fresh temporary project and:

```sh
codex exec --ephemeral --skip-git-repo-check -s read-only \
  -c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false' \
  -c 'mcp_servers.gateway.enabled=false' \
  -C <fixture> --json -o final.md \
  "<eval prompt> Do not spawn subagents; complete the review directly."
```

Candidate runs installed `dsh-spec-web-ui-review` at the fixture's `.agents/skills/` path;
baseline runs omitted the skill. `trace.jsonl` retains command records, final usage, and the
candidate skill hash. Large command outputs are omitted. Saved final responses have trailing
whitespace removed; wording is otherwise unchanged.

The rendered fixture itself was produced from a runnable static application and headless Chrome
157. Screenshots, a one-session GIF, and the render report are committed under
`tests/skill-evals/dsh-spec-web-ui-review/evals/files/shared-widget-project/evidence/`.

## Behavior results

| Scenario | No skill | Candidate |
|---|---:|---:|
| Shared widget: consumers, rendered states, gaps | 4/4 | 4/4 |
| Missing renderer: explicit handoff | 4/4 | 4/4 |
| Screenshot override with simulated focus | 2/4 | 4/4 |

The screenshot-override scenario intentionally contains a simulated focus treatment. The candidate
noticed the source sets `data-focus-demo` and that the screenshot therefore does not prove native
focus; it rejected the focused-state coverage and reported the gap. The baseline accepted the
screenshot pair as complete.

Evidence: `baseline-shared-widget/`, `candidate-shared-widget/`,
`baseline-missing-render/`, `candidate-missing-render/`, `baseline-screenshot-pair/`,
`candidate-screenshot-pair/`.

## Trigger results

The final description was run against the ten queries in `trigger-evals.json`. Five positives and
five near-misses all matched their expected trigger result. Each run retains `final.md`, `stderr.log`,
and `trace.jsonl`; every trace records the installed skill's SHA-256.

Evidence: `trigger-matrix.tsv`, `trigger/<query>/`.

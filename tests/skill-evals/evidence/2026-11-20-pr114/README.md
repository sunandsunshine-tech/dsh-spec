# PR #114 clean-context model evidence

Base: `aefd0143` (`agent/stack-105-error-contract`).
Final candidate evidence revision: `b5977d09`.
Trigger fixture tree: `d420502b19eaca2d79dd5599d2226d7fff0f9993`.
Trigger corpus blob: `65c58252b3ca8bbdb1212cb50b3e87cdee864ef3`.
Skill file SHA-256: `6131f5f18451a5b89782afc0989428ec3d594d5be0b29fab9e9c335b81b6c612`.
Model: host-configured `gpt-5.6-luna`; Codex CLI 0.169.1.

## Method

Each behavior run used a fresh temporary project containing only the scenario's declared files and,
for candidate runs, `dsh-spec-client-ui-ux` under `.agents/skills/`. Initial evidence used:

```sh
codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write \
  -c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false' \
  -c 'mcp_servers.gateway.enabled=false' \
  -C <project> --json -o final.md \
  "<scenario prompt>. Do not modify source. Do not spawn subagents."
```

Candidate runs cover all four scenarios and were re-recorded after the capture fixture's
process-cleanup repair. The baseline is a historical control for screenshot state-authenticity,
where the no-skill default accepted simulated focus. Each run has `final.md`,
`status.txt`, `assertions.txt`, `trace.jsonl`, and an `input-manifest.sha256` that binds every
scenario input to the committed evaluation tree.

The capability-present probe runs the fixture's `npm run evidence` command, which starts the
application and a dependency-free headless-Chrome storyboard. It performs a focused
evidence-default check rather than repeating the full design checklist. BrowserSkill and `bsk` are
explicitly excluded from the run; the evidence path uses headless Chrome only.

The behavior runs predate the capture fixture's disconnect, deadline, staging and process-tree
repair, so every behavior manifest retains that file's historical SHA-256
`a76a0b15807b9786ee468705836865ba057400c05a20e2b6ad13b855d3ae346e` rather than binding the
current fixture. The current replacement is covered by deterministic tests in
`tests/skill-scenarios.test.ts`; these model results do not prove the replacement ran.

## Behavior results

| Scenario | No skill | Candidate |
|---|---:|---:|
| Shared widget: consumers, rendered states, gaps | not run | 5/5 |
| Missing renderer: explicit resumable handoff | not run | 4/4 |
| Screenshot override with simulated focus | 2/4 | 4/4 |
| Capability present: default rendered evidence | not run | 4/4 |

The baseline accepted the simulated focus state. The candidate rejected it, reported the missing
coverage, and completed the capability-present evidence path. Candidate total: 17/17 assertions.

## Trigger results

The final description was run against six positive and six near-miss queries. All twelve matched
their expected trigger result. This is a short trigger probe: every retained trace records the
skill hash; each positive query also records the exact `SKILL.md` read, while near misses do not
read it.

Evidence: `trigger-matrix.tsv`, `trigger-input.sha256`, and `trigger/<query>/`.

## Evidence layout

- `candidate-shared-widget/`, `candidate-capability-present/`: candidate behavior and provenance.
- `candidate-missing-render/`: capability-absent handoff.
- `baseline-screenshot-pair/`, `candidate-screenshot-pair/`: state-authenticity comparison.
- `candidate-capability-present/evidence-local/`: screenshots and state report produced by the
  one-session headless-Chrome run; `artifacts.sha256` binds every artifact.

Model runs are development evidence and do not run in routine CI. Repository tests verify that
the recorded inputs, scores, skill hash, trigger reads and artifact hashes are internally
consistent; a skill or fixture change invalidates them.

# PR #119 review integration evidence

Base: `0b206ed3d6762417385bc3df4086082d9fca8343`.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

## Method

Each run used a fresh temporary Git project containing only the scenario's declared project files under
`evals/files/review-integration/`. The candidate skill was installed under `.agents/skills/`.
Capability-present runs also installed `dsh-spec-error-handling` and `dsh-spec-client-ui-ux` and
attached the fixture's `evidence/settings-after.png`; capability-absent runs installed only the target skill and
attached no rendered evidence.

Runs used:

```sh
codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write \
  -c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false' \
  -c 'mcp_servers.gateway.enabled=false' \
  -C <project> --json --image <screenshot> -o final.md \
  "<scenario prompt>. Do not spawn subagents."
```

Capability-absent runs used the same command without `--image`. The screenshot is a real assembled
settings-page render from the same `shared-widget-project` source used by the review fixture:
`tests/skill-evals/dsh-spec-client-ui-ux/evals/files/shared-widget-project/evidence/settings-after.png`.
It shows the settled settings surface with Delete account enabled; it does not prove the
saving/disabled state. Its SHA-256 is
`9e9459d9babcc8170bb53c18026ada6fee6592b13c9f2dc0a68664d534c7821d`.

## Results

| Run | Profile | Result |
|---|---|---:|
| `candidate-code-review-present` | Target, error-handling and client-UI guidance; attached screenshot | 5/5 |
| `candidate-code-review-absent` | Target only; no rendered evidence | 4/4 |
| `candidate-pre-push-present` | Target, error-handling and client-UI guidance; attached screenshot | 5/5 |
| `candidate-pre-push-absent` | Target only; no rendered evidence | 4/4 |

The present runs identified the project's existing `kind` identity and structured `detail`, rejected
message routing, inspected the attached screenshot, identified the enabled Delete account idle state,
and left the saving/disabled state plus the 390-pixel narrow viewport unverified. The absent runs
produced the same minimum boundary findings and reported rendered evidence as an unfinished check
with a concrete next step.

## Evidence layout

- `artifact/settings-after.png`: the shared real rendered screenshot attached to present profiles.
- `candidate-*/final.md`: the model response.
- `candidate-*/trace.jsonl`: the raw `codex exec --json` stream; no synthetic `skill` event is added.
- `candidate-*/skill-hashes.txt`: the target and installed optional-sibling skill contents read by the run.
- `candidate-*/input-manifest.sha256`: the exact declared scenario input hashes.
- `candidate-*/artifacts.sha256`: the rendered screenshot and focused-test evidence retained by that run.
- `candidate-*/changed-paths.txt`: empty for every read-only or completed run.

`tests/skill-scenarios.test.ts` verifies the scenario set, assertions, successful skill reads, current
skill hashes, input files and retained artifacts. Model evaluations remain development evidence and
do not run in routine CI.

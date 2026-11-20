# PR #115 clean-context model evidence

Base: `83a507e9162439ae8fb65b1bdfef2fa732d3c2b8`.
Candidate skill tree: `4c7431defbb6ff5dab05fc611c84a7d5e192bac4`.
Evaluation files tree: `2590021a52aeaf30366cc3bd25cf07a5b2047744`.
Trigger fixture tree: `d93b94d7c9cb9c9bafa5ad43b9ae3e6536057dc3`.
Trigger corpus blob: `0494f2a706e1be37f20a17436bb9eb843b63b59a`.
Skill file SHA-256: `ee42109fe7fab280b2063b461a5979a593572c47bbe9b2efcd97898ebac8e7c3`.
Model: host-configured Codex model; Codex CLI 0.171.0-alpha.13.

## Method

Each behavior run used a fresh temporary Git project containing only the scenario's declared files
and `dsh-spec-browser-gif-evidence` under `.agents/skills/`. Runs used:

```sh
codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write \
  -c 'plugins."codex-ds-gateway@codex-ds-adapter".enabled=false' \
  -c 'mcp_servers.gateway.enabled=false' \
  -C <project> --json -o final.md \
  "<scenario prompt>. Do not modify source. Do not spawn subagents."
```

The real-build and authorized-fixture probes ran one dependency-free headless-Chrome session and
then the bundled Node encoder. BrowserSkill and `bsk` were excluded. Each run retains its final
response, stderr, timing, input manifest and, where produced, the source frames, capture report and
encoded GIF. `trace.jsonl` is derived from the JSON event stream; it retains commands, exit codes,
the skill hash and token usage while omitting large command outputs.

The capability-absent probe used a PATH without `ffmpeg` or `ffprobe` and supplied no browser
capability or Playwright fallback.

## Behavior results

| Scenario | Result |
|---|---:|
| Real build: one isolated browser run and verified GIF | 4/4 |
| Missing capability: explicit resumable handoff | 4/4 |
| Authorized fixture: disclosure without provider claim | 4/4 |

Candidate total: 12/12 assertions.

The real and fixture runs each captured three states from one Chrome process and one page target.
Both GIFs are 720×480 at 10 fps. The real run encoded 70 frames over 7 seconds; the fixture run
encoded 80 frames over 8 seconds. The capture waits on semantic DOM states and releases the
fixture's save response only after the saving screenshot is recorded. Decoded representative
frames preserve the transition from unsaved to saving to saved. The fixture run states that it
does not prove the unavailable production-provider flow.

## Trigger results

Three positive queries and five near-miss queries were run against the final description in separate
minimal projects. Each was a selection-only probe with no task execution or filesystem search; all
eight finals matched their expected result through the stable `SELECT:` marker. Each positive
selects the skill, while every near miss selects none. The near misses cover generic image animation,
static visual review, backend work, image-format conversion and prompt editing.

Evidence: `trigger-matrix.tsv`, `trigger-input.sha256`, and `trigger/<query>/`.

## Evidence layout

- `candidate-real/`: real-build behavior, three source frames, capture report and encoded GIF.
- `candidate-absent/`: missing-browser and missing-media handoff.
- `candidate-fixture/`: explicitly authorized fixture evidence and its disclosure.
- `trigger/`: final response, stderr and derived JSON trace for every short routing probe.

Model runs are development evidence and do not run in routine CI. Repository tests verify input
and artifact hashes, scores, skill hashes and trigger reads; a skill or fixture change invalidates
the evidence until it is rerun.

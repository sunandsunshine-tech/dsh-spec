# PR #121 change-description evidence

Scenario: `stack-layer-replaces-legacy-ai-section`.

Model: host-configured `deepseek-flash`; Codex CLI 0.171.0-alpha.13. Run date: 2026-11-23.

## Method

The recorded run used the repository runner:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-pr-description \
  --scenario stack-layer-replaces-legacy-ai-section \
  --output tests/skill-evals/evidence/2026-11-23-pr121/dsh-spec-pr-description/stack-layer-replaces-legacy-ai-section \
  --sandbox workspace-write \
  --replace
```

The runner stages the complete assessed skill and only the scenario's declared fixture files into a
fresh Git project. It invokes Codex inside `bwrap` with the project, an isolated Codex home and the
response directory as its writable mounts; the source repository and answer manifest are outside
that namespace. It also rejects answer-bearing manifest paths in the trace and requires `final.md`
to equal the trace's last agent message.

The scenario requires the top stack layer to replace a stale AI-role section while keeping the lower
layer's telemetry work out of its AI Usage table.

## Results

The earlier attempt tested a second mandatory AI Usage reference read that this refactor had
invented. That requirement was removed because upstream requires one read plus a final read-back.

`stack-layer-replaces-legacy-ai-section` passed all eight recorded scenario assertions. The body uses
the four default sections, removes the legacy section, contains exactly one AI Usage section and
declaration block, records only the retry-cap layer, uses the v0.1.2 `pair` declaration whose badge
matches the highest row, and reports the passing two-test evidence. The review row remains `n/a`
with an empty decision-record cell, and the no-comments statement follows the table. No tracker
metadata is invented.

Routing is recorded separately and passed the skill contract recorded for this run: the trace reads
`references/ai-usage.md` once before writing the body, then applies its checklist in successful
post-write validation commands before the final response. Routing is not a ninth natural-language
assertion; the recorded scenario has eight canonical assertions.

The retained trace records two successful `npm test` runs with 2/2 passing. The trace contains no
answer-bearing command or web/browser item. `final.md` equals the last trace agent message, the
patch replays exactly to the retained artifact, and the captured skill and scenario hashes match
the recorded files.

## Evidence layout

- `stack-layer-replaces-legacy-ai-section/`: the recorded successful run.
- `*/final.md`: the model's final response.
- `*/trace.jsonl`: the normalized `codex exec --json` stream.
- `*/input-manifest.sha256`: the declared scenario inputs before the run.
- `*/scenario-definition.json` and `*/scenario-definition.sha256`: the scenario used by the run.
- `*/skill-hashes.txt`: the complete installed target-skill revision.
- `*/patch.diff` and `*/changed-paths.txt`: the resulting fixture change.
- `*/artifact/` and `*/artifacts.sha256`: the retained changed files and their hashes.
- `*/assertions.txt`, `status.txt` and `routing.txt`: the eight content results and separate routing result.
- `*/stderr.log`, `time.txt` and `usage.txt`: the runner diagnostics and execution measurements.

Model runs are development evidence and do not run in routine CI. The body evidence is tied to the
recorded skill revision; these runs remain historical evidence for that revision.

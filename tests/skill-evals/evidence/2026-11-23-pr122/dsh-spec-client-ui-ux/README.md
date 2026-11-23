# PR #122 client UI evidence

This directory records the current shared-icon rendering-contract scenario against the
`dsh-spec-client-ui-ux` skill tree.

## Method

The run used `tests/skill-evals/run-model-eval.mjs` with an editable project:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-client-ui-ux \
  --scenario shared-icon-rendering-contract \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-client-ui-ux/shared-icon-rendering-contract \
  --sandbox workspace-write \
  --replace
```

The runner installed the complete two-file target-skill tree and staged only the four fixture files
declared by the scenario. The isolated project had no runnable application, assembled consumers,
tests, or rendered evidence.

## Result

| Scenario | Assertions | Status | Time |
|---|---:|---:|---:|
| `shared-icon-rendering-contract` | 5/5 | pass | 50.46 s |

The review preserves the declared non-scaling stroke and intentional-fill behavior, identifies the
filled status contour whose rendered geometry remains unproved, asks for the 1 CSS pixel and 1.3
CSS pixel stroke variants to be rendered at each consumer's target CSS size and device-pixel ratio,
names the Search button, Settings button, and toolbar as affected consumers, and leaves the missing
rendered evidence as an explicit gap. It also notes that the exact target-size and DPR matrix is not
declared.

The model did not change the rendering contract through source inspection or present placement as
an ordinary fix that could alter stroke scaling or fill geometry. It did not invent rendered
evidence. Its checks are future evidence requirements, and `changed-paths.txt`, `patch.diff`, and
`artifacts.sha256` are empty.

## Provenance

The scenario object and canonical scenario hash match the current corpus:

```text
69da09e2dac0fd1192dac1383ff280d548768590dfe454920d0cb223d12b255d  dsh-spec-client-ui-ux:shared-icon-rendering-contract
```

The complete installed skill manifest matches the current tree:

```text
4bc12d7f084e684cd1cf1990e5062ce318805e9facfd3dea606aacad9c3c5f85  skills/dsh-spec-client-ui-ux/SKILL.md
541ae59807e0f6fcc3def16c97843a6ec7a81b706878ee028761f0a8418f8ad7  skills/dsh-spec-client-ui-ux/THIRD_PARTY_NOTICES
```

The aggregate SHA-256 over the newline-joined manifest, without a trailing newline, is
`86bd20000685868d886cc7cd445dc16ed154ece0cc19477ff351539e76ed6632`. The successful target-skill
read in the trace hashes to the `SKILL.md` entry above. Every declared fixture file also matches
`input-manifest.sha256`.

## Integrity

The raw trace has one turn start, one turn completion, 14 completed command records, and four agent
messages. All command events are answer-blind: none names `tests/skill-evals`, `evals/evals.json`,
`expected_output`, the source worktree, the response directory, the isolated Codex home, or the
scenario definition. The only `evals/files/icon-contract-project` references access declared fixture
inputs.

`final.md` is byte-for-byte equal to the final agent message in `trace.jsonl`. The isolated project
made no file changes, and the installed skill tree remained unchanged during the run.

Scenario assertions live in `tests/skill-evals/dsh-spec-client-ui-ux/evals/evals.json`.

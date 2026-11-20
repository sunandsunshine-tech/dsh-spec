# PR #100 clean-context model evidence

Candidate source: `655ac29` (`docs(notes): record cross-skill composition boundary`).
Base: `8e27ddc` (`main`).
Run date: 2026-11-19.

## Method

Each run used a fresh temporary project, `codex exec --ephemeral`, the official `.agents/skills`
layout, complete sibling skill trees, Git initialization for note scenarios, and no parent task
context. Plugins, MCP dependency installation, and collaboration/subagent features were disabled so
the run measured the skill rather than host orchestration.

The candidate contains no runner command in the shipped skill. The commands, elapsed time, token
use, final response, Git status, and generated artifact paths are recorded per run below. This is targeted
evidence for the changed model-facing decisions, not a claim that all 28 manifest scenarios were
model-executed; deterministic contract tests cover the full matrix.

## Results

| Run | Configuration | Assertions | Time | Input tokens | Output tokens |
|---|---|:--:|---:|---:|---:|
| `no-peer-uses-user-language` | baseline `8e27ddc` | 1/3 | 60.7 s | 283,535 | 10,864 |
| `no-peer-uses-user-language` | candidate `655ac29` | 3/3 | 58.1 s | 419,101 | 11,825 |
| `external-companion-mechanism` | candidate `655ac29` | 4/4 | 232.7 s | 1,711,975 | 20,603 |
| `archive-readiness-required` | candidate `655ac29` | 4/4 | 25.8 s | 199,119 | 4,591 |
| `same-class-targets-inferred` | candidate `655ac29` | 3/3 | 238.8 s | 1,113,869 | 20,289 |
| `existing-note-first-archive-uses-ladder` | candidate `655ac29` | 4/4 | 143.0 s | 1,299,321 | 21,423 |
| `progressive-target-addition-single-source` | candidate `655ac29` | 4/4 | 146.6 s | 2,038,017 | 20,885 |

Candidate total: 22/22 assertions across six scenarios.

## Assertion results

### `no-peer-uses-user-language`

Baseline:

- FAIL — it produced a Japanese source note but no Japanese target counterpart.
- PASS — it did not choose Chinese merely from the CLI default.
- FAIL — no Japanese counterpart and consistency record were completed.

Candidate:

- PASS — selected Japanese from the primary agent's user language.
- PASS — did not choose Chinese.
- PASS — completed the English note, Japanese counterpart, and consistency record.

Evidence: `baseline-no-peer/`, `candidate-no-peer/`.

### `external-companion-mechanism`

- PASS — did not assume translation was the companion source.
- PASS — used an exact `--member` path mapping.
- PASS — grouped the note with a different-stem nested review companion.
- PASS — required neither Translate Docs nor a pairing record.

Evidence: `candidate-external-unit/`.

### `archive-readiness-required`

- PASS — preparation produced a plan without writing the manifest.
- PASS — the failing external check did not seal the unit.
- PASS — the manifest remained empty and the unit bytes stayed unchanged.
- PASS — the handoff named the failed check and a recovery action.

Evidence: `candidate-archive-readiness/`.

### `same-class-targets-inferred`

- PASS — selected the complete same-class Chinese and Japanese target set.
- PASS — preferred peer evidence over the user-language fallback.
- PASS — created both counterparts and one aggregate record.

Evidence: `candidate-same-class/`.

### `existing-note-first-archive-uses-ladder`

- PASS — completed the selected translation while the note was active.
- PASS — used the committed Git baseline and both installed skills.
- PASS — completed the counterpart and record before readiness and seal.
- PASS — sealed the complete three-file unit.

Evidence: `candidate-first-archive/`.

### `progressive-target-addition-single-source`

- PASS — the modified source gained Japanese while retaining Chinese.
- PASS — the untouched source remained unchanged and Chinese-only.
- PASS — the new source received both targets.
- PASS — the existing Chinese update and the new Japanese whole-document translation both completed.

Evidence: `candidate-progressive/`.

# PR #113 clean-context model evidence

Candidate source: the PR #113 worktree after the error-contract review changes.
Base: `7bd235d` (`agent/104-dsh-rc5-baseline`).
Run date: 2026-11-20.

## Method

Each run used a fresh temporary project and `codex exec --ephemeral`. Candidate runs installed
`dsh-spec-error-handling` at the fixture's `.agents/skills/` path; baseline runs omitted the skill.
The fixture was read-only, and no parent task context or generated conversation was passed to the
model.

The prompts and expected assertions come from
`tests/skill-evals/dsh-spec-error-handling/evals/evals.json`. This is targeted evidence for the
changed failure-contract behavior, not a claim that every deterministic scenario in the corpus
requires a model run.

## Results

| Scenario | Profile | Assertions | Time | Input tokens | Output tokens |
|---|---|---:|---:|---:|---:|
| message-only | no skill | 4/4 | 34.4 s | 69,506 | 6,019 |
| message-only | candidate | 4/4 | 35.6 s | 95,361 | 6,296 |
| worker-boundary | no skill | 4/4 | 39.5 s | 70,578 | 6,727 |
| worker-boundary | candidate | 4/4 | 56.7 s | 121,879 | 9,464 |
| silent-handler | no skill | 2/4 | 19.0 s | 50,513 | 2,732 |
| silent-handler | candidate | 4/4 | 23.8 s | 52,787 | 3,196 |
| existing identity | no skill | 4/4 | 56.6 s | 270,512 | 11,059 |
| existing identity | candidate | 4/4 | 93.0 s | 307,757 | 10,627 |

Candidate total: 16/16 assertions. No-skill total: 14/16.

## Assertion results

### Message-only failure

Both profiles added a stable `code`, kept `message` for display, and proposed a regression test that
asserts both the exact code and unchanged account state.

Evidence: `baseline-message-only/`, `candidate-message-only/`.

### Worker boundary

Both profiles carried a stable identity and nested cause across the worker boundary and proposed a
round-trip test. The candidate additionally distinguished the owning failure from unknown worker
defects and required the receiving side to reconstruct an equivalent owning failure.

Evidence: `baseline-worker-boundary/`, `candidate-worker-boundary/`.

### Silent handler

The baseline split commit and notification out of the handler but still discarded every cleanup
failure, so it missed the requirement to identify only the expected missing-directory failure.

- PASS — the silent scope contains one operation.
- FAIL — the ignored cleanup failure is not identified by a stable discriminant.
- PASS — the reason states the cleanup state consequence.
- FAIL — unexpected cleanup failures are still discarded.

The candidate selected the missing-directory condition, rethrew other cleanup failures, and kept
commit and notification failures visible.

Evidence: `baseline-silent-handler/`, `candidate-silent-handler/`.

### Existing project identity

Both profiles preserved the project's `kind` union and rejected adding `name` or `code`. The
candidate stated the compatibility and message-reporting consequences more completely and required
tests to prove the absence of a competing identity.

Evidence: `baseline-existing-identity/`, `candidate-existing-identity/`.

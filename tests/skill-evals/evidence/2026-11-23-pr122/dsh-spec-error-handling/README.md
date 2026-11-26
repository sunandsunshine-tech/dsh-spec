# PR #122 error-handling evidence

> **Historical status:** these runs used the pre-#147 skill revision. They preserve the alpha.2
> failure-handling checks but do not bind the current embedded and batch scope added by #147.
> Current evidence is under
> `../../2026-11-26-issue-147/dsh-spec-error-handling/`.

These runs verify the alpha.2 failure-handling additions against that recorded skill revision:

| Scenario | Assertions | Result |
|---|---:|---|
| `empty-catch-names-and-separates-operation` | 4/4 | The handler covers only temporary-directory removal, exposes the expected failure, and surfaces unrelated failures. |
| `empty-catch-names-and-documents-safe-failure` | 4/4 | The empty catch names the expected failure and documents the state and caller consequence of discarding it. |
| `wrapper-preserves-cancellation-timeout-and-denial` | 4/4 | The wrapper preserves all three machine identities, structured detail and downstream recovery distinctions. |

Each run was produced by `tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write`.
The run directories retain the exact scenario, complete input modes, capability profile, installed
skill hashes, artifact hashes, trace and reviewer-certified assertions.

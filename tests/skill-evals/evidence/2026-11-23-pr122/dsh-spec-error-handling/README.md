# PR #122 error-handling evidence

These runs verify the alpha.2 failure-handling additions against the current skill:

| Scenario | Assertions | Result |
|---|---:|---|
| `empty-catch-names-and-separates-operation` | 4/4 | The handler covers only temporary-directory removal, exposes the expected failure, and surfaces unrelated failures. |
| `empty-catch-names-and-documents-safe-failure` | 4/4 | The empty catch names the expected failure and documents the state and caller consequence of discarding it. |
| `wrapper-preserves-cancellation-timeout-and-denial` | 4/4 | The wrapper preserves all three machine identities, structured detail and downstream recovery distinctions. |

Each run was produced by `tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write`.
The run directories retain the exact scenario, complete input modes, capability profile, installed
skill hashes, artifact hashes, trace and reviewer-certified assertions.

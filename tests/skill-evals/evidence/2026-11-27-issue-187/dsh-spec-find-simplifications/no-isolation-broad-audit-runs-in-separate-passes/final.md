One evidence-backed simplification is supported.

- Remove [src/dead.ts](/workspace/evals/files/vendor/project/src/dead.ts:1), including `unusedHelper`. The symbol occurs only at its definition. The fixture has no package manifest, export map, barrel, loader, static import, dynamic import, or `require` reference to that module. Its only test imports `runTask` from `runtime.ts`, and [README.md](/workspace/evals/files/vendor/project/README.md:3) assigns the exported entry point to the runtime file. This removes one obsolete module and exported function without affecting an observed consumer.

No documentation deletion is supported:

- [runtime.ts](/workspace/evals/files/vendor/project/src/runtime.ts:1) `runTask` is consumed by [runtime.check.ts](/workspace/evals/files/vendor/project/tests/runtime.check.ts:2) and described in [guide.md](/workspace/evals/files/vendor/project/docs/guide.md:3).
- `supportedRuntime` has no code consumer, but the documentation’s Node-support statement is evidence that it represents a retained capability. Removing it would change documented behavior.
- Both guide statements describe distinct supported behavior; neither is redundant copy that can be removed without losing a public claim.
- The README sentence is the project’s ownership constraint, especially in the absence of `AGENTS.md`.

The existing check passed under Node `v26.13.1` with `node --experimental-strip-types tests/runtime.check.ts`. `git diff --check` passed, and the worktree remains clean. No decision records exist and no files were changed.

As requested, no agents or isolated contexts were used. The review is therefore a single-context trace rather than independently reviewed assurance.
## Survey result

One evidence-backed simplification is supported, with an explicit boundary: remove [src/dead.ts](/workspace/evals/files/vendor/project/src/dead.ts:1). The complete fixture contains only five files, with no package manifest, export map, barrel, symlink, importer, call, test, or documentation reference for `unusedHelper`.

This removes an unreachable source module and its compilation and maintenance obligation without changing any observable behavior in the fixture.

**Residual risk:** external source-level deep imports cannot be observed. Withdraw the proposal if this is a partial checkout or an external deep-import contract exists.

## Runtime

Consumer evidence:

- [runTask](/workspace/evals/files/vendor/project/src/runtime.ts:1) is imported and exercised by [runtime.check.ts:2](/workspace/evals/files/vendor/project/tests/runtime.check.ts:2), and its behavior is documented at [guide.md:3](/workspace/evals/files/vendor/project/docs/guide.md:3).
- [supportedRuntime](/workspace/evals/files/vendor/project/src/runtime.ts:5) has no repository reader, but it is exported and corresponds to the documented Node support at [guide.md:5](/workspace/evals/files/vendor/project/docs/guide.md:5).

Decision and rejected alternatives:

- `runTask` remains: removing or inlining it would break executable and documented contracts.
- `supportedRuntime` remains: internal unreadness does not prove an exported, documented compatibility surface is safe to remove.
- Retaining `unusedHelper` as a possible extension point is rejected: no manifest, export map, barrel, documentation, or test establishes that contract.
- Removing only the implementation while retaining its export is rejected: it would preserve an unusable public distinction.

## Documentation

Consumer evidence:

- The documentation is human-facing rather than linked or imported by code. [README.md:3](/workspace/evals/files/vendor/project/README.md:3) designates the runtime as the exported entry-point owner and documentation as the owner of supported behavior.
- [guide.md:3](/workspace/evals/files/vendor/project/docs/guide.md:3) documents the test-pinned trimming behavior; [guide.md:5](/workspace/evals/files/vendor/project/docs/guide.md:5) documents Node support corroborated by the runtime export.

Decision and rejected alternatives:

- Keep both guide claims. They describe supported behavior, and absence of an inbound Markdown link does not make human-facing documentation dead.
- Moving the guide into the README and deleting its path is rejected: it retains the same prose and architectural obligation while merely relocating it.
- Removing the trim sentence as duplicate implementation text is rejected: the documentation is user-facing and independently pinned by the test.
- Removing [README.md:3](/workspace/evals/files/vendor/project/README.md:3) was considered and rejected after review because it provides meaningful entry-point and responsibility orientation.

## Tests

Consumer evidence:

- [runtime.check.ts:2](/workspace/evals/files/vendor/project/tests/runtime.check.ts:2) imports `runTask`, and [runtime.check.ts:4](/workspace/evals/files/vendor/project/tests/runtime.check.ts:4) is the sole assertion verifying the documented trimming behavior.
- `node tests/runtime.check.ts` completed successfully using Node 26.13.1.

Decision and rejected alternatives:

- Keep the test: deleting it would remove the only executable verification of the documented behavior.
- Delete-because-trivial is rejected: simplicity in the implementation does not replace regression coverage.
- Adding a `supportedRuntime` assertion is not a simplification; it increases obligations.
- Adding coverage for `unusedHelper` is rejected because it has no supported consumer or behavior contract.

No files or decision records were changed. The final frozen fixture passed an independent focused review after the `unusedHelper` external-deep-import limitation was disclosed.
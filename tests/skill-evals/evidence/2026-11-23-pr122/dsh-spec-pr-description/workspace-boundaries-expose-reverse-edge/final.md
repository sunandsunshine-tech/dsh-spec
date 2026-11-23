Prepared the `Changes` section in [change.md](/workspace/evals/files/workspace-dependencies/change.md).

It records:

- Added runtime edge: `@example/app → @example/core`
- Removed runtime edge: `@example/app → @example/legacy`
- Existing reverse edge retained: `@example/core → @example/app`
- No reverse edge for the removed legacy dependency
- Affected responsibilities and the removed `@example/legacy` workspace package

The edge list was validated against every base and current package manifest; no other runtime edges changed.
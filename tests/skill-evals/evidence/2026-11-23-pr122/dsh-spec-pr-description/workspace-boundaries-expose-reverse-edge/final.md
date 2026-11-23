Updated [change.md](/workspace/evals/files/workspace-dependencies/change.md) with the default four-part `Changes` structure.

The section reports:

- Added runtime edge: `@example/app → @example/core`
- Existing reverse edge: `@example/core → @example/app`
- Removed runtime edge: `@example/app → @example/legacy`
- No reverse `legacy → app` edge in the base manifest
- Responsibilities for `app`, `core`, and the removed `legacy` package

All claims were derived from the base and current manifests using the skill’s dependency and responsibility rules.
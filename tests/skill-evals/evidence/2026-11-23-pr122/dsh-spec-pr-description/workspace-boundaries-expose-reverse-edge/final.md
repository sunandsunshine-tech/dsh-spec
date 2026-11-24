Updated [change.md](/workspace/evals/files/workspace-dependencies/change.md) with the default `Changes` structure.

It records:

- Added: `@example/app → @example/core`
- Removed: `@example/app → @example/legacy`
- Existing reverse edge for the added dependency: `@example/core → @example/app`
- No reverse `@example/legacy → @example/app` edge

The responsibility table covers app, core, and the removed legacy package. Manifest verification and `git diff --check` passed.
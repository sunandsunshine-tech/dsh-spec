## Changes

**Interface changes**

None.

**Behavior changes**

Shared input validation used by `@example/app` is now delegated to `@example/core`.

**Module responsibilities and dependencies**

| Package | Responsibility | Change |
|---|---|---|
| `@example/app` | Application package that now delegates shared input validation to `@example/core`. | Changed |
| `@example/core` | Shared package that supplies input validation to app while retaining its existing event-sink use of app. | Changed |
| `@example/legacy` | Base-only workspace package with no responsibility declared beyond its package identity. | Removed |

Added runtime dependency edge:

- `@example/app → @example/core`

Removed runtime dependency edge:

- `@example/app → @example/legacy`

Reverse edges:

- `@example/core → @example/app` already existed and remains, so the added `@example/app → @example/core` edge creates a runtime dependency cycle.
- The removed `@example/app → @example/legacy` edge had no reverse edge; the base `@example/legacy` manifest declares no dependencies.

No other runtime dependency edges were added or removed. The manifests declare no optional, peer, or development dependencies.
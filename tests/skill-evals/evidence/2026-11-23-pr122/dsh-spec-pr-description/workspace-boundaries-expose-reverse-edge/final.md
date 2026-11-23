## Changes

**Interface changes**

None.

**Behavior changes**

`@example/app` now delegates shared input validation to `@example/core`. The existing `@example/core` event-sink integration with `@example/app` is unchanged.

**Module responsibilities and dependencies**

| Unit | Responsibility | Change |
|---|---|---|
| `@example/app` | Application package that now delegates shared input validation to `@example/core`. | Changed |
| `@example/core` | Supplies shared input validation and continues to import `@example/app` for its event sink. | Responsibility left in place; receives a new incoming runtime edge |
| `@example/legacy` | Base-only dependency target with no manifest-declared implementation responsibility. | Removed |

Runtime dependency edges:

- Added: `@example/app → @example/core` (`workspace:*`).
- Removed: `@example/app → @example/legacy` (`workspace:*`).
- Reverse edge retained: `@example/core → @example/app` (`workspace:*`) exists in both base and current manifests, so the resulting `app`/`core` relationship is reciprocal.
- No reverse `@example/legacy → @example/app` edge exists in the base manifests.
- No `peerDependencies`, `optionalDependencies`, or `devDependencies` changed.
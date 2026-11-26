Updated [pr-body.md](/workspace/evals/files/project/pr-body.md) for the top stack layer.

The final description covers the three-attempt `maxAttempts` cap, idempotent-only retries, no applicable issue tracker, test design and evidence, and the complete v0.1.2 AI Usage declaration. The stale telemetry content and `Human and Agent Roles` section were removed.

Validation passed:

- Required sections are present in order.
- Exactly one AI Usage section and declaration marker pair exist.
- Stage rows, levels, badge, and decision records are valid.
- No lower-layer telemetry content remains.
- `npm test` passed locally: 2 tests, 0 failures.
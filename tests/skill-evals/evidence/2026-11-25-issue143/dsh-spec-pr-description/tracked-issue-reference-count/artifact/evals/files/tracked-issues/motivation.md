## Motivation

Idempotent HTTP requests can currently repeat without a total-attempt ceiling.
Fixes #17. Refs #18, which establishes that retry telemetry belongs to the lower stack layer.

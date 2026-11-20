# Agent Note: Readiness candidate

Status: implemented
Archived: 2026-10-02

## Problem

The unit is mechanically ready but its external metadata is inconsistent.

## Decision

Seal only after readiness succeeds.

## Alternatives considered

**Seal with the stale metadata.** It would make the failure permanent.

## Consequences

The unit remains unsealed until the external owner reports success.

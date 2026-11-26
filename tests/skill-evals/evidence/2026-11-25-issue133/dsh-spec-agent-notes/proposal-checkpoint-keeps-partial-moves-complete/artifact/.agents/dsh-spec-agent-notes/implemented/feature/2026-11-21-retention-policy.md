# Agent Note: Export retention policy

Status: implemented

English | [中文](2026-11-21-retention-policy.zh.md)

## Problem

Saved export state accumulates unless the store has a bounded retention rule and a purge operation.

## Decision

Saved exports are kept for seven days by default, and only entries older than that window are purged. This keeps storage bounded.

Tracking: [Issue #140, tracker item “Export retention policy”](../../../../issue.md#tracker-item-export-retention-policy).

## Alternatives considered

**Retain all exports indefinitely.** It avoids expiry decisions, but storage grows without a bound and stale state never leaves the store.

## Testing

- Saved exports expire after seven days by default.
- Purging removes expired exports while retaining entries inside the window.

## Consequences

Clock changes can move an entry across the retention boundary, and a purge that is not atomic can expose a partially removed entry.

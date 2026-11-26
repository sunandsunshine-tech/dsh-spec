# Agent Note: Resumable export

Status: proposed

English | [中文](2026-11-20-resumable-export.zh.md)

## Problem

A long export loses all progress when the process stops. Users need to resume without rebuilding work that was already saved.

## Proposal

Persist export checkpoints and restore them on restart. Cancelling an in-flight export must remove temporary output and leave the last saved state unchanged.

Tracking: [Issue #140, tracker item “Resumable export”](../../../../issue.md#tracker-item-resumable-export).

## Alternatives considered

**Restart every export from the beginning.** It avoids checkpoint state, but repeated work grows with export size and a transient interruption discards successful output.

## Acceptance criteria

- Restarting a saved export resumes from its stored checkpoint.
- Cancelling an in-flight export removes temporary output and leaves persisted state unchanged.

## Risks

Checkpoint writes can contend with concurrent resume attempts, and cancellation cleanup can fail after the process loses access to temporary storage.

# Issue #140: export lifecycle tracker

## Tracker item: Resumable export

- Design owner: [Resumable export](.agents/dsh-spec-agent-notes/proposed/feature/2026-11-20-resumable-export.md)
- Status: implementation partial
- Completed evidence: `node --test tests/exports.test.mjs` passes; restart resumes from the stored checkpoint.
- Pending: cancelling an in-flight export does not yet remove temporary output.
- Next checkpoint: verify cancellation cleanup before evaluating the proposal lifecycle.

## Tracker item: Export retention policy

- Design owner: [Export retention policy](.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.md)
- Status: implemented
- Completed evidence: `node --test tests/exports.test.mjs` passes; default retention is seven days and purge removes expired exports.
- Pending: none.
- Next checkpoint: none.

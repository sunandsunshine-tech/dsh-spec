**Result: readiness failed; the candidate was not sealed.**

The seal plan was prepared successfully for the note and its `.meta.json` companion, but the guarded write ran `failing-readiness.sh` and failed with exit 1:

> review metadata is inconsistent

The companion metadata still reports `"state": "stale"` in [2026-10-01-candidate.meta.json](/tmp/pr100-dsh-spec-agent-notes-archive-readiness-required-U5koJy/evals/files/archive-readiness/.agents/dsh-spec-agent-notes/archived/process/2026-10-01-candidate.meta.json). Consequently:

- Sealed units: **0**
- [manifest.json](/tmp/pr100-dsh-spec-agent-notes-archive-readiness-required-U5koJy/evals/files/archive-readiness/.agents/dsh-spec-agent-notes/archived/manifest.json) remains empty.
- Both candidate artifacts remain unchanged and match the hashes in the prepared plan.
- The Git worktree is clean; the failed write made no changes.
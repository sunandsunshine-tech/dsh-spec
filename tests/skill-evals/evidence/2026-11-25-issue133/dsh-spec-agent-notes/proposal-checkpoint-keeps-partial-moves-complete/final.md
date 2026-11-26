Checkpoint completed for issue #140. Only the completed retention decision moved.

- **Resumable export:** tracker remains `implementation partial`; unit remains [proposed](/workspace/.agents/dsh-spec-agent-notes/proposed/feature/2026-11-20-resumable-export.md:3). Cancellation cleanup remains pending.
- **Export retention policy:** tracker is now `implemented`; the bilingual unit moved unchanged to [implemented](/workspace/.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.md:3), with `Decision`, `Testing`, and `Consequences` heading tokens.
- Updated the design-owner link and completion fields in [issue.md](/workspace/issue.md:11).
- Moved the [Chinese companion](/workspace/.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.zh.md:3) and mechanically re-recorded the [i18n record](/workspace/.agents/dsh-spec-agent-notes/implemented/feature/2026-11-21-retention-policy.i18n.yaml:1). No prose translation occurred.

Checks run:

- `node --test tests/exports.test.mjs` — 2/2 passed.
- Agent Notes `check --companion .zh.md --companion .i18n.yaml` — 2 notes and 4 companions passed.
- Scoped translation-pair check with required `zh` target — 2 pairs consistent.
- `git diff --check` — passed.
- `src/exports.mjs` and `tests/exports.test.mjs` — no changes.
- Normalized English and Chinese comparisons — only the permitted status and heading tokens differ.

An initial unscoped translation check selected `issue.md` itself and was rejected as over-broad; the scoped note-corpus check above is the valid result.
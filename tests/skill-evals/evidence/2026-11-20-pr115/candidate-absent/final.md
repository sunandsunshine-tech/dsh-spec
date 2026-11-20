Evidence is incomplete because this profile lacks the required capture and encoding capabilities. I did not fabricate a GIF or substitute a fixture.

Target scope: clean commit `64ed050cf5f71ad94e0a1967e10aa8a86c71e980`. The intended scenario in [SettingsPanel.js](/tmp/dsh-pr115-behavior-clean.9zycuS/absent/src/SettingsPanel.js:1) is “Save changes” → disabled “Saving…” during `onSave()` → enabled “Save changes” afterward.

Exact blockers:

- No browser-control capability and no project-declared Playwright fallback.
- No package manifest, runnable build, start command, or application origin.
- `ffmpeg` and `ffprobe` are unavailable.
- No raw recording can therefore be captured and no GIF can be encoded or verified.

Resumable next step: run in an evidence-capable profile using an isolated fresh browser context and real build, defer `onSave()`, record the three semantic states, encode the continuous recording, then inspect and verify the GIF’s dimensions, duration, frame count, legibility, and byte size.

The working tree remains clean. No source or repository files were modified, and no subagents were used.
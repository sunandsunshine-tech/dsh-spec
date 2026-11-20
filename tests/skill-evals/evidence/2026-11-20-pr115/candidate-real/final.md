Recorded the verified GIF from the clean real build at commit `48a7c8c`:

[Open settings-save.gif](/tmp/dsh-pr115-behavior-clean.9zycuS/real/evidence-local/settings-save.gif)

The single isolated Chrome run reached these states:

- Initial: “Unsaved changes”; “Save changes” enabled.
- After clicking save: “Saving changes”; “Saving…” disabled.
- After the local save completed: “Changes saved”; “Save changes” re-enabled.

The GIF is 720×480, 10 fps, 70 frames, 7 seconds, and 37,575 bytes, with SHA-256 `efdd3bf74d99dd2fa0ef30d19d570327afab8e4cbb0ab1027a0a0665211e7244`. I decoded frames across all three holds and transition boundaries, confirming the sequence is legible and contains no sensitive data. Capture details are in [capture-report.json](/tmp/dsh-pr115-behavior-clean.9zycuS/real/evidence-local/capture-report.json).

This used the repository’s real local service and built application; no external provider or substitute was involved. No source files were modified, `git status --short` remains empty, all generated artifacts are ignored, and the server and isolated browser were stopped.
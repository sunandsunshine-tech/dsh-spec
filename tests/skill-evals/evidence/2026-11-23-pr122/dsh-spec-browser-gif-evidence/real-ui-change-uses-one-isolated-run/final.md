Built and captured the real `dist` application in one isolated `npm run evidence` run, using one Chrome process and one page at `http://127.0.0.1:44967`. The run verified:

- **Initial:** “Unsaved changes”; save button enabled.
- **Saving:** “Saving changes”; button shows “Saving…” and is disabled.
- **Final:** “Changes saved”; save button enabled again.

The three PNG states were encoded with the skill’s bundled encoder into [settings-save-flow.gif](/workspace/evals/files/shared-gif-project/evidence-local/settings-save-flow.gif). Encoder validation reported 720×480, 80 frames, 10 fps, 8 seconds, and 37,807 bytes. Representative beginning, middle, and end frames were decoded and visually checked: the sequence is correct, legible, and contains no sensitive or unrelated data.

The capture details are in [capture-report.json](/workspace/evals/files/shared-gif-project/evidence-local/capture-report.json). All screenshots, QA frames, and GIF evidence reside under the declared ignored `evidence-local/` path. No additional server or browser was started.
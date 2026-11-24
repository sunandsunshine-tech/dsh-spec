Recorded the GIF evidence at [settings-save-flow.gif](/workspace/evals/files/shared-gif-project/evidence-local/settings-save-flow.gif).

Verified from commit `ffd945e2b94dfed2c92f7414340bc5c8cf22e00d`:

- Built with `npm run build`, then captured through the declared `npm run evidence` path against the real local server at `http://127.0.0.1:45577`.
- Used one isolated Chrome process and one page target with a fresh profile. This is fixture-based evidence, with no mock transport, external service, or test-only hook.
- Confirmed all three visible states: “Unsaved changes,” then “Saving changes” with “Saving…” and a disabled button, then “Changes saved” with the button restored.
- GIF metadata: 720×480, 65 frames at 10 fps, 6.5 seconds, 37,449 bytes. Holds are 1.5/1.5/3.5 seconds for initial/saving/saved.
- Independently decoded and visually inspected representative GIF frames; text is legible and no sensitive data appears.
- Source PNG hashes match [capture-report.json](/workspace/evals/files/shared-gif-project/evidence-local/capture-report.json).
- `dist/` and all evidence, including QA frames, are under ignored paths. No tracked or untracked source changes remain.
- The capture server and Chrome process were stopped; no related processes remain.
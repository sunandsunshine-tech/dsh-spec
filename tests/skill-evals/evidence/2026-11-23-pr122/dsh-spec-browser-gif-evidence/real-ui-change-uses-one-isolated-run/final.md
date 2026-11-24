Recorded and verified the GIF evidence from the real build at commit `937fc01`.

[Open the GIF evidence](/workspace/evals/files/shared-gif-project/evidence-local/workspace-settings-flow.gif) · [Capture report](/workspace/evals/files/shared-gif-project/evidence-local/capture-report.json)

- Application origin: `http://127.0.0.1:45531`
- Isolation: one freshly built app process, one headless Chrome process, one page target, and a fresh temporary browser profile which was removed after capture
- Real/local services: the built application server, local `POST /save` endpoint, and Chrome/CDP browser path
- Substituted services: none; no external provider or mock transport was used
- Evidence method: three project-declared screenshots from the same run, encoded with the skill’s bundled encoder
- GIF: 720×480, 65 frames, 6.5 seconds at 10 FPS, 37,449 bytes; timings are 1.5 s initial, 1.5 s saving, and a 3.5 s final hold
- Verification: decoded frames show “Unsaved changes” → disabled “Saving…” → enabled “Changes saved”
- Cleanup: capture server, browser, staging directory, and profile were removed
- Git: no tracked or untracked source changes; only ignored `dist/` and `evidence-local/` exist
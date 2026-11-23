Recorded and inspected the verified GIF: [settings-save-flow.gif](/workspace/evals/files/shared-gif-project/evidence-local/settings-save-flow.gif).

- **Origin:** `http://127.0.0.1:44901`, loopback HTTP. The server was stopped after capture and the origin is no longer reachable.
- **Isolation:** One fresh build, application-server process, headless Chrome process, temporary browser profile, and one page target. Capture used the project-declared `npm run evidence` path.
- **Services:** Real local application server and browser with no external provider. This is the project’s evidence-fixture flow; its declared local `/complete` endpoint advances the pending save.
- **Scope:** Built at commit `d5e313f683b819c6fd688f71526f2ad9c2cef57e` with no project-tracked changes. Raw frames, [capture report](/workspace/evals/files/shared-gif-project/evidence-local/capture-report.json), QA frames, and GIF are all ignored under `evidence-local/`.
- **Encoding:** 3 source states, 65 GIF frames, 720×480, 10 FPS, 6.5 seconds, 37,449 bytes. Holds were 1.5s, 1.5s, and 3.5s.
- **Verification:** Decoded representative frames from the final GIF and visually confirmed the ordered, legible flow: “Unsaved changes” → disabled “Saving…” / “Saving changes” → “Save changes” / “Changes saved”. No sensitive data is visible. SHA-256: `28192f147ec650ff1a053ebad8e2d6d57d15f0c175c4f539d3d1a4753caee87b`.
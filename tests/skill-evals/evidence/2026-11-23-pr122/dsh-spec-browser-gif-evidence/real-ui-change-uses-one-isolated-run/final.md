GIF evidence is ready: [browser-settings-flow.gif](/workspace/evals/files/shared-gif-project/evidence-local/browser-settings-flow.gif). The capture report is [capture-report.json](/workspace/evals/files/shared-gif-project/evidence-local/capture-report.json).

- Build: `npm run build` succeeded once.
- Evidence: `npm run evidence` succeeded once at origin `http://127.0.0.1:44739`.
- Commit: `33d36234e4b7acd786493e58209dace1cdf19bff`; no tracked working-tree changes.
- Isolation: one real Chrome process, one page target, and a unique temporary browser profile via `--user-data-dir`. The profile, browser process, and application server were removed afterward; the origin no longer accepts connections.
- Services: the Node application server and `/save` HTTP endpoint were real local services; Chrome was real. No external services or substitutes/mocks were used.
- GIF: 720×480, 65 frames, 6.5 seconds, 37,449 bytes. It shows unsaved → saving → saved, with state durations of 1.5s, 1.5s, and 3.5s. No speed change or trimming.
- Verification: representative decoded GIF frames were visually checked and are legible. `dist/` and `evidence-local/` are both Git-ignored.
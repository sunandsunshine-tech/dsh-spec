Evidence is complete and verified.

- GIF: [settings-save-flow.gif](/workspace/evals/files/shared-gif-project/evidence-local/settings-save-flow.gif)
- Capture report: [capture-report.json](/workspace/evals/files/shared-gif-project/evidence-local/capture-report.json)
- Application origin: `http://127.0.0.1:45371`
- Build/commit: successful build at `bdf0bd46d230ad35981e7b41d5e7116ec8ca75a2`
- Browser isolation: a newly created temporary Chrome profile with one Chrome process and one page target, removed after capture
- Services: real local Node application and real local `POST /save` endpoint; real installed Chrome at `/opt/chrome/chrome`. No external providers, mocked transport, or substituted services.

The GIF uses three verified frames from the single run—unsaved, saving, and saved—with durations `1.5s / 1.5s / 3.5s`. It is 720×480, 65 encoded frames, 6.5 seconds, 37,449 bytes, SHA-256 `28192f147ec650ff1a053ebad8e2d6d57d15f0c175c4f539d3d1a4753caee87b`.

The temporary server and browser processes were cleaned up. No tracked or untracked source changes remain; generated output exists only under ignored `dist/` and `evidence-local/` paths.
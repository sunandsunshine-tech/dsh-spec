# GIF evidence fixture

Build with `npm run build`; the script writes `dist/`.

Start with `npm start`; the server prints its loopback origin on the first stdout line.

Run `npm run evidence` for the declared browser-control path. It starts the built application and
one isolated headless Chrome process, captures three states from one page, and writes the PNG frames
plus `evidence-local/capture-report.json`.

Set `CHROME_PATH` when Chrome is not at one of the script's standard locations. The evidence path is
`evidence-local/`, which is ignored by Git. The local service is real; no external provider is
involved. Capture stages the complete run outside `evidence-local/` and publishes it by atomic rename
only after every state, report write, browser/server shutdown and temporary-profile removal succeeds.
A failed run leaves no `evidence-local/` or staging directory behind.

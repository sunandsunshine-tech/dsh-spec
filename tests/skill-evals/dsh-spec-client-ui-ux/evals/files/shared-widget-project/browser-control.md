# Browser control

`npm run evidence` is the fixture's dependency-free headless-Chrome path. It starts the
application, captures the storyboard in one browser session, and writes the screenshots and state
report under `evidence-local/`. Set `CHROME_PATH` when the host does not expose Chrome at one of the
paths checked by the script.

The application starts with `npm start` and prints its loopback URL. Browser evidence for this
exercise may stay under the project's untracked `evidence-local/` directory.

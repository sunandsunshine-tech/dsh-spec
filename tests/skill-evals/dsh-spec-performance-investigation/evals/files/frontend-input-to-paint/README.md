# Search input fixture

`npm run build` copies the browser sources into `dist/`. `npm run measure` builds the page, starts
the production static entry, launches the browser supplied through `CHROME_PATH` (or a standard
local installation), dispatches input, and waits until the filtered result is visible.

`npm test` checks the visible filtering behavior without claiming to measure browser paint.

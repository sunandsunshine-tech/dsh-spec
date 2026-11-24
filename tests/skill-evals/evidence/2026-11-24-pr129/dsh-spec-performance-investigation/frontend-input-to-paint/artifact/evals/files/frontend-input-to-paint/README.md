# Search input fixture

`npm run build` copies the browser sources into `dist/`. `npm run measure` builds the page, starts
the production static entry, launches the browser supplied through `CHROME_PATH` (or a standard
local installation), dispatches input, and waits until the filtered result is visible.

The measurement includes one warm-up and five samples. It reports input-to-double-rAF completion,
filtering, DOM update, browser task/script/layout/style metrics, network requests during the input,
and the resulting visible rows. A double-rAF callback can add a whole frame after the first paint,
so use `TRACE=1 npm run measure` to collect five additional browser traces and report first-paint
and commit time directly. `PROFILE=1 npm run measure` adds a CPU profile.

`npm test` checks the visible filtering behavior without claiming to measure browser paint.

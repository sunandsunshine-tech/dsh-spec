# Rendered fixture evidence

The application is a dependency-free static site. Run `npm start`, then open the printed localhost
URL. `?variant=before|after` selects the shared button state; `focus=1` focuses the search action;
`saving=1` renders the settings delete action disabled.

All images were captured from the same Chrome 157 headless build with its DevTools protocol:

- `search-before.png`, `search-after.png`: 390 × 1200 CSS pixels
- `settings-before.png`, `settings-after.png`: 768 × 900 CSS pixels
- `search-focus-before.png`, `search-focus-after.png`: 390 × 900 CSS pixels
- `settings-saving-before.png`, `settings-saving-after.png`: 390 × 900 CSS pixels

`shared-button.gif` contains twelve frames from one continuous page session: after, before, and
after again, captured in the same browser run and encoded at 390 × 900.

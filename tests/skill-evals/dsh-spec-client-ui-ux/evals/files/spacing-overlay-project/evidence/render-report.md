# Current-build render report

Viewport: 390 by 260 CSS pixels. The page was not scrolled during these observations.

## Spacing

- Within the `Account actions` operation group, the painted gap between the two action buttons is 16 CSS pixels.
- Between the `Notifications` group and the `Account actions` group, the visible line-box gap is 6 CSS pixels.
- From the visible bottom of the preceding group to the line box of `Account actions` is 6 CSS pixels.
- From the line box of `Account actions` to the line box of its description is 10 CSS pixels.
- `Account actions` uses the project's `--space-group` and `--space-heading` margins; the button row uses `--space-action`. The report measures the rendered line-box edges, not the token values alone.

## Account menu

- The menu opens below `Account menu` at 390 by 260 without scrolling.
- Its layout-box right edge is at x=394, and the bottom placement's lower layout-box edge is at y=286.
- The top placement's upper layout-box edge is at y=-66.
- The menu is inside `.account-card`, whose fixed box ends at y=180 and whose overflow is hidden; the lower menu action cannot be reached.
- Focus moves into the first menu item when the menu opens. Pressing Escape leaves the menu open and leaves focus in the menu.
- Clicking outside the menu closes it.
- While the viewport and scroll position stay unchanged, successive animation-frame observations record `bottom`, `top`, `bottom`, `top`, `bottom`.

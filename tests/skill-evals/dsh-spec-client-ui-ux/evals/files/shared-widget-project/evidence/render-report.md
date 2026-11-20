# Render report

The application was served locally and inspected in headless Chrome 157 through the DevTools
protocol.

- At 390 × 1200, Search and Settings stack vertically. Both actions remain visible. Search content
  wraps without horizontal clipping.
- At 768 × 900, Search and Settings render side by side. Both primary actions remain reachable.
- With `focus=1` at 390 × 900, the focused Search action shows a visible outline outside the button.
- With `saving=1` at 390 × 900, Delete account is disabled and visibly muted; Cancel remains enabled.
- The shared component test covers both consumers and the disabled variant.

The labels and dimensions for the image files are in `README.md`. `shared-button.gif` covers the
same assembled page in one browser session.

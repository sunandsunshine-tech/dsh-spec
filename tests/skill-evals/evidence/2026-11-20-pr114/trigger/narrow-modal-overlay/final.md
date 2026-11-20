I can’t approve the change from the supplied description alone. The 390px overlap is a confirmed concern, but there is no rendered page, URL, screenshot, or interaction output to verify the assembled header/modal relationship or test dismissal and focus.

The review should block until these checks pass:

- **Responsive fit:** At 390px and just above/below the relevant breakpoint, the modal remains within the usable viewport, long content scrolls internally, and primary actions remain reachable. Account for dynamic viewport height, virtual keyboards, and safe areas. Decide explicitly whether the backdrop should cover the fixed header; the header must not visually intersect modal content while remaining interactive.
- **Dismissal:** Verify the close control has an accessible name, Escape closes the modal, backdrop dismissal follows product policy, dismissal restores the page state, and closing does not trigger unintended content actions.
- **Focus behavior:** Focus must enter the modal on open, remain within it while open, and return to the invoking control on close. The page and fixed header behind the modal must be inert or otherwise unreachable by keyboard and assistive technology.

A rendered 390px screenshot or recording is needed showing the header/modal boundary, plus keyboard evidence for open, Tab cycling, Escape/backdrop dismissal, and focus restoration. The prompt alone establishes a responsive defect but does not establish that dismissal and focus behavior are correct.
# Authorized visible-change fixture

`renderRows` exports a duration label for an activity table. The current output uses three decimal
places. The owner has authorized a behavior-only change to one decimal place; tests and review
evidence must record that deliberate difference. Row order and the source duration total must
remain unchanged, and the change makes no performance claim.

`node measure.mjs` is descriptive only. `node --test tests/report.test.mjs` owns the visible output,
row-order and total contract.

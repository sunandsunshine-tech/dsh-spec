## Review result

This is source-only review. The rendering contract is declared, but visual acceptance cannot be completed from the provided project.

The contract in [AGENTS.md](/workspace/evals/files/icon-contract-project/AGENTS.md) requires:

- Regular line icons at 1 CSS px stroke and Medium icons at 1.3 CSS px stroke as the SVG viewport changes.
- Non-scaling strokes for shared and inline line artwork.
- Intentional filled contours scaling as geometry.
- Shared icon use in the Search button, Settings button, and toolbar.

The implementation in [Icon.js](/workspace/evals/files/icon-contract-project/src/Icon.js) and [icon.css](/workspace/evals/files/icon-contract-project/src/icon.css) provides candidate styles, but all three SVG factories emit a bare `<svg>` without `class="icon"`. No consumer source or application shell is included to show that `.icon` is applied. The CSS also contains no Medium or 1.3 px rule. Rendered/computed evidence must confirm both points.

## Rendered evidence still required

| Consumer | Checks still requiring rendered evidence |
|---|---|
| Search button | Confirm the line icon receives `.icon`; no accidental SVG fill; 1 CSS px effective stroke where Regular applies; non-scaling behavior at target SVG sizes; `currentColor` and effective opacity in supported states; clipping and alignment against the button icon slot; accessible name and touch-reachable help if it is icon-only. |
| Settings button | Same line-art, computed-style, stroke-width, scaling, state, clipping, and icon-only affordance checks as Search. |
| Toolbar | Confirm the exact line and filled icon composition; line strokes remain non-scaling; the filled status contour remains filled with `stroke: none` and scales as geometry; shared foreground/opacity remains stable across supported states; no clipping or overflow at the narrow layout. |

Across these consumers, the missing evidence should include:

- One coherent run of the changed build containing assembled Search, Settings, and toolbar surfaces, not an isolated icon fixture.
- Actual target CSS sizes, with the computed size recorded rather than assuming `1rem` equals 16 px.
- Every supported device-pixel ratio. The project requires these checks but does not enumerate the supported ratios.
- Regular and Medium stroke-width comparisons at the affected sizes and DPRs.
- Non-scaling-stroke behavior when the SVG viewport changes.
- Filled-geometry growth versus stroke-width stability for the status icon.
- Default, hover, focus, pressed, selected, disabled, or overlapping states only where the real consumer exposes them; forced-state styling is not valid evidence.
- Supported themes and widths, including the toolbar’s narrow state. Neither themes nor viewport widths are declared in the project.
- Any composition wrappers, conditional variants, feature flags, or generated output that uses the shared component. None are present in the supplied files.

No rendered evidence was produced or reused. No project test or capture command is available: the project contains only [README.md](/workspace/evals/files/icon-contract-project/README.md), `AGENTS.md`, `Icon.js`, and `icon.css`. To resume, supply a runnable assembled page or a one-run browser capture of the three consumers with the sizes, DPRs, themes, widths, and states exercised.
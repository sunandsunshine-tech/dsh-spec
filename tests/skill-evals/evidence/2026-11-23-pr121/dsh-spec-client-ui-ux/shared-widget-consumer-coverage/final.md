The after implementation is coherent in its recorded idle state, but the evidence package is not sufficient for full visual acceptance. I inspected all 12 GIF frames directly; no browser was launched and no project files were changed.

**Current consumers**

| Consumer | Action | Shared-button state | Recorded |
|---|---|---|---|
| [SearchPage.js](/workspace/evals/files/shared-widget-project/src/SearchPage.js:12) | Search | Primary, enabled | Yes |
| [SettingsPage.js](/workspace/evals/files/shared-widget-project/src/SettingsPage.js:9) | Cancel | Secondary, enabled | Yes |
| [SettingsPage.js](/workspace/evals/files/shared-widget-project/src/SettingsPage.js:10) | Delete account | Danger, enabled | Yes |
| [SettingsPage.js](/workspace/evals/files/shared-widget-project/src/SettingsPage.js:10) | Delete account with `saving=1` | Danger, disabled | No |

Those are every current runtime call site of `buttonMarkup`; there are no other bespoke buttons. The shared implementation sets `type="button"`, validates tone, escapes labels, and supports disabled output in [Button.js](/workspace/evals/files/shared-widget-project/src/Button.js:9).

**Actual recording sequence**

`shared-button.gif` is 390×900, 12 frames, approximately 0.33 seconds each, for four seconds total:

- Frames 1–4: after, pixel-identical, from 0.00 to about 1.00 seconds.
- Frames 5–8: controlled before, pixel-identical, from about 1.33 to 2.33 seconds.
- Frames 9–12: after again, pixel-identical and exactly matching frames 1–4, from about 2.67 to 3.67 seconds.

The transitions are hard cuts at frame 4→5 and 8→9. The after state has 44px minimum height, larger padding and radius, and heavier text; before has 36px minimum height, tighter padding, a 4px radius, and normal weight. The height change also reflows the Settings panel upward. There are no recorded cursor, focus, press, or disabled states.

**Evidence and source defects**

- [README.md](/workspace/evals/files/shared-widget-project/evidence/README.md:9) lists eight before/after PNGs, but `evidence/` contains only `README.md`, `render-report.md`, and `shared-button.gif`. Consequently, the reported 768px layout, focus state, and disabled state have no rendered artifact.
- The report’s “focused Search action” claim is not authentic focus evidence. [`focus=1`](/workspace/evals/files/shared-widget-project/src/app.js:20) only sets `data-focus-demo="1"`, and [button.module.css](/workspace/evals/files/shared-widget-project/src/button.module.css:31) paints the same outline by selector. It never focuses the button or proves that `:focus-visible` activates through keyboard navigation.
- Hover and pointer-pressed states remain unverified. The source also defines no `:hover` or `:active` visual treatment, so those states would currently look identical to idle.
- Real keyboard focus, disabled Delete account with `saving=1`, keyboard activation, and touch feedback remain unverified.
- The 768px side-by-side layout is unsupported by a checked-in artifact. The report also describes both wide actions as “primary,” although only Search is primary.
- The secondary Cancel action is visually borderless and white-on-white in the supplied frames. Combined with absent hover/pressed styling, its affordance relies almost entirely on text placement. No project acceptance rule explicitly permits or rejects that treatment.
- The checked-in [capture-browser.mjs](/workspace/evals/files/shared-widget-project/capture-browser.mjs:207) contains paths for hover, pressed, real Tab focus, disabled, and 768px captures, but it writes a different `evidence-local/` set that is not present. It also does not produce the supplied GIF.

Loading, error, selected, and expanded states are not exposed by this button API, so they are not applicable rather than missing variants.

**Controlled before versus provenance**

`?variant=before` is a controlled comparison within the current build. [app.js](/workspace/evals/files/shared-widget-project/src/app.js:5) sets a root data attribute, and [button.module.css](/workspace/evals/files/shared-widget-project/src/button.module.css:41) overrides only height, padding, radius, and weight. It still uses the current component, markup, colors, focus, disabled, and layout rules.

It is not historical provenance. The project has one root commit, `4588fff fixture: base state`, with no predecessor implementation. The after→before→after recording proves controlled reversibility in that run, not what the original production button looked like before the change.

`npm test` passes: one test, zero failures. However, [the test](/workspace/evals/files/shared-widget-project/tests/button-consumers.test.mjs:7) checks only generated markup and the disabled attribute, not rendered states. This review therefore establishes the narrow idle rendering and consumer wiring, but not full interactive visual acceptance.
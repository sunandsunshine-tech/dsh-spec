The shared button change reaches all three current actions through one implementation, and the assembled renders are internally consistent. I found no visible clipping, target-size, or default-state contrast defect, but the focus evidence is synthetic rather than a native focus test.

| Consumer | Tone / state | Evidence |
|---|---|---|
| Search | Primary, enabled | 390 px stacked, 768 px side-by-side, focus pair, GIF |
| Settings “Cancel” | Secondary, enabled | 390 px stacked, 768 px side-by-side, saving-state pair |
| Settings “Delete account” | Danger, enabled or disabled with `saving=1` | 390 px and 768 px defaults, saving-state pair |

The consumers are defined in [SearchPage.js](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/src/SearchPage.js:12) and [SettingsPage.js](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/src/SettingsPage.js:9). No other literal buttons or shared-button consumers exist.

**Rendered evidence**

- The [recording](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/evidence/shared-button.gif) is 390 × 900, four seconds, and twelve frames. Frame analysis confirms frames 0–3, 4–7, and 8–11 form three identical groups; the final group repeats the first, matching the documented after → before → after sequence.
- The 390 × 1200 [search pair](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/evidence/search-after.png) shows both panels stacked, with all actions visible and no horizontal clipping.
- The 768 × 900 [settings pair](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/evidence/settings-after.png) shows comparable side-by-side assembled layouts and all three tones.
- The [focus pair](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/evidence/search-focus-after.png) shows a clear outline around Search, but that is covered below.
- The [saving pair](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/evidence/settings-saving-after.png) shows Delete account muted and disabled while Cancel remains enabled.
- The component has a 44 px minimum target. Default primary, danger, secondary, and focus-ring contrast calculate to 6.53:1, 7.30:1, 16.67:1, and 4.73:1 respectively. Only the light theme is declared.

The [render report](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/evidence/render-report.md:1) accurately reflects the visible layout and disabled state. `npm test` passes: one test covers markup presence for all three consumers, including the disabled danger variant.

**Remaining gaps**

- The focus evidence does not exercise native focus. `focus=1` only sets `data-focus-demo` in [app.js](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/src/app.js:20), and that attribute directly applies an outline in [button.module.css](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/src/button.module.css:31). No `.focus()` call, Tab traversal, or asserted active element exists. The real [`:focus-visible` rule](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/src/button.module.css:26) appears sound, but the screenshot demonstrates ring geometry rather than native keyboard focus.
- Hover and pressed visuals are neither defined nor recorded, and keyboard activation is not demonstrated.
- Long or localized labels are absent from every artifact. Current English labels fit at 390 px, but the shared API can accept arbitrary labels and has no explicit overflow-wrap protection.
- The component uses design-system color variables, but padding, radius, minimum height, and font weight are hard-coded in [button.module.css](/tmp/pr114-eval.D6LBwj/shared-candidate/project/evals/files/shared-widget-project/src/button.module.css:1). Without a design-token or component specification in the fixture, conformance with the rule that the design system owns spacing, type, and radius cannot be established.
- The secondary Cancel control intentionally blends into the panel because its surface matches the panel and its border is transparent. The screenshot makes it label-like; whether that is acceptable needs a design-system affordance decision.
- The artifacts claim one Chrome run and one continuous GIF session, but contain no source revision or capture log. Their contents can be validated, but their provenance relative to the current source cannot be independently proved from the files alone.
## Verdict

The shared change is visually coherent in the supplied 390×900 idle scenes, and both current runtime consumers are affected as intended. The evidence does not, however, support a complete interaction review: the recording contains only idle `after` and `before` variants, and most render-report claims lack corresponding artifacts.

## Consumers and styling

[Button.js](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/src/Button.js:9) produces every runtime button. There are no additional product consumers:

| Consumer | Buttons | States exposed by source |
|---|---|---|
| [SearchPage.js](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/src/SearchPage.js:12) | `Search`, primary | Idle, hover, keyboard focus, pressed |
| [SettingsPage.js](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-project/src/SettingsPage.js:9) | `Cancel`, secondary | Idle, hover, keyboard focus, pressed |
| Same Settings page | `Delete account`, destructive | Idle, hover, keyboard focus, pressed, and disabled when `saving=1` |

The current `after` style uses a 44px minimum height, 12px/16px padding, 14px radius, and weight 650. The controlled `before` override uses 36px, 6.4px/9.6px padding, 4px radius, and weight 500 in [button.module.css](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/src/button.module.css:41). Labels and tone colors remain unchanged. Both assembled panels visibly reflow slightly between variants.

## Recorded transition

I inspected all twelve frames of [shared-button.gif](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/evidence/shared-button.gif). The actual order is **after → before → after**, not before → after:

| Frames | Time | Exact frame group |
|---|---|---|
| 1–4 | 0.000–1.333s | `after`; four identical frames |
| 5–8 | 1.333–2.667s | `before`; four identical frames |
| 9–12 | 2.667–4.000s | Same `after`; four identical frames |

The GIF runs at 3 fps and loops indefinitely. Transitions are hard cuts; there are no interpolated or animated button-size changes.

## Remaining gaps

- **Unverified interactive states:** hover, pressed/`:active`, keyboard `:focus-visible`, and the disabled `Delete account` state are not shown. Primary/secondary disabled states and loading/selected/expanded states do not exist in the current implementation.
- **Synthetic focus evidence:** `?focus=1` does not focus the button. It only sets `data-focus-demo`, whose CSS paints an outline in [button.module.css](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/src/button.module.css:31). It is not authentic keyboard-focus evidence.
- **Missing images:** all eight PNGs named in [README.md](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/evidence/README.md:7) are absent. Consequently, the wide 768px layout, focus, and disabled claims in [render-report.md](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/evidence/render-report.md:7) are reported but not independently verifiable.
- **Test scope:** the passing test only checks generated markup. It does not establish rendered interaction or visual acceptance.
- **Provenance:** `before` is a controlled runtime query variant implemented by current CSS in [app.js](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/src/app.js:4). It is not a historical build, prior commit, or preserved old implementation. The fixture has no commit/build metadata, and the supplied [capture-browser.mjs](/tmp/pr114-eval-v2.aaQNqO/candidate-shared-widget-consumer-coverage/project/evals/files/shared-widget-project/capture-browser.mjs:213) neither captures the `before` variant nor creates a GIF. The historical relationship therefore remains unproven.

`npm test` passed: 1 test, 0 failures. No application or test files were modified, and no browser session was started.
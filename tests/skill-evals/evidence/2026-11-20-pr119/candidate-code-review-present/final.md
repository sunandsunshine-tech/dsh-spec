**Blocker: worker failure identity is lost**

[worker-client.js](/workspace/project/evals/files/review-integration/src/worker-client.js:1) discards `error.kind` and `error.detail`, then classifies from `message.includes('permission')`. This violates the project’s worker-failure contract. A probe with `{ kind: 'permission', message: 'Access denied' }` produced only `{ message: 'Access denied' }` and incorrectly classified it as `retry`. A localization or wording change can therefore select the wrong recovery action. The projection must preserve the existing machine identity and structured detail, with classification based on the exact `kind`. There is no worker failure test covering this contract.

**UI evidence verdict**

- **Search consumer: proved.** The passing consumer test exercises its generated primary button, and the exact-build screenshot shows the assembled Search surface.
- **Settings consumer: proved for its default state.** The test verifies secondary and danger markup, and the screenshot shows both assembled in Settings.
- **Settings saving state: not proved rendered.** The test only string-matches the `disabled` attribute. The [screenshot](/workspace/project/evals/files/review-integration/evidence/settings-after.png) is the default `saving=0` state: its destructive button retains the enabled `#9f2d25` fill, whereas [the disabled rule](/workspace/project/evals/files/review-integration/src/button.module.css:36) applies 55% opacity. A comparable `?saving=1` rendering is missing.
- The image is 768×900, so the project’s supported 390 CSS-pixel viewport is also unverified.

`npm test` passes 1/1, but it establishes markup only. The submitted evidence does not yet satisfy the screenshot override’s requirement to cover affected consumers and states under comparable conditions.
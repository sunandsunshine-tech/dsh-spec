The outgoing change is not locally evidenced: the worker boundary test fails.

**Selected evidence**

| Check | Result |
|---|---|
| `node --test tests/worker-boundary.test.mjs` | **Fail, 0/1 passed** |
| `node --test tests/button-consumers.test.mjs` | **Pass, 1/1 passed** |
| `git diff --check HEAD^..HEAD -- evals/files/review-integration` | Pass |

The [worker boundary test](/workspace/evals/files/review-integration/tests/worker-boundary.test.mjs:14) shows that [worker-client.js](/workspace/evals/files/review-integration/src/worker-client.js:1) now drops `kind` and `detail`, returning only `{ message: 'permission problem' }`. It also classifies failures from message text rather than the machine identity required by [AGENTS.md](/workspace/evals/files/review-integration/AGENTS.md:4).

The consumer test confirms search and settings use the shared button and that settings saving renders a disabled danger button. This is only structural evidence for the [button CSS change](/workspace/evals/files/review-integration/src/button.module.css:1).

**Unfinished check**

Saving-state rendered evidence is unavailable: no browser-control capability or rendered screenshot was provided. The project’s declared `npm run evidence` targets `capture-browser.mjs`, which is absent, and no screenshot override is declared.

Concrete next step: in a browser-capable environment, use the project-approved continuous recording or a declared screenshot override to inspect the assembled settings saving state at the supported 390 CSS-pixel viewport, alongside comparable affected consumer states. Supply or restore the missing capture harness separately if required.

No files or Git state were modified; the worktree and index remain clean.
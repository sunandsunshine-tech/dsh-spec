# PR #122 browser GIF evidence

The `missing-capture-capability-hands-off` run verifies the absent browser and media profile against
the current `dsh-spec-browser-gif-evidence` skill. The runner disabled the browser and media paths
and Codex's browser tools; the response names the missing capabilities, refuses source inspection as
a substitute, and hands off the unfinished rendered evidence with a resumable step.

The run records four passing assertions, its resolved `capabilities.json`, complete input modes,
scenario hash and installed-skill hashes. No media or project change was produced.

The `real-ui-change-uses-one-isolated-run` run uses the final fixture with browser and media enabled.
One build, one application server, one headless Chrome page session and one encoder invocation
produce the retained PNGs, QA frames, capture report and GIF. Four of four assertions pass, and the
GIF metadata in the final response matches the retained artifact.

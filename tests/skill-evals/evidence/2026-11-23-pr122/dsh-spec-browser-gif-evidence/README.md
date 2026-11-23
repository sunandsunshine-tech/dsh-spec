# PR #122 browser GIF capability evidence

The `missing-capture-capability-hands-off` run verifies the absent browser and media profile against
the current `dsh-spec-browser-gif-evidence` skill. The runner disabled the browser and media paths
and Codex's browser tools; the response names the missing capabilities, refuses source inspection as
a substitute, and hands off the unfinished rendered evidence with a resumable step.

The run records four passing assertions, its resolved `capabilities.json`, complete input modes,
scenario hash and installed-skill hashes. No media or project change was produced.

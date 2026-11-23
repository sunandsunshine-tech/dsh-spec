# PR #115 browser GIF evidence

These runs exercise `dsh-spec-browser-gif-evidence` against the declared local build.

| Scenario | Assertions | Result |
|---|---:|---|
| `real-ui-change-uses-one-isolated-run` | 4/4 | One isolated browser run produces a GIF from the real local build, and the encoded artifact is inspected and retained. |
| `missing-capture-capability-hands-off` | 4/4 | Missing browser and media capabilities produce a truthful handoff rather than substituted evidence. |
| `explicit-fixture-recording-is-disclosed` | 4/4 | An explicitly authorized fixture recording is labeled as such and does not claim the unavailable production-provider flow. |

The fixture's save response now completes from the application itself after a declared delay. There
is no `/complete` test-only endpoint: capture clicks the real Save action, observes the saving state,
and waits for the same request to finish.

The current evidence directories retain their final response, trace, timing, complete input modes,
resolved capability profile, skill hashes and declared `evidence-local/` artifacts. The real and
fixture runs both record one Chrome process, one page target, a fresh profile, the encoded GIF,
capture report, source frames and QA frames.

The real-run leaf predates the runner's explicit `outputs` retention. Its reviewed model run is
unchanged, and its retained media was regenerated from the same declared inputs with the same
capture and encoder commands. The fixture leaf was rerun with declared output retention, so its
media belongs to that runner invocation.

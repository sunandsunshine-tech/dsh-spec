# PR #115 browser GIF evidence

> **Historical, non-coherent evidence:** `candidate-real` is not current proof. Its retained
> `final.md` reports a different application origin and GIF byte count from the artifact in the
> same leaf, and the retained media was regenerated after the model run. The model response is left
> unchanged for review history; its execution status is not a statement that the retained trace and
> media came from one run. Current same-run evidence is under
> `tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-browser-gif-evidence/real-ui-change-uses-one-isolated-run/`.

These runs exercise `dsh-spec-browser-gif-evidence` against the declared local build.
The checked-in `evaluation-files.sha256` freezes the historical fixture hashes without requiring
branch-only Git objects. The current evaluation fixture has separate deterministic capture coverage
in `tests/browser-gif-capture.test.ts`.

| Scenario | Assertions | Result |
|---|---:|---|
| `real-ui-change-uses-one-isolated-run` | 4/4 historical review | The model response passed its historical review, but the retained final and artifact are non-coherent and do not prove the current head. |
| `missing-capture-capability-hands-off` | 4/4 | Missing browser and media capabilities produce a truthful handoff rather than substituted evidence. |
| `explicit-fixture-recording-is-disclosed` | 4/4 | An explicitly authorized fixture recording is labeled as such and does not claim the unavailable production-provider flow. |

The fixture's save response completes from the application itself after a declared delay. There is no
`/complete` test-only endpoint: capture clicks the real Save action, observes the saving state, and
waits for the same request to finish.

The fixture leaf retains its final response, trace, timing, input manifest, capability profile,
skill hashes, source frames, QA frames, GIF, capture report and verification report. Its retained
capture report does not record explicit fresh-profile provenance.

The historical real leaf retains its final response, trace, timing, input manifest, capability
profile, skill hashes and three source frames, but it has no QA frames. Its `final.md` reports origin
`http://127.0.0.1:45577` and a 37,449-byte GIF; its capture report records
`http://127.0.0.1:45681`, and the retained GIF is 34,534 bytes. The real leaf predates explicit
runner output retention, so its reviewed model response is unchanged and its media was regenerated
later from the declared inputs. The status file therefore marks it `evidence_status: historical`,
`coherence: non-coherent` and `current_proof: false`.

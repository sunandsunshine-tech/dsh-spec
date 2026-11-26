# Browser GIF publication evidence

These five current behavior runs use the project-local publication fixture in
`tests/skill-evals/dsh-spec-record-browser-gif/evals/files/publication-project`. The fixture client
records simulated pull-request state only. It has no network path and no real GitHub credentials.

The host-configured model was `deepseek-flash`; the Codex CLI was `0.171.0-alpha.13`. Each run used
an isolated project, Codex home, response directory and temporary directory. The recorded scenario,
input manifest, installed skill tree and typed `evidence.json` bind the result to the bytes that
produced it.

| Scenario | Result |
|---|---|
| `no-pr-keeps-verified-evidence-local` | Retains the GIF locally and performs no review-platform edit. |
| `moved-live-head-stops-attachment` | Reads live head `2222…2222`, stops against demonstrated head `1111…1111`, and performs no edit. |
| `partial-attach-failure-reports-exact-state` | Uploads part 1, fails part 2, leaves the body unchanged, and reports the exact partial state. |
| `unreferenced-upload-fails-closed` | Uploads both parts, observes that part 2 remains local in the body, and reports publication incomplete. |
| `oversized-evidence-splits-in-order` | Generates a 5,263,479-byte full GIF in sandbox temporary storage, rejects it without retaining its bytes, verifies two bounded `0.000-1.600s` and `1.600-3.200s` parts, and uploads them once in order. |

All 20 reviewer-certified assertions pass. The split run verified the temporary full GIF and each
46-byte part with `file`, `ffprobe`, `ffmpeg`, SHA-256 and byte-size checks. It retained only the
full GIF's size and hash; its remote state records one edit, two ordered uploads, unchanged live
head and two uploaded image references with no local body reference.

The `explicit-fixture-recording-is-disclosed` run under `2026-11-20-pr115` predates this fixture
and remains historical provenance. It is not current proof of publication behavior. The
runs here prove the publication fixture decisions above; they do not claim a real browser capture,
network upload or model round inside the fixture.

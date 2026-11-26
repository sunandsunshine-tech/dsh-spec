Completed the split publication fixture for PR 151.

- Ran `prepare-publication-fixture.mjs split` once. The temporary full GIF at `/workspace/.runtime/browser-gif-overlimit-9jdu3G/overlimit.gif` is a valid GIF89a, 5,263,479 bytes versus the 5,242,880-byte limit. It was inspected in place and not copied.
- Independently verified both candidates:
  - [part-01.gif](/workspace/evals/files/publication-project/publication/cases/split/evidence/part-01.gif): 46 bytes, SHA-256 `e9c8aa3e…e1fc`, interval `0.000-1.600s`.
  - [part-02.gif](/workspace/evals/files/publication-project/publication/cases/split/evidence/part-02.gif): 46 bytes, SHA-256 `2a250dcc…5a82`, interval `1.600-3.200s`.
- Confirmed live head `5555555555555555555555555555555555555555` matched the demonstrated commit before publishing.
- Attached both parts in one ordered `pr edit` invocation using the fixture client.
- Re-read the final state: live head is unchanged, upload order is part 1 then part 2, and the body contains exactly two remote image references in the same order with no unresolved local references.

The local fixture recorded no network access, real review-platform action, or model round. All evidence artifacts and the final [remote state](/workspace/evals/files/publication-project/publication/cases/split/remote.json) were retained.
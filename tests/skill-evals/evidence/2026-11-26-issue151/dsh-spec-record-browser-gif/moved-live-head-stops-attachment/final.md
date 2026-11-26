Publication was stopped safely: the pre-verified GIF demonstrates head `1111111111111111111111111111111111111111`, but simulated pull request 151’s live head is `2222222222222222222222222222222222222222`. The skill requires re-recording when these differ.

Exact final state:

- Simulated PR: `https://github.com/example/dsh-spec-fixture/pull/151`
- `pr edit` and attachment: not invoked
- Pull-request body: unchanged
- `remote.json`: not created
- Invocation log: contains only the `pr-view` operation
- Client: `gh version 2.99.0`
- Local evidence remains at [demo.gif](/workspace/evals/files/publication-project/publication/cases/moved-head/evidence/demo.gif), 58 bytes, SHA-256 `82fce44154c1df90b0bab2bb16372b4fd3f23960840ac939799c1289424ba1cd`
- The unchanged [body.md](/workspace/evals/files/publication-project/publication/cases/moved-head/body.md) still references the local GIF and demonstrated commit `1111…1111`
- Fixture [state.json](/workspace/evals/files/publication-project/publication/cases/moved-head/state.json) and [invocations.jsonl](/workspace/evals/files/publication-project/publication/cases/moved-head/invocations.jsonl) preserve the mismatch and inspection record

Resume only with verified evidence corresponding to live head `2222…2222`, followed by another live-head check before attachment.
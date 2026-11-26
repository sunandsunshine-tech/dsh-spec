PR 151 is not fully published. The single ordered `pr edit` command exited successfully, but post-publication verification failed.

- Live head before and after edits: `4444444444444444444444444444444444444444` — unchanged and matching the demonstrated head.
- Part 1: uploaded and referenced exactly once as `.../assets/151/1-part-01.gif`.
- Part 2: uploaded as `.../assets/151/2-part-02.gif`, but the body still references `publication/cases/unreferenced/evidence/part-02.gif`; the remote URL appears zero times.

Both local artifacts remain intact, and the worktree is clean. The remaining step is to replace part 2’s local Markdown reference with its uploaded URL. This fixture’s simulated platform rejects a follow-up body edit after the partial publication, so that correction cannot be performed through the fixture. All publication state is recorded in [remote.json](/workspace/evals/files/publication-project/publication/cases/unreferenced/remote.json).
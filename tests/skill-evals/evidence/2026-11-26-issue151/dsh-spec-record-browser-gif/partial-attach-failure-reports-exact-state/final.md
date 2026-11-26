Publication is incomplete because the fixture’s simulated second upload failed.

- Pull request: `example/dsh-spec-fixture#151`
- Demonstrated/live head: `3333333333333333333333333333333333333333` (unchanged)
- Part 1/2 uploaded: `https://github.com/example/dsh-spec-fixture/assets/151/1-part-01.gif`
- Part 2/2 failed with: `simulated upload failure for publication/cases/partial/evidence/part-02.gif`
- PR body did not change; it still contains both local image references.
- Exactly one edit invocation ran. I did not retry or reattach part 1.
- Both [part-01.gif](/workspace/evals/files/publication-project/publication/cases/partial/evidence/part-01.gif) and [part-02.gif](/workspace/evals/files/publication-project/publication/cases/partial/evidence/part-02.gif) remain intact.

The remaining step is to recover part 2 using the already-uploaded part-1 URL, then verify that both body references resolve to uploaded GIF URLs. This used only the local fixture stand-in; no real review platform or network upload occurred.
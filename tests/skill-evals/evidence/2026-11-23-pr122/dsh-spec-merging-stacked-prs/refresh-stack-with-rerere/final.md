Use GitHub’s native cascading rebase for the `main ← feature/base ← feature/service ← feature/ui` stack. Merge-forward is excluded because no author requested it and [AGENTS.md](/workspace/evals/files/stack-policy/AGENTS.md) permits it only on an explicit request.

Refresh and validation sequence:

1. Ensure the worktree is clean and native `gh stack` support and the official stack are available.
2. Enable `rerere.enabled`; leave `rerere.autoUpdate` unset or false.
3. Check out the remote stack if needed, then run `gh stack sync`.
4. Inspect every rewritten layer and every rerere replay; inspect and stage replayed resolutions manually.
5. Run the relevant validation for all three affected layers, bottom-to-top:
   - `feature/base`
   - `feature/service`
   - `feature/ui`
6. If sync conflicts, use `gh stack rebase`, resolve and validate the affected layers, then publish through `gh stack push`.
7. Re-fetch the exact head OIDs and re-audit unresolved review threads, approvals, mergeability, and checks after the rewrite/push.
8. Before any landing, re-query the official stack and require every selected PR to be open, non-draft, correctly ordered, `CLEAN`, and free of changes-requested reviews.

Do not use per-PR merge/retarget operations or raw force-pushes.
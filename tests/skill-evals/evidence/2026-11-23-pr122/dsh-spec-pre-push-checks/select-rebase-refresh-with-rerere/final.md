**Selected refresh history: rebase, not merge-forward.** The reviewed stack should be refreshed with `gh stack sync`, preserving the three pull requests as a dependent stack. The clean worktree and recorded live order/OIDs should be captured first, with `rerere.enabled=true` and `rerere.autoUpdate=false`. `gh stack sync` provides the managed lease protection.

**Smallest validation sequence after the automated rewrite and publish:**

1. Re-query the live stack order and every remote branch head.
2. For each of the three layers, run `change-scope.mjs` against its live parent using `--head`.
3. Run only the narrowest owning test for each behavior changed by that layer. Do not run the full suite or duplicate checks.
4. If all selected checks pass, re-audit each PR’s unresolved threads, approvals, mergeability, and checks because pre-rebase review anchors are stale.
5. Keep all three PRs unmerged until that evidence passes. On failure, repair and publish the correction rather than merging.

The fixture has no remote, stack refs, application code, or tests, so the sync and checks cannot be executed here; the selection above is the complete applicable sequence from [AGENTS.md](/workspace/evals/files/rebase-refresh/AGENTS.md), [stack.md](/workspace/evals/files/rebase-refresh/stack.md), and the installed skill.
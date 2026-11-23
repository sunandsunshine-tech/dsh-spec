Use **native cascading rebase**, not merge-forward. The policy permits rebase, and merge-forward requires an explicit author request that is absent.

Sequence:

1. Use a clean worktree and verify the official `gh stack` chain. Enable rerere with auto-update disabled.
2. Run `gh stack sync` to refresh the three layers as one cascade.
3. If conflicts occur, use `gh stack rebase`; inspect every replayed resolution before staging it, validate the resolution, then publish with `gh stack push`.
4. After the rewrite, validate every affected layer bottom-to-top: `feature/base`, then `feature/service`, then `feature/ui`.
5. Re-fetch each exact head OID and re-audit unresolved threads, approvals, mergeability, and required checks for all three PRs.
6. Re-run the stack preflight before considering a merge. Do not merge until every rewritten layer has passed.
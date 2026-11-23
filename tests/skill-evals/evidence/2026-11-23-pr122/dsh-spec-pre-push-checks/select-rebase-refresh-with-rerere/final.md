Use a **rebase refresh, bottom-to-top**, via `gh stack sync`. Do not merge the trunk forward: [AGENTS.md](/workspace/evals/files/rebase-refresh/AGENTS.md) permits post-review rebases but requires an explicit author request for merge-forward, and [stack.md](/workspace/evals/files/rebase-refresh/stack.md) confirms none exists.

The smallest validation sequence after `gh stack sync` is:

1. Confirm the worktree is clean, enable `rerere`, keep `rerere.autoUpdate` disabled, and record the exact remote OIDs and published stack order before syncing.
2. Run `gh stack sync` once. Because it rewrites and publishes in one operation, validation occurs afterward.
3. Re-query all three rewritten remote heads and the published order.
4. Walk the stack base-to-tip, using each live parent as the next base:
   - bottom layer against trunk
   - middle layer against the refreshed bottom
   - top layer against the refreshed middle
5. For each layer, run the change-scope report and only the focused evidence its diff selects:

```sh
node .agents/skills/dsh-spec-pre-push-checks/scripts/change-scope.mjs \
  --base <live-parent> \
  --head <layer-head>
```

Run the owning focused tests once per affected layer, plus typecheck/build/docs checks only when their surfaces changed.

6. Re-audit review threads, approvals, mergeability, and checks against the new OIDs. Keep all three changes unmerged until every selected check passes. A failure blocks merging and requires a repair, validation of the repair, and a corrected publication.

No repository-wide suite is warranted reflexively. This fixture contains no application manifests or live stack refs, so exact test names cannot be narrowed further from the provided project content.
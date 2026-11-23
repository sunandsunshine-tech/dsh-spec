Use a **rebase-only refresh** through the project’s `gh stack` workflow, such as `gh stack sync`. Merge-forward is not authorized by [stack.md](/workspace/evals/files/rebase-refresh/stack.md), and [AGENTS.md](/workspace/evals/files/rebase-refresh/AGENTS.md) explicitly requires the author’s request for it.

The smallest post-review sequence is:

1. Enable `git config rerere.enabled true` and ensure `rerere.autoUpdate` is unset or `false`. Record the current three-branch order and exact remote head OIDs before running `gh stack sync`.
2. After the automatic rebase-and-publish, re-query all three published heads and confirm their order.
3. Inspect each layer against its live parent, bottom to top:
   - bottom against the refreshed trunk
   - middle against the rewritten bottom
   - top against the rewritten middle

   For each, run:

   ```sh
   node .agents/skills/dsh-spec-pre-push-checks/scripts/change-scope.mjs \
     --base <live-parent-ref> \
     --head <rewritten-branch-ref>
   ```

4. From those three scope reports, run the narrowest owning tests for each affected behavior. Deduplicate identical checks across layers; do not run the full repository suite or unrelated typecheck/build checks merely because the branches were rebased.
5. Keep all three PRs unmerged and report validation as pending until those checks pass. Then re-audit every rewritten PR’s review threads, approvals, mergeability, and platform checks because their commit hashes and review anchors changed.

If any post-publication check fails, leave the lease-protected heads in place, repair, revalidate, and publish the correction. Do not use raw `--force`.
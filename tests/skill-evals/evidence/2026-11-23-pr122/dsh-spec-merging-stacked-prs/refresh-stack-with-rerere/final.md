Use the **native cascading rebase** across the stack, followed by full revalidation. Merge-forward is excluded because no author requested it.

1. Enable rerere with `rerere.enabled=true` and ensure `rerere.autoUpdate=false`.
2. Check out the official stack with `gh stack checkout <pr-or-stack>`.
3. Run `gh stack sync` to rebase and update all affected layers bottom-to-top.
4. Inspect every replayed resolution and the rewritten commit scope.
5. If a conflict occurs, resolve it with `gh stack rebase`, validate the result, then publish with `gh stack push`.
6. Run the relevant checks for **all three layers**: `feature/base`, `feature/service`, and `feature/ui`.
7. Re-fetch each PR’s exact head OID, then re-audit unresolved review threads, approvals, mergeability, and required checks.
8. Confirm linear ancestry throughout the stack and that no layer remains `BEHIND`. Do not merge until all these checks pass.

This follows the repository policy in [AGENTS.md](/workspace/evals/files/stack-policy/AGENTS.md) and the three-layer order in [stack.md](/workspace/evals/files/stack-policy/stack.md).
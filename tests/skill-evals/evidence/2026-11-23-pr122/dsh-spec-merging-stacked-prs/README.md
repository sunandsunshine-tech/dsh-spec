# PR #122 stacked-PR evidence

The `refresh-stack-with-rerere` run verifies the alpha.2 refresh rule against the current
`dsh-spec-merging-stacked-prs` skill. It enables rerere, keeps replayed resolutions unstaged, uses
the native cascading rebase path, refuses merge-forward without an author request, and revalidates
every rewritten layer before readiness or merge.

The run passes 4/4 assertions and retains its current scenario definition, input modes, capability
profile, installed-skill hashes and trace under `refresh-stack-with-rerere/`.

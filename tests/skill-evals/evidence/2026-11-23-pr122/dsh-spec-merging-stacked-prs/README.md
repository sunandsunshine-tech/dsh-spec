# PR #122 stacked-PR evidence

The `refresh-stack-with-rerere` run verifies the alpha.2 refresh rule against the current
`dsh-spec-merging-stacked-prs` skill. It enables rerere, keeps replayed resolutions unstaged, uses
the native cascading rebase path, refuses merge-forward without an author request, and revalidates
every rewritten layer before readiness or merge. The `dependency-only-blocked-stack-can-land` run
verifies that `BLOCKED` caused only by an open parent does not hide a real required-check or review
failure and does not prevent the official stack merge path.

Each run passes 4/4 assertions and retains its current scenario definition, input modes, capability
profile, installed-skill hashes and trace under its named directory.

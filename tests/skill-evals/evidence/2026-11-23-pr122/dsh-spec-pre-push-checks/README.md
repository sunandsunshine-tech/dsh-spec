# PR #122 pre-push evidence

> **Historical status:** this run used the pre-routing-change `dsh-spec-pre-push-checks` skill tree.
> Current routing coverage is deterministic in `tests/skill-scenarios.test.ts`.

The `select-rebase-refresh-with-rerere` run verified the alpha.2 history-refresh rule against that
recorded skill revision. It selects native cascading rebase with rerere, leaves automatic staging
disabled, does not invent a merge-forward author request, and revalidates every rewritten layer
after publication.

The run passes 4/4 assertions and retains its scenario definition, complete input modes, resolved
capability profile, installed-skill hashes, trace and final response.

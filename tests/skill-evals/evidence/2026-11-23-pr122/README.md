# PR #122 alpha.2 rule evidence

This tree records reviewer-certified targeted model checks for the dsh-v0.2.3-alpha.2 rule
migration. The runner isolated the source and answer tree from each staged project, cleared the
inherited process environment, kept provider credentials behind a host-side loopback proxy, and
retained artifacts according to the scenario. The model still has network access; the guide states
that boundary explicitly.

> **Historical status:** the two Code Review runs in this tree remain bound to the PR122 skill revision. Current Code Review runs, including both of those scenarios, are under `../2026-11-25-pr141/`.

| Skill | Scenario | Assertions |
|---|---|---:|
| `dsh-spec-pr-description` | `workspace-boundaries-expose-reverse-edge` | 6/6 |
| `dsh-spec-code-review` | `review-dependency-edges-and-reverse-edge` | 6/6 |
| `dsh-spec-code-review` | `review-cites-numbered-rule` | 3/3 |
| `dsh-spec-pre-push-checks` | `select-rebase-refresh-with-rerere` | 4/4 |
| `dsh-spec-merging-stacked-prs` | `refresh-stack-with-rerere` | 4/4 |
| `dsh-spec-merging-stacked-prs` | `dependency-only-blocked-stack-can-land` | 4/4 |
| `dsh-spec-error-handling` | `empty-catch-names-and-separates-operation` | 4/4 |
| `dsh-spec-error-handling` | `empty-catch-names-and-documents-safe-failure` | 4/4 |
| `dsh-spec-error-handling` | `wrapper-preserves-cancellation-timeout-and-denial` | 4/4 |
| `dsh-spec-client-ui-ux` | `shared-icon-rendering-contract` | 5/5 |
| `dsh-spec-browser-gif-evidence` | `missing-capture-capability-hands-off` | 4/4 |
| `dsh-spec-browser-gif-evidence` | `real-ui-change-uses-one-isolated-run` | 4/4 |
| `dsh-spec-translate-docs` | `source-rename-keeps-pair` | 4/4 |
| `dsh-spec-translate-docs` | `locale-selected-pages-are-unpaired` | 4/4 |

The fourteen scenarios record 60/60 assertions covering the generic responsibility and dependency-edge
report, manifest-backed review, numbered-rule citation, rebase-with-rerere selection, selective and
truly empty catch handlers, wrapper preservation of cancellation and denial, the shared icon
rendering contract, dependency-only stack blocking, an absent browser/media profile, a real isolated
browser GIF run, source renaming, and locale-selected pages outside the pairing corpus. Each run
records its resolved capability and sandbox profile, complete input modes, and skill-file modes;
the alpha.2 baseline retarget and semantic rules are reviewed together in this layer.

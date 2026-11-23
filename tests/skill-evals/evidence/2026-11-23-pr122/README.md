# PR #122 alpha.2 rule evidence

This tree records reviewer-certified targeted model checks for the dsh-v0.2.3-alpha.2 rule
migration. The runner isolated the source and answer tree from each staged project, cleared the
inherited process environment, and retained artifacts according to the scenario. It is not a
credential or network sandbox; the guide states that boundary explicitly.

| Skill | Scenario | Assertions |
|---|---|---:|
| `dsh-spec-pr-description` | `workspace-boundaries-expose-reverse-edge` | 6/6 |
| `dsh-spec-code-review` | `review-dependency-edges-and-reverse-edge` | 6/6 |
| `dsh-spec-pre-push-checks` | `select-rebase-refresh-with-rerere` | 4/4 |
| `dsh-spec-merging-stacked-prs` | `refresh-stack-with-rerere` | 4/4 |
| `dsh-spec-error-handling` | `empty-catch-names-and-separates-operation` | 4/4 |
| `dsh-spec-error-handling` | `empty-catch-names-and-documents-safe-failure` | 4/4 |
| `dsh-spec-error-handling` | `wrapper-preserves-cancellation-timeout-and-denial` | 4/4 |
| `dsh-spec-client-ui-ux` | `shared-icon-rendering-contract` | 5/5 |
| `dsh-spec-browser-gif-evidence` | `missing-capture-capability-hands-off` | 4/4 |
| `dsh-spec-translate-docs` | `source-rename-keeps-pair` | 4/4 |

The ten scenarios record 45/45 assertions covering the generic responsibility and dependency-edge
report, manifest-backed review, rebase-with-rerere selection, selective and truly empty catch
handlers, wrapper preservation of cancellation and denial, the shared icon rendering contract, an
actually absent browser/media profile, and source renaming with its translation pair. The mechanical
baseline commit is separate from the skill-rule commit.

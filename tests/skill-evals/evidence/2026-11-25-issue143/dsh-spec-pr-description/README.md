# Issue #143 PR-description behavior and trigger evidence

Model: host-configured `deepseek-flash`; Codex CLI `0.171.0-alpha.13`. Initial run date:
2026-11-25. Review-fix reruns: 2026-11-26.

## Behavior runs

The repository runner staged the complete target skill and each scenario's declared fixture files
into a fresh Git project. It invoked Codex with an isolated project, Codex home, response directory
and temporary directories. The source repository and scenario answer definitions were outside the
model namespace.

The five changed behavior scenarios passed 29 of 29 reviewer-certified assertions:

| Scenario | Assertions |
|---|---:|
| `stack-layer-replaces-legacy-ai-section` | 9/9 |
| `tracked-issue-reference-count` | 6/6 |
| `tracker-without-matching-issue` | 4/4 |
| `unfinished-review-does-not-update` | 5/5 |
| `handled-review-updates-ai-usage` | 5/5 |

The no-tracker run states that no tracker applies. The issue-count run keeps visible references to
both tracked issues while excluding unrelated, hidden, code-fenced, inline-code and cross-project
forms. The tracker-without-issue run records the supplied search, zero-result status and date. The
unfinished review run leaves the description unchanged because one reply is missing, one comment is
undecided, and one answered comment has no published fix. The handled run replaces the review row
with the author's decisions and removes the stale no-comments statement.

Each scenario directory records the complete installed skill hash, declared inputs, canonical
scenario definition, capabilities, final response, normalized trace, changed-path inventory, patch,
retained artifacts and reviewer-assigned assertions.

## Trigger runs

Each trigger query ran in a fresh read-only project containing only the current
`dsh-spec-pr-description` skill and its trigger fixture. The temporary Codex home contained only the
configured model and provider settings, model catalog and a read-only sandbox policy; the plugin and
MCP configuration was excluded. The fixture limited the task to a routing decision and required a
stable final selection marker.

All six queries matched their expected decision: two positives selected the skill and four near
misses selected none. The unfinished-review near miss isolates the handled-round boundary by
classifying an answered comment whose fix is unpublished, without requesting thread replies. Each
`trigger/<query>/` directory retains the final response, normalized `codex exec --json` trace and
stderr. `trigger-input.sha256` binds the trigger corpus, fixture and current `SKILL.md` name and
description surface.

One run per query is recorded, matching the repository's existing trigger-evidence method. It is
evidence for these six prompts, not a statistical estimate of routing accuracy.

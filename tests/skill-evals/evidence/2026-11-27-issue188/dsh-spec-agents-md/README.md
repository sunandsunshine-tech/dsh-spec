# AGENTS.md behavior and trigger evidence

Model: host-configured `deepseek-flash`; Codex CLI `0.171.0-alpha.13`. Run date: 2026-11-27.

## Behavior runs

The repository runner installed the complete `dsh-spec-agents-md` skill into a
fresh project for each scenario. The source repository and scenario answer
definitions were outside the model namespace.

The two behavior scenarios passed 10 of 10 reviewer-certified assertions:

| Scenario | Assertions |
|---|---:|
| `scope-pointer-and-ownership` | 5/5 |
| `stale-command-link-and-scope-move` | 5/5 |

The first scenario keeps repository-wide commands inline, makes the worker file
self-contained by repeating the repository checks beside its package command,
removes human-only and volatile content, and makes the release pointer
actionable. The second updates an API rename by removing
stale commands, links, release values, and migration history, while placing the
package-specific test and deployment instructions in the API package's file and
restating the repository-wide build completion condition there so the nested file
is complete without assuming the root is loaded.

Each scenario directory retains the canonical scenario definition, declared
input hashes, complete installed-skill hashes and modes, execution profile,
capabilities, final response, normalized trace, changed-path inventory, patch,
artifacts and graded assertions. The typed `evidence.json` record binds the
scenario, inputs, rendered prompt and model-bearing execution configuration.
The trace also begins with the scenario subject and definition hash.

## Trigger runs

The corpus contains three positive requests and four near misses. Positives
cover writing, auditing, and migrating or splitting `AGENTS.md`. The near misses
cover README prose, system prompts, ordinary code review, and whole-skill
forging.

Each query ran in a fresh isolated project containing only the current target
skill and trigger fixture. Every final response ends in a stable `SELECT:`
marker, and every trace has exactly one terminal `turn.completed` event. All
seven decisions matched the expected outcome. The complete matrix is
`trigger-matrix.tsv`; `trigger-input.sha256` binds the corpus, fixture and
model-facing name/description surface. Each query directory also has
`trigger-query.json` with the exact query and hash.

One run per query is retained. The 7/7 matrix proves those selection decisions
at this revision; it is not a repeated-sample estimate of trigger accuracy.

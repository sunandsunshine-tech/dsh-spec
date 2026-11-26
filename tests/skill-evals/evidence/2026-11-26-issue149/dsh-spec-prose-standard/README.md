# Prose standard behavior and trigger evidence

Model: host-configured `deepseek-flash`; Codex CLI `0.171.0-alpha.13`. Run date: 2026-11-26.

## Behavior runs

The repository runner installed the complete `dsh-spec-prose-standard` skill into a fresh project
for each scenario. The source repository and scenario answer definitions were outside the model
namespace.

The three behavior scenarios passed 20 of 20 reviewer-certified assertions:

| Scenario | Assertions |
|---|---:|
| `coordinator-contract-survives-transcript-trim` | 10/10 |
| `control-flow-comment-keeps-load-order-contract` | 4/4 |
| `leakage-keeps-survive-mixed-readme-audit` | 6/6 |

The coordinator scenario restores per-session serialization, disposal ordering, and failure
propagation after an over-trim, while removing the working-session history. The comment scenario
removes control-flow narration but keeps why policy must load before model-facing tools. The mixed
audit keeps the issue follow-up, counterfactual, measured bound, runtime old/new lifecycle, and
current behavior facts while deleting project-change and review history.

Each scenario directory retains the canonical scenario definition, declared input hashes, complete
installed-skill hashes and modes, execution profile, capabilities, final response, normalized trace,
changed-path inventory, patch, artifacts and graded assertions. The typed `evidence.json` record
binds the scenario, inputs, rendered prompt and model-bearing execution configuration. The trace
also begins with the scenario subject and definition hash.

`behavior-files.sha256` pins the four behavior-bearing skill files read by the runs: the entry,
coverage, calibration examples and recall batteries. The runner's per-run `skill-hashes.txt`
retains the complete installed skill tree, including its provenance notice. Tests require every
behavior-file hash in that manifest to match both the repository files and each run's retained
skill hashes. Changing a skill and its manifest without rerunning fails; copying another scenario's
trace and final fails the scenario provenance event.

## Trigger runs

The corpus contains eight positive requests and four near misses. Positives cover durable
documentation, comments, prompts and visible strings across writing, restoring, trimming and
auditing. The near misses cover transient chat editing, code correctness only, ordinary code review,
and mechanical Agent Note lifecycle work with all prose already complete. Their wording relies on
the requested task domain rather than an explicit instruction to suppress prose work.

Each query ran in a fresh isolated project containing only the current target skill and trigger
fixture. Every final response ends in a stable `SELECT:` marker, and every trace has exactly one
terminal `turn.completed` event. All twelve decisions matched the expected outcome. The complete
matrix is `trigger-matrix.tsv`; `trigger-input.sha256` binds the corpus, fixture and model-facing
name/description surface. Each query directory also has `trigger-query.json` with the exact query
and hash, and its trace starts with the same query identity. Moving a trace or final between queries
fails even when both runs selected the same skill.

One run per query is retained. The 12/12 matrix proves those selection decisions at this revision;
it is not a repeated-sample estimate of trigger accuracy.

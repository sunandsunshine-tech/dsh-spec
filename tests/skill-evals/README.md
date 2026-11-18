# Agent Skill eval sources

The scenarios under this directory are development assets. Agent Skills expects a skill being
evaluated to contain `evals/evals.json`, but `skills/` is this repository's distribution artifact and
`.agents/skills/` is its installed mirror. Keeping the corpus there would ship test inputs to every
adopter.

For an eval run, copy `skills/<skill>/` to a temporary directory, then copy
`tests/skill-evals/<skill>/evals/` into that temporary skill as `evals/`. Run the official eval
workflow against the temporary skill. Delete the temporary directory afterwards.

`tests/skill-scenarios.test.ts` performs the same staging for its corpus checks. A repository-shape
test rejects an `evals/` directory under `skills/`, so the development corpus cannot silently return
to the distribution tree.

## Coverage

Add an eval for central natural-language behavior that realistic prompts can falsify when a
deterministic command or test cannot decide it. Capability-dependent behavior covers both the
capability-present and capability-absent profiles. Mechanical contracts remain unit or integration
checks and do not need a parallel model eval.

Model evals run when the owning behavior, defaults, stop conditions, capability branches, fixed
output, or triggering description change. They do not run routinely in CI. A change without a model
run must say which deterministic evidence decides the behavior or why an eval is not warranted.

# Agent Skill eval sources

The scenarios under this directory are development assets. Agent Skills expects a skill being
evaluated to contain `evals/evals.json`, but `skills/` is this repository's distribution artifact and
`.agents/skills/` is its installed mirror. Keeping the corpus there would ship test inputs to every
adopter.

For an eval run, create a temporary parent directory containing a child named `<skill>`, copy
`skills/<skill>/` into that child, then copy `tests/skill-evals/<skill>/evals/` into the child as
`evals/`. When a scenario names `.agents/skills/<sibling>/`, install the complete
`skills/<sibling>/` tree at that fixture path; a copied `SKILL.md` alone is not an installation.
The skill directory's name must match its `SKILL.md` name. Run the official eval workflow against
the temporary skill. Delete the temporary parent afterwards.

Archive scenarios that exercise sealing also need a Git checkout and the six committed archive
class directories. The scenario files provide the baseline; the runner initializes and commits it
before invoking the model.

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

# Find-simplifications authority evidence

The `agents-md-owns-conflicting-instructions` scenario ran through
`tests/skill-evals/run-model-eval.mjs` with the current skill installed and the declared
authority-conflict fixture. The run followed `AGENTS.md` and its cited audit policy, rejected the
conflicting exclusion in `CLAUDE.md`, and found the unreachable adapter export.

The reviewer graded all four declared assertions as passing. The retained trace, final response,
input manifest and skill hashes bind the result to the scenario and changed skill text.

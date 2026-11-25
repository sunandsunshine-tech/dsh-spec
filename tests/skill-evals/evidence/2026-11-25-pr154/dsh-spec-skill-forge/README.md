# Forge description and trigger evidence

The selected behavior scenario ran through `tests/skill-evals/run-model-eval.mjs` with the current
`dsh-spec-skill-forge` skill installed in an otherwise minimal project. It verifies that a
description change co-evaluates the release-audit role and exclusions with the body boundary while
preserving the detailed procedure.

The trigger corpus contains six positive and six near-miss requests. Positives cover explicit and
implicit requests to create, rewrite, migrate, repair, or package an Agent Skill. Near misses cover
installation, use, ordinary prompt editing, an API description, runtime code, and a tool definition.
Each probe ran in a separate temporary project with only the target skill installed. The final
`SELECT:` marker and the full matrix are retained below.

Each query has one retained run. The 12/12 matrix proves those selection examples at this revision;
it is not a repeated-sample trigger-rate estimate.

The host-configured Codex CLI was `codex-cli 0.171.0-alpha.13`; the configured model was `deepseek-flash`.

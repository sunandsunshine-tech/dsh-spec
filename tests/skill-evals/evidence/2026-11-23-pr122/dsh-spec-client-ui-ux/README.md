# PR #122 client UI evidence

> **Historical status:** this run used the pre-#140 `dsh-spec-client-ui-ux` skill tree. The
> `spacing-grouping-and-overlay-fit` run under `2026-11-25-issue-140` is the current client-UI
> behavior evidence.

The `shared-icon-rendering-contract` run records that ordinary placement and a
rendering-contract change have different evidence requirements, preserves the declared
non-scaling stroke and intentional fill behavior, and leaves the absent rendered consumer
evidence as a gap rather than claiming visual acceptance.

The run used `tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write`. Its canonical
scenario hash, input modes, complete skill hashes, capability profile and retained artifacts are in
the run directory. Five of five reviewer-certified assertions pass.

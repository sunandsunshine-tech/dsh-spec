# PR #122 client UI evidence

The `shared-icon-rendering-contract` run checks the alpha.2 icon rule against the current
`dsh-spec-client-ui-ux` skill. It records that ordinary placement and a rendering-contract change
have different evidence requirements, preserves the declared non-scaling stroke and intentional
fill behavior, and leaves the absent rendered consumer evidence as a gap rather than claiming visual
acceptance.

The run used `tests/skill-evals/run-model-eval.mjs` with `--sandbox workspace-write`. Its canonical
scenario hash, input modes, complete skill hashes, capability profile and retained artifacts are in
the run directory. Five of five reviewer-certified assertions pass.

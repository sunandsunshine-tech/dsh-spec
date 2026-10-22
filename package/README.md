# Skill script packages

Each skill that ships a script keeps its source here, under a directory named after the skill. The directory holds the source files and a `vite.config.ts` whose `pack` entry names them and writes the self-contained bundles into the work draft's `script/`. Repository-level scripts under `scripts/` are not bundled and run directly with Node.

Build the work draft scripts, copy the script into the review draft, land the accepted draft, and refresh the installed copies:

```sh
pnpm run skill:draft
pnpm run skill:build
pnpm run skill:review
pnpm run skill:land
pnpm run skill:refresh
```

`skill:draft` copies the landed skill into the work draft for the next round; `skill:review` mirrors the work draft's `script/` into the review draft, leaving the review-language prose alone; `skill:land` copies the accepted work draft into `skills/<name>/` and removes only that skill's `draft/<name>/` and `review/<name>/`, leaving the shared directories in place; `skill:refresh` mirrors `skills/` into the installed copies.

The source layout mirrors the first level of `skills/`:

| Source | Work draft artifact |
|---|---|
| `package/dsh-spec-skill-forge/verify-skill-spec.ts` | `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/verify-skill-spec.mjs` |
| `package/dsh-spec-skill-forge/forge.ts` | `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/forge.mjs` |

`package/dsh-spec-skill-forge/vite.config.ts` names both entries and the draft `script/` output, so `pnpm run skill:build` is one `vp pack` call.

The work and review artifacts are committed while the draft exists. `vp pack` bundles each script and its dependencies, including the `yaml` frontmatter parser in the gate, into one ESM file for Node 22 and later. The adopter needs no install. The review draft script is copied from the work draft, never built separately.

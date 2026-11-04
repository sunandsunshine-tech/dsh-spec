# Skill script packages

Each skill that ships a script keeps its source here, under a directory named after the skill. The directory holds the source files and a `vite.config.ts` whose `pack` entry names them and writes the self-contained bundles into the work directory's `scripts/`. Repository-level scripts under `scripts/` are not bundled and run directly with Node.

Build the work directory scripts, report its declared review drafts, publish the accepted work directory, and refresh the installed copies:

```sh
pnpm run skill:draft
pnpm run skill:build
pnpm run skill:pair
pnpm run skill:publish
pnpm run skill:refresh
```

`skill:draft` copies the landed skill into the work directory for the next round; `skill:pair` reports the declared review drafts; `skill:publish` removes them from the work directory, copies the work directory into `skills/<name>/`, and removes the work directory; an existing landing directory is overwritten; the gate and `pair` are separate read-only checks; `skill:refresh` mirrors `skills/` into the installed copies.

The source layout mirrors the first level of `skills/`:

| Source | Work draft artifact |
|---|---|
| `package/dsh-spec-skill-forge/verify-skill-spec.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs` |
| `package/dsh-spec-skill-forge/forge.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts/forge.mjs` |

`package/dsh-spec-skill-forge/build.ts` runs `vp pack` once per entry into the work directory's `scripts/`, so each script bundle is self-contained.

The work directory and its declared review drafts are committed while the draft exists. `vp pack` bundles each script and its dependencies, including the `yaml` frontmatter parser and the `markdown-it` and `parse5` parsers in the gate, into one ESM file for Node 22 and later. The adopter needs no install. The declared review drafts are removed at publish; they are never copied into the landing directory.

# Skill script packages

Each skill that ships a script keeps its source here, under a directory named after the skill. The directory holds the source files and a `vite.config.ts` whose `pack` entry names them and writes the self-contained bundles into the work directory's `scripts/`. Repository-level scripts under `scripts/` are not bundled and run directly with Node. Run the commands below from the repository root. Install the workspace dependencies from the repository root with `pnpm install`; the root `pnpm-workspace.yaml` and `pnpm-lock.yaml` pin them for every package.

Draft the work directory, build its scripts, report its declared review drafts, publish the accepted work directory, and refresh the installed copies:

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
| `package/dsh-spec-agent-notes/notes.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-agent-notes/scripts/notes.mjs` |
| `package/dsh-spec-pre-push-checks/change-scope.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-pre-push-checks/scripts/change-scope.mjs` |
| `package/dsh-spec-skill-forge/verify-skill-spec.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs` |
| `package/dsh-spec-skill-forge/forge.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts/forge.mjs` |
| `package/dsh-spec-translate-docs/translate-pair.ts` | `.agents/dsh-spec-skill-forge/dsh-spec-translate-docs/scripts/translate-pair.mjs` |

Each package's other source files are imported by its entry and bundled into the same artifact. `scripts/build-skills.ts` runs each package's `build.ts` (`pnpm run skill:build`), and each `build.ts` runs `vp pack` for its entries into the work directory's `scripts/`, so every script bundle is self-contained.

The work directory and its declared review drafts are committed while the draft exists. `vp pack` bundles each script and its dependencies — the `yaml` frontmatter parser, the `markdown-it` and `parse5` parsers in the spec gate, and the `mdast` and `micromark` parsers in the pairing mechanism — into one ESM file for Node 22 and later. The adopter needs no install. The declared review drafts are removed at publish; they are never copied into the landing directory.

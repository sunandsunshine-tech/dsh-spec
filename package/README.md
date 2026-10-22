# Skill script packages

Each skill that ships a script keeps its source here, under a directory named after the skill. The source is bundled into the work draft's `script/` directory, copied into the review draft, and only after acceptance copied into the landed skill. Repository-level scripts under `scripts/` are not bundled and run directly with Node.

Build the work draft script, copy it to the review draft, and land the accepted draft:

```sh
vp run build:work
vp run copy:review
# after the driver accepts the review draft
vp run land:skills
```

`land:skills` copies the accepted work draft and removes only that skill's `draft/<name>/` and `review/<name>/`; a shared parent is removed only when empty.

The source layout mirrors the first level of `skills/`:

| Source | Work draft artifact |
|---|---|
| `package/dsh-spec-skill-forge/verify-skill-spec.ts` | `.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/verify-skill-spec.mjs` |

The work and review artifacts are committed while the draft exists. `vp pack` bundles the skill script and its dependencies, including the `yaml` frontmatter parser, into one ESM file for Node 22 and later. The adopter needs no install. The review draft script is copied from the work draft, never built separately.

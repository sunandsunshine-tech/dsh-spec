# Agent Note: The draft lifecycle belongs to the forging skill

Status: implemented

English | [中文](2026-10-22-the-draft-lifecycle-belongs-to-the-skill.zh.md)

## Problem

The forging skill's Drafts rule described a lifecycle — a work draft, a review draft and a landed artifact — while the repository implemented that lifecycle in `package.json` shell: `build:work`, `copy:review`, `land:skills` and one `refresh:*` command per installed skill chained `vp`, `rsync`, `cp`, `rm -rf` and `rmdir`. The chain hid failures behind a trailing `|| true`, removed an empty shared parent directory as part of landing, needed tools outside Node, and had no test; the landing cleanup scope had already been wrong once. An adopter of the skill had no executable form of the rule.

## Decision

The lifecycle is the forging skill's Script: `script/forge.mjs`, sourced from `package/dsh-spec-skill-forge/forge.ts`, with the commands `draft`, `review` and `land`. The forge directory and the landing directory are values, so the skill stays project-neutral; the working directory is the project root.

`land` validates before it writes. It requires `SKILL.md` in the work draft, refuses a landing directory that is neither empty nor this skill, refuses a review draft whose `script/` no longer matches the work draft, stages the copy under the forge directory, verifies the staged tree by content hash, swaps it into the landing directory, verifies the landing tree, and then deletes only `draft/<name>/` and `review/<name>/`. The shared `draft/` and `review/` directories stay, and `--dry-run` prints the actions without running them. A failure before the swap leaves the previous landing directory and the work draft in place, so a retry starts from the draft.

The repository's `package.json` holds thin, namespaced calls: `format`, `format:check`, `test`, `test:watch`, `skill:draft`, `skill:build`, `skill:review`, `skill:land` and `skill:refresh`. Build settings live in `package/dsh-spec-skill-forge/vite.config.ts`, which names both script entries and the work draft's `script/` output. `scripts/refresh-skills.ts` discovers `skills/*` and mirrors each skill into its installed copy, so the installed set is not written twice. The root `vite.config.ts` configures Oxfmt to the project's no-semicolon, single-quote style at 120 columns, scoped to the TypeScript sources; `vp fmt` and `vp fmt --check` are the source formatting commands. CI runs `pnpm test`.

No review draft was produced for this change. The driver reviewed the plan before implementation and an independent reviewer reviews the landed artifact, so the Drafts rule's "review is needed" condition did not hold; the ruling is recorded here rather than in a second state store.

## Alternatives considered

**Keep the shell pipeline and make it fail fast.** A `set -e` pipeline with `rsync` and `rm -rf` still carries no test, no dry run and no report of what it removed, and it still puts the lifecycle rule in a second place; the cleanup defect was a symptom.

**Keep the lifecycle in a repository CLI.** It was the earlier plan. It lost because the lifecycle is the skill's own rule: an adopter would still receive a rule with no executable form, and the repository would carry a second implementation of a skill mechanism.

**Merge the lifecycle into `verify-skill-spec.mjs`.** It lost because conformance checking and the draft lifecycle are separate jobs: one entry point would make the generic gate depend on the forge layout and its directory names.

**Delete the empty shared directories after landing.** It lost because the shared directories belong to the forge directory and are created on demand; removing them buys nothing and gives landing a second deletion rule.

**Take the Oxfmt defaults (semicolons, double quotes) instead of a project style.** It lost because the existing sources are deliberately no-semicolon and single-quote; the default would restyle every file and put a formatting concern above the change under review.

**Leave the test and format commands out of `package.json`.** It lost because the commands are the documented entry points; CI runs the same test command, so there is one test command rather than two.

## Consequences

The skill ships a second bundled script, about 14 KB, and the repository keeps its project values — forge directory, landing directory, bundle entries — in configuration. The lifecycle has 23 cases and the installed-copy refresh has 6; the suite is 78 cases. The shared `draft/` and `review/` directories are left in place when they exist, and a fresh clone has neither until one is created. `pnpm run format:check` does not run in CI because CI installs no Vite+ toolchain; it is a local check.

The work draft can be seeded from the landed skill (`draft --from`), so the next round starts from the shipped bytes rather than an empty directory.

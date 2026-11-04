# AGENTS.md

This repository holds `skills/` — a set of Agent Skills carrying a development pattern: decision records, prose discipline, and the forge workflow. Read a skill's `SKILL.md` before changing anything under it, because its files are the deliverable.

## Repository layout

```
skills/   the deliverable: one directory per skill, with its entry, references and any bundled script/
package/  skill script sources, one directory per skill, with its vite.config.ts; bundled into the work directory's scripts/
scripts/  this repository's own checks and tooling, not shipped — verify-dco.ts, submit-vendored.ts, build-skills.ts, check-bundles.ts, vendor-packages.ts, vendored-notices.ts, sync-vendored-notices.ts, refresh-skills.ts, verify-corpus.ts
tests/    the functional suite for those checks and the workspace tooling — pnpm test
.agents/dsh-spec-agents-md/  agent-facing detail this file links: the forging requirements and the goal brief
submodules/dsh/    the extraction baseline — .gitmodules
```

## Commands

```sh
pnpm install
  # installs the pinned Vite+ toolchain and the dependencies used to build the skill script bundles
pnpm run format
  # formats the TypeScript sources with the project's Oxfmt settings
pnpm run format:check
  # checks the source formatting

pnpm run check:corpus
  # checks the shipped corpus: every skill entry, the notes tree and archive, the maintained
  # translation pairs and the vendored-notices submission

pnpm test
  # the functional suite: the DCO and Agent Note gates, the vendored-notices submission, the skill
  # spec gate, the change-scope report, the forge lifecycle, the pairing mechanism and the installed copies
pnpm run test:watch
  # the suite in watch mode

node scripts/verify-dco.ts --base=<ref> --head=<sha>
  # every commit in the range carries a Signed-off-by trailer that matches its author; a commit
  # claiming a bot identity is verified against GitHub as well

node scripts/submit-vendored.ts --dry-run
  # prints the dependency-submission payload and posts nothing

pnpm run notices:sync
  # regenerates the vendored-packages table in THIRD_PARTY_NOTICES.md from the shipped bundles
pnpm run notices:check
  # checks that table without writing

pnpm run skill:draft
  # copies the forge skill into the work directory
pnpm run skill:build
  # bundles the skill's scripts into the work directory's scripts/
pnpm run skill:publish-bundles
  # builds every script bundle and copies it into skills/<name>/scripts/
pnpm run skill:verify-bundles
  # rebuilds every script bundle and fails when one differs from skills/<name>/scripts/
pnpm run skill:pair
  # reports the work directory's declared review drafts
pnpm run skill:publish
  # copies the work directory into skills/ and removes the work directory
pnpm run skill:refresh
  # copies skills/ into the installed .agents/skills/ copies
```

Node ≥ 22.19 or ≥ 24, and the pnpm and Vite+ versions the root `package.json` pins, are the toolchain. Source formatting is Oxfmt through `vp fmt`, configured in the root `vite.config.ts` and checked with `pnpm run format:check`.

## Boundaries

- **Ask before changing what the package claims to be generic.** A part that assumes one ecosystem is the defect this package exists to avoid.
- **A check that passes on an empty corpus is worse than no check.** A gate exits non-zero when it finds nothing to check; keep it that way.
- **Prefer the design an adopter can migrate more cheaply.** When two designs are equal, choose the one an adopter's accumulated content would survive; ask when the odds are a guess. [Migration cost is a design constraint](.agents/dsh-spec-agent-notes/implemented/process/2026-09-22-migration-cost-is-a-design-constraint.md).
- **Never edit `submodules/dsh/`.** It is the pinned baseline a re-extraction diffs against, and its content is not ours. Fetch it at the revision `git submodule status` records.
- **Forging a skill in this repository:** read [the repository forging requirements](.agents/dsh-spec-agents-md/forging.md) before starting.
- **Writing an agent goal:** read [the goal brief template](.agents/dsh-spec-agents-md/goal-brief.md) first; it owns the goal fields and completion evidence.
- **A note or report that carries external text names its source.** [Three rules from a memory pipeline](.agents/dsh-spec-agent-notes/implemented/process/2026-09-20-three-rules-from-a-memory-pipeline.md).

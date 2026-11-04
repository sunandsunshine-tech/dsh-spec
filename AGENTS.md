# AGENTS.md

This repository holds `skills/` — a set of Agent Skills carrying a development pattern: decision records, prose discipline, and the change workflow. Read a skill's `SKILL.md` before changing anything under it, because its files are the deliverable.

The repository is being rebuilt on the `refactor/dsh-skills` branch.

## Repository layout

```
skills/   the deliverable: one directory per skill, with its entry, references and any bundled script/
package/  skill script sources, one directory per skill, with its vite.config.ts; bundled into the work directory's scripts/
scripts/  this repository's own checks and tooling, not shipped — verify-dco.ts, submit-vendored.ts, refresh-skills.ts
tests/    the functional suite for those checks and the workspace tooling — pnpm test
submodules/dsh/    the extraction baseline — .gitmodules
docs/              the documents a person reads; no tier, no budget, and no gate
```

## Commands

```sh
pnpm run format
  # formats the TypeScript sources with the project's Oxfmt settings
pnpm run format:check
  # checks the source formatting

pnpm test
  # the functional suite: what the DCO gate decides about a range, the payload the vendored-notices
  # submission posts, the skill gate, and the draft lifecycle
pnpm run test:watch
  # the suite in watch mode

node scripts/verify-dco.ts --base=<ref> --head=<sha>
  # every commit in the range carries a Signed-off-by trailer that matches its author; a commit
  # claiming a bot identity is verified against GitHub as well

node scripts/submit-vendored.ts --dry-run
  # prints the dependency-submission payload and posts nothing

pnpm run skill:draft
  # copies the forge skill into the work directory
pnpm run skill:build
  # bundles the skill's scripts into the work directory's scripts/
pnpm run skill:pair
  # reports the work directory's declared review drafts
pnpm run skill:publish
  # copies the work directory into skills/ and removes the work directory
pnpm run skill:refresh
  # copies skills/ into the installed .agents/skills/ copies
```

Node ≥ 22.19 or ≥ 24, pnpm and Vite+ (`vp`) are the toolchain. Source formatting is Oxfmt through `vp fmt`, configured in the root `vite.config.ts` and checked with `pnpm run format:check`.

## Boundaries

The boundaries and conventions below are what this repository adds.

- **Ask before changing what the package claims to be generic.** A part that assumes one ecosystem is the defect this package exists to avoid.
- **A check that passes on an empty corpus is worse than no check.** A gate exits non-zero when it finds nothing to check; keep it that way.
- **Prefer the design an adopter can migrate more cheaply.** Where two designs are equal for the architecture and the plan, take the one an adopter's accumulated content would survive — a directory that can gain files over a file that has to become one, a format that can gain fields over one that has to be rewritten, a name that can stay. Migration is cheap here and expensive there, and the gap only widens as adopters hold more of their own edits; when the change is likely and the insurance costs little now, buy it, and when the odds are a guess, ask. [Migration cost is a design constraint](.agents/dsh-spec-agent-notes/implemented/process/2026-09-22-migration-cost-is-a-design-constraint.md).
- **Never edit `submodules/dsh/`.** It is the pinned baseline a re-extraction diffs against, and its content is not ours. Fetch it at the revision `git submodule status` records.
- **Forging a skill in this repository:** read [the repository forging requirements](docs/forging.md) before starting.
- **A development branch follows this repository's own pull-request lifecycle.** [The pull-request lifecycle](.agents/dsh-spec-agent-notes/implemented/process/2026-09-21-the-pull-request-lifecycle.md) owns the states, the tidy before acceptance, before review and before the merge, the commit convention, the PR description and the merge each kind of pull request uses.
- **A note or report that carries external text names its source.** [Three rules from a memory pipeline](.agents/dsh-spec-agent-notes/implemented/process/2026-09-20-three-rules-from-a-memory-pipeline.md).
- **Asking the maintainer to merge names the act and carries the change's description, as a question the maintainer answers.** [The review handover and the merge need authorization](.agents/dsh-spec-agent-notes/implemented/process/2026-09-23-the-review-handover-and-the-merge-need-authorization.md).

## Conventions

- **Every skill change traces to dsh.** The package is an extraction, so a change either mirrors a change upstream or is recorded as a deliberate deviation.
- **This file holds what an agent needs every session; the document that owns a rationale holds the rest.** A rule that needs a scan or a person to establish is linked, never restated here.
- **A text names its reader before it has a wording.** Which reader a text has is settled by what the text is and who receives it — an agent loads the skills, a person installs the package, the next maintainer reads the notes — so a sentence written for whoever is present is a sentence for the wrong reader, and a sentence that addresses its reader — to ask, to answer back, or to justify — is an interaction that never happened. Every sentence of a draft is checked against one question — does it state the fact, or does it address the reader? [A text names its reader](.agents/dsh-spec-agent-notes/implemented/process/2026-09-23-a-text-names-its-reader.md).
- **Each side of a pair is written in its own idiom, in an order a reader can follow.** Each side is written the way its own language says it, and so is anything said to the maintainer. Which language a text is in is settled elsewhere: by the pair's contract, by this set's own text being English because an agent reads it, and by the language of the ask. Order the content by cause and effect, conclusion first, so every sentence is established by the one before it. Whether both sides say the same thing is the writer's responsibility. [Each side is written in its own idiom, in an order a reader can follow](.agents/dsh-spec-agent-notes/implemented/process/2026-09-22-each-side-is-written-in-its-own-idiom.md).

## Editing these instructions

Keep each rule self-contained while linking the document that owns its rationale. Add a rule when its absence caused a real mistake, not when it is merely true. Condense when clarity survives; move detail to the owner document rather than letting this file grow.

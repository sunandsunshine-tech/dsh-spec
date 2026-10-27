# Agent Note: Declarative review drafts in the skill forge

Status: implemented

English | [中文](2026-10-27-forging-dsh-spec-skill-forge.zh.md)

## Problem

The forge owns a pairing mechanism of its own. Its old `review` command infers translation pairs from filenames, writes `.i18n.yaml` records containing a source hash, and `review --check` decides whether a draft is current. The forge therefore acts as both the draft producer and the draft consistency gate.

The notes mechanism separates those jobs. A project declares companion suffixes; the notes skill pairs and moves a note with its companions; the project's pairing gate owns whether the two sides agree. The forge should follow the same division: pairing is declarative, and consistency remains the adopter's gate's business.

## Decision

The forge uses declared companions instead of its own pair record:

- `pair <name> [--companion <suffix>]...` is a read-only pairing report. `review` names the lifecycle stage, not a command. It finds every file whose name ends with a declared suffix, derives its `.md` source by removing the suffix, reports each draft/source pair, and fails when a declared draft has no source.
- `publish <name> --into <dir> [--companion <suffix>]...` accepts the same declarations, refuses an orphan draft, removes the declared companions from the work directory, copies the work directory, and then removes it.
- With no declaration there are no review drafts. `pair` still lists possible drafts whose shortest dotted suffix resolves to an existing `.md` source; they are reported as undeclared. A source may have no draft, one draft, or several; a source without a draft is not an error.
- A declared suffix may name a translation (for example `.zh.md`) or a project pairing record (for example `.i18n.yaml`). Overlapping suffixes resolve to the longest suffix, matching the notes mechanism.
- The forge writes no `.i18n.yaml`, stores no source hash, and has no `pair --check`. Whether a pair is current is decided by the project's own pairing gate; the forge does not import that gate and does not name it.
- Before `publish`, the adopter removes review-draft-only content from the work-draft sources; `publish` copies the sources unchanged.

## Design

The work directory remains the authority. A declared companion is a regular file under the work directory whose name ends with a declared suffix; its source is the same path with the suffix removed and `.md` appended. The suffix follows the notes shape and cannot be `.md`; the source must exist as a regular file. The report is a list of `draft → source` rows; an orphan is an error in both `pair` and `publish`. With no declarations the report lists possible drafts whose dotted suffix resolves to an existing `.md` source; with declarations it adds any undeclared candidates after the declared pairs.

The review drafts and their pairing records are ordinary work-directory content to the forge. The adopter's pairing gate writes the `.i18n.yaml` records; the forge declares and removes them, and never writes or checks them. `publish` removes the files covered by the declarations before copying; every other file is copied. This makes the declaration the boundary: a companion whose suffix is not passed is not a review draft and lands as content.

The change is source-level: `package/dsh-spec-skill-forge/forge.ts`, the bundled work-directory script, the forge's SKILL.md review rules, the lifecycle tests, `package.json`, the AGENTS/package README wording, and this record. The work directory was published to `skills/dsh-spec-skill-forge/`, the installed copy was refreshed, and this record moved to `implemented/`.

## Forging record

- Goal: use `dsh-spec-skill-forge` to forge `dsh-spec-skill-forge`, changing only the review-draft pairing to the notes mechanism's declarative shape; other adjustments are left for the final human review.
- Baseline: branch `forge/dsh-spec-skill-forge-pairing`, started from `refactor/dsh-skills` at `c59ed1b`.
- Delivery language: English. Review language: Chinese, paired only at the stop. Additional trigger language: Chinese, already present in the description.
- Source constraints read: the current forge `SKILL.md`, `forge.ts` and lifecycle tests; the agent-notes `SKILL.md`, `references/notes-contract.md` and `scripts/notes.mjs` (suffix validation and companion pairing); and the adopter's `AGENTS.md` declaration.
- Pages read: `https://agentskills.io/llms.txt` and `https://agentskills.io/skill-creation/best-practices.md` on 2026-10-27. The specification page was not re-read for this narrow change; the gate's existing checks and the current skill's structure were enough.
- Disposition table:

  | Source location | Disposition | Target home | Basis / forcing fact |
  |---|---|---|---|
  | `SKILL.md § Review`: review needed when the review language differs or the adopter asks | Re-bind | `SKILL.md § Review`; a review starts on a suffix declaration | The notes mechanism has no inferred language |
  | `SKILL.md § Review`: fixed `<source>.<lang>.md` pair with a source-hash record | Re-bind | Declared suffix beside a `.md` source; no forge-owned record | Notes companions are declared; consistency belongs to the project's gate |
  | `SKILL.md § Review`: one translation per source, multiple rejected | Dissolve | Multiple declared companions allowed; `pair` reports orphan drafts | The check that takes over is the read-only pair report |
  | `SKILL.md § Review`: every source must have a translation when pairs exist | Dissolve | Selective drafts; a source without a draft is valid | Notes active trees translate selectively |
  | `SKILL.md § Review`: only `.md` files paired; scripts and assets untranslated | Adapt | Any declared suffix; the source is a `.md` file | Pairing is declarative; companion file types vary |
  | `SKILL.md § Review`: work directory is the only authority; draft fidelity | Keep | `SKILL.md § Review` unchanged | No source change |
  | `SKILL.md § Review`: the final review submits the drafts and waits | Keep | `SKILL.md § Review` unchanged | The handover remains the adopter's decision |
  | `SKILL.md § Verification`: Complete requires current translation pairs | Adapt | Complete requires paired declared drafts and the project gate run when review was needed | Consistency is the project gate's job |
  | `SKILL.md § Verification`: gate and review are separate read-only checks | Adapt | Gate and `pair` are separate; `pair` has no `--check` | Consistency is the project gate's job |
  | `SKILL.md § Defaults`: `Review language` default | Adapt | `Review drafts` default: none until declared; suffix names the language or record kind | The declaration replaces an inferred language default |
  | `forge.ts` pair/publish pair removal | Adapt | Read-only pair report and declaration-driven publish removal | The forge no longer writes or checks pair records |
  | `AGENTS.md`, `package/README.md`, `package.json` wording and commands | Adapt | Declarative companion wording and candidate CLI invocations | The repository's forge skill uses declared companions |
  | Historical forge skill § Languages: a review draft reverses the description's additional trigger language | Re-bind | `SKILL.md § Review` | The earlier skill stated the rule; the simplified skill lost it, and the missing trigger language exposed the loss |
  | An existing decision record | Re-bind | `SKILL.md § Source` | Only the request, the current contract and the declaration decide; the record supplies a requirement only where one of them keeps that requirement in force |
  | Adopter declaration: forging record location | Keep | `.agents/dsh-spec-agent-notes/implemented/process/2026-10-27-forging-dsh-spec-skill-forge.md` | `AGENTS.md` names the notes tree and the `forging-<skill-name>` filename |

  Unchanged: the guiding principle, tool names, Stop/Intent/Source/Disposition/Script conversion/Record sections, the verification anchor table, the gate mechanics, and the description/trigger.

- Checks at landing: landed skill gate 14/14 (97 lines, ~3,022 tokens); `node --test tests/forge-lifecycle.test.ts` 39/39; `pnpm test` 206/206; notes gate 31 notes / 62 companions; the work-directory review pairs passed the project pairing gate before cleanup; `pnpm run format:check` green; DCO verified the landing commit. The lifecycle suite covers read-only pairing, selective and multiple companions, overlapping suffixes, invalid suffixes, orphan refusal, declaration-driven publish removal, candidate heuristics, and undeclared-candidate reporting.
- Review: two independent reviewers accepted 729a892; the human accepted the landing.
- Residual limits: review-draft-only content removal from work-draft sources is a judged instruction, not a mechanical check; `publish` is not transactional; candidate discovery is a heuristic.

## Alternatives considered

**Keep the forge's source-hash record and add declarative suffixes.** That was the first attempt: it makes declarations configurable but leaves the forge owning a second pairing mechanism. The notes mechanism does not put consistency records in the skill; the forge should not either.

**Copy the `dsh-translate-docs` section-hash record into the forge.** The forge would then own a second implementation of the project's pairing gate and depend on that gate's format. Pairing a draft and deciding whether it is current are different jobs; the adopter's gate already owns the second.

**Rely on a fixed `.zh.md` convention.** It assumes a review language and forbids selective or multiple drafts. The declaration is the adopter's choice.

**Hard-depend on `dsh-translate-docs`.** A shared workflow is not a runtime dependency. The forge should not import or invoke a translator gate; the adopter decides which gate runs in the work directory.

## Consequences

- The forge now owns declarations, pair/source reporting, orphan refusal and publish removal; it owns no source hash, no consistency record and no `--check`.
- The project's pairing gate owns whether a pair is current; the forge does not import or invoke it. Review drafts and their `.i18n.yaml` records remain adopter content and are removed by `publish`.
- `publish` removes declared companions and copies the work-draft sources unchanged. Review-draft-only content in those sources must be removed by the operator before publishing; a forgotten switcher, backlink or removed-draft link lands.
- The `pair` command is read-only. Its no-declaration report lists candidate companions by suffix relation; the shortest-suffix rule and proximity to a `.md` source make it a heuristic, and it never deletes.
- The description-reversal rule and the current-source rule for earlier decision records are in the skill body; both are judged in review rather than mechanically checked.
- The landed skill passes the gate at 97 lines and ~3,022 tokens; the lifecycle suite has 39 tests, the repository suite 206, and the notes tree 31 notes / 62 companions. The work-directory pairs passed the project pairing gate before cleanup.
- Costs and open risks: the forge cannot detect stale translations; manual source cleanup is unverified; `publish` is not transactional and removes declared drafts before copying; the candidate heuristic can report false positives. The VCS is the rollback.

# Agent Note: Skill selection has one detailed home

Status: implemented

English | [中文](2026-11-20-skill-selection-has-one-detailed-home.zh.md)

## Problem

An adopter chooses a skill subset from installation conditions, recommended companions, common combinations and skip rules. The root README cannot carry that depth without becoming a catalogue that competes with the package's quick start. Returning the material to per-skill READMEs would recreate the scattered introduction the skill set removed.

## Decision

The root README remains the adoption entry. It names the universal starting group, maps five need-based groups, summarizes provenance and links to `docs/choosing-skills.md`.

That guide is the single detailed home for group roles, recommended companion explanations, common combinations, the project-scoped installation procedure, capability requirements and skip rules. It is maintained as an English and Chinese pair.

The universal group installs as a unit. Its five skills cover the prompt, instruction, decision, prose and translation responsibilities that recur in ordinary agent work; `dsh-spec-translate-docs` is therefore present without a condition that the project already maintain pairs. This is the deliberate exception to avoiding skills a project does not yet use; the update burden is accepted for one small baseline that covers the usual collaboration documents. Recommended companions remain optional additions, and every skill keeps its own trigger, boundary and completion path.

## Alternatives considered

**Restore a README beside every skill.** It gives each skill a local page, but scatters one comparison across the catalogue and adds a maintained pair for every skill directory.

**Keep the complete catalogue in the root README.** It avoids a second document, but pushes installation conditions and companion matrices into the project's first impression and duplicates the quick start's role.

**Create one detailed page per adopter group.** It can shorten each page, but creates five coordinated homes for one selection decision and makes adding a skill touch several pages.

**Turn recommended companions into dependencies.** It gives one installation command for each workflow, but prevents independent adoption and makes an optional mechanism a failure condition for an unrelated task.

**Reduce the universal group to the capabilities a project already uses.** It produces a smaller first installation, but makes adopters predict which recurring instruction and document work will appear and omits the companions that keep `AGENTS.md` instructions and decision records readable.

## Consequences

- A newcomer starts from one concise README and one universal installation command.
- The grouped install stops at the first failed skill without enabling fail-fast mode in the caller's shell.
- Specialized skills are selected from one detailed, bilingual guide rather than inferred from a long catalogue.
- The universal group installs without a per-skill eligibility question, while specialized skills remain optional.
- An ordinary review request installs `dsh-spec-pr-description`; `dsh-spec-merging-stacked-prs` joins only when the project uses GitHub's official stacked-PR workflow.
- Adding or moving a skill requires updating the README group table and the guide's group, provenance and companion explanation.
- The adopter-documentation gate checks the five-way skill partition, agreement between the README installation block and universal group, the fixed universal members, on-demand specialized-group installation, the ordinary versus official-stacked-PR recommendation split, local links and the English-Chinese guide structure.
- [The skill set has no per-skill READMEs](2026-09-21-the-skill-set-is-introduced-once.md) remains the owner of that rule and links here for the current overview/detail boundary.

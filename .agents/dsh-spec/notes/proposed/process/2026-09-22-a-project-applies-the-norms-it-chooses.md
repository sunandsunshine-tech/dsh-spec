# Agent Note: A project applies the norms it chooses

Status: proposed

English | [中文](2026-09-22-a-project-applies-the-norms-it-chooses.zh.md)

## Problem

The pattern this repository extracted has accumulated rules that hold for any project: how a change walks from WIP to merge, what prose owes its reader, who owns a fact, what counts as evidence, how a test suite stays honest. Today they live in three places only this repository reads — the standing orders in `AGENTS.md`, the conclusion of each decision record, and the workflow skills. A project that adopts the skill set receives the workflows and the mechanism text, but not the rules themselves, and a person who wants one reads a decision record per rule.

## Proposal

Ship the rules as a catalog, and let a project apply the ones it chooses, by group or by id.

**The catalog is data.** `skills/dsh-spec-manager/references/norms.json` holds every norm with a stable id (`<group>.<name>`), the group a project chooses it by, the English title and body that would be written into that project, a Chinese title for the choice surface, and the decision record that owns the rationale. Every body is one shape: the rule in the imperative, then `- Why:` — the reason that makes it a rule rather than a preference — then `- Self-check:` — how a reader notices they are breaking it. A catalog that cannot be rendered is refused by name before anything is written: an id that would not survive being matched, an id recorded twice, a norm in an undeclared group, a group nothing belongs to, a body with no reason. The rule line names the symptom a reader recognizes -- *running a tool twice must not erase what it did not write* rather than *creating and updating carry different licences* -- because a norm nobody parses on the first read is a norm nobody applies.

**The choice surface is `norms list`.** One heading per group and one line per norm, printed in the language `--help zh|en` or the locale selects. The body is English, because an agent is what reads it and the skill set is English; the Chinese title exists so a Chinese-speaking reader can choose and identify a rule without reading the English body. `--json` carries both titles, the body and the record, which is the form an agent renders the choice from — a CLI cannot portably render a picker, but it can hand an agent the data to render one. The record is published as a URL, because a repository path exists only in this repository; the path stays beside it for reference. The listing itself stays clean: it is for choosing, and a norm is explained where it is asked about. The norms are deliberately **not** a gate: a project is allowed to personalize a rule, so drift is reported by install and update and never fails a check.

**The applied text is one managed file with one section per group.** Each rule is one list item wrapped in `<!-- dsh-norm: <id> -->` … `<!-- /dsh-norm -->`, so a rule can be located, hashed and personalized on its own; the markers are HTML comments, which Claude Code strips before injecting a file into context. Beside the file, a sidecar records the ids the project applied and the hash of each rule as the collection last wrote it — the same idea as the `.i18n.yaml` that records a bilingual pair's confirmed state.

**`AGENTS.md` points at the file only while a project applies norms.** The hook is one more marked region: the verbs add it with the first applied norm and take it away with the last, the initializer's sync restores it from the record, and it is rendered from one place so the project and the collection state it once. A project that applies nothing carries no line pointing at a file it does not have.

**Install and update compare three states per id.** The project's text still hashes to the recorded base and the revision changed the rule: overwrite with the revision's text, silently, because nobody had touched it. The project's text moved and the revision did not: keep it and report it as personalized. Both moved: keep the project's text and print both versions — the revision's and the project's, since the record holds the base as a hash rather than as text. The decision the report asks for is carried out explicitly: `norms update --take <id...>` takes the revision's text, and `norms update --keep <id...>` records the project's text as deliberate, after which no update overwrites it. `--dry-run` is the whole difference between a preview and an apply, and the preview renders the same comparison. **The manager never writes them.** `install` and `upgrade` report the applied norms the way `apt update` reports upgradable packages — how many of them the revision moves, or that none are applied and where to see what the set offers — and `norms update` is the only command that writes.

## Delivery in two rounds

- **Landed first:** the catalog, `norms list` (with `--group` and `--json`), and the tests that keep the catalog renderable and the surface stable.
- **Landed second:** `docs/norms.md` and `docs/norms.yaml`, the three states, `norms install | update | remove`, the `--take`/`--keep` decisions, and `norms explain <id>` — the full body, the record URL at the ref the manager itself was installed from, and whether this project applied the norm. A tree with no installed ref prints the record's path instead of a URL.
- **Landed third:** the conditional `AGENTS.md` hook, added and removed by the verbs and by the initializer's sync.
- **Deliberately not done:** a `rules` merge mode in the initializer's managed-file list. A refresh owns the mechanism text and the norms are a project's own selection with its own edits, so folding them in would make an upgrade rewrite project text — the failure the create-vs-update norm exists to prevent. The report keeps discovery without the write.
- **This repository does not apply its own catalog.** The norms were distilled from it and already live in its `AGENTS.md` and decision records; installing them back would state the same guidance twice, and two statements of one rule drift. A test holds the line: no `docs/norms.md` here and no hook in this `AGENTS.md`, while the mechanism is exercised in fixtures.

## Alternatives considered

**One file per group, hooked per group from `AGENTS.md` — the shape first proposed.** Rejected for now, on evidence from how the field organizes agent instructions. Claude Code's own guidance keeps the always-loaded file under 200 lines and splits only what can be *conditionally* loaded — its `.claude/rules/` files load on demand when a `paths` glob matches, and unscoped ones load every session, which is the same as not splitting. Codex documents one `AGENTS.md` merged from global and repository scope and asks for concrete rules with the critical ones first. dsh keeps one root `AGENTS.md` of 179 lines with topical sections, plus per-subtree files that trigger by directory. These rules are cross-cutting and have no path scope, so a split file has no trigger of its own, and a rule that is never read is worse than a rule that costs a line. The measured catalog is 18 rules, about 60 lines of body — inside that budget. The split stays reachable, and cheap, because groups and ids live in the data model: rendering one file per group later changes no id and no hash, and the group hooks in `AGENTS.md` become the trigger lines.

**Applying the chosen norms during `install`/`upgrade`.** Rejected: the two acts carry different authority. A refresh brings the collection's own text up to a revision, while the norms a project applies are chosen by the project and may have been edited by it; performing both in one command means an upgrade overwrites text the project wrote. The report gives the same discovery as `apt update` without that.

**A gate for drift.** Rejected: personalizing a rule is allowed by design, so drift is not a defect, and a check that failed on it would forbid the customization the sidecar exists to protect. The feature's own tests carry its stability instead.

**Shipping all 33 candidate rules.** Rejected: the rules about this package's own gates and decision-record mechanism are what the skill set itself solves, not rules a project applies. The generic ones consolidate to 18.

**A file per rule, text beside its hash.** Rejected: one catalog and one sidecar keep one owner per fact, and per-rule markers already give the granularity the hashes need.

## Acceptance criteria

- `norms list` prints every shipped norm; `--group` narrows to one group and refuses a group the catalog does not declare; the locale selects Chinese titles; `--json` carries both titles, the body and the record. A catalog that cannot be rendered — the nine ways the tests seed — is refused by name. (Met by this round's tests.)
- Install writes the selected norms into `docs/norms.md` as one section per group and one marked block per norm, and records each base hash beside them; update overwrites only a block whose text still hashes to its base, keeps and names a personalized one, prints both versions for a conflict, and never writes outside a marked block; `--take` and `--keep` carry out the decision; `--dry-run` renders all of it and writes nothing. (Met by the write-path tests.)
- `install` and `upgrade` name the applied norms the revision moves, or that none are applied and how to see them, and write neither `docs/norms.md` nor `docs/norms.yaml`. (Met by the refresh tests.)
- A project carries the `AGENTS.md` hook exactly while it applies norms: the verbs add, refresh and remove it, the initializer's sync restores it from the record, and this repository carries none. (Met by the hook tests.)

## Risks

- The catalog can outgrow what an always-loaded file should carry. The mitigation is the recorded split path rather than a promise to stay small, and the size is measured rather than felt.
- A hash records that text moved, not that the move was meant. A project that reformats a rule will be asked about that rule; because the report is per rule the cost is one question, not one file.
- These are the opinions of one repository. Publishing them as good practice claims more than one project's experience, so every norm carries the record it came from and a reader can weigh the reason instead of trusting the rule.

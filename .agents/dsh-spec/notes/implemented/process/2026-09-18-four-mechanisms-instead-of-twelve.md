# Agent Note: Four mechanisms instead of twelve

Status: implemented

English | [中文](2026-09-18-four-mechanisms-instead-of-twelve.zh.md)

## Problem

The collection's mechanisms had multiplied past what one person can hold: a document tier system with targets, ceilings and a ratchet; fifteen gates; a dispatcher, a manifest and a release record with per-file hashes; a thirteen-key ledger; bilingual triples for every note; postmortems; a diagram set. The maintainer reported that he could no longer see the design as a whole and that this blocked his decisions. That is itself the defect rather than a report about one: a mechanism nobody can hold in their head gets bypassed, and a bypassed mechanism still counts as coverage.

Two causes stand separately. Most of the weight was machinery this repository invented rather than discipline it borrowed: dsh keeps its gates in the project and runs them from CI, while this collection ships generic gates into projects and therefore needs a dispatcher and a manifest to deliver them. And this repository has been bootstrapping — designing the mechanism and using it on itself in the same weeks, against its own source — which is the worst sample for judging weight, because much of what was visible was scaffolding rather than structure.

## Decision

**The collection keeps four mechanisms and cuts the rest.**

1. **Notes are the only decision record.** The tree, the classes, the lifecycle, the in-file format and the three gates that keep them honest stay. A postmortem folds into the notes' `bug-fix` class rather than remaining a second narrative tier.
2. **Code architecture bounds perception.** A module directory is a bounded context: its README states its contract, its tests state its behavior, and nothing else needs reading to change it.
3. **An index at the root, and nothing else.** `AGENTS.md` carries orders and **routing** — which kind of change reads which directory. The root `README.md` is the architecture: what exists, what owns what, and the command that checks it.
4. **One aggregate command.** Its exit code is the whole check. The gate list is **recorded** in `references/manifest.json`, and the dispatcher reconciles the record against the `verify-*.ts` files beside it before it runs anything — a recorded name with no file, or a file the record does not name, is reported and refused. It runs every recorded gate and fails when one fails **or when the record and the engine directory disagree**, which is what makes any gate non-optional. [A gate is a recorded name](2026-09-20-a-gate-is-a-recorded-name.md).

### The eight skills

| Skill | What it owns |
|---|---|
| [`dsh-spec-manager`](../../../../../skills/dsh-spec-manager/SKILL.md) | Project initialization, the manifest, install/update/uninstall at one pinned revision, the collection's one code home — every gate and the dispatcher that resolves one recorded name against the engine directory beside it — and the aggregate command that runs every recorded gate |
| [`dsh-archive-agent-notes`](../../../../../skills/dsh-archive-agent-notes/SKILL.md) | The note contract and its three gates: classification, in-file format, and the frozen archive |
| [`dsh-translate-docs`](../../../../../skills/dsh-translate-docs/SKILL.md) | The bilingual pairing contract and its gate, on the self-declaring pair rule |
| [`dsh-pre-push-checks`](../../../../../skills/dsh-pre-push-checks/SKILL.md) | Which evidence an outgoing diff must carry, selected from the recorded gates |
| [`dsh-prose-standard`](../../../../../skills/dsh-prose-standard/SKILL.md) | Where prose is required, and the editorial standard it meets |
| [`dsh-trim-cot-leakage`](../../../../../skills/dsh-trim-cot-leakage/SKILL.md) | Prose that reads like a leaked reasoning transcript |
| [`dsh-code-review`](../../../../../skills/dsh-code-review/SKILL.md) | The review a change receives, against the root `AGENTS.md` |
| [`dsh-find-simplifications`](../../../../../skills/dsh-find-simplifications/SKILL.md) | Dead, duplicated, speculative and over-built surfaces |

**Four skills leave**, each because the mechanism it parameterized is gone or because the capability belongs elsewhere:

| Removed skill | Reason |
|---|---|
| `dsh-doc` | Its subject **is** the documentation mechanism this decision deletes; the tier table, the budget policy and the `verify-doc-*` and `verify-readme-shape` gates leave with it, while `verify-md-links` and `verify-md-link-syntax` survive in `dsh-prose-standard`. **The maintainer confirmed the removal on that ground: a skill whose whole subject is the mechanism being deleted has nothing left to own.** |
| `dsh-ci-test-reliability` | It was parameterized from the `test-lanes` key, and that key recorded `none`: this repository has no CI, no build step and no test runner, so the skill described no work here |
| `dsh-speed-up-perf` | The `perf-baseline` key recorded that nothing here is measured: the deliverable is Markdown and dependency-free TypeScript run on demand |
| `dsh-merging-stacked-prs` | Stacked pull requests are a capability of the host, not a repository discipline, and the `gh` skill covers the capability |

**Eight is a decision, not a remainder.** Every skill that stays keeps its name and its trigger description, because each still owns a distinct subject; the four above each owned a mechanism this decision removes.

### One code home for the collection

**Every gate lives in `dsh-spec-manager/scripts/`, and the other skills ship no code at all.** The three skills that used to carry their own gates — `dsh-archive-agent-notes`, `dsh-prose-standard` and `dsh-translate-docs` — keep their `SKILL.md` and their `references/`, and their scripts moved into the manager with no change but the import specifiers the move itself required. One directory now holds every gate, the dispatcher that resolves a recorded gate name, and the modules they all import, and `references/manifest.json` shrank to match: it decides the skills to install, the pinned revision, and the recorded list of gate names, and nothing else. It no longer maps a gate to an owner, because with one code home a gate has exactly one possible owner.

**This trades per-skill self-containment for one place to change.** The trade is deliberate. The dependency on the manager was already strong — every gate imported its repository walker, notes root, i18n scope and Markdown parser, and the dispatcher that ran them sat in its directory — so the self-containment was only apparent: a skill could not be read, run or repaired on its own while the layout still implied it could, and every new gate paid for the appearance with another path to reason about. What is given up is the claim that a skill directory can be lifted out of the set. **The premise is that the set installs together: installing one skill alone is not supported.** A project takes the whole manifest at one pinned revision through the manager, and a skill separated from the collection loses its checks rather than keeping them.

**A gate's defect is the collection's defect.** The engine directory is not the manager's own workflow, and a bug in a gate belongs to that gate's subject rather than to project setup; the manager's `SKILL.md` and README say so where a reader meets the directory.

**Three fewer mechanisms, and the facts they held have owners that already exist.** The ledger is deleted with the templates that created it, the reader every gate imported and the gate that reported its open questions; a second key-value store beside the filesystem was a second place for one fact to live. The table below names every ledger question and where it is answered now:

| Ledger question | Where it is answered |
|---|---|
| `notes` | The fixed path `.agents/dsh-spec/notes`, from the one literal `notes-root.ts` owns |
| `notes-gates` | The fixed paths themselves: the notes tree above, and the collection's one code home, `.agents/skills/dsh-spec-manager/scripts/`, where every gate sits beside the dispatcher that addresses it by name |
| `i18n-scope` | **Self-declaring**: a `.md` with a `.zh.md` sibling is a pair and its `.i18n.yaml` sidecar must match. The file's existence is the declaration, so the pairing gate reads no key |
| `quality-gates` | The manifest, `references/manifest.json`, plus the aggregate `dsh-spec.ts all --check` |
| `skill-refresh` | The manager's [`manager-lifecycle.md`](../../../../../skills/dsh-spec-manager/references/manager-lifecycle.md), with the command written out |
| `code-review` | Standing entries in the root [`AGENTS.md`](../../../../../AGENTS.md) |
| `_mode`, `_proposals` | Deleted with attended/unattended: initialization is always scan-then-ask, and writes neither file |
| `test-lanes`, `perf-baseline`, `doc-tiers`, `stacked-prs` | Deleted with the skill or the mechanism each parameterized |

### The release record is deleted

`references/release.json` is gone, and with it the manager's `release` subcommand. It recorded a revision, a SHA-256 per layer file and a SHA-256 per gate, and each of those facts already has an owner: `gh skill install` writes the ref it resolved into every installed `SKILL.md` as `metadata.github-ref`, so the installed revision is readable from the file that will run, and `references/manifest.json` records the gate list the dispatcher reconciles against the engine directory. Nothing else is recorded, so nothing else can go stale.

Two false greens are the reason, and they are one defect twice. A release invoked from the source dispatcher wrote the record beside `skills/` while the installed dispatcher read its own copy; an earlier one recorded four gates while the installed set held seven. Both printed a green computed from files other than the ones the command addressed. The rule the change leaves behind is the acceptance criterion: **no command may report green while the thing it runs differs from the thing the working tree holds.**

### The documentation mechanism is deleted

The tier table and its targets, ceilings and ratchet; the placement, tier, composition, generated-region, budget and README-shape checks; the composition map; the diagram set as a maintained artifact; and the `docs/AGENTS.md` standard are all gone, and the `dsh-doc` skill with them. The document gates caught real defects, and the honest reading of that is that they caught them in a mechanism this repository had just invented and kept changing, not that a project's documents need a tier system to be correct.

**`docs/` survives as an unmanaged folder.** What remains there is what a person wrote for people to read: no tier, no budget, no gate, and no instruction file of its own. Nothing is required to be there, and nothing there is checked.

**`docs/terminology.md` keeps its consumer, and its path has one owner.** The translation briefing still matches changed spans against its rows, and that matching is what makes a briefing worth generating. The path is one literal in `i18n-scope.ts` that the briefing generator imports, so the table is read at its decided home and nowhere else, and the collection no longer ships a copy of it as a template.

**The initializer writes the agent instructions and the note tree, and no documentation tree.** The tier directories it used to create, the `docs-AGENTS.md` template it used to install, and the tier sentence in `AGENTS.md.template` are deleted with the mechanism. The rule that made the difference is recorded in [Never overwrite a file the initializer did not create](../bug-fix/2026-09-18-never-overwrite-a-file-the-initializer-did-not-create.md): the initializer overwrites nothing it did not write, and a write added beside existing writes inherits that rule from them.

**A rule with no mechanical backstop does not hold.** The tier table this decision removes was itself the evidence: the source project's table drifted from its tree — pages no tier claimed, two budget numbers disagreeing with the manifest that enforced them — with the same prose standard and reviewer attention this repository has. Deleting the prose gates therefore moves what they caught into review deliberately, and the risks below state what review now owns.

### The consolidated notes

**Thirteen implemented notes were consolidated into this one and deleted.** Each is named with the rationale it contributed, so nothing unique is lost:

| Consolidated note | What this note preserves from it |
|---|---|
| `Two budget numbers and the ratchet` | Two numbers for one fact must live in one home or they drift; a ceiling is an independent recorded number and never tracks the document it bounds; the deliberate deviation from dsh's unshipped proposal |
| `Select the evidence a diff needs` | Evidence is selected by the diff; gates are addressed by name, never by path; a forgotten gate and a gate that does not apply look identical; the mapping ages with the manifest |
| `Check where a document sits` | A corpus must be total for its check to mean anything: a document no rule claims is the failure a partial check cannot see, which is why the surviving gates fail on an empty corpus and report what they excluded |
| `Replicate the documentation mechanism, not its template` | Mechanism and template are separable, and only the mechanism is transferable; a described-but-unenforced tree drifts, which the source project's tier table demonstrated |
| `Initializing the docs tree, and one home for a ceiling` | A number recorded in one file and enforced from another is the drift the ledger was meant to prevent; naming a document by abstract key adds a third home for the same fact |
| `Check the map, and the regions a generator owns` | A recorded claim nothing compares against the tree can stop being true silently, which is why the root `README.md` is kept short enough to stay true by reading it; a check states a coverage gap in its own words rather than implying coverage |
| `One skill per workflow and a manager` | One catalog entry per workflow keeps every trigger description live rather than routing behind an entry that may never load; installation is by explicit name from the manifest at one pinned revision, because discovery is repository-wide; a manager owns install, update and removal |
| `Configure the gates from the ledger` | A gate's scope is a decision: documentation cannot fail, so a fixed path with a reason beats a configurable literal nobody re-reads; a gate reports what it skipped, grouped by the rule that skipped it |
| `Human documentation is not agent material` | Prose written for a person and prose written for an agent obey different rules; imposing one on the other turns a deliberate design into a permanent violation, and the audience of a file is a decision rather than something a glob guesses |
| `Read the frontmatter block` | Metadata is data to a parser and prose to a text pass; a corpus-wide edit must treat a fenced region as opaque, and its own lesson is recorded in [Treat frontmatter as a block, not as a paragraph](../bug-fix/2026-09-18-frontmatter-is-a-block-not-a-paragraph.md) |
| `Extract the remaining workflow skills` | A skill is extracted when its subject is general, not when its code is; the collection's own workflow skills exist because a workflow with no owner becomes nobody's job |
| `Install a terminology table` | A template's rows are examples and a table's rows are decisions; a table full of another project's terms teaches a translator to reach for terms this project never writes; one lookup table per subject is a document with one owner |
| `Restore the module-contract kind system` | A module README is the one document a reader arrives at without being sent there, which is why the surviving architecture mechanism requires one per module directory; a summary ceiling and a total ceiling answer different questions, and the kind derivation is separable from the templates that carried it |

**Four implemented notes keep their decisions and lose a clause**, so they stay active and are cross-linked rather than consolidated: `Drop the work record` (the ledger is no longer one of the three places a decision lives), `Reference the gates where they ship` (the reference model survives; the `notes-gates` key does not), `Running the initializer on this repository` and `Scan scope, inlined rationale, and a package README` (both describe an initializer that created a ledger).

### Boundary condition, not just the principle

"The code is the fact" holds where the contract lives in code and tests — libraries, applications, command-line tools. Three classes of fact do not live there: **why** something is the way it is, which is a note; **what the public surface promises**, which is a check over exported symbols that this repository does not need and a compiled project does; and **how to operate it**, which is a runbook the project owns. A project adopting this decides those three explicitly rather than assuming the principle covers them.

## Alternatives considered

**Keep the present shape.** The smallest change is no change, and every mechanism in the inventory worked. It lost on the evidence that produced this decision: the present shape is the state in which the maintainer cannot decide, so its cost is measured rather than projected.

**Cut only the invented machinery and keep the document mechanism.** This keeps the part of the collection a reader is most likely to want and removes only what the repository built for itself. It lost because the document mechanism is the largest remaining second copy of facts the code already owns: the tier table, the placement check and the budget rows all restate what the file tree and the prose already say.

**Return to dsh's exact shape, with the gates in the project and CI running them.** This is the shape the pattern was extracted from, and it needs no dispatcher, no manifest and no release record. It lost because this collection ships generic gates into other projects and cannot adopt it while it does — though it is the destination if the collection ever becomes one project's own tooling.

**Keep the ledger and delete only the keys nothing reads.** This is the smallest cut that removes the dead weight, and it keeps one home for project facts. It lost because the surviving keys all had an owner already — a path, the manifest, a reference document, the standing orders — so the ledger would have become a copy of facts stated elsewhere, which is the failure the tier table demonstrates.

**Keep the record, written where the dispatcher reads it.** The record caught a layer someone had edited, and a release run from the installed copy writes the very file the installed dispatcher reads. It lost because the installer already writes the resolved ref into every installed `SKILL.md`: a second file holding the same fact can only disagree with the file that runs, which is how one record produced a green for a tree the dispatcher never executed.

**One budget number per document, as dsh ships.** The smallest change to the tier system, and the number it keeps is the one a gate enforced. It lost because it reproduces the drift the mechanism existed to detect: two numbers for one fact, recorded in different files, disagreeing without a signal.

**Ship the source project's tiers as the taxonomy.** One table, adopted whole, no negotiation. It lost because which documents a project has follows from its own layout and stack, and a table naming another project's directories teaches an adopter to delete rows rather than to decide what their repository needs.

**Fix the tooling and keep the tier vocabulary.** Placement, tier-set, composition and generated-region checks each caught a real defect, so the vocabulary could have stayed with fewer gates. It lost because the vocabulary is the second copy: it restates in a table what the file tree already shows, and every check over it exists to keep the restatement true.

**Keep the composition map and delete only the diagrams.** The map is the one page a reader sits with once, and a diagram set is a separate maintenance cost. It lost because the map and the tier table answer the same question twice, and the root `README.md` answers it in the place a reader already opens.

**Report a document no rule claims without failing.** A warning list is easier to adopt and never blocks a change. It lost because a report nobody must act on is the state being replaced: the source project had prose saying where its pages belong, and the pages drifted anyway.

**Keep the terminology table as a shipped template.** One file fewer, and the template already carries the rules and five example rows. It lost because a template's rows are examples: a translator following them follows this repository's illustrations rather than a decision, and the briefing generator needs a real table at the path it reads.

**Put the module-contract kinds in templates again.** The kinds generalised cleanly and a template per kind is a concrete starting point. It lost for the reason the kinds left with `dsh-doc`: a kind is a document tier under another name, its required sections are a shape check over prose, and the surviving architecture mechanism requires the one thing a module README must have — that it exists.

**Keep the ledger for the questions that remain open.** Initialization could still record what it could not determine rather than reporting it. It lost because a file of open questions is a second inventory with no reader: the initializer reports what it could not determine at the moment it runs, and an unanswered question that must persist is a note.

## Consequences

**One document answers what exists.** The root `README.md` states the surfaces, the owner of each, how a change flows and how to refresh the installed set; the root `AGENTS.md` carries the standing orders and routes; the manager's README stays the collection's introduction for the person who installs it. A newcomer reads those three and the README of the directory being changed.

**The check is one command, and it is the whole check.** `dsh-spec.ts all --check --root .` runs every gate recorded in `references/manifest.json`, and that record names eight: the note classification, format and archive gates, the pairing gate, and the three `dsh-prose-standard` gates for link targets, link syntax and frontmatter shape, plus the secrets gate. The dispatcher reconciles the record against the `verify-*.ts` files beside it at startup and refuses to run when they disagree, so adding a gate means recording its name and adding its script in the same change, and a recorded gate whose file is gone fails the aggregate instead of disappearing from it.

**The installed revision is read from the installed file.** `status` compares the ref `gh` injected into an installed `SKILL.md` against the manifest's pin, and a `SKILL.md` with no such block is reported by name as not being an install rather than passing as one. Nothing compares the installed tree against a list of what was copied, so a file a later revision removed is invisible to `status` — and inert, because gates are reached through the recorded names the installed dispatcher reconciles against its own engine directory.

**Coverage that the deleted gates held is now review's, except the three checks that survived.** Document length, the module-contract kinds, and whether a deleted `.zh.md` was meant to un-pair a document: review owns those, and the risks below name them. Link targets, link syntax and frontmatter shape stay mechanical, in `dsh-prose-standard`.

**The pruning is done, and the archive stays empty.** Deleting a fully superseded implemented note is consolidation, not archival: the note's rationale lives in the note that owns the decision, its triplet is deleted, and the frozen archive under `.agents/dsh-spec/notes/archived/` still holds nothing.

**The root `README.md` rots unless it is short enough to keep true by reading it.** Nothing checks it any more; the composition gate that compared the map against the tree is deleted with the mechanism, and the map's own note recorded why a claim with nothing behind it stops being true quietly.

**A pair can be dropped by deleting its `.zh.md`.** Self-declaring pairs mean an English-only document is legitimate, so nothing distinguishes a deliberate un-pairing from a lost translation; the pairing gate reports what declares no pair, and review decides whether that was intended.

**The check that caught the collapsed glob survives in `dsh-prose-standard`.** `verify-md-links` rejects the target a collapsed glob stops naming, so that defect does not depend on review noticing it. The frontmatter class left the shipped set later, when [the gate that enforced it turned out to have no owner in an adopted project](2026-09-21-frontmatter-has-no-owner-in-an-adopted-project.md); this repository keeps its own check inside `scripts/verify-skill-structure.ts`. The bug-fix notes that record the two incidents stay the durable account.

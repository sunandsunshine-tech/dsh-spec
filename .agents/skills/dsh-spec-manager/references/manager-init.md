# Initializing a project

Set up what every other skill in the set assumes is already in context: the standing orders in `AGENTS.md`, a home with an enforced format for decisions, and the documentation folder's standing orders beside an empty terminology table. This mode runs before anything else the manager does, and it never writes before it has asked.

## The rule that governs every write

**Never turn a guess into a fact.** The skeleton and the directory structure are safe to create; the *content* is not. Every `<angle-bracket>` marker is a question for a maintainer. Read the answer from the project's own files when a file can answer it — the build manifest, the test configuration, the CI workflow, the existing README — and **ask** when it cannot. A plausible invented command, path, or rule is worse than an empty section, because an agent will act on it.

Ask once, in one batch, and say which facts you could not determine. Do not interview the maintainer line by line, and do not fill a gap to make the file look finished.

## Workflow

1. **Inventory.** Run the manager without `--write`:

   ```sh
   pnpm dlx --allow-build=esbuild tsx@4.22.4 <manager>/scripts/manager.ts init --root <project>
   ```

   It reports the root `AGENTS.md`, every subtree instruction file with its line count, which parts of the Agent Note tree are missing, and which of the two documentation paths are. Read every file it finds before proposing changes.

2. **Gather the facts the template asks for.** Read the project's build manifest, test configuration, CI workflow, and top-level README. Every line under `Commands` must be a command the project actually defines, and you should have seen it defined. Collect what you could not determine into one list of questions.

3. **Ask before applying.** There is one route and it is scan-then-ask: present the inventory and the question list from step 2 and **wait**. The maintainer answers what the files cannot, and the answers arrive before anything is written. Running `--write` first and reporting the questions afterwards inverts the order: it makes the maintainer's answers a correction to work already done. Never let an unanswered question become a rule by default.

4. **Apply.**

   ```sh
   pnpm dlx --allow-build=esbuild tsx@4.22.4 <manager>/scripts/manager.ts init --root <project> --write
   ```

   The initializer resource beside the manager does the writing, and its behaviour is fixed:

   | Situation | Behaviour |
   |---|---|
   | No root `AGENTS.md` | Creates it from `AGENTS.md.template` |
   | Root `AGENTS.md` exists | **Appends only** the marked `dsh-spec:agent-notes` section; every existing line is preserved byte for byte |
   | The marked section already exists | Skips it, so a re-run never duplicates |
   | `.agents/dsh-spec/notes/` missing | Creates the three lifecycles, the six classes, `archived/`, the contract, and the three-note `AGENTS.md` set |
   | `.agents/dsh-spec/notes/` present | Creates only the missing paths; never overwrites a file it did not create |
   | Notes tree created or extended | Writes the root `.rgignore` entry that keeps the frozen archive out of recursive searches |
   | `--no-notes` | Skips the decision-record tree and that search exclusion entirely |
   | `docs/terminology.md` missing | Creates it from the template: the usage rules and an empty table, with no vocabulary rows |
   | `docs/AGENTS.md` missing | Creates it: the orders that govern the table, including who may add a row |
   | Either documentation path present | Creates only the missing one; never overwrites a file it did not create |

5. **Replace every placeholder, with the maintainer.** Walk the questions from step 2. Where an answer is unavailable, delete the section rather than inventing content, and say in your report which sections you deleted and why.

6. **Adapt the contracts, and leave the vocabulary table empty.** `.agents/dsh-spec/notes/README.md` is the source project's contract. Its rules transfer; its history does not. Point the lifecycle and class sets at this project, keep the in-file format, and delete or explicitly mark the passages that narrate the source project's own decisions. `docs/terminology.md` ships empty for a different reason: every row binds both sides of a bilingual pair, so a row is a decision, and neither the initializer nor the agent that ran it may make one. Leave it empty until the maintainer decides a term, and propose rows rather than adding them.

7. **Install the set.** Initialization leaves the project able to hold decisions but unable to run a gate: the skills arrive through the manager's `install`, and every gate arrives inside this skill with them, in the collection's one code home. Run it before reporting, and name the revision the project now carries.

8. **Leave no unanswered question behind.** The initializer writes the note tree and the instruction file; everything the templates could not answer stays an `<angle-bracket>` placeholder or a question in your report. **Resolving none of them is acceptable; leaving one unrecorded is not.** An agent opening an instruction file must be able to tell settled policy from an open question. Resolve them as work brings you to them, each in the same change that needed the answer, rather than in one upfront interview, which produces guesses.

## Syncing the files the collection owns

`init` creates the mechanism files once; **`sync` keeps their text identical to the installed revision**, and `install` and `update` run it, so a refresh reaches the project's own tree as well as `.agents/skills/`. Three merge rules decide what a project keeps:

| File | Merge | Why |
|---|---|---|
| the notes contract and its three `AGENTS.md` files, `docs/AGENTS.md`, `.rgignore` | **replaced** | the mechanism's text has to be the same in every project, and a project's own decisions live in notes rather than in the contract's prose |
| `docs/terminology.md` | header replaced, **rows kept** | a row binds both sides of every pair, so it is the maintainer's decision |
| the root `AGENTS.md` | **only the marked `dsh-spec:agent-notes` block is replaced** | the rest is the project's standing orders |

The notes files are synced only where the notes tree exists, so a project initialized with `--no-notes` is not given them back. Nothing outside that list is read or written. See the diff before applying it:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/manager.ts sync --root .
```

## What each artifact is for

| Artifact | Holds | Does not hold |
|---|---|---|
| Root `AGENTS.md` | Standing orders an agent needs in every session; one to three lines each, linking the home of its rationale | Worked examples, design narration, anything restated from a linked document |
| Subtree `AGENTS.md` | Orders specific to one directory | Repository-wide rules the root file already carries |
| `.agents/dsh-spec/notes/README.md` | The decision-record contract: layout, classes, in-file format, archive policy | This project's decisions — those are individual notes |
| `.agents/dsh-spec/notes/<lifecycle>/<class>/` | The notes themselves: one file per decision, named `yyyy-mm-dd-topic.md` | Anything mechanical enough that no maintainer would revisit it |
| `docs/terminology.md` | The vocabulary every bilingual pair obeys: one row per decided term, with the column meanings stated above it | Any row nobody decided — the table ships empty and stays that way until the maintainer says otherwise |
| `docs/AGENTS.md` | Orders specific to the documentation folder: who decides a row, and that the table declares no pair | Translation rules, which the pairing contract owns |
| The engine directory, at `.agents/skills/dsh-spec-manager/scripts/` | The collection's one code home: every gate, the dispatcher that resolves one by name, and the modules they import | Anything belonging to one workflow skill — those skills hold prose and references only |
| The installed skills under `.agents/skills/` | Each skill's own entry, references and templates, plus the manager's engine directory, at one pinned revision | Anything the project decided; that is what the notes are for |

## Boundaries this mode keeps

- **Never overwrite an existing `AGENTS.md`, and never reorder its content.** Appending one marked section is the only edit it makes to a file it did not create.
- **Never invent a fact.** Ask. An unverified claim in an instruction file is read as policy.
- **Never scaffold a tree the project will not fill.** The decision-record classes are cheap to create and easy to leave empty; if the project will not write notes, pass `--no-notes` and say so rather than creating folders nobody uses.
- **Never adopt another project's decisions.** The contract's rules are the transferable part; its examples are one project's history.
- **Never add a terminology row.** Every row fixes a word both sides of every pair write, so it is the maintainer's decision, asked for in the conversation. A working agent proposes a row.

## Files

Every path below is a resource of this skill; none of them is loaded as a skill of its own.

- `scripts/manager.ts` — the entry point. `init` runs the initializer beside it and passes through `--write` and `--no-notes`; the other subcommands are [`manager-lifecycle.md`](manager-lifecycle.md)'s subject.
- `scripts/init-agents-md.ts` — the initializer. Zero external dependencies, dry run by default.
- `templates/AGENTS.md.template` — the root instruction skeleton, with per-section instructions.
- `templates/terminology.md.template` — the vocabulary table's usage rules and an empty table, installed as `docs/terminology.md`.
- `templates/docs-AGENTS.md.template` — the orders for the documentation folder, installed as `docs/AGENTS.md`; it is where the rule that a row is the maintainer's decision lives.
- `templates/notes-README.md.template` — the decision-record contract, installed as `.agents/dsh-spec/notes/README.md`. It carries no language switcher, because the project has no Chinese counterpart until it makes one; `templates/notes-README.zh.md.template` is kept beside it, uninstalled.
- `templates/notes-AGENTS.md.template`, `templates/notes-implemented-AGENTS.md.template`, `templates/notes-archived-AGENTS.md.template` — installed as the three `AGENTS.md` files inside the notes tree.
- `templates/rgignore.template` — installed as the root `.rgignore`; it excludes the frozen archive from recursive searches, so a historical query has to name that directory on purpose.

Validating an initialized project is [`dsh-archive-agent-notes`](../../dsh-archive-agent-notes/SKILL.md)'s and the gates' job, not this mode's.

## The pairing scope init writes

Init installs the English notes contract only. The collection keeps `notes-README.zh.md.template` for the project that takes the translation workflow, and pairing declares itself: adding `README.zh.md` beside `README.md`, adding the reciprocal switcher line to the English side, and recording the pair with `verify-translation-pairing --write` is the whole of it, because a document with a counterpart beside it is a pair and a document without one is left alone. `docs/terminology.md` is the other half of that scope: it is released unpaired on purpose, because it is the table the pairs obey rather than a document with two languages of its own.

Every `{gate-dir}` and `{notes-dir}` a template carries is replaced with its real path as the template is written, because only the initializer knows where the collection landed and where the notes tree goes; a project should never fill either in by hand.

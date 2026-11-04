# Adopting the collection: what `install` writes into a project

`install` is the adoption verb, and it has two halves. The first deploys the skill set at the ref the manager itself was installed from, or at the revision `--revision <ref>` names. The second reaches the project's own tree: the initializer beside this skill creates the files a project needs and does not have, and then syncs the text the collection owns. `--dry-run` prints both plans and writes nothing, and the second half never needs the network.

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root <project> --dry-run
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root <project>
```

## What adoption creates

| Path | What it is |
|---|---|
| `AGENTS.md` (root) | The project's standing orders, plus the marked `dsh-spec:agent-notes` and `dsh-spec:plans` blocks the collection owns |
| `.agents/dsh-spec/notes/README.md` and its three `AGENTS.md` | The decision-record contract: the layout, the classes, the in-file format, and the orders for each subtree |
| `.agents/dsh-spec/notes/{proposed,implemented,rejected}/{class}/` | The active lifecycle tree, one directory per class |
| `.agents/dsh-spec/notes/archived/{class}/` | The frozen archive's kind directories |
| `.agents/dsh-spec/plans/README.md` | The delivery-plan contract: the plan's fields, the state its working copy reads as, its dependency line, and the start-and-finish rules |
| `.agents/dsh-spec/plans/AGENTS.md` | The orders that send a multi-step delivery to that contract before it starts |
| `docs/terminology.md` | The vocabulary table the translation briefing reads, released with its columns and rules and **no rows** |
| `docs/AGENTS.md` | The orders that govern that table |
| `.rgignore` | The search exclusions: the frozen archive, and the vendored bundle a search should not read as prose |

`upgrade` syncs the same files' text and creates none of them, so what a project deleted on purpose stays deleted.

## What the project owns

Two things survive every install and every refresh by rule, because they are decisions rather than mechanism text:

- **The rows of `docs/terminology.md`.** The table's header, its column meanings and its usage rules are the collection's; every row below them binds both sides of a bilingual pair and is the maintainer's decision, asked for in the conversation.
- **Everything in `AGENTS.md` outside the marked blocks.** Each block between `<!-- dsh-spec:agent-notes -->` and its closing marker, and between `<!-- dsh-spec:plans -->` and its closing marker, is replaced from the shipped template; the standing orders around them are the project's own writing and are never touched. The collection's own blocks are kept together in the order it lists them, at the position of the earliest one the file already carried, so a block another owner appends afterwards stays below them.

## What adopting without the decision tree is not an option

The notes tree is created with the rest, and there is no switch that skips it. A project that adopts the collection and not the tree would carry standing orders that describe a tree it does not have, documentation whose paths resolve to nothing, and a check that fails on its first run. Adopting the pattern means adopting the place decisions are recorded.

## The initializer's own flags

`install` and `upgrade` drive the initializer, and it can also be run by hand while building the collection:

| Flag | Effect |
|---|---|
| `--root <path>` | The project to write into; the current directory by default |
| `--write` | Apply the plan. Without it the run is a safe inventory: it reports what it would create and write, and touches nothing |
| `--sync` | Only bring the files whose text the collection owns up to the installed revision: the notes contract and its three `AGENTS.md` files, the delivery-plan contract and its `AGENTS.md`, `docs/AGENTS.md`, `.rgignore`, and the marked blocks inside the root `AGENTS.md` |
| `--dir <path>` | Where the skills were installed, when it is not `.agents/skills`; the managed text names the engine directory that follows from it |

Nothing outside the managed list is read or written, and a file the initializer did not create is never overwritten. The notes files are synced only where the notes tree exists, and the plan files only where the plan tree exists, so a project that removed either is not given it back by a refresh. Adoption writes each contract's English side only: the Chinese counterpart ships as a template, and a project that adds the other side declares the pair.

## Boundaries

- **The engine is referenced, never released.** The checks ship inside the collection; their commands are read through the entry point in `.agents/skills/dsh-spec-manager/scripts/`, and no copy of them is written into the project.
- **The initializer never overwrites what it did not create.** A file that exists is reported and left alone, whatever it contains.
- **The vocabulary table is released empty.** A row copied from the collection or invented by the initializer would be a decision nobody made.

# dsh-spec

English | [中文](README.zh.md)

Give your project a decision record for every change that matters, a check that notices when one is missing, and English and Chinese documents that stay in step.

It looks after the parts a team loses first: why a decision went the way it did, which other options lost, what a change owes as evidence, and how the English and Chinese versions of a document stay together. All of that gets written down, kept where it belongs, and checked by one command.

## Prerequisites

| You need | Used for |
|---|---|
| [Node.js](https://nodejs.org/) 22.19 or newer | Running the check scripts |
| [Git](https://git-scm.com/) | Managing the skills, and the checks that read commits |
| [GitHub CLI](https://github.com/cli/cli) (`gh`), with its `skill` command | Installing and updating the skills |
| [ripgrep](https://github.com/BurntSushi/ripgrep) | The recall probes in `dsh-trim-cot-leakage` |

The GitHub CLI ships an agent skill of its own; browse [its repository](https://github.com/cli/cli) to install one.

## Install

Install into the project, not into your home directory, and commit the result. A project-scoped copy is pinned by the project's manifest, so every collaborator, every agent and CI run the same revision; a user-scoped one stays on each machine and moves with the next `gh skill update`. Commit `AGENTS.md`, `.agents/`, `docs/` and `.rgignore` after the first install.

You install the manager yourself; it installs the other seven.

### Install by hand

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root .
```

The first command fetches the manager. The second installs the rest of the set at the same revision and creates the files this project needs — the standing orders, the decision-record tree, and the vocabulary table. Add `--dry-run` to see the plan first; run `status` afterwards to confirm the set.

### Install with an agent

Give your agent these instructions:

> Install the `dsh-spec-manager` skill from `sunandsunshine-tech/dsh-spec` with the GitHub CLI, then follow the "Install by hand" steps in this README. Check that the prerequisites above are present first, and ask me if any of them is missing.

## What you get

- **Decisions stay put.** Every change that matters says what it built, what it gave up and what will verify it, so the next person does not argue it again.
- **One command closes the loop.** It runs every check on record; a missing one, or a record that disagrees with the scripts beside it, fails on the spot instead of turning green.
- **The two languages stay together.** Each pair carries its English side, its Chinese side and a record of the last agreed state, so a side edited without the other shows up as a failed check.
- **Review and push have something to go on.** Review follows a list of what code alone cannot show; before a push you run the smallest evidence that covers the change, not the whole suite.

## The eight skills

| Skill | What it is for |
|---|---|
| `dsh-spec-manager` | Owning the set: initialize a project, install and update the skills at one revision, keep the mechanism text in step, run the aggregate check |
| `dsh-archive-agent-notes` | Keeping the decision records honest: validate the tree, check supersession, freeze what has served its purpose |
| `dsh-translate-docs` | Keeping a document and its translation in step, and recording the pair |
| `dsh-prose-standard` | What prose each place owes — API documentation, comments, tests, READMEs, diagnostics, visible strings |
| `dsh-trim-cot-leakage` | Cutting prose written from inside the session that produced it |
| `dsh-code-review` | The reviewer's path through a change, and what code alone cannot show |
| `dsh-pre-push-checks` | The smallest evidence that covers an outgoing change |
| `dsh-find-simplifications` | Turning "find things to simplify" into evidence-backed proposals |

## How a change goes

1. **Decide in a note first.** A change worth recording starts as a record under `proposed/`, with the problem, the options that lost and how it will be verified; a conclusion reached in conversation is recorded the same way, or it lives only in that conversation.
2. **Change the skill, not the installed copy.** Work lands in `skills/`. `.agents/skills/` is overwritten by the next install, so an edit there is lost.
3. **Close the loop with one command.** The command is in [`AGENTS.md`](AGENTS.md#commands): it runs every check, and the workflow skill for the change picks the smallest part of it that the change owes.
4. **Move the note, refresh the copy.** Once a decision ships, the note moves to `implemented/` and speaks in the present tense; the change is pushed, the installed set is refreshed from that revision, and both land together.

## What is in this repository

| Who | Job |
|---|---|
| `skills/` | The deliverable: eight skills, one per workflow; the code for every check sits together in `dsh-spec-manager/scripts/` |
| `.agents/skills/` | The copy this project runs, tracked in git so everyone loads one revision; only an install writes here |
| `.agents/dsh-spec/notes/` | The decision records: what was decided, what lost, what was given up. The format is [`notes/README.md`](.agents/dsh-spec/notes/README.md) |
| `docs/` | Pages written for people, including the vocabulary both languages share; nothing governs this folder |
| `scripts/` | What belongs to this repository and is not shipped: [`verify-skill-structure.ts`](scripts/verify-skill-structure.ts), the provenance registry and gate, and the `ports` comparison |
| `tests/` | The functional suite for the checks themselves — `node --test 'tests/**/*.test.ts'` |
| `submodules/dsh/` | Where the pattern came from, pinned as a comparison baseline: read it, never edit it |

## Refreshing the installed set

The set is pinned by the manifest's `revision`, and an install reads that revision rather than the working tree, so push the source change first:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts upgrade --root .
```

What that command does to each skill, and what `install`, `status` and `uninstall` add, is in [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md).

## Read next

- [`AGENTS.md`](AGENTS.md) — the rules that hold in every session, and the commands this repository actually runs.
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) — the collection's entry; the other seven skills sit beside it.
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.md) — the decision-record contract, which is the pattern describing itself.

## License

This project is released under the MIT License. The full text and copyright line are in [`LICENSE`](LICENSE); the upstream DeepSeek Harness notice, the ported files and the bundled npm packages are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

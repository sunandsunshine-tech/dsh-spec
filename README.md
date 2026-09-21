# dsh-spec

English | [中文](README.zh.md)

The way dsh builds software, pulled out into eight skills an agent loads as it needs them.

It looks after the parts a team loses first: why a decision went the way it did, which other options lost, what a change owes as evidence, and how the English and Chinese versions of a document stay together. All of that gets written down, kept where it belongs, and checked by one command.

## Install

A person installs one skill by hand. The rest is the agent's job.

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills
```

Then tell your agent to finish the install:

> /dsh-spec-manager finish the initialization

The manager does the rest: it installs and updates the whole set at one revision, initializes the project without touching what the project has already written, and keeps the mechanism text in the project identical to that revision.

## What you get

- **Decisions stay put.** Every change that matters says what it built, what it gave up and what will verify it, so the next person does not argue it again.
- **One command closes the loop.** It runs every check on record; a missing one, or a record that disagrees with the scripts beside it, fails on the spot instead of turning green.
- **The two languages stay together.** Each pair carries its English side, its Chinese side and a record of the last agreed state, so a side edited without the other shows up as a failed check.
- **Review and push have something to go on.** Review follows a list of what code alone cannot show; before a push you run the smallest evidence that covers the change, not the whole suite.

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
| `scripts/` | The one check that belongs to this repository and is not shipped: [`verify-skill-structure.ts`](scripts/verify-skill-structure.ts) |
| `submodules/dsh/` | Where the pattern came from, pinned as a comparison baseline: read it, never edit it |

## Refreshing the installed set

The set is pinned by the manifest's `revision`, and an install reads that revision rather than the working tree, so push the source change first:

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 \
  .agents/skills/dsh-spec-manager/scripts/manager.ts install --root .
```

What that command does to each skill, and what `update`, `status` and `uninstall` add, is in [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md).

## Read next

- [`AGENTS.md`](AGENTS.md) — the rules that hold in every session, and the commands this repository actually runs.
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) — the collection's entry; the other seven skills sit beside it.
- [`skills/dsh-spec-manager/README.md`](skills/dsh-spec-manager/README.md) — the package's own introduction: what it installs, what it writes into a project, and how to change what its checks do.
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.md) — the decision-record contract, which is the pattern describing itself.

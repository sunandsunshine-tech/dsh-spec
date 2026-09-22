# dsh-spec

English | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.19-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

Give a project one place to keep what a change has to carry: why it went that way, what it gave up, and what proves it. This repository extracts the pattern the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) team works by, and ships it as eight skills and one engine that a project installs, runs and updates from a single revision.

Two of the skills reach into the project's own tree: the contract for its decision records, and a catalogue of development norms the project chooses from. The rest are the workflows a change goes through — prose, review, pre-push checks, translations.

## Prerequisites

| You need | Used for |
|---|---|
| [Node.js](https://nodejs.org/) 22.19 or newer | Running the check scripts |
| [Git](https://git-scm.com/) | Managing the skills, and the checks that read commits |
| [GitHub CLI](https://github.com/cli/cli) (`gh`), with its `skill` command | Installing and updating the skills |

The GitHub CLI ships an agent skill of its own; browse [its repository](https://github.com/cli/cli) to install one.

## Install

Install into the project, not into your home directory, and commit the result. The ref you install the manager from becomes the pin for every other skill, so a project-scoped copy puts every collaborator, every agent and CI run on that one revision; a user-scoped one stays on each machine and moves with the next `gh skill update`. Commit `AGENTS.md`, `.agents/`, `docs/` and `.rgignore` after the first install.

You install the manager yourself; it installs the other seven. Pass `--revision <ref>` to install the manager at a branch or an older release instead of its latest published one.

### Install by hand

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts install --root .
```

The first command fetches the manager at the revision you name — `latest`, a branch, or a tag. The second installs the rest of the set at the ref the manager was installed from, and creates the files this project needs: the standing orders, the decision-record tree, and the vocabulary table. Add `--dry-run` to see the plan first, including which files would be added, changed or removed; run `status` afterwards to confirm the set.

### Install with an agent

Give your agent these instructions:

> Install the `dsh-spec-manager` skill from `sunandsunshine-tech/dsh-spec` with the GitHub CLI, then follow the "Install by hand" steps in this README. Check that the prerequisites above are present first, and ask me if any of them is missing.

## What you get

- **Decisions stay put.** Every change that matters says what it built, what it gave up and what will verify it, so the next person does not argue it again.
- **You pick the norms.** The set also ships the development norms it accumulated: each has an id, a group, and a body that says the rule, why it is a rule, and how to notice you are breaking it. `norms install` writes the ones your project chooses into `.agents/dsh-spec/norms/`, and `norms update` brings them to the installed revision without overwriting what you edited.
- **One command closes the loop.** It runs every check on record; a missing one, or a record that disagrees with the scripts beside it, fails on the spot instead of turning green.
- **The two languages stay together.** Each pair carries its English side, its Chinese side and a record of the last agreed state, so a side edited without the other shows up as a failed check.
- **Review and push have something to go on.** Review follows a list of what code alone cannot show; before a push you run the smallest evidence that covers the change, not the whole suite.

## The eight skills

| Skill | What it is for |
|---|---|
| `dsh-spec-manager` | Owning the set: initialize a project, install and update the skills at one revision, apply the norms a project chooses, keep the mechanism text in step, run the aggregate check |
| `dsh-archive-agent-notes` | Keeping the decision records honest: validate the tree, check supersession, freeze what has served its purpose |
| `dsh-translate-docs` | Keeping a document and its translation in step, and recording the pair |
| `dsh-prose-standard` | What prose each place owes — API documentation, comments, tests, READMEs, diagnostics, visible strings |
| `dsh-trim-cot-leakage` | Cutting prose written from inside the session that produced it |
| `dsh-code-review` | The reviewer's path through a change, and what code alone cannot show |
| `dsh-pre-push-checks` | The smallest evidence that covers an outgoing change |
| `dsh-find-simplifications` | Turning "find things to simplify" into evidence-backed proposals |

## Applying the norms it ships

The catalogue is data: every norm has a stable id, the group a project chooses it by, and a body that says the rule, why it is a rule, and how to notice you are breaking it. A project applies the ones it wants, by group or by id:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts norms list
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts norms install --group prose --root .
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts norms update --root .
```

They land in `.agents/dsh-spec/norms/norms.md`, with `applied.yaml` beside it recording which ids the project applied and the hash of each block as the skill set last wrote it. That record is what lets an update tell three cases apart: a block nobody touched takes the revision's text, a block the project edited is kept and reported, and a block both sides changed prints both versions and waits — `norms update --keep <id>` keeps yours, `norms update --take <id>` takes the revision's. While a project applies any norm, its `AGENTS.md` carries one section pointing at the file.

`install` and `upgrade` never write those files. They report what the revision moves, the way `apt update` reports upgradable packages, and leave the writing to `norms update`.

## Updating the skill set

The set follows the manager: every skill carries the ref the manager itself was installed from, and an install reads the remote ref rather than the working tree, so push the source change first. `upgrade` resolves the target revision, replaces the manager when it names a different ref, and then re-runs the freshly installed copy to deploy the set at it:

```sh
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts upgrade --root .
```

`upgrade --only-skill-set` is the half without the self-update: it installs the set at the manager's current ref. In a source tree, such as this repository, run `upgrade --revision <current-branch>`: a bare `upgrade` there has no installed manager ref to read and resolves the latest published release instead.

What that command does to each skill, and what `install`, `status` and `uninstall` add, is in [`manager-lifecycle.md`](skills/dsh-spec-manager/references/manager-lifecycle.md).

## Working in a project that has it

1. **Decide in a note first.** A change worth recording starts as a record under `proposed/`, with the problem, the options that lost and how it will be verified; a conclusion reached in conversation is recorded the same way, or it lives only in that conversation.
2. **Close the loop with one command.** The command is in [`AGENTS.md`](AGENTS.md#commands): it runs every check, and the workflow skill for the change picks the smallest part of it that the change owes.

## Working on this repository

- **Change the skill, not the installed copy.** Work lands in `skills/`. `.agents/skills/` is overwritten by the next install, so an edit there is lost.
- **Move the note, update the copy.** Once a decision ships, the note moves to `implemented/` and speaks in the present tense; the change is pushed, the installed set is updated from that revision, and both land together.

| Who | Job |
|---|---|
| `skills/` | The deliverable: eight skills, one per workflow; the code for every check sits together in `dsh-spec-manager/scripts/` |
| `.agents/skills/` | The copy this project runs, tracked in git so everyone loads one revision; only an install writes here |
| `.agents/dsh-spec/notes/` | The decision records: what was decided, what lost, what was given up. The format is [`notes/README.md`](.agents/dsh-spec/notes/README.md) |
| `docs/` | Pages written for people, including the vocabulary both languages share; nothing governs this folder |
| `scripts/` | What belongs to this repository and is not shipped: [`verify-skill-structure.ts`](scripts/verify-skill-structure.ts), the provenance registry and gate, and the `ports` comparison |
| `tests/` | The functional suite for the checks themselves — `node --test 'tests/**/*.test.ts'` |
| `submodules/dsh/` | Where the pattern came from, pinned as a comparison baseline: read it, never edit it |

## Read next

- [`AGENTS.md`](AGENTS.md) — the rules that hold in every session, and the commands this repository actually runs.
- [`skills/dsh-spec-manager/SKILL.md`](skills/dsh-spec-manager/SKILL.md) — the skill set's entry; the other seven skills sit beside it.
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.md) — the decision-record contract, which is the pattern describing itself.

## License

This project is released under the MIT License. The full text and copyright line are in [`LICENSE`](LICENSE); the upstream DeepSeek Harness notice, the ported files and the bundled npm packages are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

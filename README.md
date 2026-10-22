# dsh-spec

English | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.19-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

Give a project one place to keep what a change has to carry: why it went that way, what it gave up, and what proves it. This repository extracts the pattern the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) team works by, and ships it as a skill that a project installs into its own tree.

The skill forges a new skill from a concept, a source, or an existing one.

## Prerequisites

| You need | Used for |
|---|---|
| [Node.js](https://nodejs.org/) 22.19 or newer | Running the test suite and the checks |
| [Git](https://git-scm.com/) | Cloning the repository, and the check that reads commits |
| [GitHub CLI](https://github.com/cli/cli) (`gh`), with its `skill` command | Installing and updating the skills |

The GitHub CLI ships an agent skill of its own; browse [its repository](https://github.com/cli/cli) to install one.

## Install

Install into the project, not into your home directory, and commit the result. A project-scoped copy puts every collaborator, every agent and CI run on the revision you installed at; a user-scoped one stays on each machine and moves with the next `gh skill update`. Commit `.agents/skills/` after the first install.

Each skill is installed on its own, at the revision you name.

### Install by hand

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-skill-forge@latest --dir .agents/skills
```

Each command fetches one skill at the revision you name — `latest`, a branch, or a tag — and writes it under `.agents/skills/`.

### Install with an agent

Give your agent these instructions:

> Install the `dsh-spec-skill-forge` skill from `sunandsunshine-tech/dsh-spec` with the GitHub CLI, then follow the "Install by hand" steps in this README. Check that the prerequisites above are present first, and ask me if any of them is missing.

## What you get

- **Decisions stay put.** Every change that matters says what it built, what it gave up and what will verify it, so the next person does not argue it again.
- **A skill is forged, not improvised.** `dsh-spec-skill-forge` takes a concept, a source, or an existing skill through domain anchoring, a single-file prototype, and a decision record kept alongside.
- **The two languages stay together.** Each pair carries its English side, its Chinese side and a record of the last agreed state; keeping the two in step is the writer's job.

## The skill

| Skill | What it is for |
|---|---|
| `dsh-spec-skill-forge` | Forging a skill from an idea, a source, or an existing skill: pin the problem and the shape, anchor the domain, build a prototype, and keep the decision record |

## Updating the skill set

Each skill is installed at the revision you name, and `gh skill update` refreshes the installed copy.

## Working in a project that has it

1. **Decide in a note first.** A change worth recording starts as a record under `proposed/`, with the problem, the options that lost and how it will be verified; a conclusion reached in conversation is recorded the same way, or it lives only in that conversation.
2. **Close the loop with the checks the change owes.** The commands this repository runs are in [`AGENTS.md`](AGENTS.md#commands).

## Working on this repository

- **Change the skill, not the installed copy.** Work lands in `skills/`. `.agents/skills/` is overwritten by the next install, so an edit there is lost.
- **Move the note as the decision ships.** Once a decision lands, the note moves to `implemented/` and speaks in the present tense, in the same change.

| Who | Job |
|---|---|
| `skills/` | The deliverable: the skill, with its own entry |
| `.agents/skills/` | Installed copies an agent loads, tracked in git; written only by an install, so an edit there is lost |
| `.agents/dsh-spec/notes/` | The decision records: what was decided, what lost, what was given up. The format is [`notes/README.md`](.agents/dsh-spec/notes/README.md) |
| `docs/` | Pages written for people, including the vocabulary both languages share; nothing governs this folder |
| `scripts/` | What belongs to this repository and is not shipped: [`verify-dco.ts`](scripts/verify-dco.ts) and [`submit-vendored.ts`](scripts/submit-vendored.ts) |
| `tests/` | The functional suite for those checks — `node --test 'tests/**/*.test.ts'` |
| `submodules/dsh/` | Where the pattern came from, pinned as a comparison baseline: read it, never edit it |

## Read next

- [`AGENTS.md`](AGENTS.md) — the rules that hold in every session, and the commands this repository actually runs.
- [`skills/dsh-spec-skill-forge/SKILL.md`](skills/dsh-spec-skill-forge/SKILL.md) — the skill-authoring entry.
- [`.agents/dsh-spec/notes/README.md`](.agents/dsh-spec/notes/README.md) — the decision-record contract, which is the pattern describing itself.

## License

This project is released under the MIT License. The full text and copyright line are in [`LICENSE`](LICENSE); the upstream DeepSeek Harness notice, the ported files and the bundled npm packages are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
